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
    const prepositionMap = {
      'ar': 'ila',
      'bn': 'theke',
      'de': 'zu',
      'es': 'a',
      'fr': 'vers',
      'hi': 'se',
      'id': 'ke',
      'it': 'in',
      'ja': 'kara',
      'ko': 'to',
      'ms': 'ke',
      'pt-br': 'para',
      'ru': 'v',
      'th': 'to',
      'tr': 'a',
      'ur': 'se',
      'vi': 'sang',
      'zh-cn': 'zhuan'
    };
    const canonicalizeSlug = slug => {
      const parts = slug.split('-');
      if (parts.length === 3) {
        return `${parts[0]}-to-${parts[2]}`;
      }
      return slug;
    };
    const localizeSlug = (canonical, locale) => {
      const loc = (locale || '').toLowerCase();
      const parts = canonical.split('-');
      if (parts.length === 3 && parts[1] === 'to') {
        const prep = prepositionMap[loc] || 'to';
        return `${parts[0]}-${prep}-${parts[2]}`;
      }
      return canonical;
    };

    langSelect.value = langSelect.dataset.current || langSelect.value;
    langSelect.addEventListener('change', e => {
      const target = e.target.value.toLowerCase();
      const raw = window.location.pathname.replace(/\\/g, '/');
      const parts = raw.split('/').filter(Boolean);
      let fileName = parts.pop() || 'index';
      const hasHtmlExtension = fileName.toLowerCase().endsWith('.html');
      const currentSlug = hasHtmlExtension
        ? fileName.replace(/\.html$/i, '')
        : fileName || 'index';
      const canonical = canonicalizeSlug(currentSlug);
      const targetSlug = localizeSlug(canonical, target);
      const targetFile = hasHtmlExtension ? `${targetSlug}.html` : targetSlug;

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
      parts.push(targetFile);
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

  const contactSection = document.querySelector('.contact-form');
  const contactForm = contactSection ? contactSection.querySelector('form') : null;
  if (contactSection && contactForm) {
    const messageBox = document.createElement('div');
    messageBox.className = 'submission-message';
    const titleEl = document.createElement('p');
    titleEl.className = 'submission-title';
    const bodyEl = document.createElement('p');
    bodyEl.className = 'submission-body';
    messageBox.appendChild(titleEl);
    messageBox.appendChild(bodyEl);
    contactSection.appendChild(messageBox);

    const messages = {
      ar: { title: 'مرحباً {name},', body: 'شكراً لتواصلك معنا، تم إرسال رسالتك. سنعاود الاتصال بك في أقرب وقت ممكن!', defaultName: 'صديق' },
      bn: { title: 'হ্যালো {name},', body: 'আমাদের সাথে যোগাযোগের জন্য ধন্যবাদ। আপনার বার্তাটি প্রেরিত হয়েছে। আমরা শীঘ্রই ফিরে আসবো!', defaultName: 'বন্ধু' },
      de: { title: 'Hallo {name},', body: 'Danke für deine Nachricht. Wir melden uns so schnell wie möglich bei dir!', defaultName: 'Freund' },
      en: { title: 'Hello {name},', body: 'Thank you for contacting us, your message has been sent. We will get back to you as soon as possible!', defaultName: 'friend' },
      es: { title: 'Hola {name},', body: 'Gracias por contactarnos, tu mensaje fue enviado. ¡Nos pondremos en contacto contigo lo antes posible!', defaultName: 'amigo' },
      fr: { title: 'Bonjour {name},', body: 'Merci de nous avoir contactés, votre message a été envoyé. Nous vous répondrons dès que possible!', defaultName: 'ami' },
      hi: { title: 'नमस्ते {name},', body: 'हमसे संपर्क करने के लिए धन्यवाद, आपका संदेश भेज दिया गया है। हम जल्द ही आपसे संपर्क करेंगे!', defaultName: 'दोस्त' },
      id: { title: 'Halo {name},', body: 'Terima kasih telah menghubungi kami; pesan Anda telah dikirim. Kami akan menghubungi Anda sesegera mungkin!', defaultName: 'teman' },
      it: { title: 'Ciao {name},', body: 'Grazie per averci contattato, il tuo messaggio è stato inviato. Ti contatteremo il prima possibile!', defaultName: 'amico' },
      ja: { title: 'こんにちは {name}、', body: 'お問い合わせありがとうございます。メッセージは送信されました。できるだけ早く折り返しご連絡いたします！', defaultName: 'ご友人' },
      ko: { title: '안녕하세요 {name}님,', body: '문의해 주셔서 감사합니다. 메시지가 전송되었습니다. 가능한 한 빠르게 연락드리겠습니다!', defaultName: '친구' },
      ms: { title: 'Hai {name},', body: 'Terima kasih kerana menghubungi kami, mesej anda telah dihantar. Kami akan menghubungi anda secepat mungkin!', defaultName: 'rakan' },
      'pt-br': { title: 'Olá {name},', body: 'Obrigado por entrar em contato conosco, sua mensagem foi enviada. Entraremos em contato o mais breve possível!', defaultName: 'amigo' },
      ru: { title: 'Привет, {name},', body: 'Спасибо за обращение, ваше сообщение отправлено. Мы свяжемся с вами как можно скорее!', defaultName: 'друг' },
      th: { title: 'สวัสดี {name},', body: 'ขอบคุณที่ติดต่อเรา ข้อความของคุณถูกส่งแล้ว เราจะติดต่อกลับโดยเร็วที่สุด!', defaultName: 'เพื่อน' },
      tr: { title: 'Merhaba {name},', body: 'Bize ulaştığınız için teşekkürler, mesajınız gönderildi. En kısa sürede sizinle iletişime geçeceğiz!', defaultName: 'arkadaş' },
      ur: { title: 'ہیلو {name},', body: 'ہم سے رابطہ کرنے کا شکریہ، آپ کا پیغام بھیج دیا گیا ہے۔ ہم جلد از جلد آپ سے رابطہ کریں گے!', defaultName: 'دوست' },
      vi: { title: 'Xin chào {name},', body: 'Cảm ơn bạn đã liên hệ với chúng tôi, tin nhắn của bạn đã được gửi. Chúng tôi sẽ liên hệ lại với bạn sớm nhất có thể!', defaultName: 'bạn' },
      'zh-cn': { title: '你好 {name}，', body: '感谢您联系我们，您的消息已发送。我们会尽快与您联系！', defaultName: '朋友' }
    };

    const lang = document.documentElement.lang?.toLowerCase() || 'en';
    const template = messages[lang] || messages['en'];
    const formatTitle = name => template.title.replace('{name}', name || template.defaultName);

    contactForm.addEventListener('submit', event => {
      event.preventDefault();
      const nameField = contactForm.querySelector('input[name="name"]');
      const nameValue = nameField ? nameField.value.trim() : '';
      titleEl.textContent = formatTitle(nameValue);
      bodyEl.textContent = template.body;
      contactSection.classList.add('submitted');
      messageBox.scrollIntoView({ behavior: 'smooth' });
      contactForm.reset();
    });
  }
})();
