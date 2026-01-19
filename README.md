# International Daylight Saving Time Countdown

A minimalist web application that displays a real-time countdown to the next Daylight Saving Time change. Supports 15 countries with automatic location detection. Built with Swiss design principles.

![Swiss Design](https://img.shields.io/badge/design-Swiss_Style-red)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Real-time countdown** to the next DST event (seconds or full breakdown)
- **15 supported countries** with auto-detection via geolocation
- **Localized UI** with translations for each supported region
- **Swiss-style minimalist design**:
  - Helvetica typography
  - Grid-based layout
  - Black/white/red color palette
  - Generous whitespace
- **Dark mode** toggle
- **Mood modes** - plain or emotional copy
- **Responsive design** for all screen sizes
- **Deployed on Vercel** with serverless functions

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation & Run

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open your browser to:
```
http://localhost:3000
```

## How It Works

1. User opens the app in their browser
2. Frontend JavaScript calls `/api/dst` endpoint
3. Server uses Luxon to calculate DST transitions by detecting timezone offset changes
4. Server returns the next DST event timestamp and progress data
5. Frontend displays countdown that updates at ~30fps

## Architecture

```
┌─────────────────┐
│   Browser       │
└────────┬────────┘
         │
         │ HTTP GET /api/dst?country=XX
         │
┌────────▼────────┐
│  Vercel         │
│  Serverless     │
│  Function       │
└────────┬────────┘
         │
         │ Luxon timezone
         │ calculations
         │
┌────────▼────────┐
│  IANA Timezone  │
│  Database       │
│  (via Luxon)    │
└─────────────────┘
```

**Tech Stack:**
- **Backend**: Node.js + Vercel Serverless Functions
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **DST Calculation**: Luxon library (algorithmic, no external API)

## Project Structure

```
.
├── api/
│   └── dst.js            # Vercel serverless function (DST calculation)
├── data/
│   └── countries.json    # Supported countries and timezones
├── locales/              # Translations (en-GB, de, fr, sv, etc.)
├── index.html            # Main HTML page
├── style.css             # Swiss design styling
├── script.js             # Frontend countdown logic
├── vercel.json           # Vercel deployment config
└── package.json          # Node.js dependencies
```

## Swiss Design Principles

This project follows Swiss design (International Typographic Style):

- **Typography**: Helvetica Neue, strong hierarchy, uppercase headings
- **Grid System**: Asymmetric two-column layout on desktop
- **Color Palette**: Monochrome (black/white) with red accent for emphasis
- **Layout**: Mathematical precision, generous whitespace
- **Philosophy**: Form follows function, clarity over decoration

## Customization

### Change the Port

Set the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Modify the Design

Edit `frontend/style.css` to customize:
- Colors (red accent is `#ff0000`)
- Typography (currently Helvetica Neue)
- Layout breakpoints for responsive design
- Grid structure

### Update Interval

The countdown updates every 1 millisecond by default. To change this, edit `frontend/script.js`:

```javascript
// Change this value (in milliseconds)
countdownInterval = setInterval(() => {
    updateCountdown();
}, 1); // <-- Change this number
```

**Note**: Values below 4-5ms may not be accurate due to browser timer limitations.

## Development

### Running in Development Mode

The `npm start` command runs the server. Any changes to `server.js` require restarting the server.

For frontend changes (HTML/CSS/JS), just refresh your browser - no restart needed.

### Debugging

The server logs to console. Check terminal output for:
- Server startup messages
- API request logs
- Error messages if GOV.UK fetch fails

### Testing the API Endpoint

Test the API directly:

```bash
# Default (UK or auto-detected country)
curl http://localhost:3000/api/dst

# Specific country
curl http://localhost:3000/api/dst?country=US
curl http://localhost:3000/api/dst?country=SE
```

Expected response:
```json
{
  "type": "forward",
  "targetDate": "2026-03-29T01:00:00.000Z",
  "timestamp": 1774962000000,
  "millisecondsRemaining": 42750123456,
  "currentTime": 1732212876544,
  "progressPercent": 45.2,
  "country": {
    "code": "GB",
    "name": "United Kingdom",
    "flag": "🇬🇧",
    "hasDST": true
  },
  "timezone": "Europe/London"
}
```

## Supported Countries

| Region | Countries |
|--------|-----------|
| Europe | UK, Sweden, Norway, Finland, Germany, Netherlands, Poland, France, Ireland, Denmark |
| North America | USA, Canada |
| Oceania | Australia, New Zealand |
| South America | Chile |

Countries without DST (Japan, China, India, etc.) display the UK countdown as a fallback.

## How DST is Calculated

The app uses the **Luxon** library to calculate DST transitions algorithmically:

1. Iterates through each day of the current and next year
2. Compares timezone offsets day-by-day
3. When an offset change is detected, that's a DST transition
4. Returns the next future transition as the target event

This approach is more reliable than scraping external websites and works offline.

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

**Note**: Requires JavaScript to be enabled.

## Troubleshooting

### Server won't start

**Error**: `Port 3000 is already in use`
- **Solution**: Use a different port with `PORT=8080 npm start`

**Error**: `Cannot find module 'express'`
- **Solution**: Run `npm install` first

### Countdown shows "Failed to load"

**Possible causes:**
1. Server isn't running - make sure `npm start` is active
2. GOV.UK is down or blocking requests - check console for errors
3. Network issues - verify internet connection

**Debug steps:**
```bash
# Test the API endpoint
curl http://localhost:3000/api/dst

# Check server logs in terminal
# Look for error messages
```

### Countdown isn't updating

- Refresh the page (F5 or Cmd+R)
- Check browser console for JavaScript errors (F12 → Console)
- Verify browser JavaScript is enabled

## Future Enhancements

Possible additions:
- [x] Dark mode toggle
- [x] Display days/hours/minutes alongside milliseconds
- [x] Multiple country support
- [x] Localized translations
- [ ] Historical DST change log
- [ ] Export countdown to calendar (ICS file)
- [ ] Docker containerization
- [ ] Unit tests for DST calculations

## License

MIT License - feel free to use, modify, and distribute.

## Acknowledgments

- Design inspired by Swiss International Typographic Style
- Data source: UK Government (GOV.UK)
- Built with minimal dependencies for simplicity
