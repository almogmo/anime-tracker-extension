/**
 * Popup Script - Episode Tracker & Settings Management
 * Handles adding anime, tracking episodes, and managing feature settings
 */

console.log('[DEBUG] popup.js loaded');

// Wait for DOM to be fully ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  // DOM already loaded
  initializePopup();
}

/**
 * Main initialization function
 */
function initializePopup() {
  console.log('[DEBUG] initializePopup called');

  // Get DOM elements
  const form = document.getElementById('animeForm');
  const titleInput = document.getElementById('animeTitle');
  const episodeInput = document.getElementById('currentEpisode');
  const urlPreviewGroup = document.getElementById('urlPreviewGroup');
  const urlPreview = document.getElementById('urlPreview');
  const animeListContainer = document.getElementById('animeListContainer');
  const spoilerShieldToggle = document.getElementById('spoilerShield');
  const netflixAutoSkipToggle = document.getElementById('netflixAutoSkip');

  // Debug: Log what we found
  console.log('[DEBUG] Form element:', form);
  console.log('[DEBUG] Title input:', titleInput);
  console.log('[DEBUG] Episode input:', episodeInput);
  console.log('[DEBUG] Anime list container:', animeListContainer);

  if (!form) {
    console.error('[ERROR] Form element not found!');
    return;
  }

  // Attach form submit listener
  form.addEventListener('submit', (e) => {
    console.log('[DEBUG] Form submit event triggered');
    e.preventDefault();

    const title = titleInput.value.trim();
    const episodeValue = episodeInput.value.trim();
    const episode = parseInt(episodeValue, 10);

    console.log('[DEBUG] Form values - Title:', title, 'Episode:', episode);

    // Validate
    if (!title) {
      alert('Please enter anime title');
      return;
    }

    if (!episodeValue || episode < 1 || isNaN(episode)) {
      alert('Please enter valid episode number (must be 1 or higher)');
      return;
    }

    // Auto-capture current tab URL and screenshot
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        alert('Could not access current tab');
        return;
      }

      const currentUrl = tabs[0].url;
      const currentWindowId = tabs[0].windowId;

      console.log('[DEBUG] Auto-captured URL:', currentUrl);

      // Create new anime object with captured URL
      const newAnime = {
        id: Date.now(),
        title: title,
        episode: episode,
        url: currentUrl,
        imagePreview: null, // Will be set after screenshot
        addedDate: new Date().toLocaleDateString(),
      };

      console.log('[DEBUG] New anime object:', newAnime);

      // Capture screenshot
      chrome.tabs.captureVisibleTab(currentWindowId, { format: 'png' }, (screenshotUrl) => {
        if (screenshotUrl) {
          newAnime.imagePreview = screenshotUrl;
          console.log('[DEBUG] Screenshot captured');
        } else {
          console.log('[DEBUG] Screenshot capture failed, continuing without preview');
        }
        saveAnimeToStorage(newAnime);
      });
    });
  });
}

/**
 * Save anime to storage
 */
function saveAnimeToStorage(newAnime) {
    // Get existing list from storage
    chrome.storage.sync.get(['animeList'], (result) => {
      console.log('[DEBUG] Current storage result:', result);

      const animeList = result.animeList || [];
      console.log('[DEBUG] Current anime list:', animeList);

      // Add new anime
      animeList.push(newAnime);
      console.log('[DEBUG] Updated anime list:', animeList);

      // Save to storage
      chrome.storage.sync.set({ animeList: animeList }, () => {
        console.log('[DEBUG] Anime saved to storage');

        // Reset form
        form.reset();
        titleInput.focus();

        // Show success animation
        const btn = form.querySelector('.btn-add');
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = '✓ Added!';
          btn.style.background = 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)';
        }

        // Reload list display with small delay to ensure storage is updated
        setTimeout(() => {
          console.log('[DEBUG] Calling loadAnimeList after save');
          loadAnimeList();

          if (btn) {
            btn.textContent = originalText;
            btn.style.background = '';
          }
        }, 300);
      });
    });
  });

  // Attach settings toggle listeners
  if (spoilerShieldToggle) {
    spoilerShieldToggle.addEventListener('change', () => {
      console.log('[DEBUG] Spoiler shield toggled:', spoilerShieldToggle.checked);
      chrome.storage.sync.set({ spoilerShield: spoilerShieldToggle.checked });
    });
  }

  if (netflixAutoSkipToggle) {
    netflixAutoSkipToggle.addEventListener('change', () => {
      console.log('[DEBUG] Netflix auto-skip toggled:', netflixAutoSkipToggle.checked);
      chrome.storage.sync.set({ netflixAutoSkip: netflixAutoSkipToggle.checked });
    });
  }


  // Load initial data
  loadAnimeList();
  loadSettings();

  console.log('[DEBUG] Popup initialization complete');
}

/**
 * Load and display anime list from storage
 */
function loadAnimeList() {
  console.log('[DEBUG] loadAnimeList called');

  const animeListContainer = document.getElementById('animeListContainer');

  if (!animeListContainer) {
    console.error('[ERROR] animeListContainer not found - DOM element missing!');
    console.log('[ERROR] All IDs on page:', document.querySelectorAll('[id]').length);
    return;
  }

  console.log('[DEBUG] animeListContainer found, clearing and reloading...');

  chrome.storage.sync.get(['animeList'], (result) => {
    const animeList = result.animeList || [];
    console.log('[DEBUG] Loaded anime list:', animeList);

    if (animeList.length === 0) {
      animeListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✨</div>
          <p>No anime tracked yet. Add one above!</p>
        </div>
      `;
      return;
    }

    // Render anime list
    animeListContainer.innerHTML = animeList
      .map((anime) => createAnimeItemHTML(anime))
      .join('');

    // Attach event listeners to action buttons
    animeList.forEach((anime) => {
      const updateBtn = document.getElementById(`update-${anime.id}`);
      const deleteBtn = document.getElementById(`delete-${anime.id}`);
      const episodeInput = document.getElementById(`episode-${anime.id}`);

      if (updateBtn) {
        updateBtn.addEventListener('click', () => {
          console.log('[DEBUG] Update button clicked for anime:', anime.id);
          updateEpisode(anime.id, episodeInput.value);
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          console.log('[DEBUG] Delete button clicked for anime:', anime.id);
          deleteAnime(anime.id);
        });
      }

      if (episodeInput) {
        episodeInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            console.log('[DEBUG] Enter key pressed in episode input');
            updateEpisode(anime.id, episodeInput.value);
          }
        });
      }
    });
  });
}

/**
 * Generate HTML for a single anime item
 */
function createAnimeItemHTML(anime) {
  const previewHtml = anime.imagePreview
    ? `<img src="${anime.imagePreview}" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 8px; max-height: 80px; object-fit: cover;">`
    : '';

  const linkHtml = anime.url
    ? `<p style="margin-top: 4px;"><a href="${escapeHTML(anime.url)}" target="_blank" style="color: #00d4ff; text-decoration: none; font-size: 11px; word-break: break-all;">Link →</a></p>`
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
          class="anime-episode-input"
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
 * Update episode number for an anime
 */
function updateEpisode(animeId, newEpisode) {
  const episode = parseInt(newEpisode, 10);

  console.log('[DEBUG] updateEpisode called - ID:', animeId, 'Episode:', episode);

  if (episode < 1 || isNaN(episode)) {
    alert('Episode number must be at least 1');
    return;
  }

  chrome.storage.sync.get(['animeList'], (result) => {
    const animeList = result.animeList || [];
    const animeIndex = animeList.findIndex((a) => a.id === animeId);

    console.log('[DEBUG] Found anime at index:', animeIndex);

    if (animeIndex !== -1) {
      animeList[animeIndex].episode = episode;
      chrome.storage.sync.set({ animeList }, () => {
        console.log('[DEBUG] Episode updated and saved');
        loadAnimeList();

        const displayElement = document.getElementById(`ep-display-${animeId}`);
        if (displayElement) {
          displayElement.style.color = '#00d4ff';
          setTimeout(() => {
            displayElement.style.color = '';
          }, 500);
        }
      });
    }
  });
}

/**
 * Delete an anime from the list
 */
function deleteAnime(animeId) {
  console.log('[DEBUG] deleteAnime called - ID:', animeId);

  chrome.storage.sync.get(['animeList'], (result) => {
    const animeList = result.animeList || [];
    const updatedList = animeList.filter((a) => a.id !== animeId);

    console.log('[DEBUG] Anime deleted, new list length:', updatedList.length);

    chrome.storage.sync.set({ animeList: updatedList }, () => {
      console.log('[DEBUG] Deleted anime saved');
      loadAnimeList();
    });
  });
}

/**
 * Load feature settings from storage
 */
function loadSettings() {
  console.log('[DEBUG] loadSettings called');

  chrome.storage.sync.get(['spoilerShield', 'netflixAutoSkip'], (result) => {
    console.log('[DEBUG] Loaded settings:', result);

    const spoilerShieldToggle = document.getElementById('spoilerShield');
    const netflixAutoSkipToggle = document.getElementById('netflixAutoSkip');

    if (spoilerShieldToggle) {
      spoilerShieldToggle.checked =
        result.spoilerShield !== undefined ? result.spoilerShield : true;
    }

    if (netflixAutoSkipToggle) {
      netflixAutoSkipToggle.checked =
        result.netflixAutoSkip !== undefined ? result.netflixAutoSkip : true;
    }
  });
}

/**
 * Utility: Escape HTML to prevent XSS
 */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('[DEBUG] popup.js initialization code executed');
