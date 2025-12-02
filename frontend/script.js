// API Configuration
const API_ENDPOINT = '/api/dst';

// DOM Elements
const countdownElement = document.getElementById('countdown');
const descriptionElement = document.getElementById('description');
const targetDateElement = document.getElementById('targetDate');
const eventTypeElement = document.getElementById('eventType');
const errorElement = document.getElementById('error');
const containerElement = document.querySelector('.container');

// State
let targetTimestamp = null;
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

    // Update static information
    descriptionElement.textContent = eventData.description;
    targetDateElement.textContent = formatDate(new Date(eventData.targetDate));
    eventTypeElement.textContent = eventData.type === 'forward' ? 'Clocks Forward' : 'Clocks Back';
}

// Start countdown timer
function startCountdown() {
    updateCountdown();

    // Update every millisecond
    countdownInterval = setInterval(() => {
        updateCountdown();
    }, 1);
}

// Update countdown display
function updateCountdown() {
    const now = Date.now();
    const remaining = targetTimestamp - now;

    if (remaining <= 0) {
        // Event has occurred, reload data
        clearInterval(countdownInterval);
        countdownElement.textContent = '0.00';
        setTimeout(() => {
            init(); // Reload to get next event
        }, 5000);
        return;
    }

    // Format number with thousands separators and 2 decimal places
    countdownElement.textContent = formatNumber(remaining);
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
