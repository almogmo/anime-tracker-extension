# ⚡ Quick Start Guide

Get the Anime Fans Tracker extension up and running in 5 minutes!

## 1️⃣ Install the Extension (1 minute)

### Step 1: Prepare Icons
Create the `images/` folder with three icon files:
```bash
mkdir images

# You can use placeholder icons for now (or design your own)
# Create simple PNG files at: images/icon-16.png, icon-48.png, icon-128.png
```

📝 **Tip**: See `.icons-guide.md` for detailed icon creation instructions

### Step 2: Load into Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `anime-tracker-extension` folder
5. Done! ✅

## 2️⃣ Verify Installation (1 minute)

1. Look for the extension icon in your Chrome toolbar (top right)
2. Click it to open the popup
3. You should see the dark anime-themed UI
4. If you see an error, check the browser console (F12)

## 3️⃣ Add Your First Anime (1 minute)

1. Open the extension popup
2. Enter an anime title (e.g., "Jujutsu Kaisen")
3. Enter your current episode (e.g., "12")
4. Click **+ Add Anime**
5. ✅ Done! Your anime appears in the list

## 4️⃣ Test Spoiler Shield (1 minute)

1. Go to [Wikipedia's Attack on Titan page](https://en.wikipedia.org/wiki/List_of_Attack_on_Titan_characters)
2. Look for text containing words like "dies", "betrayal", "secret"
3. You should see some text blurred
4. Hold **Ctrl** and **click** any blurred text to unblur it

## 5️⃣ Test Netflix Auto-Skip (1 minute)

1. Go to [Netflix.com](https://www.netflix.com)
2. Start watching any anime episode
3. When intro/credits appear with a skip button
4. Wait 1 second and watch it auto-skip! ✨

---

## Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Unblur spoiler | **Ctrl** + Click (or **Cmd** + Click on Mac) |
| Update episode | **Enter** (while in episode input) |
| Clear form | **Alt + R** (standard browser reset) |

---

## First-Time Checklist

- [ ] Icons folder created
- [ ] Extension loaded on `chrome://extensions/`
- [ ] Popup opens when you click the icon
- [ ] Can add an anime successfully
- [ ] Anti-spoiler shield blurs text
- [ ] Can unblur with Ctrl+Click
- [ ] Anime list persists after closing popup

---

## Troubleshooting

### Icon not showing
```bash
# Make sure images exist
ls -la images/
# Should show: icon-16.png, icon-48.png, icon-128.png

# Then reload on chrome://extensions/
```

### Popup won't open
- Reload extension: `chrome://extensions/` → Click reload icon
- Check console for errors: F12 → Console tab

### Spoiler shield not working
- Ensure toggle is ON in popup
- Try refreshing the webpage
- Test on Wikipedia to verify it works

### Netflix auto-skip not clicking
- Make sure you're on netflix.com
- Check that "Netflix Auto-Skip" toggle is ON
- The skip button must be visible on screen
- Some browsers may require additional permissions

---

## Next Steps

1. **Read full documentation**: Check `README.md` for detailed features
2. **Learn testing procedures**: Review `TESTING.md` for comprehensive tests
3. **Understand architecture**: Read `STRUCTURE.md` for technical details
4. **Customize**: Edit `CONFIG` in `content.js` to change spoiler keywords
5. **Share**: Once working, share with anime-loving friends! 🎌

---

## File Overview

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config |
| `popup.html` | Dark theme UI |
| `popup.js` | Episode tracking logic |
| `content.js` | Spoiler + Netflix features |
| `background.js` | Service worker |
| `README.md` | Full documentation |
| `TESTING.md` | Testing guide |
| `STRUCTURE.md` | Architecture reference |

---

## Pro Tips 💡

1. **Enable Chrome Sync**: Your anime list syncs to all your devices
   - Go to Settings → Sign in to Chrome
   - Your saved anime appears on phone, tablet, other computers

2. **Customize Keywords**: Edit spoiler keywords in `content.js`
   ```javascript
   CONFIG.SPOILER_KEYWORDS: [
     // Add your own keywords here
   ]
   ```

3. **Adjust Netflix Delay**: Change skip delay in `content.js`
   ```javascript
   NETFLIX_SKIP_DELAY_MS: 1000  // Change to 500 or 2000
   ```

4. **Debug in Console**: Use these commands
   ```javascript
   testSpoilerDetection()  // See spoiler stats
   testNetflixSkip()       // Test Netflix clicking
   ```

---

## Getting Help

**Extension not working?**
1. Check `TESTING.md` for troubleshooting
2. Read `STRUCTURE.md` for technical details
3. Run debug commands in console (F12)
4. Reload extension on `chrome://extensions/`

**Want to customize?**
- Edit `BLUR_STRENGTH` in `content.js` (line 53)
- Add keywords to `SPOILER_KEYWORDS` (lines 20-50)
- Modify colors in `popup.html` CSS section

**Bug reports?**
- Note the steps to reproduce
- Include browser version (chrome://version/)
- Take a screenshot
- Check console errors (F12)

---

## What Happens Next?

### First Time You Open Popup
✅ Extension initializes storage
✅ Anime list loads (empty)
✅ Settings load (both enabled by default)

### When You Add Anime
✅ Data saved to `chrome.storage.sync`
✅ Syncs to Google account automatically
✅ Persists across browser restarts

### While Browsing Websites
✅ Content script scans for spoiler keywords
✅ Blurs matching elements
✅ Monitors for new content changes

### On Netflix
✅ Watches for skip/next buttons
✅ Clicks automatically after 1 second
✅ Seamlessly continues to next episode

---

## Time Estimate

- **Setup**: 5 minutes
- **Testing**: 10 minutes
- **Daily use**: Just click and enjoy!

---

**You're all set! Enjoy tracking your anime and blocking spoilers! 🎌✨**
