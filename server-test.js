/**
 * UK DST Countdown Server - TIME TRAVEL TEST VERSION
 *
 * Simulates a specific date to test summer→winter countdown
 * Run with: node server-test.js
 */

const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3001;

// ⏰ TIME TRAVEL: Simulate September 20th, 2025
const FAKE_DATE = new Date('2025-09-20T14:00:00Z');
console.log(`\n🕰️  TIME TRAVEL MODE: Simulating ${FAKE_DATE.toDateString()}\n`);

// Enable gzip compression for all responses
app.use(compression());

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Serve static files with cache headers
app.use(express.static('.', {
    maxAge: '0', // No cache for testing
    etag: false
}));

// API endpoint to get DST information
app.get('/api/dst', (req, res) => {
    try {
        const nextEvent = calculateNextDSTEvent();

        // No cache for testing
        res.setHeader('Cache-Control', 'no-store');
        res.json(nextEvent);
    } catch (error) {
        console.error('DST API Error:', error.message);
        res.status(500).json({ error: 'Failed to calculate DST information' });
    }
});

function getLastSundayOfMonth(year, month, hour) {
    const date = new Date(Date.UTC(year, month + 1, 0, hour, 0, 0, 0));
    while (date.getUTCDay() !== 0) {
        date.setUTCDate(date.getUTCDate() - 1);
    }
    return date;
}

function calculateNextDSTEvent() {
    // USE FAKE DATE instead of real now
    const now = FAKE_DATE;
    const currentYear = now.getFullYear();

    const events = [];

    for (let year = currentYear; year <= currentYear + 1; year++) {
        const springDate = getLastSundayOfMonth(year, 2, 1);
        events.push({
            type: 'forward',
            description: 'Until clocks go forward (BST begins)',
            timestamp: springDate.getTime(),
            date: springDate.toISOString()
        });

        const autumnDate = getLastSundayOfMonth(year, 9, 1);
        events.push({
            type: 'backward',
            description: 'Until clocks go back (GMT begins)',
            timestamp: autumnDate.getTime(),
            date: autumnDate.toISOString()
        });
    }

    events.sort((a, b) => a.timestamp - b.timestamp);

    const nowTimestamp = now.getTime();
    let nextEvent = null;
    let previousEvent = null;

    for (let i = 0; i < events.length; i++) {
        if (events[i].timestamp > nowTimestamp) {
            nextEvent = events[i];
            if (i > 0) {
                previousEvent = events[i - 1];
            }
            break;
        }
    }

    if (!nextEvent) {
        const nextSpring = getLastSundayOfMonth(currentYear + 2, 2, 1);
        nextEvent = {
            type: 'forward',
            description: 'Until clocks go forward (BST begins)',
            timestamp: nextSpring.getTime(),
            date: nextSpring.toISOString()
        };
    }

    let progressPercent = 0;
    if (previousEvent) {
        const totalDuration = nextEvent.timestamp - previousEvent.timestamp;
        const elapsed = nowTimestamp - previousEvent.timestamp;
        progressPercent = (elapsed / totalDuration) * 100;
    }

    return {
        type: nextEvent.type,
        description: nextEvent.description,
        targetDate: nextEvent.date,
        timestamp: nextEvent.timestamp,
        millisecondsRemaining: nextEvent.timestamp - nowTimestamp,
        currentTime: nowTimestamp,
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
    console.log('UK DST Countdown - TIME TRAVEL TEST');
    console.log('====================================');
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log('');
    console.log(`📅 Simulated date: ${FAKE_DATE.toDateString()}`);
    console.log('');
    console.log('⚠️  Clear localStorage or use incognito to test fresh!');
    console.log('====================================');
});
