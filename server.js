const express = require('express');
const https = require('https');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache for GOV.UK data
let cachedHtml = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Enable gzip compression for all responses
app.use(compression());

// Serve static files with cache headers
app.use(express.static('.', {
    maxAge: '1d', // Cache static files for 1 day
    etag: true
}));

// API endpoint to get DST information
app.get('/api/dst', async (req, res) => {
    try {
        // Check if cache is valid
        const now = Date.now();
        if (!cachedHtml || !cacheTimestamp || (now - cacheTimestamp) > CACHE_DURATION) {
            cachedHtml = await fetchGovUkPage();
            cacheTimestamp = now;
        }

        const nextEvent = parseAndCalculateNextEvent(cachedHtml);

        // Add cache headers for API response
        res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 60 seconds
        res.json(nextEvent);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch DST information' });
    }
});

// Fetch GOV.UK page
function fetchGovUkPage() {
    return new Promise((resolve, reject) => {
        https.get('https://www.gov.uk/when-do-the-clocks-change', (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Parse HTML and calculate next DST event
function parseAndCalculateNextEvent(html) {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Extract dates from the HTML table
    // The page shows dates in format like "30 March" or "26 October"
    // We'll look for patterns with or without the year

    // Look for all March dates in the current and next year
    const marchPattern = /(\\d{1,2})\\s+March(?:\\s+(\\d{4}))?/gi;
    const octoberPattern = /(\\d{1,2})\\s+October(?:\\s+(\\d{4}))?/gi;

    const marchMatches = [...html.matchAll(marchPattern)];
    const octoberMatches = [...html.matchAll(octoberPattern)];

    const futureEvents = [];
    const pastEvents = [];

    // Process March dates (clocks go forward)
    for (const match of marchMatches) {
        const day = parseInt(match[1]);
        const year = match[2] ? parseInt(match[2]) : currentYear;
        const forwardDate = new Date(year, 2, day, 1, 0, 0, 0); // Month 2 = March (0-indexed)

        const event = {
            type: 'forward',
            description: 'Until clocks go forward (BST begins)',
            timestamp: forwardDate.getTime(),
            date: forwardDate.toISOString(),
            day: day,
            year: year
        };

        if (forwardDate > now) {
            futureEvents.push(event);
        } else {
            pastEvents.push(event);
        }
    }

    // Process October dates (clocks go back)
    for (const match of octoberMatches) {
        const day = parseInt(match[1]);
        const year = match[2] ? parseInt(match[2]) : currentYear;
        const backwardDate = new Date(year, 9, day, 2, 0, 0, 0); // Month 9 = October (0-indexed)

        const event = {
            type: 'backward',
            description: 'Until clocks go back (GMT begins)',
            timestamp: backwardDate.getTime(),
            date: backwardDate.toISOString(),
            day: day,
            year: year
        };

        if (backwardDate > now) {
            futureEvents.push(event);
        } else {
            pastEvents.push(event);
        }
    }

    // If no future events found, calculate next year's March event
    if (futureEvents.length === 0) {
        const nextYear = currentYear + 1;
        const nextMarchDate = new Date(nextYear, 2, 31, 1, 0, 0, 0);
        while (nextMarchDate.getDay() !== 0) {
            nextMarchDate.setDate(nextMarchDate.getDate() - 1);
        }

        futureEvents.push({
            type: 'forward',
            description: 'Until clocks go forward (BST begins)',
            timestamp: nextMarchDate.getTime(),
            date: nextMarchDate.toISOString()
        });
    }

    // Sort events
    futureEvents.sort((a, b) => a.timestamp - b.timestamp);
    pastEvents.sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    if (futureEvents.length === 0) {
        throw new Error('Could not parse DST dates from gov.uk page');
    }

    const nextEvent = futureEvents[0];
    let previousEvent = pastEvents.length > 0 ? pastEvents[0] : null;

    // If no previous event found from parsing, calculate it based on DST rules
    if (!previousEvent) {
        const nextEventDate = new Date(nextEvent.timestamp);
        const nextEventYear = nextEventDate.getFullYear();

        let prevDate;
        if (nextEvent.type === 'forward') {
            // Next is March forward, so previous was October backward of previous year
            prevDate = new Date(nextEventYear - 1, 9, 31, 2, 0, 0, 0); // Last day of October
            // Walk back to find last Sunday
            while (prevDate.getDay() !== 0) {
                prevDate.setDate(prevDate.getDate() - 1);
            }
            previousEvent = {
                type: 'backward',
                timestamp: prevDate.getTime(),
                date: prevDate.toISOString()
            };
        } else {
            // Next is October backward, so previous was March forward of same year
            prevDate = new Date(nextEventYear, 2, 31, 1, 0, 0, 0); // Last day of March
            // Walk back to find last Sunday
            while (prevDate.getDay() !== 0) {
                prevDate.setDate(prevDate.getDate() - 1);
            }
            previousEvent = {
                type: 'forward',
                timestamp: prevDate.getTime(),
                date: prevDate.toISOString()
            };
        }
    }

    const millisecondsRemaining = nextEvent.timestamp - now.getTime();

    // Calculate progress percentage
    let progressPercent = 0;
    if (previousEvent) {
        const totalDuration = nextEvent.timestamp - previousEvent.timestamp;
        const elapsed = now.getTime() - previousEvent.timestamp;
        progressPercent = (elapsed / totalDuration) * 100;
    }

    return {
        type: nextEvent.type,
        description: nextEvent.description,
        targetDate: nextEvent.date,
        timestamp: nextEvent.timestamp,
        millisecondsRemaining: millisecondsRemaining,
        currentTime: now.getTime(),
        previousEvent: previousEvent ? {
            type: previousEvent.type,
            timestamp: previousEvent.timestamp,
            date: previousEvent.date
        } : null,
        progressPercent: Math.min(100, Math.max(0, progressPercent))
    };
}

// Start server
app.listen(PORT, () => {
    console.log('====================================');
    console.log('UK DST Countdown Server');
    console.log('====================================');
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log(`Open your browser to: http://localhost:${PORT}`);
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('====================================');
});
