/* ============================================================
   WebP Forge — script.js
   BUG FIXES:
   - renderCard now sets innerHTML FIRST, then starts FileReader
   - dropZone click no longer fires when label is clicked (label for= handles it)
   - Convert button auto-triggers after files are added (UX improvement)
   ============================================================ */

// ── State ──────────────────────────────────────────────────
const state = {
  files: [],
  quality: 85,
};

// ── DOM refs ───────────────────────────────────────────────
const dropZone        = document.getElementById('dropZone');
const fileInput       = document.getElementById('fileInput');
const qualitySlider   = document.getElementById('quality');
const qualityVal      = document.getElementById('qualityVal');
const convertAllBtn   = document.getElementById('convertAll');
const resultsGrid     = document.getElementById('results');
const downloadAllWrap = document.getElementById('downloadAllWrap');
const downloadAllBtn  = document.getElementById('downloadAll');
const sizeSavedEl     = document.getElementById('sizeSaved');

// ── Quality slider ──────────────────────────────────────────
qualitySlider.addEventListener('input', () => {
  state.quality = parseInt(qualitySlider.value);
  qualityVal.textContent = state.quality;
});

// ── File input (browse button) ──────────────────────────────
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFiles([...e.target.files]);
  fileInput.value = '';
});

// ── Drag & Drop ─────────────────────────────────────────────
dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', (e) => {
  // Only remove if leaving the dropzone entirely (not a child element)
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const imgs = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  if (imgs.length) handleFiles(imgs);
});

// Prevent browser from hijacking drops outside the zone
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop',     e => e.preventDefault());

// ── Handle new files ────────────────────────────────────────
function handleFiles(newFiles) {
  const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));
  if (!imageFiles.length) return;

  imageFiles.forEach(file => {
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry = { file, id, status: 'ready', blob: null, origSize: file.size, newSize: null };
    state.files.push(entry);
    renderCard(entry); // <-- innerHTML set FIRST inside this function now
  });

  convertAllBtn.disabled = false;
  downloadAllWrap.style.display = 'none';
}

// ── Render a card (BUG FIX: innerHTML first, FileReader after) ─
function renderCard(entry) {
  const card = document.createElement('div');
  card.className = 'card';
  card.id = entry.id;

  // 1. Set innerHTML FIRST so all elements exist in DOM
  card.innerHTML = `
    <div class="card-thumb-wrap">
      <div class="card-thumb-placeholder" id="${entry.id}_thumb">🖼</div>
    </div>
    <div class="card-body">
      <div class="card-name" title="${entry.file.name}">${escapeHtml(entry.file.name)}</div>
      <div class="card-meta">
        <span class="size-orig">Original: ${fmtSize(entry.origSize)}</span>
        <span class="size-new" id="${entry.id}_size"></span>
      </div>
      <div class="card-status" id="${entry.id}_status">Ready</div>
      <div class="card-progress"><div class="card-progress-bar" id="${entry.id}_bar"></div></div>
    </div>
    <div class="card-footer">
      <button class="btn-dl" id="${entry.id}_dl" disabled>⬇ Download WebP</button>
    </div>
  `;

  resultsGrid.appendChild(card);

  // 2. NOW start FileReader for thumbnail preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const placeholder = document.getElementById(`${entry.id}_thumb`);
    if (!placeholder) return;
    const img = document.createElement('img');
    img.className = 'card-thumb';
    img.src = e.target.result;
    img.alt = entry.file.name;
    placeholder.replaceWith(img);
  };
  reader.readAsDataURL(entry.file);
}

// ── Convert All button ───────────────────────────────────────
convertAllBtn.addEventListener('click', async () => {
  const pending = state.files.filter(e => e.status === 'ready' || e.status === 'error');
  if (!pending.length) return;

  convertAllBtn.disabled = true;
  convertAllBtn.textContent = 'Converting…';

  for (const entry of pending) {
    await convertOne(entry);
  }

  convertAllBtn.textContent = 'Convert All';

  const allDone = state.files.filter(e => e.status === 'done');
  if (allDone.length > 0) showDownloadAll();

  // Re-enable if some failed
  const hasFailed = state.files.some(e => e.status === 'error');
  if (hasFailed) convertAllBtn.disabled = false;
});

// ── Convert single image ─────────────────────────────────────
function convertOne(entry) {
  return new Promise((resolve) => {
    entry.status = 'converting';
    setStatus(entry.id, 'converting', '⏳ Converting…');
    animateBar(entry.id, 0, 60, 400);

    const reader = new FileReader();

    reader.onload = (ev) => {
      const img = new Image();

      img.onload = () => {
        try {
          animateBar(entry.id, 60, 85, 200);

          const canvas = document.createElement('canvas');
          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;

          const ctx = canvas.getContext('2d');
          // White bg for transparent images (PNG/GIF/WebP with alpha)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const quality = state.quality / 100;

          canvas.toBlob((blob) => {
            if (!blob) {
              entry.status = 'error';
              setStatus(entry.id, 'error', '✗ toBlob returned null — browser may not support WebP encoding');
              resolve();
              return;
            }

            entry.blob    = blob;
            entry.newSize = blob.size;
            entry.status  = 'done';

            animateBar(entry.id, 85, 100, 150);

            // Mark card green
            const card = document.getElementById(entry.id);
            if (card) card.classList.add('done');

            setStatus(entry.id, 'done', '✓ Done');

            // Show new size
            const sizeEl = document.getElementById(`${entry.id}_size`);
            if (sizeEl) {
              const saved = entry.origSize - entry.newSize;
              const pct   = ((saved / entry.origSize) * 100).toFixed(1);
              const sign  = saved >= 0 ? '-' : '+';
              sizeEl.textContent = `WebP: ${fmtSize(entry.newSize)} (${sign}${Math.abs(pct)}%)`;
              sizeEl.style.color  = saved >= 0 ? 'var(--success)' : '#ff9944';
            }

            // Enable individual download
            const dlBtn = document.getElementById(`${entry.id}_dl`);
            if (dlBtn) {
              dlBtn.disabled = false;
              // Remove old listeners by cloning
              const fresh = dlBtn.cloneNode(true);
              dlBtn.parentNode.replaceChild(fresh, dlBtn);
              fresh.addEventListener('click', () => downloadOne(entry));
            }

            resolve();

          }, 'image/webp', quality);

        } catch (err) {
          entry.status = 'error';
          setStatus(entry.id, 'error', '✗ ' + err.message);
          resolve();
        }
      };

      img.onerror = () => {
        entry.status = 'error';
        setStatus(entry.id, 'error', '✗ Could not decode image');
        resolve();
      };

      img.src = ev.target.result;
    };

    reader.onerror = () => {
      entry.status = 'error';
      setStatus(entry.id, 'error', '✗ File read failed');
      resolve();
    };

    reader.readAsDataURL(entry.file);
  });
}

// ── Single download ──────────────────────────────────────────
function downloadOne(entry) {
  if (!entry.blob) return;
  const url  = URL.createObjectURL(entry.blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = entry.file.name.replace(/\.[^.]+$/, '') + '.webp';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Download All as ZIP ──────────────────────────────────────
downloadAllBtn.addEventListener('click', async () => {
  const done = state.files.filter(e => e.status === 'done' && e.blob);
  if (!done.length) return;

  downloadAllBtn.textContent = '⏳ Building ZIP…';
  downloadAllBtn.disabled = true;

  try {
    if (!window.JSZip) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    }

    const zip    = new JSZip();
    const folder = zip.folder('webp-images');

    done.forEach(entry => {
      const name = entry.file.name.replace(/\.[^.]+$/, '') + '.webp';
      folder.file(name, entry.blob);
    });

    const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url  = URL.createObjectURL(content);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'webp-images.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

  } catch (err) {
    alert('ZIP failed: ' + err.message);
  }

  downloadAllBtn.textContent = '⬇ Download All as ZIP';
  downloadAllBtn.disabled = false;
});

// ── Show download-all bar ────────────────────────────────────
function showDownloadAll() {
  const done      = state.files.filter(e => e.status === 'done');
  const origTotal = done.reduce((s, e) => s + e.origSize, 0);
  const newTotal  = done.reduce((s, e) => s + (e.newSize || 0), 0);
  const saved     = origTotal - newTotal;
  const pct       = origTotal > 0 ? ((saved / origTotal) * 100).toFixed(1) : '0';

  sizeSavedEl.textContent = saved >= 0
    ? `${done.length} file${done.length > 1 ? 's' : ''} · Saved ${fmtSize(saved)} (${pct}% smaller total)`
    : `${done.length} file${done.length > 1 ? 's' : ''} converted`;

  downloadAllWrap.style.display = 'flex';
  setTimeout(() => downloadAllWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

// ── Helpers ──────────────────────────────────────────────────
function setStatus(id, type, text) {
  const el = document.getElementById(`${id}_status`);
  if (el) { el.className = `card-status ${type}`; el.textContent = text; }
}

function animateBar(id, from, to, ms) {
  const bar = document.getElementById(`${id}_bar`);
  if (!bar) return;
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min((now - t0) / ms, 1);
    bar.style.width = (from + (to - from) * (1 - Math.pow(1 - p, 3))) + '%';
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function fmtSize(bytes) {
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
