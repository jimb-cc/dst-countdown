// API Configuration
const API_ENDPOINT = '/api/dst';

// DOM Elements
const countdownElement = document.getElementById('countdown');
const countdownFullElement = document.getElementById('countdownFull');
const descriptionElement = document.getElementById('description');
const targetDateElement = document.getElementById('targetDate');
const eventTypeElement = document.getElementById('eventType');
const progressBarElement = document.getElementById('progressBar');
const errorElement = document.getElementById('error');
const containerElement = document.querySelector('.container');
const prevLabelElement = document.getElementById('prevLabel');
const nextLabelElement = document.getElementById('nextLabel');
const unitLabelElement = document.getElementById('unitLabel');

// Full format elements
const monthsElement = document.getElementById('months');
const weeksElement = document.getElementById('weeks');
const daysElement = document.getElementById('days');
const hoursElement = document.getElementById('hours');
const minutesElement = document.getElementById('minutes');
const secondsElement = document.getElementById('seconds');

// Settings Elements
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const settingsClose = document.getElementById('settingsClose');
const settingsOverlay = document.getElementById('settingsOverlay');
const darkModeToggle = document.getElementById('darkModeToggle');
const formatButtons = document.querySelectorAll('.format-btn');
const moodButtons = document.querySelectorAll('.mood-btn');

// Mood text elements
const metaLabelElement = document.getElementById('metaLabel');
const mainTitleElement = document.getElementById('mainTitle');
const unitDetailElement = document.getElementById('unitDetail');
const targetDateLabelElement = document.getElementById('targetDateLabel');
const eventTypeLabelElement = document.getElementById('eventTypeLabel');
const sourceLabelElement = document.getElementById('sourceLabel');
const sourceLinkElement = document.getElementById('sourceLink');
const coffeeLinkElement = document.getElementById('coffeeLink');

// State
let targetTimestamp = null;
let previousTimestamp = null;
let eventData = null;
let countdownInterval = null;
let timeFormat = localStorage.getItem('timeFormat') || 'seconds';
let darkMode = localStorage.getItem('darkMode') !== 'false'; // Default to true
let mood = localStorage.getItem('mood') || 'plain';

// Emotional copy - the despair of British winter rendered in Swiss precision
const emotionalCopy = {
    metaLabel: 'How Much Longer Must I Endure',
    mainTitle: 'This Wretched<br>Sunless Void',
    unitDetail: 'of this soul-crushing darkness',
    targetDateLabel: 'My Only Hope',
    eventTypeLabel: 'The Prophecy',
    eventTypeForward: 'Light Returns To This Forsaken Land',
    eventTypeBackward: 'Descent Into The Abyss',
    descriptionForward: 'Until blessed daylight graces my miserable existence once more',
    descriptionBackward: 'Until darkness consumes what remains of my will to live',
    sourceLabel: 'The Cold Hard Truth',
    sourceLink: 'The Government',
    coffeeLink: '🕯️ A flicker of hope',
    prevLabelToGMT: 'The Before Times',
    nextLabelToGMT: 'Eternal Night',
    prevLabelToBST: 'The Darkness',
    nextLabelToBST: 'Salvation'
};

const plainCopy = {
    metaLabel: 'Time Remaining Until',
    mainTitle: 'UK Daylight<br>Saving Time',
    unitDetail: 'until clocks change',
    targetDateLabel: 'Target Date',
    eventTypeLabel: 'Event',
    eventTypeForward: 'Clocks Forward',
    eventTypeBackward: 'Clocks Back',
    descriptionForward: 'Until clocks go forward (BST begins)',
    descriptionBackward: 'Until clocks go back (GMT begins)',
    sourceLabel: 'Source',
    sourceLink: 'GOV.UK',
    coffeeLink: '☕ Buy me a coffee',
    prevLabelToGMT: 'BST',
    nextLabelToGMT: 'GMT',
    prevLabelToBST: 'GMT',
    nextLabelToBST: 'BST'
};

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

    // Mood
    moodButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === mood);
    });

    // Apply time format display
    updateTimeFormatDisplay();

    // Apply mood
    applyMood();
}

// Update which countdown display is visible
function updateTimeFormatDisplay() {
    if (timeFormat === 'seconds') {
        countdownElement.classList.remove('hidden');
        countdownFullElement.classList.remove('active');
        unitLabelElement.textContent = 'seconds';
    } else {
        countdownElement.classList.add('hidden');
        countdownFullElement.classList.add('active');
        unitLabelElement.textContent = '';
    }
}

// Apply mood copy throughout the page
function applyMood() {
    const copy = mood === 'emotional' ? emotionalCopy : plainCopy;

    metaLabelElement.textContent = copy.metaLabel;
    // Main title uses <br> - safe hardcoded content
    setTitleContent(copy.mainTitle);
    unitDetailElement.textContent = copy.unitDetail;
    targetDateLabelElement.textContent = copy.targetDateLabel;
    eventTypeLabelElement.textContent = copy.eventTypeLabel;
    sourceLabelElement.textContent = copy.sourceLabel;
    sourceLinkElement.textContent = copy.sourceLink;
    setCoffeeLinkContent(copy.coffeeLink);

    // Update event-specific text if we have event data
    if (eventData) {
        updateEventText();
    }
}

// Set title content with line break (safe - hardcoded values only)
function setTitleContent(titleText) {
    const parts = titleText.split('<br>');
    mainTitleElement.textContent = '';
    parts.forEach((part, index) => {
        mainTitleElement.appendChild(document.createTextNode(part));
        if (index < parts.length - 1) {
            mainTitleElement.appendChild(document.createElement('br'));
        }
    });
}

// Set coffee link content (safe - hardcoded values only)
function setCoffeeLinkContent(text) {
    coffeeLinkElement.textContent = text;
}

// Update event-specific text based on mood and event type
function updateEventText() {
    const copy = mood === 'emotional' ? emotionalCopy : plainCopy;
    const isForward = eventData.type === 'forward';

    // Update description
    descriptionElement.textContent = isForward ? copy.descriptionForward : copy.descriptionBackward;

    // Update event type
    eventTypeElement.textContent = isForward ? copy.eventTypeForward : copy.eventTypeBackward;

    // Update progress bar labels
    if (isForward) {
        // Going to BST (forward in March)
        prevLabelElement.textContent = copy.prevLabelToBST;
        nextLabelElement.textContent = copy.nextLabelToBST;
    } else {
        // Going to GMT (backward in October)
        prevLabelElement.textContent = copy.prevLabelToGMT;
        nextLabelElement.textContent = copy.nextLabelToGMT;
    }
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
            updateTimeFormatDisplay();
            updateCountdown(); // Immediate update
        });
    });

    // Mood buttons
    moodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            mood = btn.dataset.mood;
            moodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            localStorage.setItem('mood', mood);
            applyMood();
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

    // Update target date (this doesn't change with mood)
    targetDateElement.textContent = formatDate(new Date(eventData.targetDate));

    // Update mood-dependent text
    updateEventText();

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
        updateFullDisplay(remaining);
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

// Update full display with individual elements
function updateFullDisplay(milliseconds) {
    const totalSeconds = milliseconds / 1000;

    // Calculate each unit
    const months = Math.floor(totalSeconds / (30.44 * 24 * 60 * 60)); // Average month
    const weeks = Math.floor((totalSeconds % (30.44 * 24 * 60 * 60)) / (7 * 24 * 60 * 60));
    const days = Math.floor((totalSeconds % (7 * 24 * 60 * 60)) / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    // Update each element
    monthsElement.textContent = months;
    weeksElement.textContent = weeks;
    daysElement.textContent = days;
    hoursElement.textContent = hours;
    minutesElement.textContent = minutes;
    secondsElement.textContent = seconds.toFixed(2);
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
