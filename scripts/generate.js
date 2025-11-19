const fs = require('fs');
const path = require('path');

const BASE_DOMAIN = 'https://fluxconvert.tools';
const OUTPUT_ROOT = process.cwd();

const locales = [
  { folder: 'AR', label: 'العربية', hreflang: 'ar', langAttr: 'ar', dir: 'rtl', translate: 'ar' },
  { folder: 'BN', label: 'বাংলা', hreflang: 'bn', langAttr: 'bn', dir: 'ltr', translate: 'bn' },
  { folder: 'DE', label: 'Deutsch', hreflang: 'de', langAttr: 'de', dir: 'ltr', translate: 'de' },
  { folder: 'EN', label: 'English', hreflang: 'en', langAttr: 'en', dir: 'ltr', translate: 'en' },
  { folder: 'ES', label: 'Español', hreflang: 'es', langAttr: 'es', dir: 'ltr', translate: 'es' },
  { folder: 'FR', label: 'Français', hreflang: 'fr', langAttr: 'fr', dir: 'ltr', translate: 'fr' },
  { folder: 'HI', label: 'हिन्दी', hreflang: 'hi', langAttr: 'hi', dir: 'ltr', translate: 'hi' },
  { folder: 'ID', label: 'Bahasa Indonesia', hreflang: 'id', langAttr: 'id', dir: 'ltr', translate: 'id' },
  { folder: 'IT', label: 'Italiano', hreflang: 'it', langAttr: 'it', dir: 'ltr', translate: 'it' },
  { folder: 'JA', label: '日本語', hreflang: 'ja', langAttr: 'ja', dir: 'ltr', translate: 'ja' },
  { folder: 'KO', label: '한국어', hreflang: 'ko', langAttr: 'ko', dir: 'ltr', translate: 'ko' },
  { folder: 'MS', label: 'Bahasa Melayu', hreflang: 'ms', langAttr: 'ms', dir: 'ltr', translate: 'ms' },
  { folder: 'PT-BR', label: 'Português (Brasil)', hreflang: 'pt-BR', langAttr: 'pt-BR', dir: 'ltr', translate: 'pt' },
  { folder: 'RU', label: 'Русский', hreflang: 'ru', langAttr: 'ru', dir: 'ltr', translate: 'ru' },
  { folder: 'TH', label: 'ไทย', hreflang: 'th', langAttr: 'th', dir: 'ltr', translate: 'th' },
  { folder: 'TR', label: 'Türkçe', hreflang: 'tr', langAttr: 'tr', dir: 'ltr', translate: 'tr' },
  { folder: 'UR', label: 'اردو', hreflang: 'ur', langAttr: 'ur', dir: 'rtl', translate: 'ur' },
  { folder: 'VI', label: 'Tiếng Việt', hreflang: 'vi', langAttr: 'vi', dir: 'ltr', translate: 'vi' },
  { folder: 'ZH-CN', label: '简体中文', hreflang: 'zh-CN', langAttr: 'zh-CN', dir: 'ltr', translate: 'zh-CN' }
];

const SKIP_TRANSLATION_KEYS = new Set([
  'slug',
  'icon',
  'categories',
  'category',
  'href',
  'id',
  'value'
]);

const baseContent = {
  brand: 'FluxConvert',
  email: 'contact@example.com',
  nav: {
    home: 'Home',
    tools: 'All tools',
    about: 'About',
    blog: 'Blog & guides',
    contact: 'Contact'
  },
  actions: {
    useTool: 'Use tool'
  },
  footer: {
    privacy: 'Privacy Policy',
    terms: 'Terms of Use'
  },
  hero: {
    title: 'Privacy-first online file converter',
    description: '__BRAND__ converts images, PDFs, and office files directly inside your browser so the only limit is your device. No uploads, no storage, and no registration - just fast tools that respect privacy.',
    primaryCta: 'Start converting',
    secondaryCta: 'View all tools'
  },
  languageLabel: 'Language',
  sections: {
    toolsTitle: 'All tools',
    toolsDescription: 'Switch formats for images, PDFs, and everyday creative files with one click.',
    benefitsTitle: 'Why creators pick __BRAND__',
    howTitle: 'How it works',
    faqTitle: 'Frequently asked questions'
  },
  benefits: [
    {
      title: 'No file size limits',
      description: 'Every conversion runs on your device, so only your hardware and browser memory set the limit.'
    },
    {
      title: 'Secure by design',
      description: 'Files never leave the browser - nothing is uploaded, saved, or shared with a server.'
    },
    {
      title: 'Free and no account',
      description: 'Use the full toolbox without paying or creating an account.'
    },
    {
      title: 'Supports popular formats',
      description: 'Work with JPG, PNG, WebP, PDF, and other everyday creative formats.'
    }
  ],
  howSteps: [
    'Drag files into the card or tap to select them from your device.',
    'Pick the format, quality, and behavior that fits your workflow.',
    'Press convert and download the files instantly - nothing is uploaded.'
  ],
  faqItems: [
    {
      question: 'Is there a file size limit?',
      answer: 'No. __BRAND__ runs entirely on your device, so the only limits come from your hardware and browser memory.'
    },
    {
      question: 'Are files uploaded or stored anywhere?',
      answer: 'Never. Processing happens in your browser, so we cannot view, upload, or keep your documents.'
    },
    {
      question: 'Do I need to pay or create an account?',
      answer: 'No payment or account is required. Open a tool and start converting immediately.'
    },
    {
      question: 'Why could conversion feel slow?',
      answer: 'Large files and ultra quality modes can use more memory. Closing other tabs or lowering the quality helps.'
    },
    {
      question: 'How private is __BRAND__?',
      answer: 'It is fully private because files never leave the browser and nothing is logged.'
    }
  ],
  filters: {
    all: 'All',
    images: 'Images',
    documents: 'Documents',
    compression: 'Compression'
  },
  toolCards: [
    {
      slug: 'image-converter',
      icon: '🖼️',
      categories: ['images'],
      title: 'Image converter',
      description: 'Convert JPG, PNG, and WebP files in batches with a single drag.'
    },
    {
      slug: 'pdf-to-jpg',
      icon: '📄',
      categories: ['documents'],
      title: 'PDF to JPG',
      description: 'Render crystal clear JPG pages from any PDF without uploading.'
    },
    {
      slug: 'jpg-to-pdf',
      icon: '📚',
      categories: ['documents'],
      title: 'JPG to PDF',
      description: 'Merge photos into a lightweight PDF that is ready to share.'
    },
    {
      slug: 'compress-png',
      icon: '✨',
      categories: ['images', 'compression'],
      title: 'Compress PNG',
      description: 'Shrink PNG files while preserving brand colors locally.'
    }
  ],
  allToolsPage: {
    introTitle: 'Explore every converter',
    introDescription: 'Group tools by workflow or browse the full list. Each one is instant, private, and free.',
    filterLabel: 'Filter by type'
  },
  about: {
    title: 'Designed for private, limitless conversion',
    paragraphs: [
      '__BRAND__ was built for studios and teams that need to switch file formats without leaking data.',
      'All logic runs in the browser, so there are zero uploads, zero storage costs, and no external processing queues.',
      'We obsess over UI clarity so anyone can drag files, pick a format, and finish in seconds on desktop or mobile.'
    ],
    highlights: [
      'Runs entirely inside the browser',
      'No file size ceilings',
      'No accounts, no trackers',
      'Responsive, accessible layout'
    ]
  },
  blog: {
    title: 'Blog & quick guides',
    description: 'Learn practical tips for faster, safer conversion workflows.',
    readMore: 'Read more',
    posts: [
      {
        title: 'Keep brand assets private with local tools',
        summary: 'See how on-device conversion protects customer data and design files.',
        tag: 'Privacy'
      },
      {
        title: 'Preparing PDFs for crisp JPG exports',
        summary: 'Checklist for flattening fonts and colors before exporting every page.',
        tag: 'PDF'
      },
      {
        title: 'Compressing PNG without color banding',
        summary: 'Use the quality presets to shrink PNG marketing graphics safely.',
        tag: 'Images'
      }
    ]
  },
  contact: {
    title: 'Contact the team',
    description: 'Email __EMAIL__ or send the form - responses land within two business days.',
    formTitle: 'Send a quick note',
    nameLabel: 'Full name',
    emailLabel: 'Email address',
    messageLabel: 'Message',
    submitLabel: 'Send message',
    notice: 'Demo form only. Replace with your preferred service.'
  },
  privacy: {
    title: 'Privacy policy',
    intro: '__BRAND__ processes every file inside your browser. We do not upload, view, or store your content.',
    sections: [
      {
        title: 'On-device processing',
        body: 'Converters execute with Web APIs inside the browser tab. There is no server-side queue, so your device power is the only limit.'
      },
      {
        title: 'No uploads or retention',
        body: 'Files never reach our servers. Once you close the tab the working data is cleared automatically.'
      },
      {
        title: 'Contact details',
        body: 'If you email us or submit the contact form we only use that information to reply. We do not share or sell it.'
      }
    ],
    closing: 'Questions? Write to __EMAIL__.'
  },
  terms: {
    title: 'Terms of use',
    intro: 'By using __BRAND__ you agree to be responsible for the files you process.',
    items: [
      'Only work with content you own or have rights to share.',
      'Do not use the tools for illegal or abusive material.',
      'Performance depends on your device and browser; extremely large jobs may require more memory.'
    ],
    closing: 'Continuing to use the site means you accept these terms.'
  },
  faqPage: {
    intro: 'Everything happens on your device, so most questions focus on privacy and capacity.'
  },
  notFound: {
    title: 'Page not found',
    description: 'The page you requested does not exist. Pick another tool below.',
    button: 'Back to home',
    popularTitle: 'Popular tools'
  },
  toolCommon: {
    dropHeading: 'Drag files here',
    dropBody: 'Drop your __INPUT__ here or click below to choose them from your device.',
    dropButton: 'Choose files',
    note: '__BRAND__ runs locally, so there is no file size limit and nothing touches our servers.',
    optionsTitle: 'Conversion options',
    formatLabel: 'Output format',
    qualityLabel: 'Quality presets',
    qualityOptions: [
      { title: 'Balanced', description: 'Best mix of clarity and size.' },
      { title: 'High', description: 'More detail for displays and print.' },
      { title: 'Ultra', description: 'Maximum DPI, uses more memory.' }
    ],
    convertButton: 'Convert files',
    processingLabel: 'Processing...',
    queueTitle: 'Files in queue',
    emptyQueue: 'No files yet - start by adding something above.',
    seoIntro: 'Need a quick summary?',
    offlineReminder: 'Processing happens in the browser, so your device defines the limit.',
    relatedTitle: 'Related tools'
  },
  toolPages: {
    'image-converter': {
      heading: 'Image converter',
      description: 'Switch quickly between JPG, PNG, and WebP without compressing away detail.',
      inputLabel: 'image files',
      formatOptions: ['JPG', 'PNG', 'WEBP'],
      seoParagraph: 'Perfect for designers sending proofs or marketers updating assets - no upload, no waiting.',
      related: ['compress-png', 'jpg-to-pdf']
    },
    'pdf-to-jpg': {
      heading: 'PDF to JPG',
      description: 'Render every PDF page to a sharp JPG that stays offline.',
      inputLabel: 'PDF documents',
      formatOptions: ['JPG'],
      seoParagraph: 'Ideal for sharing print previews or reducing review friction while keeping data private.',
      related: ['jpg-to-pdf', 'image-converter']
    },
    'jpg-to-pdf': {
      heading: 'JPG to PDF',
      description: 'Combine photos into a single PDF with clean ordering and margins.',
      inputLabel: 'JPG images',
      formatOptions: ['PDF'],
      seoParagraph: 'Create lightweight PDF proof sheets on any device without uploading sensitive files.',
      related: ['pdf-to-jpg', 'compress-png']
    },
    'compress-png': {
      heading: 'Compress PNG',
      description: 'Shrink PNG marketing graphics while protecting color fidelity.',
      inputLabel: 'PNG files',
      formatOptions: ['PNG'],
      seoParagraph: 'Choose a preset to reduce weight for email and web while everything stays device-side.',
      related: ['image-converter', 'pdf-to-jpg']
    }
  },
  seo: {
    home: {
      title: 'Privacy-first file converter | __BRAND__',
      description: 'Convert images, PDFs, and creative files locally with zero uploads and no file size limits.'
    },
    'all-tools': {
      title: 'All conversion tools | __BRAND__',
      description: 'Browse every converter for images, PDFs, and assets that stay on your device.'
    },
    about: {
      title: 'About __BRAND__',
      description: 'Learn how we deliver secure, unlimited, browser-based file conversion.'
    },
    blog: {
      title: 'Guides & tips | __BRAND__',
      description: 'Read tutorials for faster, safer document conversion.'
    },
    contact: {
      title: 'Contact __BRAND__ support',
      description: 'Send a note or email the team for help with the converters.'
    },
    privacy: {
      title: 'Privacy policy | __BRAND__',
      description: 'Understand how files stay on your device and what data we collect.'
    },
    terms: {
      title: 'Terms of use | __BRAND__',
      description: 'Review the rules for using the converter suite safely.'
    },
    faq: {
      title: 'FAQ | __BRAND__',
      description: 'Answers about limits, privacy, and performance.'
    },
    '404': {
      title: 'Not found | __BRAND__',
      description: 'The page you looked for was not found on __BRAND__.'
    },
    'image-converter': {
      title: 'Image converter | __BRAND__',
      description: 'Convert JPG, PNG, and WebP locally with no upload limits.'
    },
    'pdf-to-jpg': {
      title: 'PDF to JPG | __BRAND__',
      description: 'Turn PDFs into crisp JPG pages entirely offline.'
    },
    'jpg-to-pdf': {
      title: 'JPG to PDF | __BRAND__',
      description: 'Merge JPG files into a PDF safely in your browser.'
    },
    'compress-png': {
      title: 'Compress PNG | __BRAND__',
      description: 'Reduce PNG size while working completely on-device.'
    }
  }
};

function collectStringEntries(value, currentPath = []) {
  const entries = [];
  if (typeof value === 'string') {
    entries.push({ path: currentPath, value });
    return entries;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      entries.push(...collectStringEntries(item, currentPath.concat(index)));
    });
    return entries;
  }

  if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'string' && SKIP_TRANSLATION_KEYS.has(key)) {
        continue;
      }
      entries.push(...collectStringEntries(val, currentPath.concat(key)));
    }
  }

  return entries;
}

function setByPath(target, pathParts, newValue) {
  let ref = target;
  for (let i = 0; i < pathParts.length - 1; i++) {
    ref = ref[pathParts[i]];
  }
  ref[pathParts[pathParts.length - 1]] = newValue;
}

class Translator {
  constructor(target) {
    this.target = target;
  }

  async translateAll(texts) {
    const map = new Map();
    if (this.target === 'en') {
      texts.forEach(text => map.set(text, text));
      return map;
    }
    const chunkSize = 20;
    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const results = await this.translateChunk(chunk);
      chunk.forEach((original, idx) => {
        map.set(original, results[idx] || original);
      });
    }
    return map;
  }

  async translateChunk(chunk) {
    const prepared = chunk.map((text, idx) => {
      const safe = (text || '').replace(/__SPLIT_START__|__SPLIT_END__/g, '');
      return `__SPLIT_START__${idx}__${safe}__SPLIT_END__`;
    }).join(' ');

    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'en');
    url.searchParams.set('tl', this.target);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', prepared);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (generator)' }
    });

    if (!res.ok) {
      throw new Error(`Translate error ${res.status} for ${this.target}`);
    }

    const data = await res.json();
    const joined = (data[0] || []).map(part => part[0]).join('');
    const regex = /__SPLIT_START__(\d+)__(.*?)__SPLIT_END__/gs;
    const values = new Array(chunk.length).fill('');
    let match;
    while ((match = regex.exec(joined)) !== null) {
      const index = Number(match[1]);
      values[index] = (match[2] || '').trim();
    }
    return values;
  }
}
function applyPlaceholders(value) {
  if (typeof value === 'string') {
    return value
      .replace(/__BRAND__/g, baseContent.brand)
      .replace(/__EMAIL__/g, baseContent.email);
  }
  if (Array.isArray(value)) {
    return value.map(item => applyPlaceholders(item));
  }
  if (value && typeof value === 'object') {
    const clone = Array.isArray(value) ? [] : {};
    for (const [key, val] of Object.entries(value)) {
      clone[key] = applyPlaceholders(val);
    }
    return clone;
  }
  return value;
}

function renderHeader(localeConfig, content, currentPage) {
  const languageOptions = locales.map(loc => {
    const selected = loc.folder === localeConfig.folder ? ' selected' : '';
    return `<option value="${loc.folder}"${selected}>${loc.label}</option>`;
  }).join('');
  return `
    <header class="site-header" data-page="${currentPage}">
      <!-- Placeholder brand/email. Replace FluxConvert + contact@example.com with real info. -->
      <div class="logo">${content.brand}</div>
      <button class="nav-toggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="index.html">${content.nav.home}</a>
        <a href="all-tools.html">${content.nav.tools}</a>
        <a href="about.html">${content.nav.about}</a>
        <a href="blog.html">${content.nav.blog}</a>
        <a href="contact.html">${content.nav.contact}</a>
      </nav>
      <div class="lang-switch">
        <label for="languageSelect" class="sr-only">${content.languageLabel}</label>
        <select id="languageSelect" data-current="${localeConfig.folder}">
          ${languageOptions}
        </select>
      </div>
    </header>
  `;
}

function renderFooter(content) {
  return `
    <footer class="site-footer">
      <div class="footer-brand">${content.brand}</div>
      <p>${content.hero.description}</p>
      <div class="footer-links">
        <a href="about.html">${content.nav.about}</a>
        <a href="all-tools.html">${content.nav.tools}</a>
        <a href="blog.html">${content.nav.blog}</a>
        <a href="privacy.html">${content.footer.privacy}</a>
        <a href="terms.html">${content.footer.terms}</a>
        <a href="contact.html">${content.nav.contact}</a>
      </div>
      <a href="mailto:${content.email}" class="footer-email">${content.email}</a>
      <p class="copyright">&copy; ${new Date().getFullYear()} ${content.brand}</p>
    </footer>
  `;
}

function renderToolCards(content) {
  return content.toolCards.map(card => {
    const categories = card.categories.join(' ');
    return `
      <article class="tool-card" data-category="${categories}">
        <div class="tool-icon" aria-hidden="true">${card.icon}</div>
        <div>
          <h3>${card.title}</h3>
          <p>${card.description}</p>
        </div>
        <a class="pill-button" href="${card.slug}.html">${content.actions.useTool}</a>
      </article>
    `;
  }).join('');
}

function renderFaqItems(content) {
  return content.faqItems.map((item, index) => `
    <article class="faq-item">
      <button class="faq-question" aria-expanded="${index === 0 ? 'true' : 'false'}">
        <span>${item.question}</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer"${index === 0 ? '' : ' hidden'}>
        <p>${item.answer}</p>
      </div>
    </article>
  `).join('');
}

function renderHome(content) {
  const cards = renderToolCards(content);
  const benefits = content.benefits.map(benefit => `
    <article class="benefit-card">
      <h3>${benefit.title}</h3>
      <p>${benefit.description}</p>
    </article>
  `).join('');
  const steps = content.howSteps.map((step, idx) => `
    <li>
      <span class="step-number">${idx + 1}</span>
      <p>${step}</p>
    </li>
  `).join('');
  const faq = renderFaqItems(content);

  return `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">${content.nav.tools}</p>
        <h1>${content.hero.title}</h1>
        <p>${content.hero.description}</p>
        <div class="hero-actions">
          <a class="primary-btn" href="image-converter.html">${content.hero.primaryCta}</a>
          <a class="ghost-btn" href="all-tools.html">${content.hero.secondaryCta}</a>
        </div>
        <ul class="hero-list">
          ${content.benefits.slice(0, 2).map(item => `<li>${item.title}</li>`).join('')}
        </ul>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="visual-card">
          <div class="visual-drop">
            <span class="visual-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="img" aria-hidden="true" width="24" height="24"><path d="M12 5l6 6h-4v8h-4v-8H6z" fill="currentColor"/></svg></span>
            <p>${content.toolCommon.dropHeading}</p>
            <small>${content.toolCommon.note}</small>
          </div>
          <div class="visual-options">
            ${content.toolCommon.qualityOptions.map(opt => `<span>${opt.title}</span>`).join('')}
          </div>
          <button class="primary-btn">${content.toolCommon.convertButton}</button>
        </div>
      </div>
    </section>

    <section class="tools">
      <header>
        <div>
          <h2>${content.sections.toolsTitle}</h2>
          <p>${content.sections.toolsDescription}</p>
        </div>
        <a class="ghost-btn" href="all-tools.html">${content.hero.secondaryCta}</a>
      </header>
      <div class="tool-grid">
        ${cards}
      </div>
    </section>

    <section class="benefits">
      <h2>${content.sections.benefitsTitle}</h2>
      <div class="benefit-grid">
        ${benefits}
      </div>
    </section>

    <section class="how">
      <h2>${content.sections.howTitle}</h2>
      <ol class="steps">
        ${steps}
      </ol>
    </section>

    <section class="faq">
      <h2>${content.sections.faqTitle}</h2>
      <div class="faq-list">
        ${faq}
      </div>
    </section>
  `;
}

function renderAllToolsPage(content) {
  const filters = ['all', 'images', 'documents', 'compression'];
  const filterButtons = filters.map((filter, idx) => `
    <button type="button" class="filter-btn${idx === 0 ? ' active' : ''}" data-filter="${filter}">
      ${content.filters[filter]}
    </button>
  `).join('');
  return `
    <section class="page-hero">
      <h1>${content.allToolsPage.introTitle}</h1>
      <p>${content.allToolsPage.introDescription}</p>
    </section>
    <section class="filters">
      <p>${content.allToolsPage.filterLabel}</p>
      <div class="filter-group">
        ${filterButtons}
      </div>
    </section>
    <section class="tool-grid full">
      ${renderToolCards(content)}
    </section>
  `;
}

function renderAboutPage(content) {
  const paragraphs = content.about.paragraphs.map(p => `<p>${p}</p>`).join('');
  const highlights = content.about.highlights.map(item => `<li>${item}</li>`).join('');
  return `
    <section class="page-hero">
      <h1>${content.about.title}</h1>
      ${paragraphs}
    </section>
    <section class="list-panel">
      <h2>${content.sections.benefitsTitle}</h2>
      <ul>
        ${highlights}
      </ul>
    </section>
  `;
}

function renderBlogPage(content) {
  const cards = content.blog.posts.map(post => `
    <article class="blog-card">
      <span class="tag">${post.tag}</span>
      <h3>${post.title}</h3>
      <p>${post.summary}</p>
      <a href="#" class="ghost-btn">${content.blog.readMore}</a>
    </article>
  `).join('');
  return `
    <section class="page-hero">
      <h1>${content.blog.title}</h1>
      <p>${content.blog.description}</p>
    </section>
    <section class="blog-grid">
      ${cards}
    </section>
  `;
}

function renderContactPage(content) {
  return `
    <section class="page-hero">
      <h1>${content.contact.title}</h1>
      <p>${content.contact.description}</p>
      <p class="contact-email">${content.email}</p>
    </section>
    <section class="contact-form">
      <h2>${content.contact.formTitle}</h2>
      <!-- Demo form placeholder - replace with production endpoint -->
      <form>
        <label>
          ${content.contact.nameLabel}
          <input type="text" name="name" required>
        </label>
        <label>
          ${content.contact.emailLabel}
          <input type="email" name="email" required>
        </label>
        <label>
          ${content.contact.messageLabel}
          <textarea name="message" rows="5" required></textarea>
        </label>
        <button type="submit" class="primary-btn">${content.contact.submitLabel}</button>
      </form>
      <p class="form-note">${content.contact.notice}</p>
    </section>
  `;
}

function renderPrivacyPage(content) {
  const sections = content.privacy.sections.map(section => `
    <article class="text-card">
      <h3>${section.title}</h3>
      <p>${section.body}</p>
    </article>
  `).join('');
  return `
    <section class="page-hero">
      <h1>${content.privacy.title}</h1>
      <p>${content.privacy.intro}</p>
    </section>
    <section class="text-grid">
      ${sections}
    </section>
    <p class="closing">${content.privacy.closing}</p>
  `;
}

function renderTermsPage(content) {
  const items = content.terms.items.map(item => `<li>${item}</li>`).join('');
  return `
    <section class="page-hero">
      <h1>${content.terms.title}</h1>
      <p>${content.terms.intro}</p>
      <div class="list-panel">
        <ul>
          ${items}
        </ul>
      </div>
      <p class="closing">${content.terms.closing}</p>
    </section>
  `;
}

function renderFaqPage(content) {
  return `
    <section class="page-hero">
      <h1>${content.sections.faqTitle}</h1>
      <p>${content.faqPage.intro}</p>
    </section>
    <section class="faq">
      <div class="faq-list">
        ${renderFaqItems(content)}
      </div>
    </section>
  `;
}

function renderNotFoundPage(content) {
  const suggestions = content.toolCards.slice(0, 3).map(card => `
    <li><a href="${card.slug}.html">${card.title}</a></li>
  `).join('');
  return `
    <section class="page-hero">
      <h1>${content.notFound.title}</h1>
      <p>${content.notFound.description}</p>
      <a class="primary-btn" href="index.html">${content.notFound.button}</a>
    </section>
    <section class="list-panel">
      <h2>${content.notFound.popularTitle}</h2>
      <ul>${suggestions}</ul>
    </section>
  `;
}

function renderToolPage(content, slug) {
  const tool = content.toolPages[slug];
  const qualityOptions = content.toolCommon.qualityOptions.map((opt, idx) => `
    <button type="button" class="quality-card${idx === 0 ? ' active' : ''}" data-quality="${idx}">
      <strong>${opt.title}</strong>
      <p>${opt.description}</p>
    </button>
  `).join('');
  const formatOptions = tool.formatOptions.map((format, idx) => `
    <option value="${format}"${idx === 0 ? ' selected' : ''}>${format}</option>
  `).join('');
  const related = tool.related.map(ref => {
    const relatedTool = content.toolCards.find(c => c.slug === ref);
    return relatedTool ? `<li><a href="${relatedTool.slug}.html">${relatedTool.title}</a></li>` : '';
  }).join('');

  return `
    <section class="tool-layout">
      <article class="tool-drop">
        <h1>${tool.heading}</h1>
        <p>${tool.description}</p>
        <div class="dropzone" data-input="${tool.inputLabel}">
          <p class="drop-title">${content.toolCommon.dropHeading}</p>
          <p>${content.toolCommon.dropBody.replace(/__INPUT__/g, tool.inputLabel)}</p>
          <button type="button" class="primary-btn">${content.toolCommon.dropButton}</button>
          <p class="note">${content.toolCommon.note}</p>
          <input type="file" class="hidden-input" multiple>
        </div>
        <div class="file-queue">
          <h2>${content.toolCommon.queueTitle}</h2>
          <ul data-role="file-list" data-empty="${content.toolCommon.emptyQueue}">
            <li class="empty">${content.toolCommon.emptyQueue}</li>
          </ul>
        </div>
      </article>
      <aside class="tool-panel">
        <h2>${content.toolCommon.optionsTitle}</h2>
        <label>
          ${content.toolCommon.formatLabel}
          <select>
            ${formatOptions}
          </select>
        </label>
        <div class="quality-options">
          <p>${content.toolCommon.qualityLabel}</p>
          <div class="quality-group">
            ${qualityOptions}
          </div>
        </div>
        <button class="primary-btn convert" data-processing="${content.toolCommon.processingLabel}">${content.toolCommon.convertButton}</button>
        <p class="note">${content.toolCommon.offlineReminder}</p>
      </aside>
    </section>
    <section class="tool-info">
      <p>${content.toolCommon.seoIntro} ${tool.seoParagraph}</p>
      <h3>${content.toolCommon.relatedTitle}</h3>
      <ul>${related}</ul>
    </section>
  `;
}

const pageDefinitions = [
  { key: 'home', file: 'index.html', render: renderHome },
  { key: 'all-tools', file: 'all-tools.html', render: renderAllToolsPage },
  { key: 'about', file: 'about.html', render: renderAboutPage },
  { key: 'blog', file: 'blog.html', render: renderBlogPage },
  { key: 'contact', file: 'contact.html', render: renderContactPage },
  { key: 'privacy', file: 'privacy.html', render: renderPrivacyPage },
  { key: 'terms', file: 'terms.html', render: renderTermsPage },
  { key: 'faq', file: 'faq.html', render: renderFaqPage },
  { key: '404', file: '404.html', render: renderNotFoundPage },
  {
    key: 'image-converter',
    file: 'image-converter.html',
    render: content => renderToolPage(content, 'image-converter'),
    extraScripts: ['<script src="../assets/js/tools.js" defer></script>']
  },
  {
    key: 'pdf-to-jpg',
    file: 'pdf-to-jpg.html',
    render: content => renderToolPage(content, 'pdf-to-jpg'),
    extraScripts: ['<script src="../assets/js/tools.js" defer></script>']
  },
  {
    key: 'jpg-to-pdf',
    file: 'jpg-to-pdf.html',
    render: content => renderToolPage(content, 'jpg-to-pdf'),
    extraScripts: ['<script src="../assets/js/tools.js" defer></script>']
  },
  {
    key: 'compress-png',
    file: 'compress-png.html',
    render: content => renderToolPage(content, 'compress-png'),
    extraScripts: ['<script src="../assets/js/tools.js" defer></script>']
  }
];

function wrapPage({ localeConfig, content, pageKey, fileName, pageTitle, description, body, extraScripts = [] }) {
  const fontLinks = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  `;
  const alternates = locales.map(loc => {
    const href = `${BASE_DOMAIN}/${loc.folder}/${fileName}`;
    return `<link rel="alternate" hreflang="${loc.hreflang}" href="${href}">`;
  }).join('\n');
  const xDefaultHref = `${BASE_DOMAIN}/EN/${fileName}`;
  const scripts = [
    '<script src="../assets/js/main.js" defer></script>',
    ...extraScripts
  ].join('\n');
  return `<!doctype html>
<html lang="${localeConfig.langAttr}" dir="${localeConfig.dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${pageTitle}</title>
  <meta name="description" content="${description}">
  ${fontLinks}
  <link rel="stylesheet" href="../assets/css/style.css">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${xDefaultHref}">
</head>
<body data-page="${pageKey}">
  ${renderHeader(localeConfig, content, pageKey)}
  <main>
    ${body}
  </main>
  ${renderFooter(content)}
  ${scripts}
</body>
</html>`;
}

async function generate() {
  const stringEntries = collectStringEntries(baseContent);
  const uniqueStrings = [...new Set(stringEntries.map(entry => entry.value))];

  for (const localeConfig of locales) {
    const translator = new Translator(localeConfig.translate);
    const clone = structuredClone(baseContent);
    const translations = await translator.translateAll(uniqueStrings);

    for (const entry of stringEntries) {
      const newValue = translations.get(entry.value) ?? entry.value;
      setByPath(clone, entry.path, newValue);
    }

    const localizedContent = applyPlaceholders(clone);
    const localeDir = path.join(OUTPUT_ROOT, localeConfig.folder);
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }
    for (const page of pageDefinitions) {
      const seo = localizedContent.seo[page.key] || localizedContent.seo.home;
      const html = wrapPage({
        localeConfig,
        content: localizedContent,
        pageKey: page.key,
        fileName: page.file,
        pageTitle: seo.title,
        description: seo.description,
        body: page.render(localizedContent),
        extraScripts: page.extraScripts || []
      });
      fs.writeFileSync(path.join(localeDir, page.file), html, 'utf8');
    }
  }
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});

