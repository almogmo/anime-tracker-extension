/**
 * Popup Script - Episode Tracker & Settings Management
 * Handles adding anime, tracking episodes, and managing feature settings.
 *
 * Storage strategy:
 *   - animeList  -> chrome.storage.local  (entries include screenshot thumbnails;
 *                   chrome.storage.sync has an 8KB/item limit that screenshots blow past)
 *   - settings   -> chrome.storage.sync   (tiny; nice to sync across devices, and
 *                   content.js reads them from sync)
 */

console.log('[DEBUG] popup.js loaded');

// Thumbnail sizing: keep each stored screenshot small so local storage doesn't fill up.
const THUMB_MAX_WIDTH = 320;
const THUMB_JPEG_QUALITY = 0.7;

// Wait for DOM to be fully ready before wiring anything up.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}

/**
 * Main initialization: grab DOM refs, attach listeners, load data.
 */
function initializePopup() {
  console.log('[DEBUG] initializePopup called');

  const form = document.getElementById('animeForm');
  const spoilerShieldToggle = document.getElementById('spoilerShield');
  const netflixAutoSkipToggle = document.getElementById('netflixAutoSkip');

  if (!form) {
    console.error('[ERROR] Form element not found!');
    return;
  }

  // Add anime on submit (button is type="submit").
  form.addEventListener('submit', handleAddAnime);

  // Settings toggles (stored in sync so content.js can read them).
  if (spoilerShieldToggle) {
    spoilerShieldToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ spoilerShield: spoilerShieldToggle.checked });
    });
  }
  if (netflixAutoSkipToggle) {
    netflixAutoSkipToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ netflixAutoSkip: netflixAutoSkipToggle.checked });
    });
  }

  loadAnimeList();
  loadSettings();

  console.log('[DEBUG] Popup initialization complete');
}

/**
 * Handle the "Add Anime" form submission.
 * Auto-captures the active tab's URL + a thumbnail screenshot, then saves.
 */
async function handleAddAnime(e) {
  e.preventDefault();
  console.log('[DEBUG] Form submit triggered');

  const titleInput = document.getElementById('animeTitle');
  const episodeInput = document.getElementById('currentEpisode');

  const title = titleInput.value.trim();
  const episode = parseInt(episodeInput.value.trim(), 10);

  // Validate.
  if (!title) {
    alert('Please enter anime title');
    return;
  }
  if (!episode || episode < 1 || isNaN(episode)) {
    alert('Please enter a valid episode number (1 or higher)');
    return;
  }

  // Look up the active tab for URL + screenshot.
  const tab = await getActiveTab();

  const newAnime = {
    id: Date.now(),
    title,
    episode,
    url: tab ? tab.url : null,
    imagePreview: null,
    addedDate: new Date().toLocaleDateString(),
  };

  // Capture a downscaled thumbnail (best-effort — never blocks the save).
  if (tab) {
    try {
      newAnime.imagePreview = await captureThumbnail(tab.windowId);
      console.log('[DEBUG] Thumbnail captured:', !!newAnime.imagePreview);
    } catch (err) {
      console.log('[DEBUG] Thumbnail capture skipped:', err.message);
    }
  }

  saveAnimeToStorage(newAnime);
}

/**
 * Promise wrapper around chrome.tabs.query for the active tab.
 */
function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

/**
 * Capture the visible tab and downscale it to a small JPEG thumbnail.
 * Returns a data URL, or null if capture isn't possible (e.g. chrome:// pages).
 */
function captureThumbnail(windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        reject(new Error(chrome.runtime.lastError?.message || 'capture failed'));
        return;
      }

      // Downscale via canvas to keep storage small.
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, THUMB_MAX_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error('thumbnail decode failed'));
      img.src = dataUrl;
    });
  });
}

/**
 * Persist a new anime to local storage, then refresh the UI.
 */
function saveAnimeToStorage(newAnime) {
  chrome.storage.local.get(['animeList'], (result) => {
    const animeList = result.animeList || [];
    animeList.push(newAnime);

    chrome.storage.local.set({ animeList }, () => {
      if (chrome.runtime.lastError) {
        console.error('[ERROR] Failed to save anime:', chrome.runtime.lastError.message);
        alert('Could not save: ' + chrome.runtime.lastError.message);
        return;
      }

      console.log('[DEBUG] Anime saved');

      // Reset the form.
      const form = document.getElementById('animeForm');
      const titleInput = document.getElementById('animeTitle');
      form.reset();
      titleInput.focus();

      // Success animation on the button.
      const btn = form.querySelector('.btn-add');
      let originalText = '';
      if (btn) {
        originalText = btn.textContent;
        btn.textContent = '✓ Saved!';
        btn.style.background = 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
        }, 1500);
      }

      // Refresh the list immediately.
      loadAnimeList();
    });
  });
}

/**
 * Load and render the anime list from local storage.
 */
function loadAnimeList() {
  const container = document.getElementById('animeListContainer');
  if (!container) {
    console.error('[ERROR] animeListContainer not found');
    return;
  }

  chrome.storage.local.get(['animeList'], (result) => {
    const animeList = result.animeList || [];
    console.log('[DEBUG] Loaded anime list, count:', animeList.length);

    if (animeList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"></div>
          <p>No anime tracked yet. Add one above!</p>
        </div>
      `;
      return;
    }

    // Newest first.
    const sorted = [...animeList].sort((a, b) => b.id - a.id);
    container.innerHTML = sorted.map(createAnimeItemHTML).join('');

    // Wire up per-item buttons.
    sorted.forEach((anime) => {
      const updateBtn = document.getElementById(`update-${anime.id}`);
      const deleteBtn = document.getElementById(`delete-${anime.id}`);
      const epInput = document.getElementById(`episode-${anime.id}`);

      if (updateBtn) {
        updateBtn.addEventListener('click', () => updateEpisode(anime.id, epInput.value));
      }
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteAnime(anime.id));
      }
      if (epInput) {
        epInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') updateEpisode(anime.id, epInput.value);
        });
      }
    });
  });
}

/**
 * Build the HTML for a single anime entry.
 */
function createAnimeItemHTML(anime) {
  const previewHtml = anime.imagePreview
    ? `<img src="${anime.imagePreview}" alt="" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 8px; max-height: 80px; object-fit: cover;">`
    : '';

  const linkHtml = anime.url
    ? `<p style="margin-top: 4px;"><a href="${escapeHTML(anime.url)}" target="_blank" style="color: #00d4ff; text-decoration: none; font-size: 11px; word-break: break-all;">Open link →</a></p>`
    : '';

  return `
    <div class="anime-item">
      <div class="anime-info" style="flex: 1;">
        ${previewHtml}
        <h3>${escapeHTML(anime.title)}</h3>
        <p>Ep: <span id="ep-display-${anime.id}">${anime.episode}</span></p>
        ${linkHtml}
      </div>
      <div class="anime-actions" style="flex-direction: column; gap: 6px;">
        <input
          type="number"
          id="episode-${anime.id}"
          value="${anime.episode}"
          min="1"
          style="width: 50px; padding: 4px; font-size: 11px; background: #0d0d1f; border: 1px solid #333; color: #e0e0e0; border-radius: 4px; text-align: center;"
        >
        <button id="update-${anime.id}" class="btn-small">Update</button>
        <button id="delete-${anime.id}" class="btn-small btn-delete">Delete</button>
      </div>
    </div>
  `;
}

/**
 * Update the episode number for an anime.
 */
function updateEpisode(animeId, newEpisode) {
  const episode = parseInt(newEpisode, 10);
  if (!episode || episode < 1 || isNaN(episode)) {
    alert('Episode number must be at least 1');
    return;
  }

  chrome.storage.local.get(['animeList'], (result) => {
    const animeList = result.animeList || [];
    const idx = animeList.findIndex((a) => a.id === animeId);
    if (idx === -1) return;

    animeList[idx].episode = episode;
    chrome.storage.local.set({ animeList }, () => {
      loadAnimeList();
    });
  });
}

/**
 * Delete an anime from the list.
 */
function deleteAnime(animeId) {
  chrome.storage.local.get(['animeList'], (result) => {
    const animeList = (result.animeList || []).filter((a) => a.id !== animeId);
    chrome.storage.local.set({ animeList }, () => {
      loadAnimeList();
    });
  });
}

/**
 * Load feature toggle states from sync storage.
 */
function loadSettings() {
  chrome.storage.sync.get(['spoilerShield', 'netflixAutoSkip'], (result) => {
    const spoilerShieldToggle = document.getElementById('spoilerShield');
    const netflixAutoSkipToggle = document.getElementById('netflixAutoSkip');

    if (spoilerShieldToggle) {
      spoilerShieldToggle.checked = result.spoilerShield !== false;
    }
    if (netflixAutoSkipToggle) {
      netflixAutoSkipToggle.checked = result.netflixAutoSkip !== false;
    }
  });
}

/**
 * Escape HTML to prevent injection from titles/URLs.
 */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
