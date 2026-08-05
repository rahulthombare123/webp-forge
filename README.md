# ⬡ WebP Forge — Image to WebP Converter

**Created by Rahul Thombare** · © 2025 · MIT License
<img width="1907" height="780" alt="Screenshot 2026-08-05 173547" src="https://github.com/user-attachments/assets/27c983ed-af94-42e5-8b2c-dac250fecbc1" />

A fully client-side image converter that transforms any image (PNG, JPG, GIF, BMP, TIFF, AVIF, SVG etc.) into WebP format — with adjustable quality, live size comparison, individual downloads, and bulk ZIP export.

> 🔒 **Zero data collection. Images never leave your browser. No server. No uploads. Ever.**

---

## Files

```
webp-converter/
├── index.html    — main converter UI
├── style.css     — dark forge theme (Space Grotesk + JetBrains Mono)
├── script.js     — conversion logic (Canvas API + FileReader + JSZip)
├── privacy.html  — Privacy Policy page
├── legal.html    — Terms of Use & Copyright notice
├── legal.css     — shared styles for legal pages
└── README.md     — this file
```

---

## How to Use

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari)
2. Drag & drop images onto the zone, or click **Browse Files**
3. Adjust **Quality** slider (default: 85)
4. Click **Convert All**
5. Download individually or **Download All as ZIP**

No install, no build step, no internet required (except for Google Fonts + JSZip on demand).

---

## Bug Fixes in v2

The original version had a critical bug: `renderCard()` was starting a `FileReader` and then calling `innerHTML`, which wiped the DOM nodes the reader callback was trying to reference. Fixed by:

1. Setting `card.innerHTML` **first**
2. Appending the card to the DOM
3. **Then** starting the `FileReader` for the thumbnail

Also fixed:
- `dragleave` now checks `relatedTarget` so the glow doesn't flicker on child elements
- Download `<a>` is now appended to `document.body` before `.click()` (required in Firefox)
- Duplicate click listener bug on download buttons (cloneNode trick)
- `escapeHtml()` added to prevent XSS from filenames

---

## Tech Stack

| Tech | Purpose |
|---|---|
| **Canvas API** | `canvas.toBlob('image/webp', quality)` — native WebP encoding |
| **FileReader API** | Read local files as Data URLs without upload |
| **JSZip (CDN)** | Client-side ZIP generation, loaded on demand only |
| **CSS Custom Properties** | Token-based theming |
| **Vanilla JS ES2020+** | No framework, no build step |

---

## Legal & Privacy

- **Privacy Policy**: `privacy.html` — documents that zero data is collected or stored
- **Legal / Terms**: `legal.html` — MIT license, copyright notice, disclaimer
- **Copyright**: © 2025 Rahul Thombare. All rights reserved.
- **License**: MIT (see `legal.html` for full text)

---

## Interview Talking Points

**"How does WebP conversion work without a backend?"**
> The Canvas API supports `canvas.toBlob(cb, 'image/webp', quality)` natively in all modern browsers. I draw the source image onto a canvas element and call `toBlob` — the browser encodes it to WebP in memory. Zero server involvement.

**"What was the bug in v1 and how did you fix it?"**
> `renderCard()` kicked off a `FileReader` and then immediately set `card.innerHTML`, which destroyed all the DOM nodes the reader's `onload` callback was about to reference. The fix is simple: set `innerHTML` first, append the card, then start the reader.

**"How do you handle PNG transparency?"**
> Before drawing, I fill the canvas with white — `ctx.fillStyle = '#ffffff'; ctx.fillRect(...)` — then draw the image on top. This handles PNGs and GIFs where the WebP output might otherwise get a black background.

**"How does the ZIP download work client-side?"**
> JSZip is dynamically loaded from CDN only when the user clicks "Download All" (lazy loading). The converted `Blob` objects are added to a `JSZip` folder, then `generateAsync({ type: 'blob' })` builds the ZIP entirely in memory and triggers a download via an object URL.

---

## Potential Improvements

- WASM-based encoder (libwebp) for higher fidelity
- Preserve alpha/transparency toggle
- Resize before convert (max-width option)
- Batch re-convert with new quality without re-uploading

---

## Creator

**Rahul Thombare**  
Frontend Developer · 
GitHub: [github.com/rahulthombare123](https://github.com/rahulthombare123)
