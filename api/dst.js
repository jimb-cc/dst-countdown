/**
 * International DST API Endpoint
 *
 * Supports multiple countries/timezones using Luxon for DST calculations.
 * Auto-detects location via Vercel geolocation headers.
 *
 * Query params:
 *   - country: ISO 2-letter country code (e.g., 'SE', 'US')
 *   - tz: IANA timezone override (e.g., 'America/New_York')
 */

const { DateTime } = require('luxon');

// Countries data embedded directly to avoid file system issues on Vercel
const countriesData = {
    countries: {
        GB: { name: "United Kingdom", timezone: "Europe/London", locale: "en-GB", hasDST: true, flag: "🇬🇧", region: "europe" },
        SE: { name: "Sweden", timezone: "Europe/Stockholm", locale: "sv", hasDST: true, flag: "🇸🇪", region: "europe" },
        NO: { name: "Norway", timezone: "Europe/Oslo", locale: "no", hasDST: true, flag: "🇳🇴", region: "europe" },
        FI: { name: "Finland", timezone: "Europe/Helsinki", locale: "fi", hasDST: true, flag: "🇫🇮", region: "europe" },
        DE: { name: "Germany", timezone: "Europe/Berlin", locale: "de", hasDST: true, flag: "🇩🇪", region: "europe" },
        NL: { name: "Netherlands", timezone: "Europe/Amsterdam", locale: "nl", hasDST: true, flag: "🇳🇱", region: "europe" },
        PL: { name: "Poland", timezone: "Europe/Warsaw", locale: "pl", hasDST: true, flag: "🇵🇱", region: "europe" },
        FR: { name: "France", timezone: "Europe/Paris", locale: "fr", hasDST: true, flag: "🇫🇷", region: "europe" },
        IE: { name: "Ireland", timezone: "Europe/Dublin", locale: "en-IE", hasDST: true, flag: "🇮🇪", region: "europe" },
        DK: { name: "Denmark", timezone: "Europe/Copenhagen", locale: "da", hasDST: true, flag: "🇩🇰", region: "europe" },
        US: { name: "United States", timezone: "America/New_York", locale: "en-US", hasDST: true, flag: "🇺🇸", region: "northAmerica" },
        CA: { name: "Canada", timezone: "America/Toronto", locale: "en-CA", hasDST: true, flag: "🇨🇦", region: "northAmerica" },
        AU: { name: "Australia", timezone: "Australia/Sydney", locale: "en-AU", hasDST: true, flag: "🇦🇺", region: "oceania", southernHemisphere: true },
        NZ: { name: "New Zealand", timezone: "Pacific/Auckland", locale: "en-NZ", hasDST: true, flag: "🇳🇿", region: "oceania", southernHemisphere: true },
        CL: { name: "Chile", timezone: "America/Santiago", locale: "es-CL", hasDST: true, flag: "🇨🇱", region: "southAmerica", southernHemisphere: true }
    },
    noDST: ["JP", "CN", "IN", "SG", "HK", "TH", "VN", "PH", "MY", "ID", "KR", "AR", "CO", "VE", "PE", "EC", "RU", "TR", "EG", "ZA", "AE", "SA"],
    defaultCountry: "GB"
};

module.exports = async (req, res) => {
    try {
        // Get country/timezone from query params, headers, or defaults
        const { country: queryCountry, tz: queryTimezone } = req.query;

        // Vercel geolocation headers (free on all plans)
        const vercelCountry = req.headers['x-vercel-ip-country'];
        const vercelTimezone = req.headers['x-vercel-ip-timezone'];

        // Determine which country to use
        const countryCode = resolveCountry(queryCountry, vercelCountry);
        const countryInfo = countriesData.countries[countryCode] || countriesData.countries[countriesData.defaultCountry];

        // Determine timezone (query param > country default)
        const timezone = queryTimezone || countryInfo.timezone;

        // Check if country has DST
        if (!countryInfo.hasDST) {
            // Return UK data as fallback for no-DST countries
            const ukCountry = countriesData.countries['GB'];
            const ukResult = calculateDSTForTimezone(ukCountry.timezone);
            return sendResponse(res, {
                ...ukResult,
                country: {
                    code: countryCode,
                    name: countryInfo.name,
                    flag: countryInfo.flag,
                    hasDST: false
                },
                fallbackCountry: {
                    code: 'GB',
                    name: 'United Kingdom',
                    flag: '🇬🇧'
                },
                detectedCountry: vercelCountry || null,
                detectedTimezone: vercelTimezone || null
            });
        }

        // Calculate DST for the requested timezone
        const result = calculateDSTForTimezone(timezone);

        sendResponse(res, {
            ...result,
            country: {
                code: countryCode,
                name: countryInfo.name,
                flag: countryInfo.flag,
                hasDST: true,
                southernHemisphere: countryInfo.southernHemisphere || false
            },
            timezone,
            detectedCountry: vercelCountry || null,
            detectedTimezone: vercelTimezone || null
        });
    } catch (error) {
        console.error('DST API Error:', error.message);
        res.status(500).json({ error: 'Failed to calculate DST information' });
    }
};

/**
 * Resolve country code from various sources
 */
function resolveCountry(queryCountry, vercelCountry) {
    // 1. Explicit query param takes priority
    if (queryCountry && countriesData.countries[queryCountry.toUpperCase()]) {
        return queryCountry.toUpperCase();
    }

    // 2. Vercel detected country if it's in our supported list
    if (vercelCountry && countriesData.countries[vercelCountry]) {
        return vercelCountry;
    }

    // 3. Check if vercel country is in no-DST list, still return it for display
    if (vercelCountry && countriesData.noDST.includes(vercelCountry)) {
        return vercelCountry;
    }

    // 4. Default to UK
    return countriesData.defaultCountry;
}

/**
 * Calculate DST transitions for a given timezone using Luxon
 */
function calculateDSTForTimezone(timezone) {
    const now = DateTime.now().setZone(timezone);
    const currentYear = now.year;

    // Find DST transitions by checking offset changes throughout the year
    const transitions = [];

    for (let year = currentYear; year <= currentYear + 1; year++) {
        const yearTransitions = findDSTTransitions(timezone, year);
        transitions.push(...yearTransitions);
    }

    // Sort by timestamp
    transitions.sort((a, b) => a.timestamp - b.timestamp);

    // Find next future transition and previous past transition
    const nowTimestamp = now.toMillis();
    let nextEvent = null;
    let previousEvent = null;

    for (let i = 0; i < transitions.length; i++) {
        if (transitions[i].timestamp > nowTimestamp) {
            nextEvent = transitions[i];
            if (i > 0) {
                previousEvent = transitions[i - 1];
            }
            break;
        }
    }

    // If no transitions found (timezone without DST), return null indicators
    if (!nextEvent) {
        return {
            type: null,
            targetDate: null,
            timestamp: null,
            millisecondsRemaining: null,
            currentTime: nowTimestamp,
            previousEvent: null,
            progressPercent: 0,
            hasDST: false
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
        targetDate: nextEvent.date,
        timestamp: nextEvent.timestamp,
        localTime: nextEvent.localTime,
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

/**
 * Find DST transitions in a given year for a timezone
 * Returns array of { type, timestamp, date, localTime }
 */
function findDSTTransitions(timezone, year) {
    const transitions = [];

    // Check each month for offset changes
    let prevOffset = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: timezone }).offset;

    for (let month = 1; month <= 12; month++) {
        // Get the number of days in this month
        const daysInMonth = DateTime.fromObject({ year, month }, { zone: timezone }).daysInMonth;

        for (let day = 1; day <= daysInMonth; day++) {
            const dt = DateTime.fromObject({ year, month, day, hour: 3 }, { zone: timezone });
            const currentOffset = dt.offset;

            if (currentOffset !== prevOffset) {
                // Found a transition - get the exact time
                const transitionTime = findExactTransition(timezone, year, month, day);

                const offsetDiff = currentOffset - prevOffset;
                transitions.push({
                    type: offsetDiff > 0 ? 'forward' : 'backward',
                    timestamp: transitionTime.toMillis(),
                    date: transitionTime.toUTC().toISO(),
                    localTime: transitionTime.toISO(),
                    offsetBefore: prevOffset,
                    offsetAfter: currentOffset
                });

                prevOffset = currentOffset;
                break; // Move to next month
            }
        }
    }

    return transitions;
}

/**
 * Find exact transition time (DST usually changes at 01:00-03:00 local)
 */
function findExactTransition(timezone, year, month, day) {
    // DST transitions typically happen at 01:00 or 02:00 local time
    // Return 01:00 UTC on the transition day as a reasonable approximation
    return DateTime.fromObject({ year, month, day, hour: 1 }, { zone: 'UTC' }).setZone(timezone);
}

/**
 * Send JSON response with standard headers
 */
function sendResponse(res, data) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Cache for 1 hour (shorter than before since country can vary)
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200');
    res.setHeader('Content-Type', 'application/json');

    res.status(200).json(data);
}
