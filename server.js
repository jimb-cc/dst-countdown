const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the frontend directory
app.use(express.static('frontend'));

// API endpoint to get DST information
app.get('/api/dst', async (req, res) => {
    try {
        const html = await fetchGovUkPage();
        const nextEvent = parseAndCalculateNextEvent(html);
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

    const events = [];

    // Process March dates (clocks go forward)
    for (const match of marchMatches) {
        const day = parseInt(match[1]);
        const year = match[2] ? parseInt(match[2]) : currentYear;
        const forwardDate = new Date(year, 2, day, 1, 0, 0, 0); // Month 2 = March (0-indexed)

        if (forwardDate > now) {
            events.push({
                type: 'forward',
                description: 'Until clocks go forward (BST begins)',
                timestamp: forwardDate.getTime(),
                date: forwardDate.toISOString(),
                day: day,
                year: year
            });
        }
    }

    // Process October dates (clocks go back)
    for (const match of octoberMatches) {
        const day = parseInt(match[1]);
        const year = match[2] ? parseInt(match[2]) : currentYear;
        const backwardDate = new Date(year, 9, day, 2, 0, 0, 0); // Month 9 = October (0-indexed)

        if (backwardDate > now) {
            events.push({
                type: 'backward',
                description: 'Until clocks go back (GMT begins)',
                timestamp: backwardDate.getTime(),
                date: backwardDate.toISOString(),
                day: day,
                year: year
            });
        }
    }

    // If no events found for current year, try next year
    if (events.length === 0) {
        // Assume the standard last Sunday in March for next year
        const nextYear = currentYear + 1;
        const nextMarchDate = new Date(nextYear, 2, 31, 1, 0, 0, 0); // Start with last day of March
        // Walk back to find the last Sunday
        while (nextMarchDate.getDay() !== 0) {
            nextMarchDate.setDate(nextMarchDate.getDate() - 1);
        }

        events.push({
            type: 'forward',
            description: 'Until clocks go forward (BST begins)',
            timestamp: nextMarchDate.getTime(),
            date: nextMarchDate.toISOString()
        });
    }

    // Sort events by timestamp and get the next one
    events.sort((a, b) => a.timestamp - b.timestamp);

    if (events.length === 0) {
        throw new Error('Could not parse DST dates from gov.uk page');
    }

    const nextEvent = events[0];
    const millisecondsRemaining = nextEvent.timestamp - now.getTime();

    return {
        type: nextEvent.type,
        description: nextEvent.description,
        targetDate: nextEvent.date,
        timestamp: nextEvent.timestamp,
        millisecondsRemaining: millisecondsRemaining,
        currentTime: now.getTime()
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
