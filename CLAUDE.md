# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

International Daylight Saving Time Countdown - a minimalist web application displaying a real-time countdown to the next DST change. Supports 15 countries with auto-detection via Vercel geolocation. Built with Swiss International Typographic Style design principles.

**Tech Stack**: Node.js + Express backend, vanilla HTML/CSS/JavaScript frontend, Luxon for timezone calculations, no build step required.

## Commands

```bash
# Install dependencies
npm install

# Run local development server (port 3000)
npm run dev

# Test the API endpoint
curl http://localhost:3000/api/dst
curl http://localhost:3000/api/dst?country=US

# Deploy to Vercel
vercel --prod
```

## Architecture

```
Browser → Vercel Serverless Function (api/dst.js)
                    ↓
          Luxon calculates DST transitions
          by detecting timezone offset changes
                    ↓
          Returns JSON with milliseconds remaining, progress %
```

**Key files:**
- `api/dst.js` - Vercel serverless function with Luxon-based DST calculation
- `script.js` - Frontend countdown (~30fps via setInterval)
- `index.html`, `style.css` - Swiss-style minimal frontend
- `data/countries.json` - Supported countries and their timezones
- `locales/*.json` - Translations for 15 locales

**Data flow:**
1. API receives request with optional `country` param or uses Vercel geolocation headers
2. Luxon iterates through days of the year detecting UTC offset changes
3. API returns next DST event timestamp, progress percentage, and country info
4. Frontend calculates countdown locally at ~30fps

## Key Patterns

- **Algorithmic DST Detection**: Uses Luxon to find DST transitions by comparing timezone offsets day-by-day
- **Geolocation**: Vercel headers (`x-vercel-ip-country`, `x-vercel-ip-timezone`) for auto-detection
- **Client-side Caching**: localStorage caches API response for 1 hour per country
- **Locale Support**: Country-specific translations and date formatting
- **Dual deployment**: Same codebase works locally (Express) and on Vercel (serverless)

## Supported Countries

Europe: GB, SE, NO, FI, DE, NL, PL, FR, IE, DK
North America: US, CA
Oceania: AU, NZ
South America: CL

Countries without DST (JP, CN, IN, etc.) show UK countdown as fallback.
