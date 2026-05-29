/**
 * Background Service Worker for Anime Fans Tracker
 * Handles any background tasks and event listening
 */

// Initialize storage with default values on extension install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['animeList', 'spoilerShield', 'netflixAutoSkip'], (result) => {
    // Set defaults if not already set
    if (!result.animeList) {
      chrome.storage.sync.set({ animeList: [] });
    }
    if (result.spoilerShield === undefined) {
      chrome.storage.sync.set({ spoilerShield: true });
    }
    if (result.netflixAutoSkip === undefined) {
      chrome.storage.sync.set({ netflixAutoSkip: true });
    }
  });

  // Optional: Open welcome/info page on first install
  // chrome.tabs.create({ url: 'chrome-extension://' + chrome.runtime.id + '/popup.html' });
});

// Listen for storage changes to sync across extension components
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    // Notify all tabs about storage changes
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'STORAGE_UPDATED',
          changes,
        }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      });
    });
  }
});

// Handle any extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_ANIME_LIST') {
    chrome.storage.sync.get(['animeList'], (result) => {
      sendResponse({ animeList: result.animeList || [] });
    });
    return true; // Keep channel open for async response
  }
});
