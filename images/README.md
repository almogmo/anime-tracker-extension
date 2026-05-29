# Extension Icons

This folder should contain three PNG icon files for the Chrome extension:

## Required Files

1. **icon-16.png** (16×16 pixels)
   - Used in Chrome toolbar and context menus
   - Should be clear and recognizable at small size
   - Transparent PNG recommended

2. **icon-48.png** (48×48 pixels)
   - Used on Chrome's extension management page
   - Mid-sized, good for more detail
   - Transparent PNG recommended

3. **icon-128.png** (128×128 pixels)
   - Used on Chrome Web Store
   - Largest, can include more detail
   - Transparent PNG recommended

## Design Recommendations

For an anime-themed extension, consider:

- **Character Design**: Cute anime character mascot
- **Play Button**: Media player aesthetic
- **Abstract**: Geometric anime-inspired pattern
- **Logo**: Stylized letter or symbol

### Color Scheme

Use the extension's brand colors:
- Primary: `#e94560` (Pink/Red)
- Secondary: `#00d4ff` (Cyan)
- Dark: `#1a1a2e` (Navy)
- Text: `#e0e0e0` (Off-white)
- Accent: `#533483` (Purple)

### Design Guidelines

✅ Do This:
- Use consistent style across all sizes
- Keep 16px version simple and clear
- Add subtle transparency for elegance
- Use brand colors prominently
- Round corners slightly for friendliness

❌ Avoid This:
- Too many details (hard to see at 16px)
- Thin lines (don't scale well)
- Low contrast backgrounds
- Gradients that don't simplify to 16px
- Overly complex designs

## How to Create Icons

### Option 1: Design with Figma
1. Create new 128×128 artboard
2. Design your icon
3. Export as PNG at each size

### Option 2: Use Icon Generator
- [Favicon Generator](https://www.favicon-generator.org/)
- [Online Icon Converter](https://icoconvert.com/)

### Option 3: Use Python Script
```python
from PIL import Image, ImageDraw

# Create a simple icon
for size in [16, 48, 128]:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a simple circle
    draw.ellipse(
        [(5, 5), (size-5, size-5)],
        fill='#e94560'
    )
    
    img.save(f'icon-{size}.png')
```

### Option 4: Commission an Artist
- Hire on Fiverr, Upwork, or Freelancer
- Provide the design guidelines above
- Typical cost: $20-100

## File Size Requirements

- **16px**: 1-5 KB
- **48px**: 5-20 KB
- **128px**: 20-100 KB
- **Total**: Should be under 150 KB

## Testing Your Icons

1. Place PNG files in this `images/` folder
2. Load extension on `chrome://extensions/`
3. Verify icon appears in:
   - Extension toolbar
   - Extension management page
   - Chrome menu (with other extensions)

If icon doesn't appear:
- Check file format (must be PNG)
- Verify exact dimensions
- Check file names match manifest.json
- Reload extension

## Troubleshooting

**Icon appears blurry at 16px**
- The image might be scaled down
- Design the 16px version from scratch, don't downscale
- Keep details to a minimum

**Icon not showing in toolbar**
- Reload extension: `chrome://extensions/`
- Check `manifest.json` file paths
- Ensure files are in `images/` folder

**Icon shows as generic puzzle piece**
- PNG file is corrupted
- Try downloading/creating again
- Verify file isn't 0 bytes

## Next Steps

1. Design or source your icons
2. Save as `icon-16.png`, `icon-48.png`, `icon-128.png`
3. Place in this `images/` folder
4. Reload extension on `chrome://extensions/`

## Resources

- **Icon Inspiration**: [Noun Project](https://thenounproject.com/)
- **Free Icons**: [Feather Icons](https://feathericons.com/)
- **Tools**: [Figma](https://figma.com/) (free, browser-based)
- **Colors**: [Coolors.co](https://coolors.co/) for palette inspiration

---

**Once you have your icons ready, you're all set to launch!** 🚀
