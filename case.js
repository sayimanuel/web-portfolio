// ── Case Study Page — case.js ──────────────────────────────────────────────
// Reads ?id= from URL, fetches project from API, populates all sections.

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

(function () {
  const BASE_URL = window.API_BASE || 'http://localhost:5500/api';
  const DEVICONS_BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
  function show(id) { const el = document.getElementById(id); if (el) el.style.display = ''; }
  function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

  // ── IMAGE SLIDER ──────────────────────────────────────────────────────────
  function buildSlider(images) {
    const track   = document.getElementById('sliderTrack');
    const dotsWrap = document.getElementById('sliderDots');
    const caption = document.getElementById('sliderCaption');
    const counter = document.getElementById('sliderCounter');
    const prev    = document.getElementById('sliderPrev');
    const next    = document.getElementById('sliderNext');

    if (!images?.length || !track) {
      hide('sec-slider'); return;
    }

    let cur = 0;
    const total = images.length;

    // Build slides
    track.innerHTML = images.map((img, i) => `
      <div class="slide${i === 0 ? ' active' : ''}">
        <img src="${esc(img.url)}" alt="${esc(img.caption || '')}" loading="${i === 0 ? 'eager' : 'lazy'}">
      </div>`).join('');

    // Build vertical dots
    function renderDots() {
      dotsWrap.innerHTML = '';
      images.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'slider-dot' + (i === cur ? ' active' : '');
        d.setAttribute('aria-label', `Image ${i + 1}`);
        d.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(d);
      });
    }

    function goTo(n) {
      const slides = track.querySelectorAll('.slide');
      slides[cur]?.classList.remove('active');
      cur = (n + total) % total;
      slides[cur]?.classList.add('active');

      // Caption
      const cap = images[cur]?.caption;
      if (caption) caption.textContent = cap || '';

      // Counter
      if (counter) counter.textContent = `${cur + 1} / ${total}`;

      // Dots
      dotsWrap.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
    }

    prev?.addEventListener('click', () => goTo(cur - 1));
    next?.addEventListener('click', () => goTo(cur + 1));

    // Touch/swipe
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) goTo(cur + (dx < 0 ? 1 : -1));
    });

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') goTo(cur - 1);
      if (e.key === 'ArrowRight') goTo(cur + 1);
    });

    // Hide arrows if only one image
    if (total <= 1) {
      if (prev) prev.style.display = 'none';
      if (next) next.style.display = 'none';
    }

    renderDots();
    goTo(0);
  }

  // ── TECH STACK MARQUEE ────────────────────────────────────────────────────
  function buildTechStack(stack) {
    const wrap    = document.querySelector('.techstack-marquee-wrap');
    const marquee = document.getElementById('techstackMarquee');
    if (!marquee) return;
    if (!stack?.length) { hide('sec-techstack'); return; }

    function itemHTML(tech) {
      const name    = tech.name || tech;
      const iconKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const iconUrl = tech.logoUrl || `${DEVICONS_BASE}/${iconKey}/${iconKey}-original.svg`;
      return `
        <div class="techstack-item">
          <img class="techstack-logo" src="${esc(iconUrl)}" alt="${esc(name)}"
               onerror="this.style.display='none'"
               loading="lazy">
          <span class="techstack-name">${esc(name)}</span>
        </div>`;
    }

    const html  = stack.map(itemHTML).join('');
    const inner = document.createElement('div');
    inner.className = 'marquee-inner';
    inner.innerHTML = html;
    marquee.innerHTML = '';
    marquee.appendChild(inner);

    // After layout: only animate if items overflow container
    requestAnimationFrame(() => {
      const innerW = inner.scrollWidth;
      const wrapW  = (wrap || marquee).offsetWidth;
      if (innerW > wrapW) {
        inner.innerHTML += html; // duplicate for seamless loop
        if (wrap) wrap.classList.add('is-scrolling');
      } else {
        // Not overflowing — center items, no animation
        inner.style.width          = '100%';
        inner.style.justifyContent = 'center';
        inner.style.flexWrap       = 'wrap';
      }
    });
  }

  // ── OVERVIEW + METRICS + COLLABORATION ───────────────────────────────────
  function buildOverview(p) {
    const text = document.getElementById('caseOverview');
    if (text) text.textContent = p.overview || '';

    // Collaboration merged below overview with separator
    if (p.collaboration) {
      const overviewCol = text?.closest('.overview-col');
      if (overviewCol) {
        const collabEl = document.createElement('div');
        collabEl.className = 'overview-collab';
        collabEl.innerHTML = `
          <hr class="overview-collab-divider">
          <p class="overview-collab-text">${esc(p.collaboration)}</p>`;
        overviewCol.appendChild(collabEl);
      }
    }

    if (!p.overview) {
      const col = document.querySelector('.overview-col');
      if (col) col.style.display = 'none';
    }

    const metricsCol = document.getElementById('metricsCol');
    if (metricsCol && p.metrics?.length) {
      metricsCol.innerHTML = p.metrics.map(m => `
        <div class="metric-card">
          <span class="metric-value">${esc(m.value)}</span>
          <span class="metric-label">${esc(m.label)}</span>
        </div>`).join('');
    } else if (metricsCol) {
      metricsCol.style.display = 'none';
    }

    if (!p.overview && !p.metrics?.length) hide('sec-overview');
  }

  // ── RESPONSIBILITIES ──────────────────────────────────────────────────────
  function buildResponsibilities(list) {
    if (!list?.length) return;
    const ul = document.getElementById('responsibilitiesList');
    if (ul) ul.innerHTML = list.map(r => `<li>${esc(r)}</li>`).join('');
    show('sec-responsibilities');
  }

  // ── OUTCOME + PROOF LINKS ─────────────────────────────────────────────────
  function buildOutcome(p) {
    const hasLinks = p.links && Object.values(p.links).some(v => v);
    if (!p.outcome && !hasLinks) return;

    if (p.outcome) {
      const el = document.getElementById('caseOutcome');
      if (el) el.textContent = p.outcome;
    }

    const proofLinks = document.getElementById('proofLinks');
    if (proofLinks && hasLinks) {
      const linkDefs = [
        { key: 'github',    label: 'GitHub', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1C4.134 1 1 4.134 1 8c0 3.086 2.001 5.704 4.776 6.628.35.065.478-.152.478-.337v-1.18c-1.944.422-2.355-.938-2.355-.938-.318-.807-.777-1.022-.777-1.022-.636-.434.048-.426.048-.426.702.05 1.072.72 1.072.72.624 1.07 1.636.76 2.035.581.063-.453.244-.761.444-.936-1.552-.176-3.184-.776-3.184-3.455 0-.763.273-1.387.72-1.875-.072-.177-.312-.887.068-1.848 0 0 .587-.188 1.922.716A6.69 6.69 0 0 1 8 5.198c.594.003 1.192.08 1.75.235 1.334-.904 1.92-.716 1.92-.716.382.961.142 1.671.07 1.848.448.488.72 1.112.72 1.875 0 2.686-1.635 3.277-3.192 3.45.251.216.474.643.474 1.297v1.922c0 .187.127.405.482.337C12.001 13.702 14 11.085 14 8c0-3.866-3.134-7-7-7z" fill="currentColor"/></svg>` },
        { key: 'figma',     label: 'Figma',  icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="4" height="4" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="5.5" width="4" height="4" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="10" width="4" height="4" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="6.5" y="1" width="4" height="4" rx="1.5" stroke="currentColor" stroke-width="1.3"/><circle cx="8.5" cy="7.5" r="2" stroke="currentColor" stroke-width="1.3"/></svg>` },
        { key: 'prototype', label: 'Prototype', icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M14.5 12.5L16 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>` },
      ];
      const links = linkDefs.filter(l => p.links[l.key]);
      if (links.length) {
        proofLinks.innerHTML = links.map(l => `
          <a class="proof-link" href="${esc(p.links[l.key])}" target="_blank" rel="noopener">
            ${l.icon}
            ${l.label}
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 9L9 2M9 2H4M9 2v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>`).join('');
      }
    }

    show('sec-outcome');
  }

  // ── TEXT SECTIONS ─────────────────────────────────────────────────────────
  function buildTextAccordion(sectionId, bodyId, text) {
    if (!text) return;
    const el = document.getElementById(bodyId);
    if (el) el.textContent = text;
    show(sectionId);
  }

  // ── TECHNICAL NOTES (parent) + sub-sections ──────────────────────────────
  function buildTechNotes(text, steps, details) {
    const hasText    = !!text;
    const hasSteps   = steps?.length > 0;
    const hasDetails = details?.length > 0;
    if (!hasText && !hasSteps && !hasDetails) return;

    if (hasText) {
      const el = document.getElementById('caseTechNotes');
      if (el) el.textContent = text;
    }

    if (hasSteps) {
      const grid = document.getElementById('implFlowGrid');
      if (grid) {
        grid.innerHTML = steps.map((s, i) => `
          <div class="impl-flow-card">
            <span class="impl-flow-num">${String(i + 1).padStart(2, '0')}</span>
            <p class="impl-flow-step">${esc(s.step)}</p>
            ${s.desc ? `<p class="impl-flow-desc">${esc(s.desc)}</p>` : ''}
          </div>`).join('');
        show('sec-implflow');
      }
    }

    if (hasDetails) {
      const ul = document.getElementById('implDetailsList');
      if (ul) {
        ul.innerHTML = details.map(d => `<li>${esc(d)}</li>`).join('');
        show('sec-impldetails');
      }
    }

    show('sec-technotes');
  }

  // ── PROCESS (Editor.js blocks) ───────────────────────────────────────────
  function buildProcess(blocks) {
    if (!blocks) return;
    const container = document.getElementById('caseProcess');
    if (!container) return;

    const data = typeof blocks === 'string' ? JSON.parse(blocks) : blocks;
    const items = data?.blocks || (Array.isArray(data) ? data : []);
    if (!items.length) return;

    container.innerHTML = items.map(block => renderEditorBlock(block)).join('');
    show('sec-process');
  }

  function renderEditorBlock(block) {
    switch (block.type) {
      case 'header': {
        const level = block.data?.level || 2;
        return `<h${level} class="editorjs-header">${block.data?.text || ''}</h${level}>`;
      }
      case 'paragraph':
        return `<p class="editorjs-paragraph">${block.data?.text || ''}</p>`;
      case 'list': {
        const tag = block.data?.style === 'ordered' ? 'ol' : 'ul';
        const items = (block.data?.items || []).map(i => `<li>${i}</li>`).join('');
        return `<${tag} class="editorjs-list">${items}</${tag}>`;
      }
      case 'image': {
        const url     = block.data?.file?.url || block.data?.url || '';
        const caption = block.data?.caption || '';
        return `
          <figure class="editorjs-image${block.data?.withBorder ? ' with-border' : ''}${block.data?.stretched ? ' stretched' : ''}${block.data?.withBackground ? ' with-bg' : ''}">
            <img src="${esc(url)}" alt="${esc(caption)}" loading="lazy">
            ${caption ? `<figcaption>${caption}</figcaption>` : ''}
          </figure>`;
      }
      case 'quote':
        return `
          <blockquote class="editorjs-quote">
            <p>${block.data?.text || ''}</p>
            ${block.data?.caption ? `<cite>${esc(block.data.caption)}</cite>` : ''}
          </blockquote>`;
      case 'code':
        return `<pre class="editorjs-code"><code>${esc(block.data?.code || '')}</code></pre>`;
      case 'delimiter':
        return `<hr class="editorjs-delimiter">`;
      case 'table': {
        const rows = block.data?.content || [];
        return `
          <div class="editorjs-table-wrap">
            <table class="editorjs-table">
              <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>`;
      }
      case 'warning':
        return `
          <div class="editorjs-warning">
            <strong>${esc(block.data?.title || 'Warning')}</strong>
            <p>${block.data?.message || ''}</p>
          </div>`;
      case 'checklist': {
        const items = (block.data?.items || []).map(i =>
          `<li class="${i.checked ? 'checked' : ''}">
            <span class="check-box">${i.checked ? '✓' : ''}</span>
            ${i.text}
          </li>`).join('');
        return `<ul class="editorjs-checklist">${items}</ul>`;
      }
      default:
        return '';
    }
  }

  // ── KEY LEARNINGS ─────────────────────────────────────────────────────────
  function buildKeyLearnings(list) {
    if (!list?.length) return;
    const ul = document.getElementById('learningsList');
    if (ul) ul.innerHTML = list.map(l => `
      <li class="learning-item">
        <span class="learning-bullet">→</span>
        ${esc(l)}
      </li>`).join('');
    show('sec-learnings');
  }

  // ── PROJECT TESTIMONIALS (from API, filtered by projectId) ────────────────
  async function loadProjectTestimonials(projectId) {
    try {
      const res = await fetch(`${BASE_URL}/testimonials?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) return;
      const items = await res.json();
      if (!items.length) return;

      const list = document.getElementById('caseTestiList');
      if (!list) return;

      list.innerHTML = items.map(t => `
        <div class="testi-card">
          <p class="testi-quote">\u201C${esc(t.quote)}\u201D</p>
          <div class="testi-footer">
            <div class="testi-avatar">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="6" r="3.5" stroke="rgba(255,255,255,0.6)" stroke-width="1.4"/>
                <path d="M2 16c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="rgba(255,255,255,0.6)" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="testi-info">
              <span class="testi-name">${esc(t.name)}</span>
              <span class="testi-role">${esc(t.role || '')}</span>
            </div>
          </div>
        </div>`).join('');

      show('sec-testi');
    } catch { /* silent */ }
  }

  // ── SOCIAL SHARE ──────────────────────────────────────────────────────────
  function initSocialShare(title) {
    const url   = window.location.href;
    const text  = `Check out this project: ${title}`;

    // Web Share API (mobile)
    const nativeBtn = document.getElementById('shareNative');
    const platformBtns = document.getElementById('sharePlatformBtns');
    if (navigator.share && nativeBtn) {
      nativeBtn.style.display = '';
      if (platformBtns) platformBtns.style.display = 'none';
      nativeBtn.addEventListener('click', () =>
        navigator.share({ title, text, url }).catch(() => {})
      );
    }

    // WhatsApp
    const wa = document.getElementById('shareWa');
    if (wa) wa.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;

    // X / Twitter
    const x = document.getElementById('shareX');
    if (x) x.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

    // LinkedIn
    const li = document.getElementById('shareLi');
    if (li) li.href = `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

    // Copy link
    const copyBtn   = document.getElementById('shareCopy');
    const copyLabel = document.getElementById('copyLabel');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(url).then(() => {
          if (copyLabel) { copyLabel.textContent = 'Copied!'; setTimeout(() => { copyLabel.textContent = 'Copy'; }, 2000); }
        }).catch(() => {});
      });
    }
  }

  // ── REQUEST EDIT LINK ─────────────────────────────────────────────────────
  function initEditLink(id) {
    const btn = document.getElementById('requestEditBtn');
    if (btn) btn.href = `edit-request.html?id=${id}`;
  }

  // ── HEADER META ───────────────────────────────────────────────────────────
  function buildHeader(p) {
    document.title = `${p.title} — Case Study | Imanuel Portfolio`;

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = document.title;

    setText('caseTitle', p.title);

    // Tag
    const tagEl = document.getElementById('caseTag');
    if (tagEl) tagEl.textContent = p.tag || p.category || 'Case Study';

    // Meta row: role · period · year with icons
    const metaEl = document.getElementById('caseMeta');
    if (metaEl) {
      const iconRole   = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 12.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
      const iconPeriod = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M7 4v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const iconYear   = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3" width="11" height="9.5" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 6h11M4.5 1.5v3M9.5 1.5v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
      const parts = [
        p.role   ? `<span class="meta-item">${iconRole}${esc(p.role)}</span>` : null,
        p.period ? `<span class="meta-item">${iconPeriod}${esc(p.period)}</span>` : null,
        p.year   ? `<span class="meta-item">${iconYear}${esc(p.year)}</span>` : null,
      ].filter(Boolean);
      metaEl.innerHTML = parts.join('<span class="meta-sep">·</span>');
    }
  }

  // ── Load profile → footer ─────────────────────────────────────────────────
  async function loadProfile() {
    try {
      const res = await fetch(`${BASE_URL}/profile`);
      if (!res.ok) return;
      const p = await res.json();

      const emailBtn = document.querySelector('.email-btn');
      if (emailBtn && p.email) {
        emailBtn.href = `mailto:${p.email}`;
        const tn = [...emailBtn.childNodes].find(n => n.nodeType === 3);
        if (tn) tn.textContent = p.email.toUpperCase() + ' ';
      }

      const footerLinks = document.querySelector('.footer-links');
      if (footerLinks) {
        const links = [
          { label: 'Linkedin', url: p.linkedin },
          { label: 'Instagram', url: p.instagram },
          { label: 'Whatsapp', url: p.whatsapp },
        ].filter(l => l.url);
        if (links.length) {
          footerLinks.innerHTML = links.map(l =>
            `<a href="${esc(l.url)}" target="_blank" rel="noopener">${l.label}</a>`
          ).join('');
        }
      }

      const footerP = document.querySelector('.footer p');
      if (footerP && p.name) footerP.textContent = `© ${new Date().getFullYear()} Hello ${p.name}. All Rights Reserved.`;
    } catch { /* silent */ }
  }

  // ── MAIN LOADER ───────────────────────────────────────────────────────────
  async function loadCase() {
    const id = new URLSearchParams(window.location.search).get('id');

    loadProfile();

    if (!id) {
      setText('caseTitle', 'Project not found');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/projects/${id}`);
      if (!res.ok) throw new Error('Not found');
      const p = await res.json();

      // ── Backward compat: map old schema fields to new ──────────────────────
      // Old: p.image (string) → new: p.images[]
      if (!p.images?.length && p.image) {
        p.images = [{ url: p.image, caption: '' }];
      }
      // Old: p.description → new: p.overview
      if (!p.overview && p.description) {
        p.overview = p.description;
      }
      // Old: p.caseStudy.stack[] → new: p.techStack[]
      const cs = p.caseStudy || {};
      if (!p.techStack?.length && cs.stack?.length) {
        p.techStack = (Array.isArray(cs.stack) ? cs.stack : [cs.stack])
          .map(name => ({ name }));
      }
      // Old: cs.role / cs.duration → new: p.role / p.period
      if (!p.role && cs.role)         p.role   = cs.role;
      if (!p.period && cs.duration)   p.period  = cs.duration;
      // Old: cs.liveUrl → new: p.liveUrl
      if (!p.liveUrl && cs.liveUrl)   p.liveUrl = cs.liveUrl;
      // Old: cs.results[] → new: p.metrics[]
      if (!p.metrics?.length && cs.results?.length) {
        p.metrics = cs.results.map(r => ({ value: r.value, label: r.metric || r.label || '' }));
      }
      // ──────────────────────────────────────────────────────────────────────

      buildHeader(p);
      buildSlider(p.images);
      buildTechStack(p.techStack);
      buildOverview(p);
      buildResponsibilities(p.responsibilities);
      buildOutcome(p);
      buildTextAccordion('sec-detail',    'caseDetail',   p.detailedInfo);
      buildTextAccordion('sec-problem',   'caseProblem',  p.problemSolution);
      buildTextAccordion('sec-appflow',   'caseAppFlow',  p.appFlow);
      buildTechNotes(p.technicalNotes, p.implementFlow, p.implementDetails);
      buildProcess(p.process);
      buildKeyLearnings(p.keyLearnings);
      loadProjectTestimonials(id);
      initSocialShare(p.title);
      initEditLink(id);



    } catch (err) {
      console.warn('Could not load case study:', err.message);
      setText('caseTitle', 'Could not load project');
    }
  }

  document.addEventListener('DOMContentLoaded', loadCase);
})();
