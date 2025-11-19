(function () {
  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  document.querySelectorAll('.tool-layout').forEach(section => {
    const dropzone = section.querySelector('.dropzone');
    const input = section.querySelector('.hidden-input');
    const list = section.querySelector('[data-role="file-list"]');
    const convertBtn = section.querySelector('.convert');
    const qualityCards = section.querySelectorAll('.quality-card');

    if (!dropzone || !list) return;
    const files = [];
    const emptyText = list.dataset.empty || '';

    function renderList() {
      if (!files.length) {
        list.innerHTML = `<li class="empty">${emptyText}</li>`;
        return;
      }
      list.innerHTML = files.map(file => `<li>${file.name} - ${formatSize(file.size)}</li>`).join('');
    }

    function addFiles(items) {
      Array.from(items || []).forEach(file => {
        files.push({ name: file.name, size: file.size });
      });
      renderList();
    }

    dropzone.addEventListener('click', () => input && input.click());
    dropzone.addEventListener('dragover', event => {
      event.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', event => {
      if (!dropzone.contains(event.relatedTarget)) {
        dropzone.classList.remove('dragover');
      }
    });
    dropzone.addEventListener('drop', event => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
      if (event.dataTransfer && event.dataTransfer.files.length) {
        addFiles(event.dataTransfer.files);
      }
    });

    if (input) {
      input.addEventListener('change', event => {
        addFiles(event.target.files);
        input.value = '';
      });
    }

    qualityCards.forEach(card => {
      card.addEventListener('click', () => {
        qualityCards.forEach(item => item.classList.remove('active'));
        card.classList.add('active');
      });
    });

    if (convertBtn) {
      const original = convertBtn.textContent;
      const processingLabel = convertBtn.dataset.processing || 'Processing...';
      convertBtn.addEventListener('click', () => {
        if (!files.length) return;
        convertBtn.disabled = true;
        convertBtn.textContent = processingLabel;
        setTimeout(() => {
          convertBtn.disabled = false;
          convertBtn.textContent = original;
        }, 1200);
      });
    }

    renderList();
  });
})();
