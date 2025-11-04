// Shared converter logic for the standalone converters in /function.
// Each HTML entry point must declare window.CONVERTER_CONFIG before loading this script.
(() => {
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
      jpg: {
        formatLabel: 'JPG',
        buttonLabel: 'Xuất ảnh JPG',
        zipNameBase: 'anh-sang-jpg'
      },
      pdf: {
        formatLabel: 'PDF',
        buttonLabel: 'Xuất thành PDF',
        zipNameBaseMerged: 'anh-gop-pdf',
        zipNameBaseSeparate: 'anh-sang-pdf'
      }
    },
    availableOutputs: ['jpg', 'pdf'],
    defaultOutput: 'jpg',
    allowPdfInput: false
  };

  function mergeConfig(base, override) {
    const result = {...base};
    for (const key of Object.keys(override || {})) {
      const value = override[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = mergeConfig(base[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  const config = mergeConfig(defaultConfig, window.CONVERTER_CONFIG || {});
  const imageConfig = config.input || {};

  const supportedOutputs = ['jpg', 'pdf'];
  let availableOutputs = Array.isArray(config.availableOutputs)
    ? config.availableOutputs.filter(fmt => supportedOutputs.includes(fmt) && config.outputs[fmt])
    : supportedOutputs.filter(fmt => config.outputs[fmt]);
  if (!availableOutputs.length) {
    availableOutputs = config.outputs.jpg ? ['jpg'] : ['pdf'];
  }

  const imageMimeSet = new Set(
    Array.isArray(imageConfig.mimeTypes) ? imageConfig.mimeTypes.filter(Boolean) : []
  );
  const imageExtensions = Array.isArray(imageConfig.extensions)
    ? imageConfig.extensions.filter(Boolean).map(ext => ext.replace(/^\./, ''))
    : [];
  const extensionPattern = imageExtensions.length
    ? new RegExp(`\\.(${imageExtensions.join('|')})$`, 'i')
    : null;
  const allowImageInput = Boolean(imageMimeSet.size || imageExtensions.length);

  const pdfjs = config.allowPdfInput ? (window.pdfjsLib || null) : null;

  const fileLabelSingular = config.fileLabel || 'tệp';
  const fileLabelPlural = config.fileLabelPlural || fileLabelSingular;
  const itemLabelSingular = imageConfig.label || 'mục';
  const itemLabelPlural = imageConfig.labelPlural || itemLabelSingular;
  const itemLabelWhenUnknown = imageConfig.labelWhenUnknown || itemLabelPlural;

  const dropzone = document.querySelector('#dropzone');
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
  let formatButtons = Array.from(document.querySelectorAll('.format-btn'));
  const formatHeading = document.querySelector('#formatHeading');
  const defaultFormatHeading = formatHeading?.textContent || 'Chọn định dạng xuất';
  const formatOptions = document.querySelector('#formatOptions');
  const pdfOptions = document.querySelector('#pdfOptions');
  const pdfModeButtons = Array.from(document.querySelectorAll('.pdf-mode-btn'));

  formatButtons.forEach(btn => {
    const fmt = btn.dataset.format;
    if (!availableOutputs.includes(fmt)) {
      btn.remove();
    }
  });
  formatButtons = Array.from(document.querySelectorAll('.format-btn'));

  if (!dropzone || !fileInput || !grid || !convertBtn) {
    console.error('Thiếu phần tử giao diện cần thiết.');
    return;
  }

  const initialOutput = availableOutputs.includes(config.defaultOutput)
    ? config.defaultOutput
    : availableOutputs[0];
  const singleOutput = availableOutputs.length === 1;

  const state = {
    files: [], // {id,type,file,name,pdf,pages,thumb,revokeThumb,imageInfo}
    quality: 'normal',
    pdfMode: 'merged',
    outputFormat: initialOutput,
    converting: false
  };

  if (fileInput) {
    const accepts = [];
    if (imageConfig.accept) accepts.push(imageConfig.accept);
    if (config.allowPdfInput) accepts.push('.pdf,application/pdf');
    if (accepts.length) fileInput.setAttribute('accept', accepts.join(','));
  }

  if (singleOutput) {
    const targetOutput = config.outputs[state.outputFormat] || {};
    if (formatHeading) formatHeading.textContent = targetOutput.buttonLabel || defaultFormatHeading;
    if (formatOptions) {
      formatOptions.style.display = 'none';
      formatOptions.setAttribute('aria-hidden', 'true');
    }
  } else {
    if (formatHeading) formatHeading.textContent = defaultFormatHeading;
    if (formatOptions) {
      formatOptions.style.display = '';
      formatOptions.removeAttribute?.('aria-hidden');
    }
  }

  const mql = window.matchMedia('(max-width:1100px)');
  const compactLabel = '⚙️ Tùy chọn chuyển đổi';
  const desktopLabel = '⚙️ Tùy chọn chuyển đổi';

  handleResponsive();
  mql.addEventListener('change', handleResponsive);
  optsToggle?.addEventListener('click', () => panel?.classList.toggle('open'));
  document.addEventListener('click', handleOutsidePanelClick);

  setPdfMode(state.pdfMode);
  setOutputFormat(state.outputFormat);
  renderGrid();

  if (config.allowPdfInput) {
    if (pdfjs) {
      pdfjs.GlobalWorkerOptions.workerSrc = './libs/pdfjs/pdf.worker.min.js';
    } else {
      updateStatus('Không thể tải thư viện PDF. Bạn vẫn có thể xử lý ảnh.', 'warn');
    }
  }

  attachEventListeners();

  const QUALITY_PRESETS = {
    normal: {
      label: 'bình thường',
      dpi: 150,
      jpegQuality: 0.82,
      message: 'Chế độ bình thường (150 DPI) cân bằng tốc độ và dung lượng.',
      tone: 'info'
    },
    high: {
      label: 'cao',
      dpi: 220,
      jpegQuality: 0.92,
      message: 'Chế độ cao (220 DPI) cho ảnh nét hơn nhưng dung lượng lớn hơn.',
      tone: 'info'
    },
    ultra: {
      label: 'siêu nét',
      dpi: 600,
      jpegQuality: 1,
      message: 'Chế độ siêu nét (600 DPI) tiêu tốn nhiều tài nguyên, chỉ nên dùng khi cần.',
      tone: 'warn'
    }
  };

  const LONG_TASK_MESSAGES = {
    normal: {
      after15: 'Đang xử lý các tệp lớn, vui lòng chờ thêm một chút.',
      after45: 'Tiến trình vẫn tiếp tục. Nếu quá lâu, hãy tách nhỏ tệp hoặc giảm chất lượng.'
    },
    high: {
      after15: 'Đang xử lý ở chế độ chất lượng cao, sẽ mất thời gian lâu hơn.',
      after45: 'Tiếp tục chờ ở chế độ chất lượng cao. Cân nhắc quay về chế độ bình thường nếu cần.'
    },
    ultra: {
      after15: 'Đang xử lý ở chế độ siêu nét, vui lòng kiên nhẫn.',
      after45: 'Vẫn xử lý chế độ siêu nét. Với tệp rất lớn, hãy thử lại với chất lượng thấp hơn.'
    }
  };

  function handleResponsive() {
    if (!optsToggle || !panel) return;
    const isCompact = mql.matches;
    optsToggle.style.display = isCompact ? 'inline-flex' : 'none';
    optsToggle.textContent = isCompact ? compactLabel : desktopLabel;
    if (!isCompact) panel.classList.remove('open');
  }

  function handleOutsidePanelClick(event) {
    if (!panel || !optsToggle || !panel.classList.contains('open') || !mql.matches) return;
    if (panel.contains(event.target)) return;
    if (optsToggle.contains(event.target)) return;
    panel.classList.remove('open');
  }

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

  function sanitizeName(name) {
    return (name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  function cleanupEntry(entry) {
    if (!entry) return;
    if (entry.pdf && typeof entry.pdf.destroy === 'function') {
      try { entry.pdf.destroy(); } catch (err) { console.warn('Không thể huỷ PDF', err); }
    }
    entry.pdf = null;
    if (typeof entry.revokeThumb === 'function') {
      try { entry.revokeThumb(); } catch (err) { console.warn('Không thể thu hồi thumbnail', err); }
    }
    entry.thumb = null;
    entry.revokeThumb = null;
    entry.imageInfo = null;
  }

  function updateSelection() {
    if (!selectionBar || !selectionCount || !pageCount) return;
    const fileTotal = state.files.length;
    if (!fileTotal) {
      selectionBar.style.display = 'none';
      selectionCount.textContent = `0 ${fileLabelPlural}`;
      pageCount.textContent = `0 ${itemLabelPlural}`;
    } else {
      selectionBar.style.display = 'flex';
      selectionCount.textContent = `${fileTotal} ${fileTotal === 1 ? fileLabelSingular : fileLabelPlural}`;
      const itemTotal = state.files.reduce((sum, entry) => {
        if (entry.type === 'pdf') {
          return sum + Math.max(1, entry.pages || 0);
        }
        return sum + 1;
      }, 0);
      const itemLabel = itemTotal === 1 ? itemLabelSingular : itemLabelPlural;
      pageCount.textContent = `${itemTotal} ${itemLabel}`;
    }
    if (emptyState) emptyState.style.display = fileTotal ? 'none' : 'block';
    convertBtn.disabled = !fileTotal || state.converting;
  }

  function renderGrid() {
    if (!grid) return;
    if (!state.files.length) {
      grid.innerHTML = '';
      updateSelection();
      return;
    }
    const cards = state.files.map(entry => {
      const info = entry.type === 'pdf'
        ? (entry.pages ? `${entry.pages} trang` : 'Đang đếm trang…')
        : (entry.imageInfo ? `${entry.imageInfo.width}×${entry.imageInfo.height}` : '1 ảnh');
      const alt = entry.type === 'pdf'
        ? `Trang đầu của ${entry.name}`
        : `Ảnh xem trước của ${entry.name}`;
      const thumb = entry.thumb
        ? `<img src="${entry.thumb}" alt="${alt}">`
        : '<span class="muted">Đang tạo xem trước…</span>';
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

  async function rasterizeImageFile(file) {
    if (!file) throw new Error('Thiếu dữ liệu ảnh nguồn.');

    if ('createImageBitmap' in window && typeof createImageBitmap === 'function') {
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width || 1;
        canvas.height = bitmap.height || 1;
        const ctx = canvas.getContext('2d', {alpha: false});
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        return canvas;
      } catch (err) {
        bitmap?.close?.();
        console.warn('createImageBitmap thất bại, dùng ảnh thường.', err);
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
      const width = img.naturalWidth || img.width || 1;
      const height = img.naturalHeight || img.height || 1;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', {alpha: false});
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function canvasToJpeg(canvas, quality) {
    return await new Promise((resolve, reject) => {
      canvas.toBlob(result => {
        if (result) resolve(result);
        else reject(new Error('Không thể tạo ảnh JPG.'));
      }, 'image/jpeg', quality);
    });
  }

  async function fileToArrayBuffer(file) {
    return await new Response(file).arrayBuffer();
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
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
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
    if (typeof entry.revokeThumb === 'function') {
      entry.revokeThumb();
    }
    const objectUrl = URL.createObjectURL(entry.file);
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        entry.pages = 1;
        entry.imageInfo = {
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height
        };
        entry.thumb = objectUrl;
        entry.revokeThumb = () => {
          URL.revokeObjectURL(objectUrl);
          entry.revokeThumb = null;
        };
        resolve();
      };
      img.onerror = err => {
        URL.revokeObjectURL(objectUrl);
        reject(err || new Error('Không thể đọc ảnh.'));
      };
      img.src = objectUrl;
    });
  }

  function isPdfFile(file) {
    return file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
  }

  function isImageFile(file) {
    if (isPdfFile(file)) return false;
    if (!allowImageInput) return false;
    const typeMatch = imageMimeSet.size ? imageMimeSet.has(file.type) : false;
    const extMatch = extensionPattern ? extensionPattern.test(file.name || '') : false;
    const fallback = !imageMimeSet.size && !extensionPattern
      ? file.type.startsWith('image/')
      : false;
    return typeMatch || extMatch || fallback;
  }

  function attachEventListeners() {
    dropzone.addEventListener('click', event => {
      if (event.target.closest('button')) return;
      fileInput.click();
    });

    chooseBtn?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      handleFiles(files);
      fileInput.value = '';
    });

    ['dragenter', 'dragover'].forEach(evt =>
      dropzone.addEventListener(evt, event => {
        event.preventDefault();
        dropzone.classList.add('dragover');
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      })
    );

    dropzone.addEventListener('dragleave', event => {
      if (event.target === dropzone) {
        dropzone.classList.remove('dragover');
      }
    });

    dropzone.addEventListener('drop', event => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
      const files = Array.from(event.dataTransfer?.files || []).filter(file => {
        if (config.allowPdfInput && isPdfFile(file)) return true;
        return isImageFile(file);
      });
      if (files.length) {
        handleFiles(files);
      } else {
        const description = imageConfig.description || 'Vui lòng chọn đúng định dạng được hỗ trợ.';
        updateStatus(description, 'warn');
      }
    });

    window.addEventListener('dragover', event => event.preventDefault());
    window.addEventListener('drop', event => event.preventDefault());

    document.querySelector('#clearAll')?.addEventListener('click', () => {
      state.files.forEach(cleanupEntry);
      state.files = [];
      renderGrid();
      updateStatus('Đã xóa danh sách tệp.', 'info');
    });

    grid.addEventListener('click', event => {
      const btn = event.target.closest('[data-remove]');
      if (!btn) return;
      const id = btn.getAttribute('data-remove');
      const entry = state.files.find(f => f.id === id);
      if (entry) cleanupEntry(entry);
      state.files = state.files.filter(f => f.id !== id);
      renderGrid();
      updateStatus('Đã loại bỏ tệp khỏi danh sách.', 'info');
    });

    document.querySelectorAll('.qitem').forEach(item => {
      item.addEventListener('click', () => setQuality(item.dataset.quality));
      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setQuality(item.dataset.quality);
        }
      });
    });

    formatButtons.forEach(btn => {
      btn.addEventListener('click', () => setOutputFormat(btn.dataset.format));
    });

    pdfModeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        setPdfMode(btn.dataset.mode);
      });
    });

    convertBtn.addEventListener('click', convert);

    window.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        fileInput.click();
      }
    });
  }

  async function handleFiles(files) {
    if (!files.length) return;
    updateStatus('Đang tải tệp…', 'info');
    let added = 0;
    const skippedPdf = [];
    const unsupported = [];

    for (const file of files) {
      const pdfCandidate = config.allowPdfInput && isPdfFile(file);
      const imageCandidate = isImageFile(file);

      if (!pdfCandidate && !imageCandidate) {
        unsupported.push(file.name);
        continue;
      }
      if (pdfCandidate && !pdfjs) {
        skippedPdf.push(file.name);
        continue;
      }

      const id = Math.random().toString(36).slice(2, 9);
      const entry = {
        id,
        type: pdfCandidate ? 'pdf' : 'image',
        file,
        name: file.name,
        pdf: null,
        pages: pdfCandidate ? 0 : 1,
        thumb: null,
        revokeThumb: null,
        imageInfo: null
      };

      state.files.push(entry);
      renderGrid();

      try {
        if (pdfCandidate) {
          await loadPdfPreview(entry);
        } else {
          await loadImagePreview(entry);
        }
        added++;
        renderGrid();
      } catch (err) {
        console.error('Không thể xử lý tệp', err);
        cleanupEntry(entry);
        state.files = state.files.filter(f => f.id !== id);
        renderGrid();
        updateStatus(`Không thể xử lý tệp ${file.name}.`, 'error');
      }
    }

    if (added) {
      const notes = [];
      if (skippedPdf.length) {
        notes.push(`Bỏ qua ${skippedPdf.length} tệp PDF vì thư viện PDF chưa sẵn sàng.`);
      }
      if (unsupported.length) {
        notes.push(`Bỏ qua ${unsupported.length} tệp không đúng định dạng.`);
      }
      const actionLabel = state.outputFormat === 'pdf'
        ? config.outputs.pdf.buttonLabel
        : config.outputs.jpg.buttonLabel;
      const message = [`Tệp đã sẵn sàng, bấm "${actionLabel}".`, ...notes].join(' ');
      updateStatus(message, notes.length ? 'warn' : 'success');
    } else if (skippedPdf.length) {
      updateStatus('Không thể xử lý PDF vì thư viện chưa sẵn sàng. Kiểm tra kết nối rồi thử lại.', 'error');
    } else if (unsupported.length) {
      const description = imageConfig.description || 'Các tệp bạn chọn không thuộc định dạng được hỗ trợ.';
      updateStatus(description, 'warn');
    } else {
      updateStatus('Không có tệp hợp lệ nào được thêm.', 'info');
    }
  }

  function setQuality(quality) {
    const key = QUALITY_PRESETS[quality] ? quality : 'normal';
    state.quality = key;
    document.querySelectorAll('.qitem').forEach(el => {
      const active = el.dataset.quality === key;
      el.classList.toggle('active', active);
      el.setAttribute('aria-checked', active);
    });
    const preset = QUALITY_PRESETS[key];
    updateStatus(preset.message, preset.tone);
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

  function updateConvertLabel() {
    if (!convertLabel) return;
    convertLabel.textContent = state.outputFormat === 'pdf'
      ? config.outputs.pdf.buttonLabel
      : config.outputs.jpg.buttonLabel;
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

  function createLongTaskTimers(quality = 'normal', tone = 'info') {
    const key = LONG_TASK_MESSAGES[quality] ? quality : 'normal';
    const messages = LONG_TASK_MESSAGES[key];
    const timers = [];
    timers.push(setTimeout(() => updateStatus(messages.after15, tone), 15000));
    timers.push(setTimeout(() => updateStatus(messages.after45, tone), 45000));
    return () => timers.forEach(clearTimeout);
  }

  function incrementProgressFactory(total) {
    let processed = 0;
    return () => {
      processed++;
      if (progressBar) {
        const percent = Math.round((processed / total) * 100);
        progressBar.style.width = `${Math.min(100, percent)}%`;
      }
    };
  }

  async function convert() {
    if (!state.files.length || state.converting) return;

    const exportingPdf = state.outputFormat === 'pdf';
    const mergeAll = exportingPdf && state.pdfMode === 'merged';

    if (state.files.some(entry => entry.type === 'pdf') && !pdfjs) {
      updateStatus('Không thể xử lý PDF vì thư viện chưa tải xong.', 'error');
      return;
    }

    const jsPDFLib = exportingPdf ? (window.jspdf && window.jspdf.jsPDF) : null;
    if (exportingPdf && !jsPDFLib) {
      updateStatus('Không thể tải thư viện tạo PDF. Vui lòng kiểm tra mạng rồi thử lại.', 'error');
      return;
    }
    if (typeof JSZip !== 'function' || typeof saveAs !== 'function') {
      updateStatus('Thiếu thư viện nén hoặc tải xuống. Vui lòng tải lại trang.', 'error');
      return;
    }

    state.converting = true;
    convertBtn.disabled = true;

    const preset = QUALITY_PRESETS[state.quality] || QUALITY_PRESETS.normal;
    const tone = preset.tone === 'warn' ? 'warn' : 'info';
    const scale = preset.dpi / 72;
    const jpegQuality = preset.jpegQuality;

    const startMessage = exportingPdf
      ? (mergeAll
        ? 'Bắt đầu gộp tất cả sang một tệp PDF.'
        : 'Bắt đầu xuất từng mục sang PDF riêng.')
      : 'Bắt đầu xuất ảnh JPG.';
    updateStatus(startMessage, tone);

    if (progressWrap) {
      progressWrap.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
    }

    const releaseTimers = createLongTaskTimers(state.quality, tone);
    const zip = new JSZip();
    let totalItems = state.files.reduce((sum, entry) => {
      if (entry.type === 'pdf') {
        return sum + Math.max(1, entry.pages || 0);
      }
      return sum + 1;
    }, 0);
    if (!totalItems) totalItems = state.files.length || 1;
    const incrementProgress = incrementProgressFactory(totalItems);

    const appendCanvasToDoc = (doc, canvas) => {
      const orientation = canvas.width >= canvas.height ? 'l' : 'p';
      const format = [canvas.width || 1, canvas.height || 1];
      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      if (!doc) {
        doc = new jsPDFLib({orientation, unit: 'px', format});
      } else {
        doc.addPage(format, orientation);
      }
      doc.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height);
      return doc;
    };

    try {
      let mergedDoc = null;

      for (const entry of state.files) {
        const targetLabel = exportingPdf
          ? config.outputs.pdf.formatLabel
          : config.outputs.jpg.formatLabel;
        updateStatus(`Đang xử lý "${entry.name}" sang ${targetLabel}…`, tone);

        const baseLabel = entry.name ? entry.name.replace(/\.[^.]+$/, '') : '';
        const folderBase = sanitizeName(baseLabel) || `tep-${entry.id}`;
        const needsFolder = exportingPdf ? !mergeAll : true;
        const container = needsFolder ? zip.folder(folderBase) : zip;

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
                const pdfName = pageCount > 1
                  ? `trang-${String(pageIndex).padStart(3, '0')}.pdf`
                  : `${folderBase}.pdf`;
                container.file(pdfName, pdfBlob);
              }
            } else {
              const blob = await canvasToJpeg(canvas, jpegQuality);
              const buffer = await blob.arrayBuffer();
              const jpgName = pageCount > 1
                ? `trang-${String(pageIndex).padStart(3, '0')}.jpg`
                : `${folderBase}.jpg`;
              container.file(jpgName, buffer);
            }

            incrementProgress();
          }
        } else {
          const canvas = await rasterizeImageFile(entry.file);
          if (exportingPdf && jsPDFLib) {
            if (mergeAll) {
              mergedDoc = appendCanvasToDoc(mergedDoc, canvas);
            } else {
              const singleDoc = appendCanvasToDoc(null, canvas);
              const pdfBlob = singleDoc.output('blob');
              container.file(`${folderBase}.pdf`, pdfBlob);
            }
          } else {
            const blob = await canvasToJpeg(canvas, jpegQuality);
            const buffer = await blob.arrayBuffer();
            container.file(`${folderBase}.jpg`, buffer);
          }

          incrementProgress();
        }
      }

      if (mergeAll && exportingPdf && mergedDoc) {
        const mergedBlob = mergedDoc.output('blob');
        const mergedName = state.files.length === 1
          ? `${sanitizeName(state.files[0].name.replace(/\.[^.]+$/, '')) || config.slug}.pdf`
          : `${config.slug || 'tong-hop'}-${state.files.length}-tep.pdf`;
        zip.file(mergedName, mergedBlob);
      }

      const zipBlob = await zip.generateAsync({type: 'blob'});
      const zipNameBase = exportingPdf
        ? (mergeAll ? config.outputs.pdf.zipNameBaseMerged : config.outputs.pdf.zipNameBaseSeparate)
        : config.outputs.jpg.zipNameBase;
      saveAs(zipBlob, `${zipNameBase}-${Date.now()}.zip`);
      updateStatus('Hoàn tất! Đang tải xuống tệp ZIP.', 'success');
    } catch (err) {
      console.error(err);
      updateStatus('Đã xảy ra lỗi trong quá trình chuyển đổi. Vui lòng thử lại.', 'error');
    } finally {
      releaseTimers();
      if (progressWrap) progressWrap.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      state.converting = false;
      convertBtn.disabled = !state.files.length;
    }
  }
})();
