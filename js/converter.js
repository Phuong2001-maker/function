// Shared converter logic for the standalone converters in /function.
// Each HTML entry point must declare window.CONVERTER_CONFIG before loading this script.
(function () {
  // ---------- Utilities ----------
  function mergeConfig(base, override) {
    const result = {...(base || {})};
    for (const k of Object.keys(override || {})) {
      const v = override[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        result[k] = mergeConfig(base?.[k] || {}, v);
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  function sanitizeName(name) {
    return (name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  async function fileToArrayBuffer(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = (dataUrl || '').split(',');
    if (parts.length < 2) throw new Error('Dữ liệu ảnh không hợp lệ.');
    const mime = (parts[0].match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
    const binary = atob(parts[1]);
    const u8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
    return new Blob([u8], {type: mime});
  }

  // ---------- Config ----------
  const defaultConfig = {
    slug: 'chuyen-doi',
    fileLabel: 'tệp',
    fileLabelPlural: 'tệp',
    input: {
      label: 'ảnh',
      labelPlural: 'ảnh',
      labelWhenUnknown: 'ảnh',
      mimeTypes: ['image/png', 'image/jpeg', 'image/pjpeg', 'image/webp', 'image/gif'],
      extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
      accept: '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/pjpeg,image/webp,image/gif',
      description: 'Chỉ hỗ trợ ảnh PNG, JPG, JPEG, WebP hoặc GIF.'
    },
    outputs: {
      jpg: { formatLabel: 'JPG', buttonLabel: 'Xuất ảnh JPG', zipNameBase: 'anh-sang-jpg', mimeType: 'image/jpeg', fileExtension: 'jpg' },
      png: { formatLabel: 'PNG', buttonLabel: 'Xuất ảnh PNG', zipNameBase: 'anh-sang-png', mimeType: 'image/png', fileExtension: 'png' },
      webp:{ formatLabel: 'WebP',buttonLabel: 'Xuất ảnh WebP',zipNameBase: 'anh-sang-webp', mimeType: 'image/webp', fileExtension: 'webp' },
      gif: { formatLabel: 'GIF', buttonLabel: 'Xuất ảnh GIF', zipNameBase: 'anh-sang-gif', mimeType: 'image/gif', fileExtension: 'gif' },
      jpeg:{ formatLabel: 'JPEG',buttonLabel: 'Xuất ảnh JPEG',zipNameBase: 'anh-sang-jpeg', mimeType: 'image/jpeg', fileExtension: 'jpeg' },
      pdf: { formatLabel: 'PDF', buttonLabel: 'Xuất thành PDF', zipNameBaseMerged: 'anh-gop-pdf', zipNameBaseSeparate: 'anh-sang-pdf' }
    },
    availableOutputs: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
    defaultOutput: 'jpg',
    allowPdfInput: false
  };

  const config = mergeConfig(defaultConfig, window.CONVERTER_CONFIG || {});
  const slugParts = (config.slug || '').split('-sang-');
  const inputFormatKey = (slugParts[0] || '').toLowerCase();
  const outputFormatKey = (slugParts[1] || config.defaultOutput || '').toLowerCase();

  // ---------- Icons (inline SVG) ----------
  const ICONS = {
    image: '<svg viewBox="0 0 64 64" width="52" height="52" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><filter id="imgShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.18"/></filter><linearGradient id="imgSky" x1="0" y1="16" x2="0" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#9CD6FF"/><stop offset="1" stop-color="#F1FAFF"/></linearGradient><linearGradient id="hillA" x1="0" y1="40" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#7ED957"/><stop offset="1" stop-color="#34C759"/></linearGradient><linearGradient id="hillB" x1="0" y1="42" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#B8E994"/><stop offset="1" stop-color="#7ED957"/></linearGradient></defs><rect x="8" y="12" width="48" height="36" rx="7" fill="#F7B267" stroke="#EB7A3C" stroke-width="2" filter="url(#imgShadow)"/><rect x="12" y="16" width="40" height="28" rx="6" fill="#FFFFFF"/><rect x="14" y="18" width="36" height="14" rx="4" fill="url(#imgSky)"/><circle cx="24" cy="25" r="4.6" fill="#FFD166"/><path d="M14 42c8-8 12-10 16-6l6 6 8-8c4-4 8 0 12 6v4H14v-2z" fill="url(#hillA)"/><path d="M14 44c6-6 10-8 14-4l6 6 6-6c3-3 6-1 14 6H14v-2z" fill="url(#hillB)"/></svg>',
    pdf:   '<svg viewBox="0 0 64 64" width="52" height="52" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><filter id="docShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.18"/></filter><linearGradient id="docPaper" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#EEE5FF"/><stop offset="1" stop-color="#E9D8FD"/></linearGradient></defs><path d="M18 10h22l10 10v30a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V18a8 8 0 0 1 8-8z" fill="url(#docPaper)" stroke="#7C3AED" stroke-width="2" filter="url(#docShadow)"/><path d="M40 10v8a4 4 0 0 0 4 4h8" fill="#D6CCFF"/><path d="M22 32h22" stroke="#7C3AED" stroke-width="3" stroke-linecap="round" opacity=".9"/><path d="M22 40h22" stroke="#7C3AED" stroke-width="3" stroke-linecap="round" opacity=".7"/><path d="M22 48h16" stroke="#7C3AED" stroke-width="3" stroke-linecap="round" opacity=".6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="#B0B8C3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function getFormatIconSvg(key) {
    if (key === 'pdf') return ICONS.pdf;
    return ICONS.image; // png, jpg, jpeg, webp, gif
  }

  // ---------- DOM ----------
  const dropzone = document.querySelector('#dropzone');
  const conversionFlow = document.querySelector('.conversion-flow');
  const fileInput = document.querySelector('#fileInput');
  const grid = document.querySelector('#fileGrid');
  const emptyState = document.querySelector('#emptyState');
  const selectionBar = document.querySelector('#selectionBar');
  const selectionCount = document.querySelector('#selectionCount');
  const pageCount = document.querySelector('#pageCount');
  const convertBtn = document.querySelector('#convertBtn');
  const convertLabel = convertBtn?.querySelector('span');
  const progressWrap = document.querySelector('#progressWrap');
  const progressBar = document.querySelector('#progressBar');
  const statusMessage = document.querySelector('#statusMessage');
  const optsToggle = document.querySelector('#optsToggle');
  const panel = document.querySelector('#panel');
  const chooseBtn = document.querySelector('#chooseBtn');
  const formatOptions = document.querySelector('#formatOptions');
  const pdfOptions = document.querySelector('#pdfOptions');
  let formatButtons = Array.from(document.querySelectorAll('.format-btn'));
  const pdfModeButtons = Array.from(document.querySelectorAll('.pdf-mode-btn'));

  if (!dropzone || !fileInput || !grid || !convertBtn) {
    console.error('Thiếu phần tử giao diện cần thiết.');
    return;
  }

  // ---------- Input/Output availability ----------
  const supportedOutputs = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];
  let availableOutputs = Array.isArray(config.availableOutputs)
    ? config.availableOutputs.filter(fmt => supportedOutputs.includes(fmt) && config.outputs[fmt])
    : supportedOutputs.filter(fmt => config.outputs[fmt]);
  if (!availableOutputs.length) availableOutputs = Object.keys(config.outputs || {}).filter(k => supportedOutputs.includes(k));
  if (!availableOutputs.length) availableOutputs = ['jpg'];

  formatButtons.forEach(btn => { if (!availableOutputs.includes(btn.dataset.format)) btn.remove(); });
  formatButtons = Array.from(document.querySelectorAll('.format-btn'));

  const imageConfig = config.input || {};
  const imageMimeSet = new Set((imageConfig.mimeTypes || []).filter(Boolean));
  const imageExtensions = (imageConfig.extensions || []).map(e => e.replace(/^\./, ''));
  const extensionPattern = imageExtensions.length ? new RegExp(`\\.(${imageExtensions.join('|')})$`, 'i') : null;
  const allowImageInput = Boolean(imageMimeSet.size || imageExtensions.length);
  const pdfjs = config.allowPdfInput ? (window.pdfjsLib || null) : null;

  if (fileInput) {
    const accepts = [];
    if (imageConfig.accept) accepts.push(imageConfig.accept);
    if (config.allowPdfInput) accepts.push('.pdf,application/pdf');
    if (accepts.length) fileInput.setAttribute('accept', accepts.join(','));
  }

  const initialOutput = availableOutputs.includes(config.defaultOutput) ? config.defaultOutput : availableOutputs[0];
  const singleOutput = availableOutputs.length === 1;

  // ---------- State ----------
  const state = {
    files: [], // {id,type,file,name,pdf,pages,thumb,revokeThumb,imageInfo}
    quality: 'normal',
    pdfMode: 'merged',
    outputFormat: initialOutput,
    converting: false
  };

  // ---------- UI helpers ----------
  function updateStatus(text = '', tone = 'info') {
    if (!statusMessage) return;
    if (!text) {
      statusMessage.className = 'status';
      statusMessage.textContent = '';
      return;
    }
    statusMessage.textContent = text;
    statusMessage.className = `status show ${tone}`;
  }

  function updateSelection() {
    const fileTotal = state.files.length;
    if (!fileTotal) {
      selectionBar && (selectionBar.style.display = 'none');
      selectionCount && (selectionCount.textContent = '0 ' + (config.fileLabelPlural || 'tệp'));
      pageCount && (pageCount.textContent = '0 ' + (imageConfig.labelPlural || 'ảnh'));
    } else {
      selectionBar && (selectionBar.style.display = 'flex');
      selectionCount && (selectionCount.textContent = `${fileTotal} ${fileTotal === 1 ? (config.fileLabel || 'tệp') : (config.fileLabelPlural || 'tệp')}`);
      const itemTotal = state.files.reduce((sum, e) => sum + (e.type === 'pdf' ? Math.max(1, e.pages || 0) : 1), 0);
      pageCount && (pageCount.textContent = `${itemTotal} ${itemTotal === 1 ? (imageConfig.label || 'ảnh') : (imageConfig.labelPlural || 'ảnh')}`);
    }
    emptyState && (emptyState.style.display = fileTotal ? 'none' : 'block');
    convertBtn.disabled = !fileTotal || state.converting;
  }

  function applyConversionIcons() {
    if (!conversionFlow) return;
    const icons = conversionFlow.querySelectorAll('.icon');
    const arrow = conversionFlow.querySelector('.arrow');
    if (icons[0]) {
      icons[0].innerHTML = getFormatIconSvg(inputFormatKey);
      icons[0].setAttribute('aria-hidden', 'true');
    }
    if (icons[1]) {
      icons[1].innerHTML = getFormatIconSvg(outputFormatKey);
      icons[1].setAttribute('aria-hidden', 'true');
    }
    if (arrow) {
      arrow.innerHTML = ICONS.arrow;
      arrow.setAttribute('aria-hidden', 'true');
    }
  }

  function renderGrid() {
    if (!grid) return;
    if (!state.files.length) {
      grid.innerHTML = '';
      updateSelection();
      return;
    }
    const cards = state.files.map(entry => {
      const info = entry.type === 'pdf' ? (entry.pages ? `${entry.pages} trang` : 'Đang đếm trang…') : (entry.imageInfo ? `${entry.imageInfo.width}×${entry.imageInfo.height}` : '1 ảnh');
      const alt = entry.type === 'pdf' ? `Trang đầu của ${entry.name}` : `Ảnh xem trước của ${entry.name}`;
      const thumb = entry.thumb ? `<img src="${entry.thumb}" alt="${alt}">` : '<span class="muted">Đang tạo xem trước…</span>';
      return `
        <div class="card">
          <button class="remove" type="button" data-remove="${entry.id}" title="Xóa tệp">×</button>
          <div class="thumb" data-pages="${info}">
            ${thumb}
          </div>
          <div class="filename" title="${entry.name}">${entry.name}</div>
        </div>`;
    }).join('');
    grid.innerHTML = cards;
    updateSelection();
  }

  // ---------- Quality & format ----------
  const QUALITY_PRESETS = {
    normal: { label: 'bình thường', dpi: 150, jpegQuality: 0.82, message: 'Chế độ bình thường (150 DPI) cân bằng giữa chất lượng và dung lượng.', tone: 'info' },
    high:   { label: 'cao',          dpi: 220, jpegQuality: 0.92, message: 'Chế độ cao (220 DPI) cho ảnh rõ hơn nhưng dung lượng lớn hơn.', tone: 'info' },
    ultra:  { label: 'siêu nét',     dpi: 600, jpegQuality: 1.00, message: 'Chế độ siêu nét (600 DPI) tiêu tốn nhiều tài nguyên, chỉ nên chọn khi cần.', tone: 'warn' }
  };

  function setQuality(quality) {
    const key = QUALITY_PRESETS[quality] ? quality : 'normal';
    state.quality = key;
    document.querySelectorAll('.qitem').forEach(el => {
      const active = el.dataset.quality === key;
      el.classList.toggle('active', active);
      el.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    updateStatus(QUALITY_PRESETS[key].message, QUALITY_PRESETS[key].tone);
  }

  function updateConvertLabel() {
    if (!convertLabel) return;
    const currentOutput = config.outputs[state.outputFormat] || {};
    convertLabel.textContent = currentOutput.buttonLabel || 'Bắt đầu chuyển đổi';
  }

  function setOutputFormat(format) {
    const next = availableOutputs.includes(format) ? format : availableOutputs[0];
    state.outputFormat = next;
    formatButtons.forEach(btn => {
      const active = btn.dataset.format === next;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    updateConvertLabel();
    updatePdfOptionsVisibility();
  }

  function updatePdfOptionsVisibility() {
    if (!pdfOptions) return;
    const show = state.outputFormat === 'pdf';
    pdfOptions.style.display = show ? 'block' : 'none';
    pdfOptions.setAttribute('aria-hidden', show ? 'false' : 'true');
    pdfModeButtons.forEach(btn => {
      btn.disabled = !show;
      btn.setAttribute('aria-disabled', show ? 'false' : 'true');
    });
    if (show) setPdfMode(state.pdfMode);
  }

  function setPdfMode(mode) {
    const next = mode === 'separate' ? 'separate' : 'merged';
    state.pdfMode = next;
    pdfModeButtons.forEach(btn => {
      const active = btn.dataset.mode === next;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  // ---------- Input helpers ----------
  function isPdfFile(file) {
    return file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
  }
  function isImageFile(file) {
    if (!file || isPdfFile(file)) return false;
    if (!allowImageInput) return false;
    const typeMatch = imageMimeSet.size ? imageMimeSet.has(file.type) : false;
    const extMatch = extensionPattern ? extensionPattern.test(file.name || '') : false;
    const fallback = !imageMimeSet.size && !extensionPattern ? (file.type || '').startsWith('image/') : false;
    return typeMatch || extMatch || fallback;
  }

  async function loadPdf(entry) {
    if (!pdfjs) throw new Error('Thư viện PDF chưa sẵn sàng.');
    if (entry.pdf) return entry.pdf;
    const buffer = await fileToArrayBuffer(entry.file);
    entry.pdf = await pdfjs.getDocument({data: buffer}).promise;
    entry.pages = entry.pdf.numPages;
    return entry.pdf;
  }
  async function renderPdfPageToCanvas(page, scale) {
    const viewport = page.getViewport({scale});
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({canvasContext: ctx, viewport}).promise;
    return canvas;
  }
  async function loadPdfPreview(entry) {
    const pdf = await loadPdf(entry);
    const page = await pdf.getPage(1);
    const canvas = await renderPdfPageToCanvas(page, 1.1);
    entry.thumb = canvas.toDataURL('image/jpeg', 0.75);
  }
  async function loadImagePreview(entry) {
    if (typeof entry.revokeThumb === 'function') entry.revokeThumb();
    const objectUrl = URL.createObjectURL(entry.file);
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        entry.pages = 1;
        entry.imageInfo = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
        entry.thumb = objectUrl;
        entry.revokeThumb = () => { URL.revokeObjectURL(objectUrl); entry.revokeThumb = null; };
        resolve();
      };
      img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e || new Error('Không thể tải ảnh xem trước.')); };
      img.src = objectUrl;
    });
  }

  async function rasterizeImageFile(file, {preserveAlpha = false} = {}) {
    if ('createImageBitmap' in window && typeof createImageBitmap === 'function') {
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, bitmap.width || 1);
        canvas.height = Math.max(1, bitmap.height || 1);
        const ctx = canvas.getContext('2d', {alpha: preserveAlpha});
        if (!preserveAlpha) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        return canvas;
      } catch (e) {
        bitmap?.close?.();
        // fallback below
      }
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 1;
      canvas.height = img.naturalHeight || img.height || 1;
      const ctx = canvas.getContext('2d', {alpha: preserveAlpha});
      if (!preserveAlpha) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function canvasToGif(canvas, outputConfig = {}) {
    // Try direct
    const direct = await new Promise(resolve => {
      if (typeof canvas.toBlob !== 'function') return resolve(null);
      canvas.toBlob(b => resolve(b && b.type === 'image/gif' ? b : null), 'image/gif');
    });
    if (direct) return direct;
    // Use gifshot if available
    if (typeof gifshot === 'object' && typeof gifshot?.createGIF === 'function') {
      const dataUrl = canvas.toDataURL('image/png');
      return await new Promise((resolve, reject) => {
        gifshot.createGIF({ gifWidth: canvas.width || 1, gifHeight: canvas.height || 1, images: [dataUrl], interval: 0.1, numFrames: 1, frameDuration: 1, sampleInterval: outputConfig.gifSampleInterval || 5, numWorkers: 2 }, (result) => {
          if (result.error) return reject(new Error(result.errorMsg || 'Không thể tạo ảnh GIF.'));
          try { resolve(dataUrlToBlob(result.image)); } catch (err) { reject(err); }
        });
      });
    }
    throw new Error('Thư viện tạo GIF chưa sẵn sàng.');
  }

  async function canvasToImageBlob(canvas, outputConfig, preset) {
    const mimeType = outputConfig?.mimeType || 'image/jpeg';
    const qualityHint = typeof preset?.jpegQuality === 'number' ? preset.jpegQuality : 0.92;
    if (mimeType === 'image/gif') return await canvasToGif(canvas, outputConfig);
    const quality = mimeType === 'image/jpeg' ? qualityHint : (mimeType === 'image/webp' ? (typeof outputConfig?.webpQuality === 'number' ? outputConfig.webpQuality : qualityHint) : undefined);
    if (typeof canvas.toBlob === 'function') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
      if (blob) return blob;
    }
    return dataUrlToBlob(canvas.toDataURL(mimeType, quality));
  }

  // ---------- Events ----------
  function attachEventListeners() {
    // Choose button
    chooseBtn?.setAttribute('type', 'button');
    chooseBtn?.setAttribute('aria-controls', 'fileInput');
    chooseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); });
    chooseBtn?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });

    // Dropzone
    dropzone.addEventListener('click', (e) => { if (e.target.closest('button')) return; fileInput.click(); });
    ['dragenter', 'dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; }));
    dropzone.addEventListener('dragleave', (e) => { if (e.target === dropzone) dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault(); dropzone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer?.files || []).filter(f => (config.allowPdfInput && isPdfFile(f)) || isImageFile(f));
      if (files.length) handleFiles(files); else updateStatus(imageConfig.description || 'Vui lòng chọn đúng loại tệp được hỗ trợ.', 'warn');
    });

    // File input
    fileInput.addEventListener('change', () => { const files = Array.from(fileInput.files || []); handleFiles(files); fileInput.value = ''; });

    // Clear
    document.querySelector('#clearAll')?.addEventListener('click', () => { state.files.forEach(cleanupEntry); state.files = []; renderGrid(); updateStatus('Đã xóa danh sách tệp.', 'info'); });

    // Remove per item
    grid.addEventListener('click', (e) => { const btn = e.target.closest('[data-remove]'); if (!btn) return; const id = btn.getAttribute('data-remove'); const entry = state.files.find(f => f.id === id); if (entry) cleanupEntry(entry); state.files = state.files.filter(f => f.id !== id); renderGrid(); updateStatus('Đã loại bỏ tệp khỏi danh sách.', 'info'); });

    // Quality
    document.querySelectorAll('.qitem').forEach(item => {
      item.addEventListener('click', () => setQuality(item.dataset.quality));
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setQuality(item.dataset.quality); } });
    });

    // Output
    formatButtons.forEach(btn => btn.addEventListener('click', () => setOutputFormat(btn.dataset.format)));

    // PDF mode
    pdfModeButtons.forEach(btn => btn.addEventListener('click', () => { if (!btn.disabled) setPdfMode(btn.dataset.mode); }));

    // Convert
    convertBtn.addEventListener('click', convert);

    // Global prevent default browser open file on drop
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());

    // Panel toggle on mobile
    const mql = window.matchMedia('(max-width:1100px)');
    function handleResponsive() { if (!optsToggle || !panel) return; const isCompact = mql.matches; optsToggle.style.display = isCompact ? 'inline-flex' : 'none'; if (!isCompact) panel.classList.remove('open'); }
    handleResponsive(); mql.addEventListener('change', handleResponsive);
    optsToggle?.addEventListener('click', () => panel?.classList.toggle('open'));
    document.addEventListener('click', (event) => { if (!panel || !optsToggle || !panel.classList.contains('open') || !mql.matches) return; if (panel.contains(event.target)) return; if (optsToggle.contains(event.target)) return; panel.classList.remove('open'); });

    // Shortcuts
    window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); fileInput.click(); } });
  }

  function cleanupEntry(entry) {
    if (!entry) return;
    if (entry.pdf && typeof entry.pdf.destroy === 'function') { try { entry.pdf.destroy(); } catch {} }
    entry.pdf = null;
    if (typeof entry.revokeThumb === 'function') { try { entry.revokeThumb(); } catch {} }
    entry.thumb = null; entry.revokeThumb = null; entry.imageInfo = null;
  }

  async function handleFiles(files) {
    if (!files.length) return;
    updateStatus('Đang tải và tạo xem trước…', 'info');
    let added = 0; const skippedPdf = []; const unsupported = [];
    for (const file of files) {
      const pdfCandidate = config.allowPdfInput && isPdfFile(file);
      const imageCandidate = isImageFile(file);
      if (!pdfCandidate && !imageCandidate) { unsupported.push(file.name); continue; }
      if (pdfCandidate && !pdfjs) { skippedPdf.push(file.name); continue; }
      const id = Math.random().toString(36).slice(2, 9);
      const entry = { id, type: pdfCandidate ? 'pdf' : 'image', file, name: file.name, pdf: null, pages: pdfCandidate ? 0 : 1, thumb: null, revokeThumb: null, imageInfo: null };
      state.files.push(entry); renderGrid();
      try { if (pdfCandidate) await loadPdfPreview(entry); else await loadImagePreview(entry); added++; renderGrid(); } catch (err) { console.error('Không thể xử lý tệp để tạo xem trước.', err); cleanupEntry(entry); state.files = state.files.filter(f => f.id !== id); renderGrid(); updateStatus(`Không thể xử lý tệp ${file.name}.`, 'error'); }
    }
    if (added) {
      const notes = [];
      if (skippedPdf.length) notes.push(`Bỏ qua ${skippedPdf.length} tệp PDF do thiếu thư viện đọc PDF.`);
      if (unsupported.length) notes.push(`Bỏ qua ${unsupported.length} tệp không đúng định dạng.`);
      const outputDetails = config.outputs[state.outputFormat] || {}; const actionLabel = outputDetails.buttonLabel || 'Bắt đầu chuyển đổi';
      updateStatus([`Tệp đã sẵn sàng, bấm "${actionLabel}".`, ...notes].join(' '), notes.length ? 'warn' : 'success');
    } else if (skippedPdf.length) {
      updateStatus('Không thể thêm tệp PDF vì thiếu thư viện đọc PDF.', 'error');
    } else if (unsupported.length) {
      updateStatus(imageConfig.description || 'Các tệp đã chọn không phù hợp định dạng được hỗ trợ.', 'warn');
    } else {
      updateStatus('Không có tệp hợp lệ nào được thêm vào.', 'info');
    }
  }

  function createLongTaskTimers(quality = 'normal', tone = 'info') {
    const messages = {
      normal: { after15: 'Đang xử lý các tệp lớn, vui lòng chờ thêm một chút.', after45: 'Nếu quá lâu, hãy chia nhỏ tệp hoặc giảm chất lượng.' },
      high:   { after15: 'Đang xử lý ở chất lượng cao, thời gian có thể lâu hơn.', after45: 'Hãy chờ thêm hoặc chọn chất lượng thấp hơn để nhanh hơn.' },
      ultra:  { after15: 'Đang xử lý ở chế độ siêu nét, vui lòng tiếp tục chờ.', after45: 'Chế độ siêu nét cần nhiều thời gian. Cân nhắc chất lượng thấp hơn nếu cần.' }
    }[quality] || { after15: '', after45: '' };
    const timers = [];
    if (messages.after15) timers.push(setTimeout(() => updateStatus(messages.after15, tone), 15000));
    if (messages.after45) timers.push(setTimeout(() => updateStatus(messages.after45, tone), 45000));
    return () => timers.forEach(clearTimeout);
  }

  function incrementProgressFactory(total) {
    let processed = 0; return () => { processed++; if (progressBar) progressBar.style.width = `${Math.min(100, Math.round((processed / total) * 100))}%`; };
  }

  async function convert() {
    if (!state.files.length || state.converting) return;
    const exportingPdf = state.outputFormat === 'pdf';
    const mergeAll = exportingPdf && state.pdfMode === 'merged';
    const outputConfig = config.outputs[state.outputFormat] || {};
    const fileExtension = (outputConfig.fileExtension || state.outputFormat || 'jpg').replace(/^\./, '');
    const preserveAlpha = Boolean(outputConfig.preserveAlpha);
    const targetFormatLabel = outputConfig.formatLabel || (state.outputFormat || 'tệp').toUpperCase();

    if (state.files.some(e => e.type === 'pdf') && !pdfjs) { updateStatus('Không thể xử lý tệp PDF vì thiếu thư viện PDF.', 'error'); return; }

    const jsPDFLib = exportingPdf ? (window.jspdf && window.jspdf.jsPDF) : null;
    if (exportingPdf && !jsPDFLib) { updateStatus('Thiếu thư viện tạo PDF. Vui lòng bổ sung jsPDF hoặc chọn định dạng ảnh.', 'error'); return; }
    if (typeof JSZip !== 'function' || typeof saveAs !== 'function') { updateStatus('Thiếu thư viện nén/tải xuống. Vui lòng đảm bảo JSZip và FileSaver đã được nạp.', 'error'); return; }

    state.converting = true; convertBtn.disabled = true;

    const preset = QUALITY_PRESETS[state.quality] || QUALITY_PRESETS.normal;
    const tone = preset.tone === 'warn' ? 'warn' : 'info';
    const scale = preset.dpi / 72; const jpegQuality = preset.jpegQuality;

    updateStatus(exportingPdf ? (mergeAll ? 'Bắt đầu gộp tất cả sang một tệp PDF.' : 'Bắt đầu xuất từng mục sang PDF riêng.') : `Bắt đầu xuất ${targetFormatLabel}.`, tone);

    if (progressWrap) { progressWrap.style.display = 'block'; if (progressBar) progressBar.style.width = '0%'; }
    const releaseTimers = createLongTaskTimers(state.quality, tone);
    let totalItems = state.files.reduce((sum, e) => sum + (e.type === 'pdf' ? Math.max(1, e.pages || 0) : 1), 0);
    if (!totalItems) totalItems = state.files.length || 1;
    const increment = incrementProgressFactory(totalItems);

    const resultFiles = [];
    const pushResult = (folderBase, filename, blob, needsFolder) => {
      const zipPath = needsFolder ? `${folderBase}/${filename}` : filename;
      resultFiles.push({ zipPath, outputFilename: filename, blob });
    };

    const appendCanvasToDoc = (doc, canvas) => {
      const orientation = canvas.width >= canvas.height ? 'l' : 'p';
      const format = [canvas.width || 1, canvas.height || 1];
      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      if (!doc) doc = new jsPDFLib({orientation, unit: 'px', format}); else doc.addPage(format, orientation);
      doc.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height); return doc;
    };

    try {
      let mergedDoc = null;
      for (const entry of state.files) {
        updateStatus(`Đang xử lý "${entry.name}" sang ${targetFormatLabel}…`, tone);
        const baseLabel = entry.name ? entry.name.replace(/\.[^.]+$/, '') : '';
        const folderBase = sanitizeName(baseLabel) || `tep-${entry.id}`;
        const needsFolder = exportingPdf ? !mergeAll : true;

        if (entry.type === 'pdf') {
          const pdf = await loadPdf(entry);
          const pageCount = pdf.numPages || 1;
          for (let pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
            const page = await pdf.getPage(pageIndex);
            const canvas = await renderPdfPageToCanvas(page, scale);
            if (exportingPdf && jsPDFLib) {
              if (mergeAll) {
                mergedDoc = appendCanvasToDoc(mergedDoc, canvas);
              } else {
                const singleDoc = appendCanvasToDoc(null, canvas);
                const pdfBlob = singleDoc.output('blob');
                const pdfName = pageCount > 1 ? `trang-${String(pageIndex).padStart(3, '0')}.pdf` : `${folderBase}.pdf`;
                pushResult(folderBase, pdfName, pdfBlob, needsFolder);
              }
            } else {
              const blob = await canvasToImageBlob(canvas, outputConfig, preset);
              const outputName = pageCount > 1 ? `trang-${String(pageIndex).padStart(3, '0')}.${fileExtension}` : `${folderBase}.${fileExtension}`;
              pushResult(folderBase, outputName, blob, needsFolder);
            }
            increment();
          }
        } else {
          const canvas = await rasterizeImageFile(entry.file, {preserveAlpha});
          if (exportingPdf && jsPDFLib) {
            if (mergeAll) {
              mergedDoc = appendCanvasToDoc(mergedDoc, canvas);
            } else {
              const singleDoc = appendCanvasToDoc(null, canvas);
              const pdfBlob = singleDoc.output('blob');
              pushResult(folderBase, `${folderBase}.pdf`, pdfBlob, needsFolder);
            }
          } else {
            const blob = await canvasToImageBlob(canvas, outputConfig, preset);
            pushResult(folderBase, `${folderBase}.${fileExtension}`, blob, needsFolder);
          }
          increment();
        }
      }

      if (mergeAll && exportingPdf && mergedDoc) {
        const mergedBlob = mergedDoc.output('blob');
        const mergedName = state.files.length === 1
          ? `${sanitizeName(state.files[0].name.replace(/\.[^.]+$/, ''))}.pdf`
          : `${config.slug || 'tong-hop'}-${state.files.length}-tep.pdf`;
        saveAs(mergedBlob, mergedName);
        updateStatus('Hoàn tất. Tệp đã được tải xuống.', 'success');
      } else {
        if (resultFiles.length === 1) {
          saveAs(resultFiles[0].blob, resultFiles[0].outputFilename);
          updateStatus('Hoàn tất. Tệp đ�� được tải xuống.', 'success');
        } else {
          const zip = new JSZip();
          for (const item of resultFiles) {
            zip.file(item.zipPath, item.blob);
          }
          let zipNameBase;
          if (exportingPdf) {
            zipNameBase = mergeAll ? outputConfig.zipNameBaseMerged : outputConfig.zipNameBaseSeparate;
          } else { zipNameBase = outputConfig.zipNameBase; }
          if (!zipNameBase) zipNameBase = `${config.slug || 'ket-qua'}-${state.outputFormat || 'xuat'}`;
          const zipBlob = await zip.generateAsync({type: 'blob'});
          saveAs(zipBlob, `${zipNameBase}-${Date.now()}.zip`);
          updateStatus('Hoàn tất. Tệp ZIP đã được tải xuống.', 'success');
        }
      }
    } catch (err) {
      console.error(err);
      updateStatus('Đã xảy ra lỗi trong quá trình chuyển đổi. Vui lòng thử lại.', 'error');
    } finally {
      state.converting = false;
      convertBtn.disabled = !state.files.length;
      if (progressWrap) progressWrap.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      try { releaseTimers?.(); } catch {}
    }
  }

  // ---------- Init ----------
  // Icons
  applyConversionIcons();
  // Output heading options visibility
  if (singleOutput && formatOptions) { formatOptions.style.display = 'none'; formatOptions.setAttribute('aria-hidden', 'true'); }
  else if (formatOptions) { formatOptions.style.display = ''; formatOptions.removeAttribute?.('aria-hidden'); }
  // Set initial state/UI
  setOutputFormat(state.outputFormat);
  renderGrid();
  // Attach events
  attachEventListeners();
})();
