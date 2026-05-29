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
  // Settings live in sync; the anime list lives in local (see popup.js).
  chrome.storage.sync.get(['spoilerShield', 'netflixAutoSkip'], (result) => {
    state.spoilerShieldEnabled =
      result.spoilerShield !== undefined ? result.spoilerShield : true;
    state.netflixAutoSkipEnabled =
      result.netflixAutoSkip !== undefined ? result.netflixAutoSkip : true;
  });

  chrome.storage.local.get(['animeList'], (result) => {
    state.animeList = result.animeList || [];
  });
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

  // Safety-net poll: the observer misses pure attribute toggles (e.g. the
  // seamless "next episode" countdown), so also check on a 1s interval.
  setInterval(() => {
    if (state.netflixAutoSkipEnabled) {
      skipNextButton();
    }
  }, 1000);
}

// Netflix's stable, language-independent button identifiers (data-uia).
// These are the most reliable way to find skip/next controls.
const NETFLIX_UIA_SELECTORS = [
  '[data-uia="player-skip-intro"]',
  '[data-uia="player-skip-recap"]',
  '[data-uia="next-episode-seamless-button"]',
  '[data-uia="next-episode-seamless-button-draining"]',
  '[data-uia*="skip"]',
  '[data-uia*="next-episode"]',
];

// Fallback text/aria keywords — multilingual (English + Hebrew) so it works
// regardless of the user's Netflix language setting.
const NETFLIX_TEXT_KEYWORDS = [
  'skip intro',
  'skip recap',
  'skip credits',
  'skip',
  'next episode',
  'דלג', // "skip" (Hebrew)
  'הפרק הבא', // "next episode" (Hebrew)
  'הבא', // "next" (Hebrew)
];

/**
 * Find and click a Netflix skip / next-episode button.
 */
function skipNextButton() {
  // 1) Try the reliable data-uia selectors first.
  for (const selector of NETFLIX_UIA_SELECTORS) {
    const el = document.querySelector(selector);
    if (el && isButtonVisible(el)) {
      scheduleButtonClick(el, selector);
      return;
    }
  }

  // 2) Fall back to scanning buttons by text / aria-label (multilingual).
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (const button of buttons) {
    const text = (button.textContent || '').toLowerCase();
    const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
    const haystack = text + ' ' + ariaLabel;

    if (
      NETFLIX_TEXT_KEYWORDS.some((kw) => haystack.includes(kw)) &&
      isButtonVisible(button)
    ) {
      scheduleButtonClick(button, haystack.trim().slice(0, 40));
      return; // Only click one button at a time
    }
  }
}

/**
 * Check if an element is actually rendered/clickable.
 * Intentionally lenient — Netflix controls sit flush against screen edges,
 * so we do NOT require the element to be fully inside the viewport.
 */
function isButtonVisible(element) {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  // offsetParent is null for display:none / detached; size > 0 means it's laid out.
  return element.offsetWidth > 0 && element.offsetHeight > 0;
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
  // Don't double-inject if the script re-runs.
  if (document.getElementById('anime-tracker-styles')) {
    return;
  }

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

  // This script runs at document_start, so <head> may not exist yet.
  // Fall back to <html> (documentElement), which is always present —
  // a <style> there is honored by the browser just the same.
  const target = document.head || document.documentElement;
  target.appendChild(styleSheet);
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
