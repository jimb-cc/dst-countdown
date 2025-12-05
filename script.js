// API Configuration
const API_ENDPOINT = '/api/dst';
const COUNTRIES_ENDPOINT = '/data/countries.json';
const LOCALES_PATH = '/locales';

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

// Custom country dropdown elements
const countryDropdown = document.getElementById('countryDropdown');
const countryDropdownTrigger = document.getElementById('countryDropdownTrigger');
const countryDropdownMenu = document.getElementById('countryDropdownMenu');
const selectedFlagElement = document.getElementById('selectedFlag');
const selectedCountryTextElement = document.getElementById('selectedCountryText');

// Mood text elements
const metaLabelElement = document.getElementById('metaLabel');
const mainTitleElement = document.getElementById('mainTitle');
const unitDetailElement = document.getElementById('unitDetail');
const targetDateLabelElement = document.getElementById('targetDateLabel');
const eventTypeLabelElement = document.getElementById('eventTypeLabel');
const coffeeLinkElement = document.getElementById('coffeeLink');
const solsticeMarkerElement = document.getElementById('solsticeMarker');
const solsticeLabelElement = document.getElementById('solsticeLabel');

// State
let targetTimestamp = null;
let previousTimestamp = null;
let eventData = null;
let countdownInterval = null;
let timeFormat = localStorage.getItem('timeFormat') || 'seconds';
let darkMode = localStorage.getItem('darkMode') === 'true'; // Default to false (light mode)
let mood = localStorage.getItem('mood') || 'plain';
let selectedCountry = localStorage.getItem('country') || 'auto';
let countriesData = null;
let detectedCountry = null;
let currentLocale = null;
let currentLocaleCode = 'en-GB';

// Fallback copy (embedded en-GB) - used if locale file fails to load
const fallbackLocale = {
    plain: {
        winter: {
            metaLabel: 'Time Remaining Until',
            mainTitle: 'UK Daylight\nSaving Time',
            unitDetail: 'until clocks change',
            targetDateLabel: 'Target Date',
            eventTypeLabel: 'Event',
            eventTypeValue: 'Clocks Forward',
            description: 'Until clocks go forward (BST begins)',
            coffeeLink: 'Buy me a coffee',
            prevLabel: 'GMT',
            nextLabel: 'BST',
            solsticeLabel: 'Solstice'
        },
        summer: {
            metaLabel: 'Time Remaining Until',
            mainTitle: 'UK Daylight\nSaving Time',
            unitDetail: 'until clocks change',
            targetDateLabel: 'Target Date',
            eventTypeLabel: 'Event',
            eventTypeValue: 'Clocks Back',
            description: 'Until clocks go back (GMT begins)',
            coffeeLink: 'Buy me a coffee',
            prevLabel: 'BST',
            nextLabel: 'GMT',
            solsticeLabel: 'Solstice'
        }
    },
    emotional: {
        winter: {
            metaLabel: 'How Much Longer Must I Endure',
            mainTitle: 'This Wretched\nSunless Void',
            unitDetail: 'of this soul-crushing darkness',
            targetDateLabel: 'My Only Hope',
            eventTypeLabel: 'The Prophecy',
            eventTypeValue: 'Light Returns To This Forsaken Land',
            description: 'Until blessed daylight graces my miserable existence once more',
            coffeeLink: 'A flicker of hope',
            prevLabel: 'Darkness',
            nextLabel: 'Salvation',
            solsticeLabel: 'The Longest Night'
        },
        summer: {
            metaLabel: 'How Much Longer Can I Savour',
            mainTitle: 'These Precious\nGolden Days',
            unitDetail: 'of fleeting summer bliss',
            targetDateLabel: 'The Inevitable',
            eventTypeLabel: 'The Doom',
            eventTypeValue: 'Descent Into The Abyss',
            description: 'Until darkness consumes what remains of my will to live',
            coffeeLink: 'Cherish the warmth',
            prevLabel: 'The Light',
            nextLabel: 'The Void',
            solsticeLabel: 'Peak Glory'
        }
    },
    ui: {
        seconds: 'seconds'
    },
    dateFormat: {
        locale: 'en-GB'
    }
};

// Load locale file for a given locale code
async function loadLocale(localeCode) {
    try {
        const response = await fetch(`${LOCALES_PATH}/${localeCode}.json`);
        if (!response.ok) {
            console.warn(`Locale ${localeCode} not found, falling back to en-GB`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.warn(`Failed to load locale ${localeCode}:`, error);
        return null;
    }
}

// Get the locale code for a country
function getLocaleForCountry(countryCode) {
    if (countriesData && countriesData.countries[countryCode]) {
        return countriesData.countries[countryCode].locale || 'en-GB';
    }
    return 'en-GB';
}

// Helper to get the right copy based on mood and season
function getCopy() {
    const locale = currentLocale || fallbackLocale;
    const isWinter = eventData && eventData.type === 'forward';
    const season = isWinter ? 'winter' : 'summer';

    // Get copy from locale, with fallback chain
    const moodCopy = locale[mood] || locale.plain || fallbackLocale.plain;
    return moodCopy[season] || fallbackLocale.plain[season];
}

// Get UI string from locale
function getUIString(key) {
    const locale = currentLocale || fallbackLocale;
    return (locale.ui && locale.ui[key]) || (fallbackLocale.ui && fallbackLocale.ui[key]) || key;
}

// Initialize
async function init() {
    try {
        // Load countries data first
        await loadCountriesData();

        // Apply saved settings
        applySettings();

        // Fetch DST data first (this sets detectedCountry for 'auto' mode)
        await fetchDSTData();

        // Now update locale with correct country info (handles 'auto' detection)
        await updateLocale();

        startCountdown();
        initSettings();
    } catch (error) {
        console.error('Init error:', error);
        showError();
    }
}

// Update locale based on current country
async function updateLocale() {
    // Determine which country we're actually showing data for
    const activeCountry = selectedCountry === 'auto'
        ? (detectedCountry || 'GB')
        : selectedCountry;

    const localeCode = getLocaleForCountry(activeCountry);

    // Load locale if changed OR if we haven't loaded any locale yet
    if (localeCode !== currentLocaleCode || !currentLocale) {
        currentLocaleCode = localeCode;
        currentLocale = await loadLocale(localeCode);

        // If locale failed to load, try en-GB as fallback
        if (!currentLocale && localeCode !== 'en-GB') {
            currentLocaleCode = 'en-GB';
            currentLocale = await loadLocale('en-GB');
        }
    }

    // Re-format date with new locale
    if (eventData && eventData.targetDate) {
        targetDateElement.textContent = formatDate(new Date(eventData.targetDate));
    }

    // Re-apply mood with new locale
    applyMood();
}

// Load countries data and populate selector
async function loadCountriesData() {
    const response = await fetch(COUNTRIES_ENDPOINT);
    if (!response.ok) {
        throw new Error('Failed to load countries data');
    }
    countriesData = await response.json();
    populateCountrySelector();
}

// Create a dropdown option element safely (no innerHTML)
function createDropdownOption(value, flag, text) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'country-dropdown-option';
    option.dataset.value = value;

    const flagSpan = document.createElement('span');
    flagSpan.className = 'country-dropdown-option-flag';
    flagSpan.textContent = flag;

    const textSpan = document.createElement('span');
    textSpan.className = 'country-dropdown-option-text';
    textSpan.textContent = text;

    option.appendChild(flagSpan);
    option.appendChild(textSpan);

    return option;
}

// Populate custom country dropdown
function populateCountrySelector() {
    // Clear existing menu content
    while (countryDropdownMenu.firstChild) {
        countryDropdownMenu.removeChild(countryDropdownMenu.firstChild);
    }

    // Group countries by region
    const regions = countriesData.regions;
    const countries = countriesData.countries;

    // Sort regions by order
    const sortedRegions = Object.entries(regions)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([key]) => key);

    // Add "Auto-detect" option first
    const autoGroup = document.createElement('div');
    autoGroup.className = 'country-dropdown-group';
    autoGroup.appendChild(createDropdownOption('auto', '🌍', 'Auto-detect'));
    countryDropdownMenu.appendChild(autoGroup);

    // Add countries grouped by region
    for (const regionKey of sortedRegions) {
        const regionCountries = Object.entries(countries)
            .filter(([, info]) => info.region === regionKey)
            .sort((a, b) => a[1].name.localeCompare(b[1].name));

        if (regionCountries.length > 0) {
            const group = document.createElement('div');
            group.className = 'country-dropdown-group';

            const groupLabel = document.createElement('div');
            groupLabel.className = 'country-dropdown-group-label';
            groupLabel.textContent = regions[regionKey].name;
            group.appendChild(groupLabel);

            for (const [code, info] of regionCountries) {
                group.appendChild(createDropdownOption(code, info.flag, info.name));
            }

            countryDropdownMenu.appendChild(group);
        }
    }

    // Parse flags with Twemoji for cross-platform rendering
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(countryDropdownMenu, {
            folder: 'svg',
            ext: '.svg'
        });
    }

    // Update the trigger to show current selection
    updateCountryDropdownDisplay();
}

// Update the dropdown trigger to show current selection
function updateCountryDropdownDisplay() {
    let flag = '🌍';
    let text = 'Auto-detect';

    if (selectedCountry === 'auto') {
        // Show detected country if available
        if (detectedCountry && countriesData?.countries[detectedCountry]) {
            const country = countriesData.countries[detectedCountry];
            text = `Auto (${country.name})`;
            flag = country.flag;
        }
    } else if (countriesData?.countries[selectedCountry]) {
        const country = countriesData.countries[selectedCountry];
        text = country.name;
        flag = country.flag;
    }

    selectedFlagElement.textContent = flag;
    selectedCountryTextElement.textContent = text;

    // Parse the trigger flag with Twemoji
    if (typeof twemoji !== 'undefined') {
        twemoji.parse(selectedFlagElement, {
            folder: 'svg',
            ext: '.svg'
        });
    }

    // Update selected state in menu
    countryDropdownMenu.querySelectorAll('.country-dropdown-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === selectedCountry);
    });
}

// Toggle dropdown open/closed
function toggleCountryDropdown(open) {
    const isOpen = open !== undefined ? open : !countryDropdown.classList.contains('open');
    countryDropdown.classList.toggle('open', isOpen);
    countryDropdownTrigger.setAttribute('aria-expanded', isOpen);
}

// Handle country selection from dropdown
function selectCountry(value) {
    selectedCountry = value;
    localStorage.setItem('country', selectedCountry);
    toggleCountryDropdown(false);
    updateCountryDropdownDisplay();

    // Fetch new data and update locale
    fetchDSTData().then(() => updateLocale());
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
        unitLabelElement.textContent = getUIString('seconds');
    } else {
        countdownElement.classList.add('hidden');
        countdownFullElement.classList.add('active');
        unitLabelElement.textContent = '';
    }
}

// Apply mood copy throughout the page
function applyMood() {
    const copy = getCopy();

    metaLabelElement.textContent = copy.metaLabel;
    // Main title uses <br> - safe hardcoded content
    setTitleContent(copy.mainTitle);
    unitDetailElement.textContent = copy.unitDetail;
    targetDateLabelElement.textContent = copy.targetDateLabel;
    eventTypeLabelElement.textContent = copy.eventTypeLabel;
    setCoffeeLinkContent(copy.coffeeLink);

    // Update event-specific text if we have event data
    if (eventData) {
        updateEventText();
    }

    // Update solstice label
    updateSolsticeMarker();
}

// Set title content with line break (safe - hardcoded values only)
function setTitleContent(titleText) {
    // Support both \n (from JSON) and <br> (legacy) as line breaks
    const parts = titleText.split(/\n|<br>/);
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

// Update event-specific text based on mood and season
function updateEventText() {
    const copy = getCopy();

    // Update description and event type - now directly from season-specific copy
    descriptionElement.textContent = copy.description;
    eventTypeElement.textContent = copy.eventTypeValue;

    // Update progress bar labels
    prevLabelElement.textContent = copy.prevLabel;
    nextLabelElement.textContent = copy.nextLabel;
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

    // Custom country dropdown
    countryDropdownTrigger.addEventListener('click', () => {
        toggleCountryDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!countryDropdown.contains(e.target)) {
            toggleCountryDropdown(false);
        }
    });

    // Handle country option selection
    countryDropdownMenu.addEventListener('click', async (e) => {
        const option = e.target.closest('.country-dropdown-option');
        if (!option) return;

        const newCountry = option.dataset.value;
        if (newCountry !== selectedCountry) {
            selectedCountry = newCountry;
            localStorage.setItem('country', selectedCountry);
            toggleCountryDropdown(false);
            updateCountryDropdownDisplay();

            // Stop current countdown and fetch new data
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }

            try {
                await updateLocale(); // Load locale for new country FIRST
                await fetchDSTData(true); // Then fetch DST data (formats date with correct locale)
                startCountdown();
            } catch (error) {
                console.error('Failed to fetch DST data for new country:', error);
                showError();
            }
        } else {
            toggleCountryDropdown(false);
        }
    });

    // Keyboard navigation for dropdown
    countryDropdownTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCountryDropdown();
        } else if (e.key === 'Escape') {
            toggleCountryDropdown(false);
        }
    });
}

// Fetch DST data from server (with localStorage caching)
async function fetchDSTData(forceRefresh = false) {
    const CACHE_DURATION = 3600000; // 1 hour in milliseconds
    const cacheKey = `dstData_${selectedCountry}`;
    const cacheTimeKey = `dstDataTime_${selectedCountry}`;

    // Check localStorage cache first (unless force refresh)
    if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);

        if (cached && cacheTime) {
            const age = Date.now() - parseInt(cacheTime, 10);
            if (age < CACHE_DURATION) {
                // Use cached data
                eventData = JSON.parse(cached);
                targetTimestamp = eventData.timestamp;
                previousTimestamp = eventData.previousEvent ? eventData.previousEvent.timestamp : null;
                detectedCountry = eventData.detectedCountry;
                updateCountryDisplay();
                targetDateElement.textContent = formatDate(new Date(eventData.targetDate));
                updateEventText();
                if (eventData.progressPercent !== undefined) {
                    progressBarElement.style.width = `${eventData.progressPercent}%`;
                }
                return;
            }
        }
    }

    // Build API URL with country param
    let apiUrl = API_ENDPOINT;
    if (selectedCountry !== 'auto') {
        apiUrl += `?country=${selectedCountry}`;
    }

    // Fetch fresh data from API
    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    eventData = await response.json();

    // Store detected country from API response
    detectedCountry = eventData.detectedCountry;
    updateCountryDisplay();

    // Cache the response
    localStorage.setItem(cacheKey, JSON.stringify(eventData));
    localStorage.setItem(cacheTimeKey, Date.now().toString());

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

    // Update solstice marker
    updateSolsticeMarker();
}

// Update country display in the dropdown trigger
function updateCountryDisplay() {
    // Use the new custom dropdown display function
    updateCountryDropdownDisplay();
}

// Start countdown timer
function startCountdown() {
    updateCountdown();

    // Update at ~30fps for smooth decimal blur effect
    // Good balance between visual smoothness and efficiency
    countdownInterval = setInterval(updateCountdown, 33);
}

// Update countdown display
function updateCountdown() {
    const now = Date.now();
    const remaining = targetTimestamp - now;

    if (remaining <= 0) {
        // Event has occurred, reload data
        clearInterval(countdownInterval);
        countdownElement.textContent = '0.00';
        progressBarElement.style.width = '100%';
        // Clear cached data so we fetch fresh
        const cacheKey = `dstData_${selectedCountry}`;
        const cacheTimeKey = `dstDataTime_${selectedCountry}`;
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(cacheTimeKey);
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

// Calculate winter solstice date for a given year (approximately Dec 21)
function getWinterSolstice(year) {
    // Winter solstice is typically Dec 21, around 21:00-22:00 UTC
    return new Date(Date.UTC(year, 11, 21, 21, 0, 0));
}

// Calculate summer solstice date for a given year (approximately June 21)
function getSummerSolstice(year) {
    // Summer solstice is typically June 20-21, around 21:00-22:00 UTC
    return new Date(Date.UTC(year, 5, 21, 21, 0, 0));
}

// Update solstice marker position and visibility
function updateSolsticeMarker() {
    if (!previousTimestamp || !targetTimestamp || !eventData) {
        solsticeMarkerElement.classList.remove('visible');
        return;
    }

    const isWinter = eventData.type === 'forward';
    let solsticeTimestamp;

    if (isWinter) {
        // Winter period (Oct → March): show winter solstice (Dec 21)
        const prevDate = new Date(previousTimestamp);
        const solstice = getWinterSolstice(prevDate.getFullYear());
        solsticeTimestamp = solstice.getTime();
    } else {
        // Summer period (March → Oct): show summer solstice (June 21)
        const prevDate = new Date(previousTimestamp);
        const solstice = getSummerSolstice(prevDate.getFullYear());
        solsticeTimestamp = solstice.getTime();
    }

    // Check if solstice falls within our range
    if (solsticeTimestamp <= previousTimestamp || solsticeTimestamp >= targetTimestamp) {
        solsticeMarkerElement.classList.remove('visible');
        return;
    }

    // Calculate position as percentage
    const totalDuration = targetTimestamp - previousTimestamp;
    const solsticeOffset = solsticeTimestamp - previousTimestamp;
    const solsticePercent = (solsticeOffset / totalDuration) * 100;

    // Position the marker
    solsticeMarkerElement.style.left = `${solsticePercent}%`;
    solsticeMarkerElement.classList.add('visible');

    // Update label based on mood and season
    const copy = getCopy();
    solsticeLabelElement.textContent = copy.solsticeLabel;
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
    const locale = currentLocale || fallbackLocale;
    const dateFormat = locale.dateFormat || fallbackLocale.dateFormat;

    const options = dateFormat.options || {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    };

    return date.toLocaleString(dateFormat.locale || 'en-GB', options);
}

// Show error state
function showError() {
    containerElement.style.display = 'none';
    errorElement.classList.remove('hidden');
}

// Start the application
init();
