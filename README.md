# UK Daylight Saving Time Countdown

A minimalist web application that displays a real-time countdown in milliseconds to the next UK Daylight Saving Time change. Built with Swiss design principles.

![Swiss Design](https://img.shields.io/badge/design-Swiss_Style-red)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Real-time countdown** in milliseconds to the next DST event
- **Fetches official dates** from GOV.UK on each page load
- **Swiss-style minimalist design**:
  - Helvetica typography
  - Grid-based layout
  - Black/white/red color palette
  - Generous whitespace
- **Responsive design** for all screen sizes
- **Simple local server** - no cloud deployment needed

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation & Run

```bash
# Install dependencies
npm install

# Start the server
npm start
```

That's it! Open your browser to:
```
http://localhost:3000
```

## How It Works

1. User opens `http://localhost:3000` in their browser
2. Frontend JavaScript calls `/api/dst` endpoint
3. Express server fetches https://www.gov.uk/when-do-the-clocks-change
4. Server parses the HTML to extract official DST dates
5. Server calculates which DST event is next and returns the data
6. Frontend displays countdown that updates every millisecond

## Architecture

```
┌─────────────────┐
│   Browser       │
│  (localhost)    │
└────────┬────────┘
         │
         │ HTTP GET /
         │ HTTP GET /api/dst
         │
┌────────▼────────┐
│  Express.js     │
│   Server        │
│  (port 3000)    │
└────────┬────────┘
         │
         │ HTTPS GET
         │
┌────────▼────────┐
│   GOV.UK        │
│ /when-do-the-   │
│ clocks-change   │
└─────────────────┘
```

**Tech Stack:**
- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Data Source**: GOV.UK official website

## Project Structure

```
.
├── server.js              # Express server + DST parsing logic
├── package.json           # Node.js dependencies
├── frontend/              # Static frontend files
│   ├── index.html        # Main HTML page
│   ├── style.css         # Swiss design styling
│   └── script.js         # Countdown timer logic
└── README.md             # This file
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
curl http://localhost:3000/api/dst
```

Expected response:
```json
{
  "type": "forward",
  "description": "Until clocks go forward (BST begins)",
  "targetDate": "2026-03-29T01:00:00.000Z",
  "timestamp": 1774962000000,
  "millisecondsRemaining": 42750123456,
  "currentTime": 1732212876544
}
```

## Data Source

Official UK Daylight Saving Time dates from:
- https://www.gov.uk/when-do-the-clocks-change

**UK DST Rules:**
- **Spring**: Clocks go forward 1 hour at 1:00 AM on the last Sunday in March
- **Autumn**: Clocks go back 1 hour at 2:00 AM on the last Sunday in October

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
- [ ] Dark mode toggle
- [ ] Display days/hours/minutes alongside milliseconds
- [ ] Historical DST change log
- [ ] Export countdown to calendar (ICS file)
- [ ] Docker containerization
- [ ] Unit tests for date parsing
- [ ] Fallback calculation if GOV.UK is unreachable

## License

MIT License - feel free to use, modify, and distribute.

## Acknowledgments

- Design inspired by Swiss International Typographic Style
- Data source: UK Government (GOV.UK)
- Built with minimal dependencies for simplicity
