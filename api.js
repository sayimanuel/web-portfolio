// Update PROD_URL below before deploying to production
const BASE_URL = (() => {
  const PROD_URL = '';  // e.g. 'https://api.helloimanuel.com/api'
  const isLocal  = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocal ? 'http://localhost:5500/api' : (PROD_URL || '/api');
})();
window.API_BASE = BASE_URL;

async function get(path) {
  const res = await fetch(BASE_URL + path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── PROJECTS ──

function makeProjectCard(p, showArrowBtn = false) {
  const card = document.createElement('div');
  card.className = 'project-card reveal';
  card.dataset.year = p.year || '';
  card.dataset.cat  = p.category || '';
  card.dataset.type = p.type || '';

  const arrowHtml = showArrowBtn
    ? `<a href="projects.html" class="projects-all-btn projects-all-btn--card" aria-label="See all projects"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="#E8F55F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`
    : '';
  const imgUrl   = p.images?.[0]?.url || p.image || '';
  const imgStyle = imgUrl ? `background-image:url('${imgUrl}')` : '';

  card.innerHTML = `
    <div class="project-img-glass${showArrowBtn ? ' project-img-glass--last' : ''}">
      <div class="project-img${imgUrl ? '' : ' project-img--empty'}" ${imgStyle ? `style="${imgStyle}"` : ''}></div>
      ${arrowHtml}
    </div>
    <h3></h3>
    <a class="pill-btn" href="case.html?id=${p._id}">Read Case <img src="assets/arrow.svg" alt="" width="19" height="19"></a>`;

  card.querySelector('h3').textContent = p.title;
  return card;
}

// Load 3 featured projects for index.html
async function loadFeaturedProjects() {
  const grid = document.querySelector('.projects .projects-grid');
  if (!grid) return;
  try {
    const projects = await get('/projects?featured=true&limit=3');
    grid.innerHTML = '';
    projects.forEach((p, i) => {
      const card = makeProjectCard(p, i === projects.length - 1);
      grid.appendChild(card);
    });
  } catch (err) {
    console.warn('Could not load projects:', err.message);
  }
}


// Load all projects for projects.html — grouped by month/year
async function loadAllProjects() {
  const wrapper = document.querySelector('.allprojects');
  if (!wrapper) return;

  wrapper.querySelectorAll('.projects-group, .projects-loading, .projects-empty').forEach(g => g.remove());

  // Show loading spinner
  const loader = document.createElement('div');
  loader.className = 'projects-loading';
  loader.innerHTML = `<div class="projects-spinner"></div><p>Loading projects…</p>`;
  wrapper.appendChild(loader);

  try {
    const projects = await get('/projects');
    loader.remove();

    if (!projects.length) {
      const empty = document.createElement('div');
      empty.className = 'projects-empty';
      empty.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style="opacity:.25">
          <rect x="6" y="10" width="28" height="22" rx="4" stroke="white" stroke-width="1.5"/>
          <path d="M13 18h14M13 24h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p>No projects yet.</p>`;
      wrapper.appendChild(empty);
      return;
    }

    // Sync year filter pills with actual data
    const timeGroup = document.querySelector('.filter-pills[data-filter="time"]');
    if (timeGroup) {
      const years = [...new Set(projects.map(p => p.year).filter(Boolean))].sort().reverse();
      timeGroup.querySelectorAll('.filter-pill:not([data-val="all"])').forEach(p => p.remove());
      years.forEach(year => {
        const btn = document.createElement('button');
        btn.className  = 'filter-pill';
        btn.dataset.val = year;
        btn.textContent = year;
        timeGroup.appendChild(btn);
      });
    }

    // Group by "Month Year"
    const groups = {};
    projects.forEach(p => {
      const key = (p.month ? p.month + ' ' : '') + (p.year || '');
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    Object.entries(groups).forEach(([label, items]) => {
      const group = document.createElement('div');
      group.className = 'projects-group reveal';

      const dateEl = document.createElement('p');
      dateEl.className = 'projects-date';
      dateEl.textContent = label;
      group.appendChild(dateEl);

      const grid = document.createElement('div');
      grid.className = 'projects-grid';
      items.forEach(p => grid.appendChild(makeProjectCard(p)));
      group.appendChild(grid);

      wrapper.appendChild(group);
    });

    // re-observe
    wrapper.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Notify GSAP ScrollTrigger that project cards are ready
    window.dispatchEvent(new CustomEvent('porto:projectsLoaded'));

    // Stamp "Popular" badge on hot projects
    stampPopularBadges();
  } catch (err) {
    loader.remove();
    console.warn('Could not load all projects:', err.message);
  }
}

// ── TESTIMONIALS ──

function makeTestiCard(t) {
  const card = document.createElement('div');
  card.className = 'testi-card';
  card.innerHTML = `
    <p class="testi-quote"></p>
    <div class="testi-footer">
      <div class="testi-avatar"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="rgba(255,255,255,0.6)" stroke-width="1.4"/><path d="M2 16c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="rgba(255,255,255,0.6)" stroke-width="1.4" stroke-linecap="round"/></svg></div>
      <div class="testi-info"><span class="testi-name"></span><span class="testi-role"></span></div>
    </div>`;
  card.querySelector('.testi-quote').textContent = '\u201C' + t.quote + '\u201D';
  card.querySelector('.testi-name').textContent  = t.name;
  card.querySelector('.testi-role').textContent  = t.role || '';
  return card;
}

async function loadTestimonials() {
  const track = document.querySelector('.testi-track');
  if (!track) return;
  try {
    const items = await get('/testimonials');
    const section = document.getElementById('testimonials');
    if (!items.length) {
      if (section) section.classList.add('testi-marquee--empty');
      return;
    }

    if (section) section.classList.remove('testi-marquee--empty');

    track.innerHTML = '';

    if (items.length <= 4) {
      // Static layout — no scroll, just show cards centered
      if (section) section.classList.add('testi-marquee--static');
      items.forEach(t => track.appendChild(makeTestiCard(t)));
      track.style.animation = 'none';
    } else {
      // Marquee scroll — duplicate enough to fill viewport seamlessly
      if (section) section.classList.remove('testi-marquee--static');
      const CARD_W = 300;
      const vw     = window.innerWidth || 1200;
      const reps   = Math.max(1, Math.ceil(vw / (items.length * CARD_W)) + 1);
      for (let r = 0; r < reps; r++) items.forEach(t => track.appendChild(makeTestiCard(t)));
      for (let r = 0; r < reps; r++) items.forEach(t => track.appendChild(makeTestiCard(t)));
      track.style.animation = 'none';
      track.offsetHeight;
      track.style.animation = '';
    }
  } catch (err) {
    console.warn('Could not load testimonials:', err.message);
  }
}

// Submit review → POST to API
async function submitReview(name, role, quote, projectId, projectTitle) {
  const res = await fetch(BASE_URL + '/testimonials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role, quote, projectId: projectId || '', projectTitle: projectTitle || '' }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function getProjectsForPicker() {
  return get('/projects');
}

// ── EXPERIENCE ──

// Default icon SVG for experience with no image
const EXP_DEFAULT_ICON = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="8" width="20" height="14" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
  <path d="M9 8V7a5 5 0 0 1 10 0v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M4 14h20" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>
</svg>`;

async function loadExperience() {
  const list = document.querySelector('.exp-list');
  if (!list) return;
  try {
    // Fetch both in parallel
    const [items, projects] = await Promise.all([
      get('/experience'),
      get('/projects').catch(() => []),
    ]);

    // Build lookup: lowercase company/title → first project image
    const projImgMap = {};
    projects.forEach(p => {
      const img = p.images?.[0]?.url || p.image || '';
      if (!img) return;
      const key = (p.title || '').toLowerCase().trim();
      if (key && !projImgMap[key]) projImgMap[key] = img;
    });

    list.innerHTML = '';
    items.forEach(item => {
      // Priority: manual imageUrl → matched project image → default icon
      const companyKey = (item.company || '').toLowerCase().trim();
      const matchedImg = projImgMap[companyKey];
      const imgSrc     = item.imageUrl || matchedImg || '';

      const div = document.createElement('div');
      div.className = 'exp-item reveal';

      const imgEl = imgSrc
        ? `<img class="exp-thumb" src="${imgSrc}" alt="${item.company}" loading="lazy">`
        : `<span class="exp-thumb exp-thumb--default">${EXP_DEFAULT_ICON}</span>`;

      div.innerHTML = `
        <span class="exp-role"></span>
        <div class="exp-right-group">
          ${imgEl}
          <div class="exp-info">
            <span class="exp-company"></span>
            <span class="exp-period"></span>
          </div>
        </div>`;

      // Swipe-letters: wrap each char of role in .sl-char with two layers
      const roleEl = div.querySelector('.exp-role');
      // Capitalize manually (CSS text-transform breaks per-span wrapping)
      const roleText = item.role.replace(/\b\w/g, c => c.toUpperCase());
      roleEl.innerHTML = [...roleText].map((ch, i) => {
        const c = ch === ' ' ? '&nbsp;' : ch;
        return `<span class="sl-char" style="--i:${i}"><span class="sl-out">${c}</span><span class="sl-in">${c}</span></span>`;
      }).join('');

      div.querySelector('.exp-company').textContent = item.company;
      div.querySelector('.exp-period').textContent  = item.period;
      list.appendChild(div);
    });
    list.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } catch (err) {
    console.warn('Could not load experience:', err.message);
  }
}

// ── SKILLS ──

async function loadSkills() {
  const pillsContainer = document.querySelector('.skills-pills');
  if (!pillsContainer) return;
  try {
    const items = await get('/skills');
    pillsContainer.innerHTML = '';
    items.forEach(s => {
      const span = document.createElement('span');
      span.className   = 'pill';
      span.dataset.cat = s.category;
      span.textContent = s.name;
      pillsContainer.appendChild(span);
    });

    // Re-apply active filter so newly loaded pills match selected tab
    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.dataset.filter !== 'all') {
      const filter = activeTab.dataset.filter;
      pillsContainer.querySelectorAll('.pill').forEach(pill => {
        pill.classList.toggle('hidden', pill.dataset.cat !== filter);
      });
    }
  } catch (err) {
    console.warn('Could not load skills:', err.message);
  }
}

// ── PROFILE ──

async function loadProfile() {
  try {
    const p = await get('/profile');
    if (!p) return;

    // Hero photo
    const heroImg = document.querySelector('.hero-photo img');
    if (heroImg) {
      if (p.photo) {
        heroImg.src = p.photo;
        heroImg.alt = p.name + ' — Frontend Developer dan UI/UX Designer Jakarta';
        heroImg.style.display = '';
      } else {
        heroImg.style.display = 'none';
      }
    }

    // Email button
    const emailBtn = document.querySelector('.email-btn');
    if (emailBtn && p.email) {
      emailBtn.href = `mailto:${p.email}`;
      const textNode = [...emailBtn.childNodes].find(n => n.nodeType === 3);
      if (textNode) textNode.textContent = p.email.toUpperCase() + ' ';
    }

    // Footer social links
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

    // About / bio
    const aboutEl = document.querySelector('.about-text');
    if (aboutEl && p.bio) {
      aboutEl.textContent = p.bio;
      window.rewrapAbout?.();
    }

    // Footer copyright
    const footerP = document.querySelector('.footer p');
    if (footerP) {
      footerP.textContent = `© ${new Date().getFullYear()} Hello ${p.name}. All Rights Reserved.`;
    }
  } catch { /* silently fail — static fallback */ }
}

// ── INIT ──

document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedProjects();
  loadAllProjects();
  loadTestimonials();
  loadExperience();
  loadSkills();
  loadProfile();
});

// Export for use in script.js review form
window.portoApi = { submitReview, getProjectsForPicker };
