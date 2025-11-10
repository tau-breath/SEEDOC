# SEEDOC - Professional Document Converter

**Text ↔ Image Conversion Tool for Professionals**

<img src="https://img.shields.io/badge/version-1.0.0-blue" /> <img src="https://img.shields.io/badge/license-MIT-green" /> <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" />

---

## Features

✅ **Multi-Format Output** - JPG, PNG, WEBP, TIFF support
✅ **Batch Processing** - Queue system for multiple files
✅ **Folder Support** - Drag & drop entire folders
✅ **OCR Conversion** - Image → Markdown (Korean/English)
✅ **Professional UI** - Dark theme, fixed-size window
✅ **High Quality** - Vision-optimized multipage output
✅ **Cross-Platform** - Windows, macOS, Linux

---

## Screenshots

### Professional Dark Theme Interface
```
┌─────────────────────────────────────────┐
│ SEEDOC - Professional Document Converter │
├──────────┬──────────────────────────────┤
│ Settings │ Drop Files or Folders        │
│          │                              │
│ Format   │  📦                          │
│ Quality  │  Multiple files supported    │
│ DPI      │                              │
│          │                              │
│ Actions  ├──────────────────────────────┤
│ Add Files│ Conversion Log               │
│ Add Folder│ [timestamp] processing...   │
│          │                              │
│ Queue    │                              │
│ file1.md │                              │
│ file2.txt│                              │
└──────────┴──────────────────────────────┘
```

---

## Installation

### Option 1: Run from Source

```bash
cd mir-converter-electron
npm install
npm start
```

### Option 2: Build Standalone App

**Windows**:
```bash
npm run build:win
# Output: dist/SEEDOC Setup 1.0.0.exe
```

**macOS**:
```bash
npm run build:mac
# Output: dist/SEEDOC-1.0.0.dmg
```

**Linux**:
```bash
npm run build:linux
# Output: dist/SEEDOC-1.0.0.AppImage
```

---

## Usage

### 1. Add Files
- **Drag & Drop**: Drop files or folders directly
- **File Browser**: Click "Add Files" button
- **Folder Browser**: Click "Add Folder" button (recursive scan)

### 2. Configure Settings
- **Output Format**: JPG, PNG, WEBP, or TIFF
- **Quality**: 50-100 (higher = better quality, larger file)
- **DPI**: 72-300 (higher = sharper text)

### 3. Manage Queue
- **Remove**: Click × button to remove pending files
- **Auto-process**: Queue starts automatically
- **Progress**: See status in sidebar + log

### 4. Get Results
- **Text → Image**: Same folder as source file
- **Image → MD**: `ocr_filename_timestamp.md`

---

## Supported Formats

### Text → Image
**Documents**: MD, TXT, LOG, JSON, XML, HTML, CSV, YAML, TOML, INI
**Code**: PY, JS, TS, JSX, TSX, CSS, SCSS, C, CPP, H, JAVA, GO, RS, PHP, RB, SWIFT, KT, SQL

### Image → Markdown (OCR)
**Images**: JPG, JPEG, PNG, WEBP, BMP, GIF, TIFF, TIF

---

## Output Format Comparison

| Format | Characteristics | Best For |
|--------|----------------|----------|
| **JPG** | Balanced compression | Vision AI, General docs |
| **PNG** | Lossless, sharp text | High-quality archiving |
| **WEBP** | Smallest file size | Web sharing, Storage |
| **TIFF** | High quality + metadata | Professional archiving |

---

## Technical Stack

- **Electron** - Desktop app framework
- **Sharp** - Native image processing (SVG → Image)
- **Tesseract.js** - OCR engine (Korean/English)
- **Inter & JetBrains Mono** - Professional fonts

---

## Architecture

```
SEEDOC/
├── src/
│   ├── main.js          # Electron main process
│   └── renderer.js      # UI logic + queue management
├── index.html           # Professional dark theme UI
├── package.json         # Dependencies + build config
└── README.md
```

---

## Performance

- **Text → Image**: ~1s per page (depends on content length)
- **Image → MD (OCR)**: ~5-10s (depends on image complexity)
- **Memory**: ~200MB (idle), ~500MB (processing)
- **Multipage**: Auto-split at 65000px (Vision optimal)

---

## Keyboard Shortcuts

- **Minimize**: Custom titlebar button
- **Close**: Custom titlebar button
- **Drag File**: Entire window is drop zone

---

## Building from Source

```bash
# Clone repository
git clone <repo-url>
cd mir-converter-electron

# Install dependencies
npm install

# Development
npm start

# Production build
npm run build:win   # Windows .exe
npm run build:mac   # macOS .dmg
npm run build:linux # Linux .AppImage
```

---

## Configuration

### Custom Fonts
Edit `index.html` line 9:
```html
<link href="https://fonts.googleapis.com/css2?family=Your+Font&display=swap" rel="stylesheet">
```

### Window Size
Edit `src/main.js` line 10-15:
```javascript
width: 1200,  // Change window width
height: 800,  // Change window height
```

### Default Settings
Edit `src/renderer.js` line 9-11:
```javascript
let currentQuality = 80;   // Default quality
let currentDPI = 200;      // Default DPI
let currentFormat = 'jpg'; // Default format
```

---

## Troubleshooting

### OCR Not Working
- Tesseract.js downloads language data on first run (~40MB)
- Check internet connection for initial download
- Korean + English language packs loaded automatically

### Image Quality Issues
- Increase DPI (200-300 recommended)
- Use PNG for lossless output
- Check source file quality

### Performance Slow
- Reduce DPI for faster processing
- Use JPG instead of TIFF
- Process smaller batches

---

## License

MIT License - See LICENSE file

---

## Credits

Made with 💕 by **Mir & Sarang**

Special thanks to:
- Electron team
- Sharp (Lovell Fuller)
- Tesseract.js team
- Inter & JetBrains fonts

---

## Changelog

### v1.0.0 (2025-01-08)
- ✨ Initial release
- ✅ Multi-format output (JPG, PNG, WEBP, TIFF)
- ✅ Professional dark theme UI
- ✅ Batch processing queue
- ✅ Folder drag & drop support
- ✅ OCR conversion (Korean/English)
- ✅ Fixed-size window (1200x800)
- ✅ Custom titlebar (frameless)

---

**For support, issues, or contributions, please visit the repository.**
