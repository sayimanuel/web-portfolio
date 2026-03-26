// ── Case Study Page — case.js ──────────────────────────────────────────────
// Reads ?id= from URL, fetches project from API, populates all sections.
// Falls back to hiding empty sections gracefully.

(function () {
  const BASE_URL = window.API_BASE || 'http://localhost:5500/api';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  function show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  }
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function setAttr(id, attr, val) {
    const el = document.getElementById(id);
    if (el) el[attr] = val;
  }

  // ── Overview icons ────────────────────────────────────────────────────────
  const OVERVIEW_ICONS = {
    stack: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4.5" width="14" height="3" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9.5" width="14" height="3" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 3L8 1L12 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    role:  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    duration: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8L10.5 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    platform: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="9" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 13.5h6M8 11.5v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  };

  // ── Populate overview cards ───────────────────────────────────────────────
  function buildOverviewCards(cs) {
    const container = document.getElementById('overviewCards');
    if (!container) return;

    const items = [
      { key: 'stack',    label: 'Tech Stack',   value: Array.isArray(cs.stack) ? cs.stack.join(', ') : cs.stack },
      { key: 'role',     label: 'Role',          value: cs.role },
      { key: 'duration', label: 'Duration',      value: cs.duration },
      { key: 'platform', label: 'Platform',      value: cs.platform },
    ].filter(i => i.value);

    if (!items.length) { hide('sec-overview'); return; }

    container.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'overview-card glass reveal';
      card.innerHTML = `
        <div class="overview-card-icon">${OVERVIEW_ICONS[item.key] || ''}</div>
        <p class="overview-card-label">${item.label}</p>
        <p class="overview-card-value">${item.value}</p>`;
      container.appendChild(card);
    });
  }

  // ── Problems list ─────────────────────────────────────────────────────────
  function buildProblems(list) {
    const ul = document.getElementById('problemsList');
    if (!ul) return;
    if (!list?.length) { hide('colProblems'); return; }
    ul.innerHTML = list.map(p => `<li>${p}</li>`).join('');
  }

  // ── Goals checklist ───────────────────────────────────────────────────────
  function buildGoals(list) {
    const ul = document.getElementById('goalsList');
    if (!ul) return;
    if (!list?.length) { hide('colGoals'); return; }
    ul.innerHTML = list.map(g => `<li>${g}</li>`).join('');
  }

  // ── Features list ─────────────────────────────────────────────────────────
  function buildFeatures(list) {
    const ul = document.getElementById('featuresList');
    if (!ul) return;
    if (!list?.length) { hide('colFeatures'); return; }
    // list items can be strings or { title, desc }
    ul.innerHTML = list.map(f => {
      const text = typeof f === 'string' ? f : (f.title + (f.desc ? ` — <span style="opacity:.6">${f.desc}</span>` : ''));
      return `<li>${text}</li>`;
    }).join('');
  }

  // ── Architecture ──────────────────────────────────────────────────────────
  function buildArchitecture(cs) {
    if (!cs.architectureImage && !cs.architectureDesc) {
      hide('sec-arch');
      return;
    }
    if (cs.architectureImage) {
      const img = document.getElementById('archImg');
      if (img) { img.src = cs.architectureImage; img.style.display = 'block'; }
      hide('archPlaceholder');
    } else {
      hide('archPlaceholder');
    }
    if (cs.architectureDesc) {
      setText('archDesc', cs.architectureDesc);
    } else {
      const descEl = document.getElementById('archDesc');
      if (descEl) descEl.style.display = 'none';
    }
  }

  // ── UI Gallery ────────────────────────────────────────────────────────────
  function buildGallery(gallery) {
    const tabBar = document.getElementById('galleryTabs');
    const img    = document.getElementById('galleryImg');
    const empty  = document.getElementById('galleryEmpty');
    const dots   = document.getElementById('galleryDots');

    if (!gallery?.length) { hide('sec-gallery'); return; }

    // Normalise: each item may have .images[] or single .image
    const items = gallery.map((item, i) => ({
      label:  item.label || `View ${i + 1}`,
      images: item.images?.length ? item.images : [item.image].filter(Boolean),
    })).filter(it => it.images.length);

    if (!items.length) { hide('sec-gallery'); return; }

    img.style.display    = 'block';
    img.style.transition = 'opacity 0.2s ease';
    if (empty) empty.style.display = 'none';

    let curImages = [];

    function renderDots(images, active) {
      dots.innerHTML = '';
      if (images.length <= 1) return;
      images.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'gallery-dot' + (i === active ? ' active' : '');
        d.setAttribute('aria-label', `Image ${i + 1}`);
        d.addEventListener('click', () => goToImg(i));
        dots.appendChild(d);
      });
    }

    function goToImg(i) {
      img.style.opacity = '0';
      setTimeout(() => { img.src = curImages[i]; img.style.opacity = '1'; }, 200);
      dots.querySelectorAll('.gallery-dot').forEach((d, j) => d.classList.toggle('active', j === i));
    }

    function activateTab(item, btn) {
      tabBar.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      curImages = item.images;
      img.style.opacity = '0';
      setTimeout(() => { img.src = curImages[0]; img.style.opacity = '1'; }, 150);
      renderDots(curImages, 0);
    }

    tabBar.innerHTML = '';
    items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.className = 'gallery-tab' + (i === 0 ? ' active' : '');
      btn.textContent = item.label;
      btn.addEventListener('click', () => activateTab(item, btn));
      tabBar.appendChild(btn);
    });

    // Init first tab
    curImages = items[0].images;
    img.src   = curImages[0];
    renderDots(curImages, 0);
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  function buildTimeline(timeline) {
    const container = document.getElementById('caseTimeline');
    if (!container) return;
    if (!timeline?.length) { hide('sec-timeline'); return; }

    container.innerHTML = timeline.map((item, i) => `
      <div class="timeline-item reveal">
        <div class="timeline-dot">${String(i + 1).padStart(2, '0')}</div>
        <div class="timeline-body">
          <p class="timeline-phase">${item.phase}</p>
          ${item.desc ? `<p class="timeline-desc">${item.desc}</p>` : ''}
          ${item.duration ? `<span class="timeline-duration">${item.duration}</span>` : ''}
        </div>
      </div>`).join('');
  }

  // ── Challenge / Solution ──────────────────────────────────────────────────
  function buildCS(challenges) {
    const container = document.getElementById('caseCS');
    if (!container) return;
    if (!challenges?.length) { hide('sec-cs'); return; }

    container.innerHTML = challenges.map(item => `
      <div class="cs-item">
        <div class="cs-card cs-challenge glass">
          <p class="cs-card-label">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v5M6.5 10v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/></svg>
            Challenge
          </p>
          <p>${item.challenge}</p>
        </div>
        <div class="cs-card cs-solution glass">
          <p class="cs-card-label">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5l2.5 2.5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/></svg>
            Solution
          </p>
          <p>${item.solution}</p>
        </div>
      </div>`).join('');
  }

  // ── Results ───────────────────────────────────────────────────────────────
  function buildResults(results) {
    const container = document.getElementById('caseResults');
    if (!container) return;
    if (!results?.length) { hide('sec-results'); return; }

    container.innerHTML = results.map(r => `
      <div class="result-card glass reveal">
        <p class="result-metric-value">${r.value}</p>
        <p class="result-metric-label">${r.metric}</p>
        ${r.desc ? `<p class="result-metric-desc">${r.desc}</p>` : ''}
      </div>`).join('');
  }

  // ── Populate hero ─────────────────────────────────────────────────────────
  function populateHero(p, cs) {
    // Page title
    document.title = `${p.title} — Case Study | Imanuel Portfolio`;

    setText('caseTitle', p.title);

    // Meta pills
    const metaRow = document.getElementById('caseMeta');
    if (metaRow && cs) {
      const metas = [
        cs.stack?.length ? { label: 'Stack', value: Array.isArray(cs.stack) ? cs.stack.join(', ') : cs.stack } : null,
        cs.role          ? { label: 'Role',     value: cs.role     } : null,
        cs.duration      ? { label: 'Duration', value: cs.duration } : null,
        cs.platform      ? { label: 'Platform', value: cs.platform } : null,
      ].filter(Boolean);

      metaRow.innerHTML = metas.map(m => `
        <div class="case-meta-pill">
          <strong>${m.label} :</strong>
          <span class="pill-sep">&nbsp;</span>
          ${m.value}
        </div>`).join('');
    }

    // Hero image
    if (p.image) {
      setAttr('caseHeroImg', 'src', p.image);
      setAttr('caseHeroImg', 'alt', p.title);
    }

    // Live button
    const liveUrl = cs?.liveUrl || p.caseUrl;
    if (liveUrl && liveUrl !== '#' && !liveUrl.endsWith('case.html')) {
      const liveBtn = document.getElementById('caseLiveBtn');
      if (liveBtn) {
        liveBtn.href = liveUrl;
        liveBtn.style.display = '';
      }
      const ctaBtn = document.getElementById('ctaLiveBtn');
      if (ctaBtn) ctaBtn.href = liveUrl;
    } else {
      hide('sec-cta');
    }
  }

  // ── Load profile → populate footer ───────────────────────────────────────
  async function loadProfile() {
    try {
      const res = await fetch(`${BASE_URL}/profile`);
      if (!res.ok) return;
      const p = await res.json();

      // Email button
      const emailBtn = document.querySelector('.email-btn');
      if (emailBtn && p.email) {
        emailBtn.href = `mailto:${p.email}`;
        const textNode = [...emailBtn.childNodes].find(n => n.nodeType === 3);
        if (textNode) textNode.textContent = p.email.toUpperCase() + ' ';
      }

      // Social links
      const footerLinks = document.querySelector('.footer-links');
      if (footerLinks) {
        const links = [
          { label: 'Linkedin',  url: p.linkedin  },
          { label: 'Instagram', url: p.instagram },
          { label: 'Whatsapp',  url: p.whatsapp  },
        ].filter(l => l.url);
        if (links.length) {
          footerLinks.innerHTML = links.map(l =>
            `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`
          ).join('');
        }
      }

      // Copyright name
      const footerP = document.querySelector('.footer p');
      if (footerP && p.name) {
        footerP.textContent = `© ${new Date().getFullYear()} Hello ${p.name}. All Rights Reserved.`;
      }
    } catch { /* silently fail — fallback to static values */ }
  }

  // ── Main loader ───────────────────────────────────────────────────────────
  async function loadCase() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    // Load profile in parallel (footer doesn't depend on project)
    loadProfile();

    if (!id) {
      setText('caseTitle', 'Project not found');
      ['sec-overview','sec-pgf','sec-arch','sec-gallery','sec-timeline','sec-cs','sec-results','sec-cta']
        .forEach(hide);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/projects/${id}`);
      if (!res.ok) throw new Error('Not found');
      const p = await res.json();
      const cs = p.caseStudy || {};

      populateHero(p, cs);
      hide('sec-overview');
      buildProblems(cs.problems);
      buildGoals(cs.goals);
      buildFeatures(cs.features);
      buildArchitecture(cs);
      buildGallery(cs.uiGallery);
      buildTimeline(cs.timeline);
      buildCS(cs.challenges);
      buildResults(cs.results);

      // If no pgf content at all, hide section
      const hasPGF = cs.problems?.length || cs.goals?.length || cs.features?.length;
      if (!hasPGF) hide('sec-pgf');

      // CTA desc
      if (p.description) setText('ctaDesc', p.description);

      // Trigger scroll reveals on newly added elements
      document.querySelectorAll('.reveal').forEach(el => {
        if (typeof observer !== 'undefined') observer.observe(el);
      });

      // Related projects (same category, exclude current)
      loadRelated(id, p.category);

    } catch (err) {
      console.warn('Could not load case study:', err.message);
      setText('caseTitle', 'Could not load project');
    }
  }

  // ── Related Projects ─────────────────────────────────────────────────────
  async function loadRelated(currentId, category) {
    try {
      const all = await fetch(`${BASE_URL}/projects`).then(r => r.ok ? r.json() : []);
      // Same category first, otherwise any other project; exclude current
      const related = all
        .filter(p => String(p._id) !== String(currentId))
        .sort((a, b) => (a.category === category ? -1 : 1) - (b.category === category ? -1 : 1))
        .slice(0, 3);
      if (!related.length) return;

      const section = document.createElement('section');
      section.className = 'case-section case-related reveal';
      section.innerHTML = `
        <h2 class="case-section-title">Related Projects</h2>
        <div class="related-grid"></div>`;

      const grid = section.querySelector('.related-grid');
      related.forEach(p => {
        const imgStyle = p.image ? `style="background-image:url('${p.image}')"` : '';
        const card = document.createElement('a');
        card.className = 'related-card glass';
        card.href = `case.html?id=${p._id}`;
        card.innerHTML = `
          <div class="related-img${p.image ? '' : ' project-img--empty'}" ${imgStyle}></div>
          <p class="related-title"></p>
          <span class="related-cat"></span>`;
        card.querySelector('.related-title').textContent = p.title;
        card.querySelector('.related-cat').textContent = p.category || '';
        grid.appendChild(card);
      });

      // Insert before the CTA section
      const cta = document.getElementById('sec-cta');
      cta ? cta.before(section) : document.querySelector('.case-body-card').appendChild(section);

      if (typeof observer !== 'undefined') observer.observe(section);
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', loadCase);
})();
