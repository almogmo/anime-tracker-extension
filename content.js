/**
 * Content Script - Netflix Auto-Skip
 * Runs on web pages; on Netflix it auto-clicks "Skip Intro" / "Skip Recap" /
 * "Next Episode" controls so playback continues seamlessly.
 */

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================

const CONFIG = {
  NETFLIX_SKIP_DELAY_MS: 1000,        // wait before auto-clicking a found button
  MUTATION_OBSERVER_DEBOUNCE_MS: 250, // coalesce rapid DOM mutations
  POLL_INTERVAL_MS: 1000,             // safety-net poll for attribute-only changes
};

const state = {
  netflixAutoSkipEnabled: true,
  isNetflixPage: false,
  netflixInitialized: false,
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Visible proof the script is running — appears in the page DevTools console
// (the console is shared across worlds, even though JS globals are isolated).
console.log('[Anime Tracker] content script active on', location.href);

document.addEventListener('DOMContentLoaded', initialize, { once: true });
if (document.readyState !== 'loading') {
  initialize();
}

function initialize() {
  state.isNetflixPage = isNetflixURL();
  loadSettings();

  // React to setting changes from the popup.
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.netflixAutoSkip) {
      state.netflixAutoSkipEnabled = changes.netflixAutoSkip.newValue !== false;
      if (state.netflixAutoSkipEnabled && state.isNetflixPage) {
        initNetflixAutoSkip();
      }
    }
  });
}

/**
 * Load feature settings from sync storage, then start Netflix auto-skip if on.
 */
function loadSettings() {
  chrome.storage.sync.get(['netflixAutoSkip'], (result) => {
    state.netflixAutoSkipEnabled = result.netflixAutoSkip !== false;
    if (state.netflixAutoSkipEnabled && state.isNetflixPage) {
      initNetflixAutoSkip();
    }
  });
}

// ============================================================================
// NETFLIX AUTO-SKIP
// ============================================================================

// Netflix's stable, language-independent button identifiers (data-uia).
// These work in EVERY UI language with no translation — Netflix keeps these
// attributes identical regardless of the user's language.
const NETFLIX_UIA_SELECTORS = [
  '[data-uia="player-skip-intro"]',
  '[data-uia="player-skip-recap"]',
  '[data-uia="player-skip-preplay"]',
  '[data-uia="next-episode-seamless-button"]',
  '[data-uia="next-episode-seamless-button-draining"]',
  '[data-uia*="skip"]',
  '[data-uia*="next-episode"]',
];

// Fallback text/aria keywords for "skip" and "next" across ~15 languages.
// The safety net that makes it "work in every language" without an external
// translation API. All lowercase for case-insensitive matching.
const NETFLIX_TEXT_KEYWORDS = [
  'skip', 'next episode', 'play next',               // English
  'דלג', 'הפרק הבא', 'הבא',                            // Hebrew
  'omitir', 'saltar', 'siguiente episodio',          // Spanish
  'passer', 'ignorer', 'épisode suivant',            // French
  'überspringen', 'nächste folge',                   // German
  'salta', 'prossimo episodio',                      // Italian
  'pular', 'ignorar', 'próximo episódio',            // Portuguese
  'overslaan', 'volgende aflevering',                // Dutch
  'пропустить', 'следующий эпизод',                  // Russian
  'atla', 'sonraki bölüm',                           // Turkish
  'pomiń', 'następny odcinek',                       // Polish
  'تخطي', 'الحلقة التالية',                            // Arabic
  'スキップ', '次のエピソード',                          // Japanese
  '건너뛰기', '다음 회',                                // Korean
  '跳过', '下一集',                                    // Chinese (Simplified)
];

/**
 * Start watching for Netflix skip / next-episode controls.
 */
function initNetflixAutoSkip() {
  if (state.netflixInitialized) {
    return;
  }
  state.netflixInitialized = true;

  // Visible confirmation that the script is live on this page.
  showBadge('⏭ Auto-Skip active');

  // Check immediately.
  skipNextButton();

  // Watch the DOM for new controls.
  const observer = new MutationObserver(
    debounce(skipNextButton, CONFIG.MUTATION_OBSERVER_DEBOUNCE_MS)
  );
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  // Safety-net poll: the observer misses pure attribute toggles (e.g. the
  // seamless "next episode" countdown), so also check on an interval.
  setInterval(() => {
    if (state.netflixAutoSkipEnabled) {
      skipNextButton();
    }
  }, CONFIG.POLL_INTERVAL_MS);
}

/**
 * Find a Netflix skip / next-episode button and schedule a click.
 */
function skipNextButton() {
  if (!state.netflixAutoSkipEnabled) {
    return;
  }

  // 1) Reliable, language-independent data-uia selectors first.
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

    if (NETFLIX_TEXT_KEYWORDS.some((kw) => haystack.includes(kw)) && isButtonVisible(button)) {
      scheduleButtonClick(button, haystack.trim().slice(0, 40));
      return; // one button at a time
    }
  }
}

/**
 * Lenient visibility check — Netflix controls sit flush against screen edges,
 * so we only require the element to be rendered, not fully inside the viewport.
 */
function isButtonVisible(element) {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  return element.offsetWidth > 0 && element.offsetHeight > 0;
}

// Track the pending click so the 1s poll doesn't perpetually cancel it.
let pendingClickTimer = null;
let pendingButton = null;

/**
 * Click the button after a short delay. If a click for the SAME button is
 * already scheduled, leave it alone — otherwise the recurring poll would reset
 * the timer every tick and the click would never fire.
 */
function scheduleButtonClick(button, label) {
  if (pendingClickTimer && pendingButton === button) {
    return; // already scheduled for this button — let it fire
  }
  if (pendingClickTimer) {
    clearTimeout(pendingClickTimer);
  }

  pendingButton = button;
  pendingClickTimer = setTimeout(() => {
    pendingClickTimer = null;
    pendingButton = null;
    if (isButtonVisible(button)) {
      realisticClick(button);
      showBadge('⏭ Skipped');
      console.log('[Anime Tracker] Auto-clicked Netflix control:', label);
    }
  }, CONFIG.NETFLIX_SKIP_DELAY_MS);
}

/**
 * Show a small on-screen badge so the user can SEE the script is working
 * without opening DevTools. Re-parents to the fullscreen element when the
 * player is fullscreen (otherwise a body-level element wouldn't render).
 */
let badgeEl = null;
let badgeTimer = null;
function showBadge(text) {
  const parent = document.fullscreenElement || document.body;
  if (!parent) return;

  if (!badgeEl) {
    badgeEl = document.createElement('div');
    Object.assign(badgeEl.style, {
      position: 'fixed',
      left: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      padding: '8px 14px',
      borderRadius: '10px',
      font: '700 13px/1.2 system-ui, -apple-system, sans-serif',
      color: '#fff',
      background: 'linear-gradient(180deg, #f7864f 0%, #e24e7b 100%)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.35s ease',
    });
  }

  // Keep it inside whichever element is fullscreen (or body).
  if (badgeEl.parentElement !== parent) {
    parent.appendChild(badgeEl);
  }

  badgeEl.textContent = text;
  badgeEl.style.opacity = '1';
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    if (badgeEl) badgeEl.style.opacity = '0';
  }, 2500);
}

/**
 * Click an element the way a real user would. Netflix's controls often ignore
 * a bare element.click(), so dispatch a full pointer + mouse event sequence
 * (with a real click on coordinates) before falling back to .click().
 */
function realisticClick(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const base = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 };

  try {
    el.dispatchEvent(new PointerEvent('pointerover', base));
    el.dispatchEvent(new PointerEvent('pointerenter', base));
    el.dispatchEvent(new PointerEvent('pointerdown', base));
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.focus({ preventScroll: true });
    el.dispatchEvent(new PointerEvent('pointerup', base));
    el.dispatchEvent(new MouseEvent('mouseup', base));
    el.dispatchEvent(new MouseEvent('click', base));
  } catch (e) {
    // Some environments can't construct PointerEvent — fall through.
  }

  // Final fallback — harmless if the dispatched click already registered.
  if (typeof el.click === 'function') {
    el.click();
  }
}

/**
 * Is the current page Netflix?
 */
function isNetflixURL() {
  return (
    window.location.hostname.includes('netflix.com') ||
    window.location.hostname.includes('netflix.co')
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Debug helper — run testNetflixSkip() in the page console.
window.testNetflixSkip = () => {
  console.log('[Anime Tracker] netflixAutoSkip:', state.netflixAutoSkipEnabled,
    '| isNetflixPage:', state.isNetflixPage);
  skipNextButton();
};
