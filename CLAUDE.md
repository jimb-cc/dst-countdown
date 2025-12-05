# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UK Daylight Saving Time Countdown - a minimalist web application displaying a real-time countdown in milliseconds to the next UK DST change. Built with Swiss International Typographic Style design principles.

**Tech Stack**: Node.js + Express backend, vanilla HTML/CSS/JavaScript frontend, no build step required.

## Commands

```bash
# Install dependencies
npm install

# Run local development server (port 3000)
npm start

# Test the API endpoint
curl http://localhost:3000/api/dst

# Change port
PORT=8080 npm start

# Deploy to Vercel
vercel --prod
```

## Architecture

```
Browser → Express Server → GOV.UK (https://www.gov.uk/when-do-the-clocks-change)
           ↓
         Parses HTML, extracts DST dates, calculates countdown
           ↓
         Returns JSON with milliseconds remaining, progress %
```

**Key files:**
- `api/dst.js` - Vercel serverless function (main API logic for production)
- `server.js` - Express server for local development
- `script.js` - Frontend countdown using requestAnimationFrame
- `index.html`, `style.css` - Swiss-style minimal frontend

**Data flow:**
1. Server fetches GOV.UK page and caches HTML for 1 hour
2. Regex parses March/October dates from the page
3. API returns next DST event timestamp and progress percentage
4. Frontend calculates countdown locally using requestAnimationFrame (~60fps)

## Key Patterns

- **HTML Caching**: GOV.UK response cached server-side for 1 hour to minimize external requests
- **Fallback Calculation**: If no dates found in HTML, calculates next DST using UK rules (last Sunday of March/October)
- **requestAnimationFrame**: Used instead of setInterval for efficient ~60fps updates
- **Dual deployment**: Same codebase works as Express server locally and Vercel serverless function in production

## UK DST Rules

- **Spring (forward)**: Last Sunday of March at 01:00 UTC → BST begins
- **Autumn (backward)**: Last Sunday of October at 02:00 UTC → GMT begins
