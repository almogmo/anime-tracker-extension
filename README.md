# 🎌 Anime Fans Tracker

A lightweight Chrome Extension (Manifest V3) for anime watchers: track the episode you're on, and let Netflix skip intros and roll into the next episode automatically — in any language.

## Features

### 📺 Episode Tracker
- **Save & Track**: Keep the current episode for every anime you're watching
- **Auto-Saved Link**: The link to the page you're on is captured automatically, so you can jump right back to where you left off
- **Quick Updates**: Change the episode number directly from the popup
- **Local Storage**: Everything is stored on your device (`chrome.storage.local`) — no account, no tracking

### ⏭️ Netflix Auto-Skip
- **Skip the intro/recap**: Auto-clicks "Skip Intro" / "Skip Recap" at the start of an episode
- **Seamless next episode**: Advances to the next episode only when the end credits roll — never from 0:00
- **Works in every language**: Uses Netflix's built-in button identifiers (`data-uia`), not on-screen text, with a multilingual text fallback for the skip button
- **No refresh needed**: Keeps working across episodes through Netflix's in-app navigation
- **On-screen badge**: A small "⏭ Auto-Skip active" badge confirms it's running; it flashes "⏭ Skipped" on each auto-click
- **Toggle**: Turn it on/off from the popup

## Installation

1. **Download/Clone** this extension folder to your computer
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the extension folder
5. The extension is now active! Click the extension icon in your toolbar to open the popup

## Usage

### Adding Anime
1. Click the extension icon
2. Enter the anime title (e.g., "Jujutsu Kaisen")
3. Enter your current episode number
4. Click **+ Add Anime**
5. Your anime appears in the list below

### Updating Episodes
1. Find the anime in your list
2. Change the episode number in the input field
3. Click **Update** or press Enter
4. The episode updates instantly

### Managing Settings
- **Anti-Spoiler Shield**: Toggle to enable/disable spoiler detection
- **Netflix Auto-Skip**: Toggle to enable/disable auto-skip on Netflix

### Unblurring Spoilers
- If a spoiler is blurred and you want to see it:
  - Hold **Ctrl** (or **Cmd** on Mac) and **Click** the blurred text
  - The blur will be removed for that element

## File Structure

```
anime-tracker-extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── popup.html             # Popup UI (dark anime theme)
├── popup.js               # Popup logic & storage management
├── content.js             # Spoiler shield & Netflix auto-skip
├── background.js          # Service worker for background tasks
├── README.md              # This file
└── images/                # Icon files (16x16, 48x48, 128x128)
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Code Architecture

### Storage Schema
```javascript
{
  animeList: [
    {
      id: 1234567890,          // Timestamp ID
      title: "Jujutsu Kaisen",
      episode: 5,
      addedDate: "5/29/2026"
    }
  ],
  spoilerShield: true,         // Feature toggle
  netflixAutoSkip: true        // Feature toggle
}
```

### Content Script Flow
1. **Initialization**: Load settings and anime list from storage
2. **Spoiler Shield**: 
   - Scans all text nodes for spoiler keywords
   - Applies CSS blur filter to matching elements
   - Monitors DOM changes with MutationObserver
3. **Netflix Auto-Skip**:
   - Searches for skip/next buttons
   - Uses visibility check before clicking
   - Implements 1-second delay for UX

### Popup Script Flow
1. **Load**: Fetch anime list and settings from storage
2. **Add**: Create new anime object and save to storage
3. **Update**: Modify episode number and refresh display
4. **Delete**: Remove anime from list
5. **Settings**: Toggle features and auto-save

## Performance Optimizations

- **Debounced Scanning**: Spoiler scan debounces to 300ms to avoid excessive DOM traversals
- **TreeWalker**: Efficient text node traversal using native TreeWalker API
- **Early Exit**: Skips elements that are already processed or in protected areas
- **Delegated Listeners**: Event listeners use delegation to handle dynamic content
- **Lazy Initialization**: Netflix auto-skip only initializes on Netflix domains

## Browser Compatibility

- **Chrome**: 88+
- **Edge**: 88+ (based on Chromium)
- **Brave**: 1.0+
- **Opera**: 74+

Any browser supporting Manifest V3.

## Security & Privacy

- ✅ No external API calls
- ✅ All data stored locally in Chrome sync storage
- ✅ No tracking or analytics
- ✅ No content sent to third parties
- ✅ Runs only on pages you visit
- ✅ HTML escaped to prevent XSS

## Troubleshooting

### Spoiler Shield Not Working
- Ensure "Anti-Spoiler Shield" toggle is enabled
- Try refreshing the page
- Check console (F12) for errors using `testSpoilerDetection()`

### Netflix Auto-Skip Not Clicking
- Verify "Netflix Auto-Skip" toggle is enabled
- Ensure you're on netflix.com or netflix.co
- Netflix's UI may have changed; check console using `testNetflixSkip()`
- The button must be visible on screen to be clicked

### Settings Not Saving
- Check if you're logged into your Google account
- Go to `chrome://settings/syncSetup` to verify sync is enabled
- Try reloading the extension (chrome://extensions/)

### Debug Commands
Open the console (F12) on any page with the extension active:

```javascript
// Test spoiler detection
testSpoilerDetection()

// Test Netflix skip
testNetflixSkip()
```

## Future Improvements

- [ ] Community spoiler word database
- [ ] Episode count lookup (anime API integration)
- [ ] Sync with MyAnimeList / AniList accounts
- [ ] Custom spoiler keyword lists per anime
- [ ] Blacklist websites from spoiler scanning
- [ ] Statistics dashboard (episodes watched, completion %)
- [ ] Notification reminders for new episodes
- [ ] Export/Import anime list
- [ ] Dark/Light theme customization
- [ ] Multiple language support

## Contributing

Found a bug or want to suggest a feature? Issues and suggestions are welcome!

## License

This extension is free and open source. Feel free to modify and distribute.

---

**Made with ❤️ for anime fans everywhere**

*Track your shows • Protect from spoilers • Never miss an episode*
