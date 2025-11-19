(function () {
  const body = document.body;
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', open);
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => body.classList.remove('nav-open'));
    });
  }

  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    const localeValues = Array.from(langSelect.options).map(opt => opt.value.toLowerCase());
    langSelect.value = langSelect.dataset.current || langSelect.value;
    langSelect.addEventListener('change', e => {
      const target = e.target.value;
      const raw = window.location.pathname.replace(/\\/g, '/');
      const parts = raw.split('/').filter(Boolean);
      let fileName = parts.pop() || 'index.html';
      if (!fileName.endsWith('.html')) {
        fileName = 'index.html';
      }
      let localeIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        if (localeValues.includes(parts[i].toLowerCase())) {
          localeIndex = i;
          break;
        }
      }
      if (localeIndex === -1) {
        parts.push(target);
      } else {
        parts[localeIndex] = target;
      }
      parts.push(fileName);
      const next = '/' + parts.join('/');
      window.location.href = next;
    });
  }

  document.querySelectorAll('.faq-item').forEach(item => {
    const button = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!button || !answer) return;
    button.setAttribute('aria-expanded', 'false');
    answer.setAttribute('hidden', '');
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', (!expanded).toString());
      if (expanded) {
        answer.setAttribute('hidden', '');
      } else {
        answer.removeAttribute('hidden');
      }
    });
  });

  const filterGroup = document.querySelector('.filter-group');
  if (filterGroup) {
    const cards = Array.from(document.querySelectorAll('.tool-grid .tool-card'));
    filterGroup.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      filterGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const filter = button.dataset.filter;
      cards.forEach(card => {
        if (!filter || filter === 'all') {
          card.style.display = '';
          return;
        }
        const categories = (card.dataset.category || '').split(' ');
        card.style.display = categories.includes(filter) ? '' : 'none';
      });
    });
  }
})();
