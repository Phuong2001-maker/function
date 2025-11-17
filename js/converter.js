(function () {
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

  const state = {
    files: [],
    quality: 'normal',
    pdfMode: 'merged',
    outputFormat: initialOutput,
    converting: false
  };

  const i18n = config.i18n || {};
  const qualityMessages = {
    normal: i18n.qualityMessages?.normal || 'Normal mode (150 DPI) balances quality and size.',
    high:   i18n.qualityMessages?.high   || 'High mode (220 DPI) is clearer but produces larger files.',
    ultra:  i18n.qualityMessages?.ultra  || 'Ultra mode (600 DPI) takes longer; use it only when needed.'
  };

  function updateStatus(text = '', tone = 'info') {
    if (!statusMessage) return;
    if (!text) {
      statusMessage.className = 'status';
      statusMessage.textContent = '';
    } else {
      statusMessage.textContent = text;
      statusMessage.className = `status show ${tone}`;
    }
  }

  const DOWNLOAD_HINT_BROWSER = 'Check your browser downloads folder to open the file.';
  const DOWNLOAD_HINT_FOLDER = 'Check the folder you selected to open the files.';

  function describeDownloadedTargets(names = []) {
    const cleaned = (names || [])
      .map(name => (name || '').toString())
      .map(name => name.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (!cleaned.length) return '';
    const quoted = cleaned.map(name => `"${name}"`);
    if (quoted.length === 1) return `File ${quoted[0]}`;
    if (quoted.length === 2) return `Files ${quoted[0]} and ${quoted[1]}`;
    if (quoted.length === 3) return `Files ${quoted[0]}, ${quoted[1]} and ${quoted[2]}`;
    return `Files ${quoted[0]}, ${quoted[1]} and ${quoted.length - 2} more`;
  }

  function buildDownloadAnnouncement(detail, hint) {
    const trimmed = detail ? detail.toString().trim().replace(/\.*$/, '') : '';
    const baseSentence = trimmed ? `Done. ${trimmed}.` : 'Done.';
    return hint ? `${baseSentence} ${hint}` : baseSentence;
  }

  let floatingAlertTimeout = null;

  function ensureFloatingAlert() {
    let container = document.querySelector('#floatingAlert');
    if (container) return container;
    container = document.createElement('div');
    container.id = 'floatingAlert';
    container.className = 'floating-alert';
    document.body.appendChild(container);
    return container;
  }

  function hideFloatingAlert() {
    const alertEl = ensureFloatingAlert();
    if (!alertEl) return;
    if (floatingAlertTimeout) {
      clearTimeout(floatingAlertTimeout);
      floatingAlertTimeout = null;
    }
    alertEl.classList.remove('visible');
    alertEl.classList.add('exiting');
    const cleanup = () => {
      alertEl.classList.remove('exiting');
      alertEl.removeEventListener('animationend', cleanup);
    };
    alertEl.addEventListener('animationend', cleanup);
  }

  function showFloatingAlert(message, tone = 'warn', duration = 5000) {
    if (!message) return;
    const alertEl = ensureFloatingAlert();
    alertEl.textContent = message;
    alertEl.dataset.tone = tone;
    alertEl.classList.remove('exiting');
    alertEl.classList.add('visible');
    if (floatingAlertTimeout) clearTimeout(floatingAlertTimeout);
    floatingAlertTimeout = setTimeout(() => {
      hideFloatingAlert();
    }, duration);
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
    icons.forEach(icon => {
      icon.textContent = '';
      icon.setAttribute('aria-hidden', 'true');
    });
    if (arrow) {
      arrow.textContent = '';
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

  const QUALITY_PRESETS = {
    normal: { label: 'bình thường', dpi: 150, jpegQuality: 0.82, message: qualityMessages.normal, tone: 'info' },
    high:   { label: 'cao',          dpi: 220, jpegQuality: 0.92, message: qualityMessages.high,   tone: 'info' },
    ultra:  { label: 'siêu nét',     dpi: 600, jpegQuality: 1.00, message: qualityMessages.ultra,  tone: 'warn' }
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
    const direct = await new Promise(resolve => {
      if (typeof canvas.toBlob !== 'function') return resolve(null);
      canvas.toBlob(b => resolve(b && b.type === 'image/gif' ? b : null), 'image/gif');
    });
    if (direct) return direct;
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

  function attachEventListeners() {
    chooseBtn?.setAttribute('type', 'button');
    chooseBtn?.setAttribute('aria-controls', 'fileInput');
    chooseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); });
    chooseBtn?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });

    dropzone.addEventListener('click', (e) => { if (e.target.closest('button')) return; fileInput.click(); });
    ['dragenter', 'dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; }));
    dropzone.addEventListener('dragleave', (e) => { if (e.target === dropzone) dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault(); dropzone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer?.files || []).filter(f => (config.allowPdfInput && isPdfFile(f)) || isImageFile(f));
      if (files.length) handleFiles(files); else updateStatus(imageConfig.description || 'Please choose supported file types.', 'warn');
    });

    fileInput.addEventListener('change', () => { const files = Array.from(fileInput.files || []); handleFiles(files); fileInput.value = ''; });

    document.querySelector('#clearAll')?.addEventListener('click', () => { state.files.forEach(cleanupEntry); state.files = []; renderGrid(); updateStatus('File list cleared.', 'info'); });

    grid.addEventListener('click', (e) => { const btn = e.target.closest('[data-remove]'); if (!btn) return; const id = btn.getAttribute('data-remove'); const entry = state.files.find(f => f.id === id); if (entry) cleanupEntry(entry); state.files = state.files.filter(f => f.id !== id); renderGrid(); updateStatus('Removed the file from the list.', 'info'); });

    document.querySelectorAll('.qitem').forEach(item => {
      item.addEventListener('click', () => setQuality(item.dataset.quality));
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setQuality(item.dataset.quality); } });
    });

    formatButtons.forEach(btn => btn.addEventListener('click', () => setOutputFormat(btn.dataset.format)));

    pdfModeButtons.forEach(btn => btn.addEventListener('click', () => { if (!btn.disabled) setPdfMode(btn.dataset.mode); }));

    convertBtn.addEventListener('click', convert);

    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());

    const mql = window.matchMedia('(max-width:1100px)');
    function handleResponsive() { if (!optsToggle || !panel) return; const isCompact = mql.matches; optsToggle.style.display = isCompact ? 'inline-flex' : 'none'; if (!isCompact) panel.classList.remove('open'); }
    handleResponsive(); mql.addEventListener('change', handleResponsive);
    optsToggle?.addEventListener('click', () => panel?.classList.toggle('open'));
    document.addEventListener('click', (event) => { if (!panel || !optsToggle || !panel.classList.contains('open') || !mql.matches) return; if (panel.contains(event.target)) return; if (optsToggle.contains(event.target)) return; panel.classList.remove('open'); });

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
    updateStatus('Loading files and generating previews…', 'info');
    let added = 0; const skippedPdf = []; const unsupported = [];
    for (const file of files) {
      const pdfCandidate = config.allowPdfInput && isPdfFile(file);
      const imageCandidate = isImageFile(file);
      if (!pdfCandidate && !imageCandidate) { unsupported.push(file.name); continue; }
      if (pdfCandidate && !pdfjs) { skippedPdf.push(file.name); continue; }
      const id = Math.random().toString(36).slice(2, 9);
      const entry = { id, type: pdfCandidate ? 'pdf' : 'image', file, name: file.name, pdf: null, pages: pdfCandidate ? 0 : 1, thumb: null, revokeThumb: null, imageInfo: null };
      state.files.push(entry);
      try { if (pdfCandidate) await loadPdfPreview(entry); else await loadImagePreview(entry); added++; } catch (err) { console.error('Cannot process file for preview.', err); cleanupEntry(entry); state.files = state.files.filter(f => f.id !== id); updateStatus(`Could not process file ${file.name}.`, 'error'); }
    }
    renderGrid();
    if (added) {
      const notes = [];
      if (skippedPdf.length) notes.push(`Skipped ${skippedPdf.length} PDF files because the PDF reader library is missing.`);
      if (unsupported.length) notes.push(`Skipped ${unsupported.length} unsupported files.`);
      const outputDetails = config.outputs[state.outputFormat] || {}; const actionLabel = outputDetails.buttonLabel || 'Start converting';
      updateStatus([`Files are ready, click "${actionLabel}".`, ...notes].join(' '), notes.length ? 'warn' : 'success');
    } else if (skippedPdf.length) {
      updateStatus('Cannot add PDF because the PDF reader library is missing.', 'error');
    } else if (unsupported.length) {
      const previewCount = 3;
      const rawPreview = unsupported.slice(0, previewCount);
      const normalizedPreview = rawPreview
        .map(name => (name || '').toString().trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      const previewNames = normalizedPreview.length ? normalizedPreview : rawPreview;
      const formattedNames = previewNames.map(name => `"${name}"`).join(', ');
      const extraCount = unsupported.length - previewNames.length;
      const extraText = extraCount > 0 ? ` và ${extraCount} tệp khác` : '';
      const detailSegment = unsupported.length === 1
        ? `file ${formattedNames}`
        : `${unsupported.length} files (${formattedNames}${extraText})`;
      const reason = imageConfig.description || 'Please choose valid image formats.';
      const message = `Could not add ${detailSegment} because the format is unsupported. ${reason}`;
      updateStatus(message, 'warn');
      showFloatingAlert(message, 'warn', 5000);
    } else {
      updateStatus('No valid files were added.', 'info');
    }
  }

  function createLongTaskTimers(quality = 'normal', tone = 'info') {
    const messages = {
      normal: { after15: 'Processing large files, please wait a bit longer.', after45: 'If it takes too long, split files or choose lower quality.' },
      high:   { after15: 'Processing at high quality may take longer.', after45: 'Please wait more or choose lower quality for faster export.' },
      ultra:  { after15: 'Processing in ultra mode, please keep waiting.', after45: 'Ultra mode needs more time; consider lower quality if needed.' }
    }[quality] || { after15: '', after45: '' };
    const timers = [];
    if (messages.after15) timers.push(setTimeout(() => updateStatus(messages.after15, tone), 15000));
    if (messages.after45) timers.push(setTimeout(() => updateStatus(messages.after45, tone), 45000));
    return () => timers.forEach(clearTimeout);
  }

  function incrementProgressFactory(total) {
    let processed = 0; return () => { processed++; if (progressBar) progressBar.style.width = `${Math.min(100, Math.round((processed / total) * 100))}%`; };
  }

  const preferNativeFileSystem = false;
  async function nativeSaveFile(blob, suggestedName, mime) {
    if (!preferNativeFileSystem || !('showSaveFilePicker' in window)) return 'unsupported';
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'File', accept: { [mime || blob.type || 'application/octet-stream']: ['.' + (suggestedName.split('.').pop() || 'bin')] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      console.warn('nativeSaveFile failed, falling back to download.', e);
      return 'failed';
    }
  }

  async function nativeSaveMultiple(results) {
    if (!preferNativeFileSystem || !('showDirectoryPicker' in window)) return 'unsupported';
    try {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      for (const item of results) {
        const parts = item.zipPath.split('/').filter(Boolean);
        let dir = root;
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i], { create: true });
        }
        const filename = parts[parts.length - 1];
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(item.blob);
        await writable.close();
      }
      return 'saved';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      console.warn('nativeSaveMultiple failed, falling back to ZIP download.', e);
      return 'failed';
    }
  }

  async function convert() {
    if (!state.files.length || state.converting) return;
    const exportingPdf = state.outputFormat === 'pdf';
    const mergeAll = exportingPdf && state.pdfMode === 'merged';
    const outputConfig = config.outputs[state.outputFormat] || {};
    const fileExtension = (outputConfig.fileExtension || state.outputFormat || 'jpg').replace(/^\./, '');
    const preserveAlpha = Boolean(outputConfig.preserveAlpha);
    const targetFormatLabel = outputConfig.formatLabel || (state.outputFormat || 'tệp').toUpperCase();

    if (state.files.some(e => e.type === 'pdf') && !pdfjs) { updateStatus('Cannot process PDF files because the PDF library is missing.', 'error'); return; }

    const jsPDFLib = exportingPdf ? (window.jspdf && window.jspdf.jsPDF) : null;
    if (exportingPdf && !jsPDFLib) { updateStatus('Missing PDF generator library. Please include jsPDF or choose an image format.', 'error'); return; }
    if (typeof JSZip !== 'function' || typeof saveAs !== 'function') { updateStatus('Missing ZIP/download library. Please ensure JSZip and FileSaver are loaded.', 'error'); return; }

    state.converting = true; convertBtn.disabled = true;

    const preset = QUALITY_PRESETS[state.quality] || QUALITY_PRESETS.normal;
    const tone = preset.tone === 'warn' ? 'warn' : 'info';
    const scale = preset.dpi / 72; const jpegQuality = preset.jpegQuality;

    updateStatus(exportingPdf ? (mergeAll ? 'Merging everything into a single PDF.' : 'Exporting each item to a separate PDF.') : `Starting export to ${targetFormatLabel}.`, tone);

    if (progressWrap) { progressWrap.style.display = 'block'; if (progressBar) progressBar.style.width = '0%'; }
    const releaseTimers = createLongTaskTimers(state.quality, tone);
    let totalItems = state.files.reduce((sum, e) => sum + (e.type === 'pdf' ? Math.max(1, e.pages || 0) : 1), 0);
    if (!totalItems) totalItems = state.files.length || 1;
    const increment = incrementProgressFactory(totalItems);

    const archiveRootBase = sanitizeName(config.slug || 'ket-qua') || 'ket-qua';
    const archiveRoot = `${archiveRootBase}-${state.outputFormat || 'xuat'}`;
    const usedBaseNames = Object.create(null);
    const getUniqueBaseName = (base) => {
      const key = base || 'tep';
      const count = usedBaseNames[key] || 0;
      usedBaseNames[key] = count + 1;
      return count ? `${key}-${count + 1}` : key;
    };
    const resultFiles = [];
    const gatherResultFileNames = () => resultFiles
      .map((item) => (item.outputFilename || item.zipPath || '').split('/').pop() || '')
      .map((name) => name.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    const pushResult = (filename, blob) => {
      const safeName = (filename || '').replace(/[\\/]+/g, '-');
      const zipPath = `${archiveRoot}/${safeName}`;
      resultFiles.push({ zipPath, outputFilename: safeName, blob });
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
        updateStatus(`Processing "${entry.name}" to ${targetFormatLabel}…`, tone);
        const baseLabel = entry.name ? entry.name.replace(/\.[^.]+$/, '') : '';
        const folderBase = sanitizeName(baseLabel) || `tep-${entry.id}`;
        const entryBase = getUniqueBaseName(folderBase);

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
                const suffix = pageCount > 1 ? `-trang-${String(pageIndex).padStart(3, '0')}` : '';
                const pdfName = `${entryBase}${suffix}.pdf`;
                pushResult(pdfName, pdfBlob);
              }
            } else {
              const blob = await canvasToImageBlob(canvas, outputConfig, preset);
              const suffix = pageCount > 1 ? `-trang-${String(pageIndex).padStart(3, '0')}` : '';
              const outputName = `${entryBase}${suffix}.${fileExtension}`;
              pushResult(outputName, blob);
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
              pushResult(`${entryBase}.pdf`, pdfBlob);
            }
          } else {
            const blob = await canvasToImageBlob(canvas, outputConfig, preset);
            pushResult(`${entryBase}.${fileExtension}`, blob);
          }
          increment();
        }
      }

      if (mergeAll && exportingPdf && mergedDoc) {
        const mergedBlob = mergedDoc.output('blob');
        const mergedName = state.files.length === 1
          ? `${sanitizeName(state.files[0].name.replace(/\.[^.]+$/, ''))}.pdf`
          : `${config.slug || 'tong-hop'}-${state.files.length}-tep.pdf`;
        let saveOutcome = 'failed';
        try { saveOutcome = await nativeSaveFile(mergedBlob, mergedName, 'application/pdf'); }
        catch (err) { console.warn('nativeSaveFile failed for merged PDF.', err); }
        if (saveOutcome === 'cancelled') {
          updateStatus('Save canceled. No files were downloaded.', 'info');
          return;
        }
        if (saveOutcome !== 'saved') saveAs(mergedBlob, mergedName);
        const mergedDetail = describeDownloadedTargets([mergedName]);
        const mergedMessage = mergedDetail ? `${mergedDetail} đã được tải xuống` : 'Tệp đã được tải xuống';
        updateStatus(buildDownloadAnnouncement(mergedMessage, DOWNLOAD_HINT_BROWSER), 'success');
      } else {
        if (resultFiles.length === 1) {
          const item = resultFiles[0];
          let saveOutcome = 'failed';
          try { saveOutcome = await nativeSaveFile(item.blob, item.outputFilename, item.blob.type); }
          catch (err) { console.warn('nativeSaveFile failed for single export.', err); }
          if (saveOutcome === 'cancelled') {
          updateStatus('Save canceled. No files were downloaded.', 'info');
            return;
          }
          if (saveOutcome !== 'saved') saveAs(item.blob, item.outputFilename);
          const singleDetail = describeDownloadedTargets(gatherResultFileNames());
          const singleMessage = singleDetail ? `${singleDetail} đã được tải xuống` : 'Tệp đã được tải xuống';
          updateStatus(buildDownloadAnnouncement(singleMessage, DOWNLOAD_HINT_BROWSER), 'success');
        } else {
          let dirOutcome = 'unsupported';
          if ('showDirectoryPicker' in window) {
            try { dirOutcome = await nativeSaveMultiple(resultFiles); }
            catch (err) { console.warn('nativeSaveMultiple threw an error.', err); dirOutcome = 'failed'; }
          }
          if (dirOutcome === 'cancelled') {
          updateStatus('Save canceled. No files were downloaded.', 'info');
            return;
          }
          if (dirOutcome === 'saved') {
            const savedDetail = describeDownloadedTargets(gatherResultFileNames());
            const savedMessage = savedDetail ? `${savedDetail} đã được lưu vào thư mục bạn chọn` : 'Các tệp đã được lưu vào thư mục bạn chọn';
            updateStatus(buildDownloadAnnouncement(savedMessage, DOWNLOAD_HINT_FOLDER), 'success');
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
            const zipFilename = `${zipNameBase}-${Date.now()}.zip`;
            saveAs(zipBlob, zipFilename);
            const zipDetail = `Tệp ZIP "${zipFilename}" đã được tải xuống`;
            updateStatus(buildDownloadAnnouncement(zipDetail, DOWNLOAD_HINT_BROWSER), 'success');
          }
        }
      }
    } catch (err) {
      console.error(err);
      updateStatus('An error occurred during conversion. Please try again.', 'error');
    } finally {
      state.converting = false;
      convertBtn.disabled = !state.files.length;
      if (progressWrap) progressWrap.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      try { releaseTimers?.(); } catch {}
    }
  }

  applyConversionIcons();
  if (singleOutput && formatOptions) { formatOptions.style.display = 'none'; formatOptions.setAttribute('aria-hidden', 'true'); }
  else if (formatOptions) { formatOptions.style.display = ''; formatOptions.removeAttribute?.('aria-hidden'); }
  setOutputFormat(state.outputFormat);
  renderGrid();
  attachEventListeners();
})();

