(function () {
  const body = document.body;
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    const navOverlay = document.createElement('div');
    navOverlay.className = 'nav-overlay';
    document.body.appendChild(navOverlay);

    const closeNav = () => {
      if (!body.classList.contains('nav-open')) return;
      body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    const openNav = () => {
      body.classList.add('nav-open');
      navToggle.setAttribute('aria-expanded', 'true');
    };

    navToggle.addEventListener('click', () => {
      if (body.classList.contains('nav-open')) {
        closeNav();
      } else {
        openNav();
      }
    });

    navOverlay.addEventListener('click', closeNav);

    document.addEventListener('click', event => {
      if (!body.classList.contains('nav-open')) return;
      if (navLinks.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeNav();
      }
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeNav);
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

    const langWrapper = langSelect.closest('.lang-switch');
    if (langWrapper && !langWrapper.querySelector('.lang-dropdown')) {
      const dropdown = document.createElement('div');
      dropdown.className = 'lang-dropdown';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'lang-dropdown-toggle';
      const toggleLabel = document.createElement('span');
      toggle.appendChild(toggleLabel);
      const list = document.createElement('ul');
      list.className = 'lang-dropdown-list';
      const optionButtons = [];

      const updateSelection = () => {
        const current = langSelect.options[langSelect.selectedIndex];
        toggleLabel.textContent = current ? current.textContent : '';
        optionButtons.forEach(entry => {
          entry.button.classList.toggle('active', entry.value === langSelect.value);
        });
      };

      Array.from(langSelect.options).forEach(option => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option.textContent;
        button.addEventListener('click', () => {
          if (langSelect.value !== option.value) {
            langSelect.value = option.value;
            langSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
          dropdown.classList.remove('open');
          updateSelection();
        });
        li.appendChild(button);
        list.appendChild(li);
        optionButtons.push({ value: option.value, button });
      });

      const closeDropdown = () => dropdown.classList.remove('open');

      toggle.addEventListener('click', event => {
        event.stopPropagation();
        dropdown.classList.toggle('open');
      });

      document.addEventListener('click', event => {
        if (!dropdown.contains(event.target)) {
          closeDropdown();
        }
      });

      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          closeDropdown();
        }
      });

      dropdown.appendChild(toggle);
      dropdown.appendChild(list);
      langWrapper.appendChild(dropdown);
      langSelect.classList.add('lang-select-hidden');
      updateSelection();
    }
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
