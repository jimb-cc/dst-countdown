/**
 * UK DST API Endpoint
 *
 * Optimized version:
 * - No external dependencies (GOV.UK fetch removed)
 * - Pure calculation based on UK DST rules
 * - Long cache duration (data changes twice per year)
 * - Security headers included
 */

module.exports = async (req, res) => {
    try {
        const nextEvent = calculateNextDSTEvent();

        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Cache for 1 day - DST dates only change twice per year
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=172800');
        res.setHeader('Content-Type', 'application/json');

        res.status(200).json(nextEvent);
    } catch (error) {
        console.error('DST API Error:', error.message);
        res.status(500).json({ error: 'Failed to calculate DST information' });
    }
};

/**
 * Calculate the last Sunday of a given month
 * @param {number} year - The year
 * @param {number} month - The month (0-indexed, so March=2, October=9)
 * @param {number} hour - The hour (UTC) when the change occurs
 * @returns {Date} - The date of the last Sunday
 */
function getLastSundayOfMonth(year, month, hour) {
    // Start from the last day of the month
    const date = new Date(Date.UTC(year, month + 1, 0, hour, 0, 0, 0));
    // Walk back to find Sunday (day 0)
    while (date.getUTCDay() !== 0) {
        date.setUTCDate(date.getUTCDate() - 1);
    }
    return date;
}

/**
 * Calculate the next UK DST event based on current date
 * UK DST Rules:
 * - Spring forward: Last Sunday of March at 01:00 UTC (GMT -> BST)
 * - Fall back: Last Sunday of October at 01:00 UTC (BST -> GMT)
 *   (Note: Clocks show 02:00 BST when they go back to 01:00 GMT)
 */
function calculateNextDSTEvent() {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Calculate DST dates for current year and next year
    const events = [];

    for (let year = currentYear; year <= currentYear + 1; year++) {
        // Spring: Last Sunday of March at 01:00 UTC
        const springDate = getLastSundayOfMonth(year, 2, 1);
        events.push({
            type: 'forward',
            description: 'Until clocks go forward (BST begins)',
            timestamp: springDate.getTime(),
            date: springDate.toISOString()
        });

        // Autumn: Last Sunday of October at 01:00 UTC
        const autumnDate = getLastSundayOfMonth(year, 9, 1);
        events.push({
            type: 'backward',
            description: 'Until clocks go back (GMT begins)',
            timestamp: autumnDate.getTime(),
            date: autumnDate.toISOString()
        });
    }

    // Sort all events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    // Find next future event and previous past event
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

    // Fallback: if somehow no future event found, calculate next year
    if (!nextEvent) {
        const nextSpring = getLastSundayOfMonth(currentYear + 2, 2, 1);
        nextEvent = {
            type: 'forward',
            description: 'Until clocks go forward (BST begins)',
            timestamp: nextSpring.getTime(),
            date: nextSpring.toISOString()
        };
    }

    // Calculate progress percentage
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
