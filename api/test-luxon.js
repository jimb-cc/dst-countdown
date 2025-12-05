// Simple test to check if Luxon loads on Vercel
const { DateTime } = require('luxon');

module.exports = async (req, res) => {
    try {
        const now = DateTime.now();
        res.status(200).json({
            success: true,
            luxonVersion: require('luxon/package.json').version,
            currentTime: now.toISO(),
            timezone: now.zoneName
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};
