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

// State
let targetTimestamp = null;
let previousTimestamp = null;
let eventData = null;
let countdownInterval = null;

// Initialize
async function init() {
    try {
        await fetchDSTData();
        startCountdown();
    } catch (error) {
        showError();
    }
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

    // Format number with thousands separators and 2 decimal places
    countdownElement.textContent = formatNumber(remaining);

    // Update progress bar
    if (previousTimestamp) {
        const totalDuration = targetTimestamp - previousTimestamp;
        const elapsed = now - previousTimestamp;
        const progressPercent = (elapsed / totalDuration) * 100;
        progressBarElement.style.width = `${Math.min(100, Math.max(0, progressPercent))}%`;
    }
}

// Format number as seconds with 2 decimal places and commas
function formatNumber(milliseconds) {
    const seconds = milliseconds / 1000;
    // Split into integer and decimal parts
    const integerPart = Math.floor(seconds);
    const decimalPart = (seconds - integerPart).toFixed(2).substring(2);
    // Format integer part with thousands separators
    const formattedInteger = integerPart.toLocaleString('en-GB');
    return `${formattedInteger}.${decimalPart}`;
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
