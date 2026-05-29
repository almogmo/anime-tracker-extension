/**
 * Popup Script - Episode Tracker & Settings Management
 * Handles adding anime, tracking episodes, and managing feature settings.
 *
 * Storage strategy:
 *   - animeList  -> chrome.storage.local  (kept local for headroom/consistency)
 *   - settings   -> chrome.storage.sync   (tiny; nice to sync across devices, and
 *                   content.js reads them from sync)
 */

console.log('[DEBUG] popup.js loaded');

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
  const netflixAutoSkipToggle = document.getElementById('netflixAutoSkip');

  if (!form) {
    console.error('[ERROR] Form element not found!');
    return;
  }

  // Save anime on submit (button is type="submit").
  form.addEventListener('submit', handleAddAnime);

  // Settings toggle (stored in sync so content.js can read it).
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

  // Look up the active tab for its URL (no screenshot).
  const tab = await getActiveTab();
  const url = tab && tab.url ? tab.url : null;
  console.log('[DEBUG] Captured tab URL:', url);

  const newAnime = {
    id: Date.now(),
    title,
    episode,
    url,
    addedDate: new Date().toLocaleDateString(),
  };

  saveAnimeToStorage(newAnime);
}

/**
 * Find the active browser tab from the popup.
 *
 * From a popup, `currentWindow` can resolve to the popup itself and return no
 * tab, so we prefer `lastFocusedWindow` and fall back to a global active query.
 */
function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        resolve(tabs[0]);
        return;
      }
      // Fallback: any active tab in any normal window.
      chrome.tabs.query({ active: true }, (all) => {
        resolve(all && all[0] ? all[0] : null);
      });
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
  const linkHtml = anime.url
    ? `<p style="margin-top: 4px;"><a href="${escapeHTML(anime.url)}" target="_blank" style="color: #00d4ff; text-decoration: none; font-size: 11px; word-break: break-all;">Open link →</a></p>`
    : '';

  return `
    <div class="anime-item">
      <div class="anime-info" style="flex: 1;">
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
  chrome.storage.sync.get(['netflixAutoSkip'], (result) => {
    const netflixAutoSkipToggle = document.getElementById('netflixAutoSkip');
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
