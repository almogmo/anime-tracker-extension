/**
 * Background Service Worker for Anime Fans Tracker
 * Handles any background tasks and event listening
 */

// Initialize storage with default values on extension install.
// NOTE: animeList lives in chrome.storage.local (entries carry screenshot
// thumbnails that exceed chrome.storage.sync's 8KB/item limit). Settings stay
// in chrome.storage.sync so they can roam across devices and content.js can read them.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['animeList'], (result) => {
    if (!result.animeList) {
      chrome.storage.local.set({ animeList: [] });
    }
  });

  chrome.storage.sync.get(['spoilerShield', 'netflixAutoSkip'], (result) => {
    if (result.spoilerShield === undefined) {
      chrome.storage.sync.set({ spoilerShield: true });
    }
    if (result.netflixAutoSkip === undefined) {
      chrome.storage.sync.set({ netflixAutoSkip: true });
    }
  });
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
    chrome.storage.local.get(['animeList'], (result) => {
      sendResponse({ animeList: result.animeList || [] });
    });
    return true; // Keep channel open for async response
  }
});
