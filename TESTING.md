# 🧪 Testing Guide - Anime Fans Tracker

Complete guide for testing all features of the Anime Fans Tracker extension.

## Setup for Testing

### 1. Load the Extension
- Open `chrome://extensions/`
- Enable **Developer mode** (top right toggle)
- Click **Load unpacked**
- Select the `anime-tracker-extension` folder
- The extension should appear in your extensions list

### 2. Verify Installation
- Look for the extension icon in your Chrome toolbar
- Click it to open the popup
- You should see the dark anime-themed UI

## Feature Testing

### 📺 Episode Tracker

#### Test 1: Add Anime
1. Open the popup
2. Enter title: "Attack on Titan"
3. Enter episode: 10
4. Click "+ Add Anime"
5. **Expected**: Anime appears in list with "Ep: 10" and shows success animation

#### Test 2: Update Episode
1. In the anime list, change episode number for an anime
2. Click the "Update" button
3. **Expected**: Episode number updates immediately, text flashes cyan

#### Test 3: Update with Enter Key
1. In the anime list, click on episode input field
2. Change the number
3. Press Enter key
4. **Expected**: Episode updates without clicking button

#### Test 4: Delete Anime
1. In the anime list, click "Delete" button
2. **Expected**: Anime is removed from list immediately

#### Test 5: Clear Form
1. Enter data in the form fields
2. Click "Clear" button
3. **Expected**: All fields are emptied

#### Test 6: Validation
1. Try to add anime with:
   - Empty title → Should show alert
   - Empty episode → Should show alert
   - Episode 0 → Should show alert
   - Negative episode → Should show alert
2. **Expected**: Validation alerts appear

#### Test 7: Persistent Storage
1. Add several anime
2. Close the popup
3. Close and reopen Chrome
4. Open extension popup again
5. **Expected**: All anime are still in the list

#### Test 8: Cross-Device Sync
1. On this device, add anime
2. Sign in to same Google account on another device
3. Open extension on other device
4. **Expected**: Same anime list appears (if sync is enabled)

### 🛡️ Anti-Spoiler Shield

#### Test 1: Basic Spoiler Detection
1. Go to https://en.wikipedia.org/wiki/List_of_Attack_on_Titan_chapters
2. Open console (F12)
3. Run: `testSpoilerDetection()`
4. **Expected**: Console shows spoiler shield is enabled and blurred elements count

#### Test 2: Keywords Detection
1. Go to any webpage with text
2. Create test text with spoiler keywords: "This character dies"
3. Refresh the page
4. **Expected**: Text containing "dies" is blurred

#### Test 3: Blur Visual Effect
1. Go to Wikipedia episode guide
2. Look for blurred text
3. Hover over it
4. **Expected**: Text appears blurred, opacity is reduced

#### Test 4: Unblur with Ctrl+Click
1. Find a blurred spoiler element
2. Hold Ctrl (or Cmd on Mac)
3. Click the blurred element
4. **Expected**: Blur is removed, text becomes readable

#### Test 5: Multiple Keywords
1. Test that extension detects various keywords:
   - "death", "dies", "dead"
   - "betrayal", "betrays"
   - "confession", "reveal"
   - "power up", "transformation"
   - "true identity"
2. **Expected**: All matching elements are blurred

#### Test 6: Dynamic Content
1. Open a website with lazy loading (Twitter, Reddit)
2. Scroll down to load new content
3. **Expected**: New blurred elements appear as content loads

#### Test 7: Toggle Feature Off/On
1. Open popup
2. Toggle "Anti-Spoiler Shield" OFF
3. Refresh webpage
4. **Expected**: No elements are blurred
5. Toggle back ON
6. Refresh webpage
7. **Expected**: Elements are blurred again

#### Test 8: Skip Protected Elements
1. Visit webpage with `<nav>`, `<header>`, `<script>` tags
2. **Expected**: These elements are not scanned for spoilers

### ⏭️ Netflix Auto-Skip

#### Test 1: Setup Netflix
1. Go to https://www.netflix.com
2. Open console (F12)
3. Run: `testNetflixSkip()`
4. **Expected**: Console logs "Testing Netflix skip..."

#### Test 2: Auto-Skip Intro
1. Start watching an anime on Netflix that has an intro
2. **Expected**: After intro ends and "Skip Intro" appears, it auto-clicks after 1 second
3. Intro is skipped automatically

#### Test 3: Auto-Skip Credits
1. Watch episode and reach end credits
2. When "Skip Credits" button appears
3. **Expected**: Button auto-clicks after 1 second
4. Credits are skipped, next episode plays

#### Test 4: Auto-Skip Next Episode
1. During end credits of an episode
2. When "Next Episode" or "Continue Watching" appears
3. **Expected**: Button is clicked automatically
4. Next episode starts playing

#### Test 5: Manual Cancel
1. Watch episode until skip button appears
2. During the 1-second delay, click elsewhere
3. **Expected**: You can still manually click skip if needed
4. Functionality doesn't interfere with manual control

#### Test 6: Visibility Check
1. Start episode and minimize browser window
2. When "Skip Intro" appears (but not visible)
3. **Expected**: Button is NOT clicked because it's not visible
4. Once window is restored, button may be clicked if still visible

#### Test 7: Toggle Feature Off/On
1. Open popup
2. Toggle "Netflix Auto-Skip" OFF
3. Refresh Netflix page with skip button
4. **Expected**: Skip button is NOT auto-clicked
5. Toggle back ON
6. **Expected**: Auto-skip works again

#### Test 8: Multiple Button Types
1. Test with different Netflix episodes that have:
   - Skip Intro button
   - Skip Credits button
   - Next Episode button
2. **Expected**: All buttons are detected and clicked appropriately

#### Test 9: Non-Netflix Pages
1. Go to Crunchyroll or other anime site
2. Enable feature debug via console
3. **Expected**: Auto-skip only runs on netflix.com/netflix.co

### ⚙️ Settings Management

#### Test 1: Toggle Persistence
1. Toggle "Anti-Spoiler Shield" OFF
2. Close popup
3. Reopen popup
4. **Expected**: Toggle is still OFF

#### Test 2: Settings Sync Across Tabs
1. Open popup in one tab
2. Toggle "Netflix Auto-Skip" OFF
3. In another tab, open popup again
4. **Expected**: Toggle is OFF in second tab too

#### Test 3: Storage Quota
1. Add 100+ anime to the list
2. **Expected**: All data saves without errors (Chrome gives 10MB quota)

## Edge Cases & Error Handling

### Test 1: Invalid Input
- Empty strings
- Very long anime titles (500+ characters)
- Extremely large episode numbers
- Special characters in titles: !@#$%^&*()

### Test 2: Page Content Types
- PDF viewer
- Image-heavy websites
- Video player pages
- Mobile responsive pages
- PWA applications

### Test 3: Performance
- Open popup while extension is processing large page
- Scroll rapidly while spoiler scanning
- Leave extension running for extended period
- Test on machine with limited resources

### Test 4: Compatibility
- Test on different websites:
  - Reddit (anime discussions)
  - Twitter (anime news)
  - MyAnimeList
  - AniList
  - YouTube (anime reviews)
  - Wikipedia (anime articles)
  - Fandom wikis

## Console Debug Commands

### Available Debug Functions

```javascript
// Test spoiler detection
testSpoilerDetection()
// Output: Shows feature state, enabled status, and blurred element count

// Test Netflix skip
testNetflixSkip()
// Output: Attempts to find and click skip button

// Check storage
chrome.storage.sync.get(null, (result) => console.log(result))
// Output: Displays all stored data

// Clear all storage
chrome.storage.sync.clear()
// Output: Clears all saved data

// Get anime list
chrome.runtime.sendMessage({ type: 'GET_ANIME_LIST' }, (response) => {
  console.log(response.animeList)
})
// Output: Lists all saved anime
```

## Performance Testing

### Measure Spoiler Scanning Time
```javascript
console.time('spoiler-scan')
scanAndBlurSpoilers()
console.timeEnd('spoiler-scan')
```

### Check MutationObserver Impact
- Open DevTools Performance tab
- Record for 10 seconds
- Check for excessive mutations and repaints
- Should see debouncing working (batched updates)

## Common Issues & Solutions

### Issue: Popup won't open
- **Solution**: Reload extension on chrome://extensions/
- Ensure manifest.json is valid

### Issue: Storage not persisting
- **Solution**: Check if Chrome sync is enabled
- Verify Google account is signed in
- Try signing out and back in

### Issue: Spoiler blur not working
- **Solution**: Check console for errors (F12)
- Verify CSS isn't being overridden by site
- Test on different websites

### Issue: Netflix auto-skip not working
- **Solution**: Ensure you're on netflix.com or netflix.co
- Check if button exists in DOM
- Look for Netflix UI updates that changed selectors

## Automated Testing Ideas

For future development:

```javascript
// Unit test example
describe('Anime Tracker', () => {
  test('should add anime to list', () => {
    // Test add functionality
  })

  test('should detect spoiler keywords', () => {
    // Test keyword detection
  })

  test('should blur spoiler elements', () => {
    // Test blur application
  })

  test('should click Netflix skip button', () => {
    // Test Netflix auto-skip
  })
})
```

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser version (`chrome://version/`)
5. Console errors (if any)
6. Screenshots
7. Whether it's reproducible

---

**Happy Testing! 🎌**
