/**
 * Content Script - Spoiler Shield & Netflix Auto-Skip
 * Runs on all websites to block spoilers and automate Netflix playback
 */

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================

const CONFIG = {
  SPOILER_KEYWORDS: [
    'dies', 'dead', 'kills', 'death',
    'betrayal', 'betrays',
    'confession', 'confesses', 'revealed', 'reveal', 'secret',
    'ending', 'ends', 'final episode',
    'relationship', 'couple', 'together', 'kiss', 'romance',
    'villain', 'antagonist', 'evil',
    'plot twist', 'twist',
    'power up', 'transformation',
    'loses', 'defeat', 'defeated',
    'win', 'wins', 'victory',
    'attack', 'battle', 'fight',
    'true identity', 'real name',
    'father', 'mother', 'parent', 'brother', 'sister',
    'father of', 'mother of', 'son of', 'daughter of',
    'spoiler', 'major spoiler',
  ],
  BLUR_STRENGTH: '10px',
  NETFLIX_SKIP_DELAY_MS: 1000,
  MUTATION_OBSERVER_DEBOUNCE_MS: 300,
};

let state = {
  spoilerShieldEnabled: true,
  netflixAutoSkipEnabled: true,
  animeList: [],
  isNetflixPage: false,
  netflixObserverActive: false,
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize content script on page load
 */
document.addEventListener('DOMContentLoaded', initialize, { once: true });
if (document.readyState !== 'loading') {
  initialize();
}

/**
 * Main initialization function
 */
function initialize() {
  loadSettings();
  state.isNetflixPage = isNetflixURL();

  if (state.spoilerShieldEnabled) {
    initSpoilerShield();
  }

  if (state.netflixAutoSkipEnabled && state.isNetflixPage) {
    initNetflixAutoSkip();
  }

  // Listen for setting changes from popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.spoilerShield) {
      state.spoilerShieldEnabled = changes.spoilerShield.newValue;
    }
    if (changes.netflixAutoSkip) {
      state.netflixAutoSkipEnabled = changes.netflixAutoSkip.newValue;
    }
    if (changes.animeList) {
      state.animeList = changes.animeList.newValue || [];
    }
  });
}

/**
 * Load settings and anime list from chrome.storage
 */
function loadSettings() {
  chrome.storage.sync.get(
    ['spoilerShield', 'netflixAutoSkip', 'animeList'],
    (result) => {
      state.spoilerShieldEnabled =
        result.spoilerShield !== undefined ? result.spoilerShield : true;
      state.netflixAutoSkipEnabled =
        result.netflixAutoSkip !== undefined ? result.netflixAutoSkip : true;
      state.animeList = result.animeList || [];
    }
  );
}

// ============================================================================
// SPOILER SHIELD
// ============================================================================

/**
 * Initialize spoiler shield
 * Scans page for spoiler keywords and blurs matching elements
 */
function initSpoilerShield() {
  // Initial scan
  scanAndBlurSpoilers();

  // Re-scan on dynamic content changes
  const observer = new MutationObserver(
    debounce(() => {
      scanAndBlurSpoilers();
    }, CONFIG.MUTATION_OBSERVER_DEBOUNCE_MS)
  );

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false,
  });
}

/**
 * Scan page and blur elements containing spoiler keywords
 */
function scanAndBlurSpoilers() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const nodesToProcess = [];
  let node;

  // Collect all text nodes
  while ((node = walker.nextNode())) {
    nodesToProcess.push(node);
  }

  // Check each text node for spoiler keywords
  nodesToProcess.forEach((textNode) => {
    const text = textNode.textContent.toLowerCase();
    const parent = textNode.parentElement;

    // Skip if already blurred or in specific elements
    if (
      shouldSkipElement(parent) ||
      parent.classList.contains('spoiler-blurred')
    ) {
      return;
    }

    // Check if text contains spoiler keywords
    CONFIG.SPOILER_KEYWORDS.forEach((keyword) => {
      // Use word boundary to avoid partial matches
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');

      if (regex.test(text)) {
        applySpoilerBlur(parent);
      }
    });
  });
}

/**
 * Apply blur effect to an element
 */
function applySpoilerBlur(element) {
  if (element.classList.contains('spoiler-blurred')) {
    return;
  }

  element.classList.add('spoiler-blurred');
  element.style.filter = `blur(${CONFIG.BLUR_STRENGTH})`;
  element.style.cursor = 'pointer';
  element.style.opacity = '0.7';
  element.style.transition = 'all 0.3s ease';

  // Allow user to unblur by clicking
  element.addEventListener('click', (e) => {
    if (e.ctrlKey || e.shiftKey) {
      // Unblur on Ctrl+Click or Shift+Click
      removeSpoilerBlur(element);
      e.stopPropagation();
    }
  }, { once: false });

  // Add tooltip
  element.title = 'Ctrl+Click to unblur';
}

/**
 * Remove blur effect from an element
 */
function removeSpoilerBlur(element) {
  element.classList.remove('spoiler-blurred');
  element.style.filter = '';
  element.style.opacity = '';
  element.title = '';
}

/**
 * Check if element should be skipped during spoiler scanning
 */
function shouldSkipElement(element) {
  if (!element) return true;

  // Skip navigation, headers, script tags
  const tagName = element.tagName.toLowerCase();
  if (['nav', 'header', 'script', 'style', 'noscript'].includes(tagName)) {
    return true;
  }

  // Skip extension's own elements
  if (element.id && element.id.startsWith('anime-tracker')) {
    return true;
  }

  // Skip already processed elements
  if (element.classList.contains('spoiler-blurred')) {
    return true;
  }

  return false;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// NETFLIX AUTO-SKIP
// ============================================================================

/**
 * Initialize Netflix auto-skip feature
 * Watches DOM for next episode/skip credits buttons and clicks them
 */
function initNetflixAutoSkip() {
  if (state.netflixObserverActive) {
    return;
  }

  state.netflixObserverActive = true;

  // Look for skip buttons immediately
  skipNextButton();

  // Watch for button changes
  const observer = new MutationObserver(
    debounce(() => {
      skipNextButton();
    }, CONFIG.MUTATION_OBSERVER_DEBOUNCE_MS)
  );

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: false,
  });
}

/**
 * Find and click skip button on Netflix
 */
function skipNextButton() {
  // Common Netflix button selectors
  const buttonSelectors = [
    'button[aria-label*="Skip"]',
    'button[aria-label*="Next"]',
    'button:contains("Skip Intro")',
    'button:contains("Skip Credits")',
    'button:contains("Next Episode")',
    '[data-testid*="skip"]',
    '[data-testid*="next"]',
  ];

  // More flexible search by button text content
  const buttons = document.querySelectorAll('button');

  for (const button of buttons) {
    const text = button.textContent.toLowerCase();
    const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();

    // Check for skip or next episode buttons
    if (
      (text.includes('skip') || ariaLabel.includes('skip') ||
       text.includes('next episode') || ariaLabel.includes('next episode')) &&
      isButtonVisible(button)
    ) {
      scheduleButtonClick(button, text);
      return; // Only click one button at a time
    }
  }
}

/**
 * Check if button is visible on screen
 */
function isButtonVisible(element) {
  const style = window.getComputedStyle(element);

  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

/**
 * Schedule button click with delay for better UX
 */
let pendingClickTimer = null;

function scheduleButtonClick(button, buttonText) {
  // Clear any pending click
  if (pendingClickTimer) {
    clearTimeout(pendingClickTimer);
  }

  // Schedule new click
  pendingClickTimer = setTimeout(() => {
    if (isButtonVisible(button)) {
      // Simulate user interaction
      button.focus();
      button.click();

      // Log click (optional, for debugging)
      console.log(`[Anime Tracker] Auto-clicked Netflix button: ${buttonText}`);
    }
    pendingClickTimer = null;
  }, CONFIG.NETFLIX_SKIP_DELAY_MS);
}

/**
 * Check if current page is Netflix
 */
function isNetflixURL() {
  return (
    window.location.hostname.includes('netflix.com') ||
    window.location.hostname.includes('netflix.co')
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce function to prevent excessive calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Inject styles for spoiler blur effect
 */
function injectStyles() {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'anime-tracker-styles';
  styleSheet.textContent = `
    .spoiler-blurred {
      filter: blur(10px) !important;
      transition: filter 0.3s ease, opacity 0.3s ease !important;
    }

    .spoiler-blurred:hover {
      opacity: 0.8 !important;
    }

    .spoiler-blurred:active {
      filter: blur(2px) !important;
    }
  `;

  document.head.appendChild(styleSheet);
}

// Inject styles on script load
injectStyles();

// ============================================================================
// DEBUG HELPERS (for development)
// ============================================================================

/**
 * Debug function to test spoiler detection
 * Usage: testSpoilerDetection() in console
 */
window.testSpoilerDetection = () => {
  console.log('[Anime Tracker Debug]');
  console.log('Spoiler Shield Enabled:', state.spoilerShieldEnabled);
  console.log('Netflix Auto-Skip Enabled:', state.netflixAutoSkipEnabled);
  console.log('Is Netflix Page:', state.isNetflixPage);
  console.log('Anime List:', state.animeList);
  console.log('Blurred Elements:', document.querySelectorAll('.spoiler-blurred').length);
};

/**
 * Debug function to test Netflix skip
 * Usage: testNetflixSkip() in console
 */
window.testNetflixSkip = () => {
  console.log('[Anime Tracker Debug] Testing Netflix skip...');
  skipNextButton();
};
