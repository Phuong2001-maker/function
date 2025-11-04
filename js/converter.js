// Shared converter logic for format-specific pages.
// Each HTML file should populate window.CONVERTER_CONFIG before loading this script.
(() => {
  const defaultConfig = {
    slug: 'chuyen-doi',
    fileLabel: 'tá»‡p',
    fileLabelPlural: 'tá»‡p',
    input: {
      label: 'áº£nh',
      labelPlural: 'áº£nh',
      labelWhenUnknown: 'áº£nh',
      mimeTypes: ['image/png', 'image/jpeg', 'image/pjpeg', 'image/webp', 'image/gif'],
      extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
      accept: '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/pjpeg,image/webp,image/gif',
      description: 'Chá»‰ há»— trá»£ áº£nh PNG, JPG, JPEG, WebP hoáº·c GIF.'
    },
    outputs: {
      jpg: {
        formatLabel: 'JPG',
        buttonLabel: 'Chuyá»ƒn sang JPG',
        zipNameBase: 'anh-sang-jpg'
      },
      pdf: {
        formatLabel: 'PDF',
        buttonLabel: 'Xuáº¥t thÃ nh PDF',
        zipNameBaseMerged: 'anh-gop-pdf',
        zipNameBaseSeparate: 'anh-sang-pdf'
      }
    },
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

  const fileLabelSingular = config.fileLabel || 'tá»‡p';
  const fileLabelPlural = config.fileLabelPlural || fileLabelSingular;
  const itemLabelSingular = imageConfig.label || 'má»¥c';
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
  const supportedOutputs = ['jpg', 'pdf'];

  let availableOutputs = Array.isArray(config.availableOutputs)
    ? config.availableOutputs.filter(fmt => supportedOutputs.includes(fmt) && config.outputs[fmt])
    : supportedOutputs.filter(fmt => config.outputs[fmt]);
  if (!availableOutputs.length) {
    availableOutputs = config.outputs.jpg ? ['jpg'] : ['pdf'];
  }

  formatButtons.forEach(btn => {
    const fmt = btn.dataset.format;
    if (!availableOutputs.includes(fmt)) {
      btn.remove();
    }
  });
  formatButtons = Array.from(document.querySelectorAll('.format-btn'));

  if (!dropzone || !fileInput || !grid || !convertBtn) {
    console.error('Thiáº¿u pháº§n tá»­ giao diá»‡n cáº§n thiáº¿t.');
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
    if (accepts.length) {
      fileInput.setAttribute('accept', accepts.join(','));
    }
  }

  if (singleOutput) {
    const targetOutput = config.outputs[state.outputFormat] || {};
    if (formatHeading) {
      formatHeading.textContent = targetOutput.buttonLabel || defaultFormatHeading;
    }
    if (formatOptions) {
      formatOptions.style.display = 'none';
      formatOptions.setAttribute('aria-hidden', 'true');
    }
  } else {
    if (formatHeading) {
      formatHeading.textContent = defaultFormatHeading;
    }
    if (formatOptions) {
      formatOptions.style.display = '';
      if (typeof formatOptions.removeAttribute === 'function') {
        formatOptions.removeAttribute('aria-hidden');
      }
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
      updateStatus('KhÃ´ng thá»ƒ táº£i thÆ° viá»‡n xá»­ lÃ½ PDF. Báº¡n váº«n cÃ³ thá»ƒ lÃ m viá»‡c vá»›i áº£nh.', 'warn');
    }
  }

  attachEventListeners();

  const QUALITY_PRESETS = {
    normal: {
      label: 'bÃ¬nh thÆ°á»ng',
      dpi: 150,
      jpegQuality: 0.82,
      message: 'Cháº¿ Ä‘á»™ bÃ¬nh thÆ°á»ng (150 DPI) cÃ¢n báº±ng tá»‘c Ä‘á»™ vÃ  dung lÆ°á»£ng.',
      tone: 'info'
    },
    high: {
      label: 'cao',
      dpi: 220,
      jpegQuality: 0.92,
      message: 'Cháº¿ Ä‘á»™ cao (220 DPI) cho áº£nh nÃ©t hÆ¡n nhÆ°ng dung lÆ°á»£ng lá»›n hÆ¡n.',
      tone: 'info'
    },
    ultra: {
      label: 'siÃªu nÃ©t',
      dpi: 600,
      jpegQuality: 1,
      message: 'Cháº¿ Ä‘á»™ siÃªu nÃ©t (600 DPI) tá»‘n nhiá»u tÃ i nguyÃªn, chá»‰ nÃªn dÃ¹ng khi thá»±c sá»± cáº§n.',
      tone: 'warn'
    }
  };

  const LONG_TASK_MESSAGES = {
    normal: {
      after15: 'Äang xá»­ lÃ½ cÃ¡c tá»‡p lá»›n, vui lÃ²ng chá» thÃªm má»™t chÃºt.',
      after45: 'Tiáº¿n trÃ¬nh váº«n tiáº¿p tá»¥c. Náº¿u quÃ¡ lÃ¢u, hÃ£y tÃ¡ch nhá» tá»‡p hoáº·c giáº£m cháº¥t lÆ°á»£ng.'
    },
    high: {
      after15: 'Äang xá»­ lÃ½ á»Ÿ cháº¿ Ä‘á»™ cháº¥t lÆ°á»£ng cao, sáº½ máº¥t thá»i gian lÃ¢u hÆ¡n.',
      after45: 'QuÃ¡ trÃ¬nh váº«n cháº¡y á»Ÿ cháº¿ Ä‘á»™ cháº¥t lÆ°á»£ng cao. HÃ£y cÃ¢n nháº¯c quay vá» cháº¿ Ä‘á»™ bÃ¬nh thÆ°á»ng náº¿u cáº§n.'
    },
    ultra: {
      after15: 'Äang xá»­ lÃ½ á»Ÿ cháº¿ Ä‘á»™ siÃªu nÃ©t, vui lÃ²ng kiÃªn nháº«n chá».',
      after45: 'Váº«n Ä‘ang xá»­ lÃ½ cháº¿ Ä‘á»™ siÃªu nÃ©t. Vá»›i tá»‡p ráº¥t lá»›n, hÃ£y thá»­ láº¡i vá»›i cháº¥t lÆ°á»£ng tháº¥p hÆ¡n.'
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
      try { entry.pdf.destroy(); } catch (err) { console.warn('KhÃ´ng thá»ƒ giáº£i phÃ³ng PDF', err); }
    }
    entry.pdf = null;
    entry.pages = entry.type === 'pdf' ? 0 : entry.pages;
    if (typeof entry.revokeThumb === 'function') {
      try { entry.revokeThumb(); } catch (err) { console.warn('KhÃ´ng thá»ƒ thu há»“i thumbnail', err); }
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
      const itemLabel = typeof itemTotal === 'number' && itemTotal > 0
        ? (itemTotal === 1 ? itemLabelSingular : itemLabelPlural)
        : itemLabelWhenUnknown;
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
        ? (entry.pages ? `${entry.pages} trang` : 'Äang Ä‘áº¿m trangâ€¦')
        : (entry.imageInfo
          ? `${entry.imageInfo.width}Ã—${entry.imageInfo.height}`
          : '1 áº£nh');
      const alt = entry.type === 'pdf'
        ? `Trang Ä‘áº§u cá»§a ${entry.name}`
        : `áº¢nh xem trÆ°á»›c cá»§a ${entry.name}`;
      const thumb = entry.thumb
        ? `<img src="${entry.thumb}" alt="${alt}">`
        : '<span class="muted">Äang táº¡o xem trÆ°á»›câ€¦</span>';
      return `
        <div class="card">
          <button class="remove" type="button" data-remove="${entry.id}" title="XÃ³a tá»‡p">Ã—</button>
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
    if (!file) throw new Error('Thiáº¿u dá»¯ liá»‡u áº£nh nguá»“n.');

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
        console.warn('createImageBitmap tháº¥t báº¡i, dÃ¹ng áº£nh thÆ°á»ng.', err);
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
        else reject(new Error('KhÃ´ng thá»ƒ táº¡o áº£nh JPG.'));
      }, 'image/jpeg', quality);
    });
  }

  async function fileToArrayBuffer(file) {
    return await new Response(file).arrayBuffer();
  }

  async function loadPdf(entry) {
    if (!pdfjs) throw new Error('ThÆ° viá»‡n PDF chÆ°a sáºµn sÃ ng.');
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
        reject(err || new Error('KhÃ´ng thá»ƒ Ä‘á»c áº£nh.'));
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
        const description = imageConfig.description || 'Vui lÃ²ng chá»n Ä‘Ãºng Ä‘á»‹nh dáº¡ng Ä‘Æ°á»£c há»— trá»£.';
        updateStatus(description, 'warn');
      }
    });

    window.addEventListener('dragover', event => event.preventDefault());
    window.addEventListener('drop', event => event.preventDefault());

    document.querySelector('#clearAll')?.addEventListener('click', () => {
      state.files.forEach(cleanupEntry);
      state.files = [];
      renderGrid();
      updateStatus('ÄÃ£ xÃ³a danh sÃ¡ch tá»‡p.', 'info');
    });

    grid.addEventListener('click', event => {
      const btn = event.target.closest('[data-remove]');
      if (!btn) return;
      const id = btn.getAttribute('data-remove');
      const entry = state.files.find(f => f.id === id);
      if (entry) cleanupEntry(entry);
      state.files = state.files.filter(f => f.id !== id);
      renderGrid();
      updateStatus('ÄÃ£ loáº¡i bá» tá»‡p khá»i danh sÃ¡ch.', 'info');
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
    updateStatus('Äang táº£i tá»‡pâ€¦', 'info');
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
        console.error('KhÃ´ng thá»ƒ xá»­ lÃ½ tá»‡p', err);
        cleanupEntry(entry);
        state.files = state.files.filter(f => f.id !== id);
        renderGrid();
        updateStatus(`KhÃ´ng thá»ƒ xá»­ lÃ½ tá»‡p ${file.name}.`, 'error');
      }
    }

    if (added) {
      const notes = [];
      if (skippedPdf.length) {
        notes.push(`Bá» qua ${skippedPdf.length} tá»‡p PDF vÃ¬ thÆ° viá»‡n PDF chÆ°a sáºµn sÃ ng.`);
      }
      if (unsupported.length) {
        notes.push(`Bá» qua ${unsupported.length} tá»‡p khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng.`);
      }
      const actionLabel = state.outputFormat === 'pdf'
        ? config.outputs.pdf.buttonLabel
        : config.outputs.jpg.buttonLabel;
      const message = [`Tá»‡p Ä‘Ã£ sáºµn sÃ ng, báº¥m "${actionLabel}".`, ...notes].join(' ');
      updateStatus(message, notes.length ? 'warn' : 'success');
    } else if (skippedPdf.length) {
      updateStatus('KhÃ´ng thá»ƒ xá»­ lÃ½ PDF vÃ¬ thÆ° viá»‡n chÆ°a táº£i xong. HÃ£y kiá»ƒm tra káº¿t ná»‘i máº¡ng vÃ  thá»­ láº¡i.', 'error');
    } else if (unsupported.length) {
      const description = imageConfig.description || 'CÃ¡c tá»‡p vá»«a chá»n khÃ´ng thuá»™c Ä‘á»‹nh dáº¡ng Ä‘Æ°á»£c há»— trá»£.';
      updateStatus(description, 'warn');
    } else {
      updateStatus('KhÃ´ng cÃ³ tá»‡p há»£p lá»‡ nÃ o Ä‘Æ°á»£c thÃªm.', 'info');
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
    const next = format === 'pdf' ? 'pdf' : 'jpg';
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
    if (show) {
      setPdfMode(state.pdfMode);
    }
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
      updateStatus('KhÃ´ng thá»ƒ xá»­ lÃ½ PDF vÃ¬ thÆ° viá»‡n chÆ°a sáºµn sÃ ng.', 'error');
      return;
    }

    const jsPDFLib = exportingPdf ? (window.jspdf && window.jspdf.jsPDF) : null;
    if (exportingPdf && !jsPDFLib) {
      updateStatus('KhÃ´ng thá»ƒ táº£i thÆ° viá»‡n táº¡o PDF. Vui lÃ²ng kiá»ƒm tra káº¿t ná»‘i máº¡ng rá»“i thá»­ láº¡i.', 'error');
      return;
    }
    if (typeof JSZip !== 'function' || typeof saveAs !== 'function') {
      updateStatus('Thiáº¿u thÆ° viá»‡n nÃ©n hoáº·c táº£i xuá»‘ng. Vui lÃ²ng táº£i láº¡i trang.', 'error');
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
        ? 'Báº¯t Ä‘áº§u gá»™p cÃ¡c má»¥c sang má»™t tá»‡p PDF.'
        : 'Báº¯t Ä‘áº§u xuáº¥t tá»«ng má»¥c sang PDF riÃªng.')
      : 'Báº¯t Ä‘áº§u chuyá»ƒn sang JPG.';
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
        updateStatus(`Äang xá»­ lÃ½ "${entry.name}" sang ${targetLabel}â€¦`, tone);

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
                let singleDoc = appendCanvasToDoc(null, canvas);
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
              let singleDoc = appendCanvasToDoc(null, canvas);
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
      updateStatus('HoÃ n táº¥t! Äang táº£i xuá»‘ng tá»‡p ZIP.', 'success');
    } catch (err) {
      console.error(err);
      updateStatus('ÄÃ£ xáº£y ra lá»—i trong quÃ¡ trÃ¬nh chuyá»ƒn Ä‘á»•i. Vui lÃ²ng thá»­ láº¡i.', 'error');
    } finally {
      releaseTimers();
      if (progressWrap) progressWrap.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      state.converting = false;
      convertBtn.disabled = !state.files.length;
    }
  }
})();





