// Theme toggle
(function () {
  const KEY = 'porto_theme';
  const btn  = document.getElementById('navThemeToggle');
  if (!btn) return;

  function applyTheme(theme) {
    document.documentElement.classList.toggle('light', theme === 'light');
    const label = btn.querySelector('.nav-theme-label');
    if (label) label.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
    btn.setAttribute('aria-pressed', theme === 'light');
  }

  applyTheme(localStorage.getItem(KEY) || 'dark');

  btn.addEventListener('click', () => {
    const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    localStorage.setItem(KEY, next);
    applyTheme(next);
  });
})();

// Floating nav menu
(function () {
  const btn   = document.getElementById('navToggle');
  const panel = document.getElementById('navPanel');
  if (!btn || !panel) return;

  // Toggle open/close
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
  });

  // Close on outside click or nav link click
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove('open');
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  panel.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', () => {
      panel.classList.remove('open');
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  // Fade to 50% while scrolling, restore on stop
  let scrollTimer;
  window.addEventListener('scroll', () => {
    btn.classList.add('scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => btn.classList.remove('scrolling'), 500);
  }, { passive: true });
})();

// Skills tab filter
const tabs = document.querySelectorAll('.tab');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const filter = tab.dataset.filter;
    // Re-query pills each time so dynamically loaded skills are included
    document.querySelectorAll('.skills-pills .pill').forEach(pill => {
      const match = filter === 'all' || pill.dataset.cat === filter;
      pill.classList.toggle('hidden', !match);
    });
  });
});

// Scroll reveal — bidirectional
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    entry.target.classList.toggle('visible', entry.isIntersecting);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Unblur text reveal — bidirectional
const aboutText = document.querySelector('.about-text');
if (aboutText) {
  new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      aboutText.classList.toggle('unblurred', entry.isIntersecting);
    });
  }, { threshold: 0.2 }).observe(aboutText);
}

// Typewriter on hero tagline
(function () {
  const el = document.querySelector('.hero-tagline');
  if (!el) return;
  const full = el.textContent.trim();

  // Height already fixed in CSS (60px), just clear content
  el.textContent = '';

  function type() {
    let i = 0;
    el.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    el.appendChild(cursor);

    const iv = setInterval(() => {
      if (i < full.length) {
        cursor.insertAdjacentText('beforebegin', full[i]);
        i++;
      } else {
        clearInterval(iv);
        setTimeout(type, 5000);
      }
    }, 55);
  }
  type();
})();

// Per-letter hover on about text (yellow, reverts after 5s)
(function () {
  const el = document.querySelector('.about-text');
  if (!el) return;

  // Split text nodes into individual char spans
  function wrapChars(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach(ch => {
        if (ch === ' ' || ch === '\n') {
          frag.appendChild(document.createTextNode(ch));
        } else {
          const s = document.createElement('span');
          s.className = 'char-hover';
          s.textContent = ch;
          frag.appendChild(s);
        }
      });
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      [...node.childNodes].forEach(wrapChars);
    }
  }
  wrapChars(el);

  // Expose for re-wrapping after profile bio is loaded dynamically
  window.rewrapAbout = () => {
    el.querySelectorAll('.char-hover').forEach(s => s.replaceWith(document.createTextNode(s.textContent)));
    wrapChars(el);
  };

  el.addEventListener('mouseover', e => {
    const span = e.target.closest('.char-hover');
    if (!span || span.dataset.timer) return;
    span.classList.add('char-yellow');
    span.dataset.timer = setTimeout(() => {
      span.classList.remove('char-yellow');
      delete span.dataset.timer;
    }, 5000);
  });
})();

// Column orbs — clip to skills→footer range
(function () {
  const orbs     = document.querySelector('.grid-orbs');
  const skillsEl = document.querySelector('.skills');
  const footerEl = document.querySelector('.contact');
  if (!orbs || !skillsEl || !footerEl) return;

  function updateClip() {
    const top    = skillsEl.getBoundingClientRect().top;
    const bottom = footerEl.getBoundingClientRect().bottom;
    const vh     = window.innerHeight;
    const clipT  = Math.max(0, top);
    const clipB  = Math.max(0, vh - bottom);
    if (bottom < 0 || top > vh) {
      orbs.style.clipPath = 'inset(0 0 100% 0)';
    } else {
      orbs.style.clipPath = `inset(${clipT}px 0 ${clipB}px 0)`;
    }
  }

  window.addEventListener('scroll', updateClip, { passive: true });
  window.addEventListener('resize', updateClip);
  updateClip();
})();

// All Projects — filter logic
(function () {
  const searchInput = document.getElementById('filterSearch');
  if (!searchInput && !document.querySelector('.filter-pill')) return;

  let activeTime = 'all', activeCat = 'all', activeType = 'all', searchQuery = '';

  function applyFilters() {
    // Re-query each time so dynamically loaded cards are included
    const cards = document.querySelectorAll('.project-card');
    cards.forEach(card => {
      const year  = card.dataset.year || '';
      const cat   = card.dataset.cat  || '';
      const type  = card.dataset.type || '';
      const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
      const show  =
        (activeTime === 'all' || year === activeTime) &&
        (activeCat  === 'all' || cat  === activeCat)  &&
        (activeType === 'all' || type === activeType)  &&
        (!searchQuery || title.includes(searchQuery));
      card.style.display = show ? '' : 'none';
    });
    document.querySelectorAll('.projects-group').forEach(group => {
      const anyVisible = [...group.querySelectorAll('.project-card')].some(c => c.style.display !== 'none');
      group.style.display = anyVisible ? '' : 'none';
    });
  }

  // Use event delegation so dynamically added year pills work automatically
  document.querySelectorAll('.filter-pills').forEach(group => {
    group.addEventListener('click', e => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      group.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const f = group.dataset.filter;
      if (f === 'time') activeTime = pill.dataset.val;
      if (f === 'cat')  activeCat  = pill.dataset.val;
      if (f === 'type') activeType = pill.dataset.val;
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.toLowerCase().trim();
      applyFilters();
    });
  }
})();

// Add review modal
(function () {
  const addBtn   = document.getElementById('testiAddBtn');
  const modal    = document.getElementById('reviewModal');
  const closeBtn = document.getElementById('reviewModalClose');
  const form     = document.getElementById('reviewForm');
  if (!addBtn || !modal) return;

  // ── Searchable project picker ──
  let allProjects    = [];
  let projectsLoaded = false;

  const rssInput    = document.getElementById('rssInput');
  const rssClear    = document.getElementById('rssClear');
  const rssDropdown = document.getElementById('rssDropdown');
  const rssControl  = document.getElementById('rssControl');

  function rssRender(query) {
    const q = (query || '').toLowerCase();
    const filtered = allProjects.filter(p => !q || p.title.toLowerCase().includes(q));
    rssDropdown.innerHTML = '';
    // "none" option
    const none = document.createElement('div');
    none.className = 'rss-option';
    none.dataset.id = '';
    none.dataset.title = '';
    none.textContent = '— Tanpa project —';
    none.addEventListener('mousedown', () => rssSelect('', ''));
    rssDropdown.appendChild(none);
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'rss-option rss-option--empty';
      empty.textContent = 'Project tidak ditemukan';
      rssDropdown.appendChild(empty);
    } else {
      filtered.forEach(p => {
        const opt = document.createElement('div');
        opt.className = 'rss-option';
        opt.dataset.id    = p._id;
        opt.dataset.title = p.title;
        opt.textContent   = p.title;
        opt.addEventListener('mousedown', () => rssSelect(p._id, p.title));
        rssDropdown.appendChild(opt);
      });
    }
  }

  function rssSelect(id, title) {
    document.getElementById('reviewProjectId').value = id;
    rssInput.value = title;
    rssClear.style.display = id ? 'flex' : 'none';
    rssClose();
  }

  function rssOpen() {
    rssRender(rssInput.value);
    rssDropdown.style.display = 'block';
    rssControl.classList.add('open');
    rssInput.setAttribute('aria-expanded', 'true');
  }

  function rssClose() {
    rssDropdown.style.display = 'none';
    rssControl.classList.remove('open');
    rssInput.setAttribute('aria-expanded', 'false');
  }

  rssInput.addEventListener('focus', rssOpen);
  rssInput.addEventListener('input', () => { rssRender(rssInput.value); rssDropdown.style.display = 'block'; });
  rssInput.addEventListener('blur',  () => setTimeout(rssClose, 150));
  rssClear.addEventListener('click', () => { rssSelect('', ''); rssInput.focus(); });
  rssControl.querySelector('.rss-chevron').addEventListener('mousedown', (e) => {
    e.preventDefault();
    rssDropdown.style.display === 'none' ? rssOpen() : rssClose();
  });

  async function loadProjectPicker() {
    if (projectsLoaded) return;
    try {
      allProjects = window.portoApi ? await window.portoApi.getProjectsForPicker() : [];
      projectsLoaded = true;
    } catch { allProjects = []; }
  }

  function openModal()  {
    modal.classList.add('open');
    loadProjectPicker();
  }
  function closeModal() {
    modal.classList.remove('open');
    rssSelect('', '');
  }

  addBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  const submitBtn = form.querySelector('.review-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('reviewName').value.trim();
    const role  = document.getElementById('reviewRole').value.trim();
    const quote = document.getElementById('reviewQuote').value.trim();
    if (!name || !quote) return;

    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      if (window.portoApi) {
        // API mode: POST to backend
        const projectId    = document.getElementById('reviewProjectId')?.value || '';
        const projectTitle = document.getElementById('rssInput')?.value.trim() || '';
        await window.portoApi.submitReview(name, role, quote, projectId, projectTitle);
        submitBtn.textContent = 'Sent! Thank you.';
      } else {
        // Fallback: add card to DOM directly (no backend)
        const track = document.querySelector('.testi-track');
        const allCards = track.querySelectorAll('.testi-card');
        const mid = Math.floor(allCards.length / 2);
        function makeCard() {
          const card = document.createElement('div');
          card.className = 'testi-card';
          card.innerHTML = `<p class="testi-quote"></p>
            <div class="testi-footer">
              <div class="testi-avatar"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="rgba(255,255,255,0.6)" stroke-width="1.4"/><path d="M2 16c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="rgba(255,255,255,0.6)" stroke-width="1.4" stroke-linecap="round"/></svg></div>
              <div class="testi-info"><span class="testi-name"></span><span class="testi-role"></span></div>
            </div>`;
          card.querySelector('.testi-quote').textContent = '\u201C' + quote + '\u201D';
          card.querySelector('.testi-name').textContent = name;
          card.querySelector('.testi-role').textContent = role;
          return card;
        }
        track.insertBefore(makeCard(), allCards[mid]);
        track.appendChild(makeCard());
        track.style.animation = 'none';
        track.offsetHeight;
        track.style.animation = '';
        submitBtn.textContent = 'Submitted!';
      }
    } catch (err) {
      submitBtn.textContent = 'Error. Try again.';
      console.error(err);
    }

    setTimeout(() => {
      submitBtn.textContent = 'Submit Review';
      submitBtn.disabled = false;
      form.reset();
      closeModal();
    }, 1800);
  });
})();

// Hero particles — paused when hero not visible (saves GPU)
(function () {
  const canvas = document.getElementById('heroParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = 80;
  const particles = Array.from({ length: COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.8 + 0.4,
    vx: (Math.random() - 0.5) * 0.0003,
    vy: (Math.random() - 0.5) * 0.0003,
    a: Math.random() * 0.5 + 0.1,
  }));

  let rafId;
  let active = true;

  function draw() {
    if (!active) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;
    particles.forEach(p => {
      p.x = (p.x + p.vx + 1) % 1;
      p.y = (p.y + p.vy + 1) % 1;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(75,129,255,${p.a})`;
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }

  new IntersectionObserver((entries) => {
    active = entries[0].isIntersecting;
    if (active) { cancelAnimationFrame(rafId); draw(); }
  }, { threshold: 0 }).observe(canvas.closest('.hero') || canvas);

  draw();
})();

