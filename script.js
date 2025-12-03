// API Configuration
const API_ENDPOINT = '/api/dst';

// DOM Elements
const countdownElement = document.getElementById('countdown');
const descriptionElement = document.getElementById('description');
const targetDateElement = document.getElementById('targetDate');
const eventTypeElement = document.getElementById('eventType');
const progressBarElement = document.getElementById('progressBar');
const errorElement = document.getElementById('error');
const containerElement = document.querySelector('.container');
const prevLabelElement = document.getElementById('prevLabel');
const nextLabelElement = document.getElementById('nextLabel');

// Settings Elements
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const settingsClose = document.getElementById('settingsClose');
const settingsOverlay = document.getElementById('settingsOverlay');
const darkModeToggle = document.getElementById('darkModeToggle');
const formatButtons = document.querySelectorAll('.format-btn');

// State
let targetTimestamp = null;
let previousTimestamp = null;
let eventData = null;
let countdownInterval = null;
let timeFormat = localStorage.getItem('timeFormat') || 'seconds';
let darkMode = localStorage.getItem('darkMode') === 'true';

// Initialize
async function init() {
    try {
        // Apply saved settings
        applySettings();

        await fetchDSTData();
        startCountdown();
        initSettings();
    } catch (error) {
        showError();
    }
}

// Apply saved settings on load
function applySettings() {
    // Dark mode
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.setAttribute('aria-checked', 'true');
    }

    // Time format
    formatButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.format === timeFormat);
    });
}

// Initialize settings panel
function initSettings() {
    // Open settings
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.add('active');
        settingsOverlay.classList.add('active');
    });

    // Close settings
    const closeSettings = () => {
        settingsPanel.classList.remove('active');
        settingsOverlay.classList.remove('active');
    };

    settingsClose.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsPanel.classList.contains('active')) {
            closeSettings();
        }
    });

    // Dark mode toggle
    darkModeToggle.addEventListener('click', () => {
        darkMode = !darkMode;
        darkModeToggle.setAttribute('aria-checked', darkMode.toString());

        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        localStorage.setItem('darkMode', darkMode.toString());
    });

    // Format buttons
    formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            timeFormat = btn.dataset.format;
            formatButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            localStorage.setItem('timeFormat', timeFormat);
            updateCountdown(); // Immediate update
        });
    });
}

// Fetch DST data from server
async function fetchDSTData() {
    const response = await fetch(API_ENDPOINT);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    eventData = await response.json();
    targetTimestamp = eventData.timestamp;
    previousTimestamp = eventData.previousEvent ? eventData.previousEvent.timestamp : null;

    // Update static information
    descriptionElement.textContent = eventData.description;
    targetDateElement.textContent = formatDate(new Date(eventData.targetDate));
    eventTypeElement.textContent = eventData.type === 'forward' ? 'Clocks Forward' : 'Clocks Back';

    // Update GMT/BST labels based on event type
    // If next event is 'forward' (March), we're going FROM GMT TO BST
    // If next event is 'backward' (October), we're going FROM BST TO GMT
    if (eventData.type === 'forward') {
        prevLabelElement.textContent = 'GMT';
        nextLabelElement.textContent = 'BST';
    } else {
        prevLabelElement.textContent = 'BST';
        nextLabelElement.textContent = 'GMT';
    }

    // Set initial progress
    if (eventData.progressPercent !== undefined) {
        progressBarElement.style.width = `${eventData.progressPercent}%`;
    }
}

// Start countdown timer
function startCountdown() {
    updateCountdown();

    // Use requestAnimationFrame for efficient updates (~60fps)
    function animate() {
        updateCountdown();
        countdownInterval = requestAnimationFrame(animate);
    }
    countdownInterval = requestAnimationFrame(animate);
}

// Update countdown display
function updateCountdown() {
    const now = Date.now();
    const remaining = targetTimestamp - now;

    if (remaining <= 0) {
        // Event has occurred, reload data
        cancelAnimationFrame(countdownInterval);
        countdownElement.textContent = '0.00';
        progressBarElement.style.width = '100%';
        setTimeout(() => {
            init(); // Reload to get next event
        }, 5000);
        return;
    }

    // Format based on selected format
    if (timeFormat === 'seconds') {
        countdownElement.textContent = formatAsSeconds(remaining);
    } else {
        countdownElement.textContent = formatAsFull(remaining);
    }

    // Update progress bar
    if (previousTimestamp) {
        const totalDuration = targetTimestamp - previousTimestamp;
        const elapsed = now - previousTimestamp;
        const progressPercent = (elapsed / totalDuration) * 100;
        progressBarElement.style.width = `${Math.min(100, Math.max(0, progressPercent))}%`;
    }
}

// Format number as seconds with 2 decimal places and commas
function formatAsSeconds(milliseconds) {
    const seconds = milliseconds / 1000;
    // Split into integer and decimal parts
    const integerPart = Math.floor(seconds);
    const decimalPart = (seconds - integerPart).toFixed(2).substring(2);
    // Format integer part with thousands separators
    const formattedInteger = integerPart.toLocaleString('en-GB');
    return `${formattedInteger}.${decimalPart}`;
}

// Format as months, weeks, days, hours, minutes, seconds
function formatAsFull(milliseconds) {
    const totalSeconds = milliseconds / 1000;

    // Calculate each unit
    const months = Math.floor(totalSeconds / (30.44 * 24 * 60 * 60)); // Average month
    const weeks = Math.floor((totalSeconds % (30.44 * 24 * 60 * 60)) / (7 * 24 * 60 * 60));
    const days = Math.floor((totalSeconds % (7 * 24 * 60 * 60)) / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    // Build the string, only including non-zero units (except always show seconds)
    const parts = [];

    if (months > 0) parts.push(`${months}mo`);
    if (weeks > 0) parts.push(`${weeks}w`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds.toFixed(2)}s`);

    return parts.join(' ');
}

// Format date for display
function formatDate(date) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    };
    return date.toLocaleString('en-GB', options);
}

// Show error state
function showError() {
    containerElement.style.display = 'none';
    errorElement.classList.remove('hidden');
}

// Start the application
init();
