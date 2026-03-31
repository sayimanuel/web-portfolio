// ═══════════════════════════════════════════════════
// PORTO ADMIN PANEL
// ═══════════════════════════════════════════════════
// Escape HTML entities to prevent XSS
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Update PROD_URL below before deploying to production
const API = (() => {
  const PROD_URL = '';  // e.g. 'https://api.helloimanuel.com/api'
  const isLocal  = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocal ? 'http://localhost:5500/api' : (PROD_URL || '/api');
})();
let TOKEN = localStorage.getItem('porto_admin_token') || ''; // fallback local dev
let currentTestiTab  = 'approved';
let currentSkillsTab = 'all';
let allTestimonials  = [];
let allSkills        = [];

// ── API helper ─────────────────────────────────────
async function api(method, path, body, isForm = false) {
  const opts = {
    method,
    credentials: 'include', // kirim HttpOnly cookie otomatis
    headers: {},
  };
  // Fallback Authorization header untuk local dev (cross-origin)
  if (TOKEN) opts.headers['Authorization'] = 'Bearer ' + TOKEN;
  if (body) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Toast ───────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('adminToast');
  el.textContent = msg;
  el.className = 'admin-toast ' + type;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Modal ───────────────────────────────────────────
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('adminModal').classList.add('open');
}
function closeModal() {
  if (window._processEditor) {
    window._processEditor.destroy?.();
    window._processEditor = null;
  }
  document.getElementById('adminModal').classList.remove('open');
}
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('adminModal').addEventListener('click', e => {
  if (e.target === document.getElementById('adminModal')) closeModal();
});

// ── Auth ────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const pw  = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  btn.textContent = 'Signing in...';
  btn.disabled = true;
  err.textContent = '';
  try {
    const data = await fetch(API + '/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    }).then(r => r.json());
    if (!data.ok) throw new Error(data.error || 'Failed');
    // Simpan token untuk fallback local dev (cross-origin)
    if (data.token) { TOKEN = data.token; localStorage.setItem('porto_admin_token', TOKEN); }
    showApp();
  } catch (ex) {
    err.textContent = ex.message;
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
});

document.getElementById('eyeToggle').addEventListener('click', () => {
  const inp = document.getElementById('loginPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try { await api('POST', '/auth/logout'); } catch { /* ignore */ }
  TOKEN = '';
  localStorage.removeItem('porto_admin_token');
  document.getElementById('adminApp').style.display  = 'none';
  document.getElementById('adminLogin').style.display = 'flex';
});

// ── Section routing ─────────────────────────────────
const sectionTitles = {
  projects: 'Projects', testimonials: 'Testimonials',
  experience: 'Experience', skills: 'Skills', profile: 'Profile',
  seo: 'SEO Settings', submissions: 'Submissions', analytics: 'Analytics',
  editrequests: 'Edit Requests', messages: 'Messages',
};

async function showApp() {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminApp').style.display  = 'flex';
  loadSection('projects');
  // Update submissions badge
  try {
    const pending = await api('GET', '/projects/pending');
    const badge = document.getElementById('submissionsBadge');
    if (badge) {
      badge.textContent = pending.length;
      badge.style.display = pending.length ? '' : 'none';
    }
  } catch { /* ignore */ }
  // Update notification badge
  pollNotifBadge();
}

// ── Notifications badge ───────────────────────────────────────────────────
let _notifPollTimer = null;

async function pollNotifBadge() {
  try {
    const { unreadCount } = await api('GET', '/notifications/count');
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? '' : 'none';
    }
  } catch { /* ignore */ }
}

// Start polling every 30s when logged in
function startNotifPoll() {
  if (_notifPollTimer) return;
  _notifPollTimer = setInterval(pollNotifBadge, 30000);
}
function stopNotifPoll() {
  clearInterval(_notifPollTimer);
  _notifPollTimer = null;
}

// Cek session via cookie (production) atau token localStorage (local dev)
(async () => {
  try {
    await fetch(API + '/auth/check', { credentials: 'include', headers: TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {} })
      .then(r => { if (r.ok) showApp(); });
  } catch { /* tidak bisa cek, tampilkan login */ }
})();

document.querySelectorAll('.sidebar-link[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadSection(btn.dataset.section);
  });
});

function loadSection(name) {
  document.querySelectorAll('.admin-content section').forEach(s => s.style.display = 'none');
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.style.display = 'block';
  document.getElementById('topbarTitle').textContent = sectionTitles[name] || name;
  if (name === 'projects')     fetchProjects();
  if (name === 'testimonials') fetchTestimonials();
  if (name === 'experience')   fetchExperience();
  if (name === 'skills')       fetchSkills();
  if (name === 'profile')      fetchProfile();
  if (name === 'seo')          fetchSeo();
  if (name === 'submissions')  fetchSubmissions();
  if (name === 'analytics')    fetchAnalytics();
  if (name === 'editrequests') fetchEditRequests();
  if (name === 'messages')     loadMessages();
}

// ══════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════
async function fetchProjects() {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '<div class="empty-state">Loading...</div>';
  try {
    const projects = await api('GET', '/projects');
    document.getElementById('projectsCount').textContent = projects.length + ' total';
    grid.innerHTML = '';
    if (!projects.length) { grid.innerHTML = '<div class="empty-state">No projects yet. Add your first one!</div>'; return; }
    projects.forEach(p => grid.appendChild(makeProjectCard(p)));
  } catch { toast('Failed to load projects', 'error'); }
}

function makeProjectCard(p) {
  const imgUrl = p.images?.[0]?.url || p.image || '';
  const card = document.createElement('div');
  card.className = 'admin-card glass';
  card.innerHTML = `
    ${imgUrl
      ? `<img class="admin-card-img" src="${esc(imgUrl)}" alt="${esc(p.title)}" loading="lazy">`
      : `<div class="admin-card-img-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><circle cx="8.5" cy="10.5" r="1.5" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><path d="M3 16l5-4 4 3 3-2 6 5" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`
    }
    <div class="admin-card-body">
      <div class="admin-card-title">${esc(p.title)}</div>
      <div class="admin-card-meta">
        <span class="meta-tag">${esc(p.year || '—')}</span>
        <span class="meta-tag">${esc(p.category || '—')}</span>
        <span class="meta-tag">${esc(p.type || '—')}</span>
        ${p.featured ? '<span class="meta-tag featured">Featured</span>' : ''}
      </div>
    </div>
    <div class="admin-card-actions">
      <a class="btn-case" href="case.html?id=${p._id}" target="_blank">Preview</a>
      <button class="btn-edit" data-id="${p._id}">Edit</button>
      <button class="btn-danger" data-id="${p._id}">Delete</button>
    </div>`;
  card.querySelector('.btn-edit').addEventListener('click',   () => openProjectForm(p));
  card.querySelector('.btn-danger').addEventListener('click', () => deleteProject(p._id, p.title));
  return card;
}

// ── Tag Select Widget ───────────────────────────────
const _CY = new Date().getFullYear();
// Maps category/type labels ↔ API values
const CATEGORY_TO_VAL = { 'Web Dev': 'web-dev', 'Web Design': 'web-design' };
const CATEGORY_TO_LABEL = Object.fromEntries(Object.entries(CATEGORY_TO_VAL).map(([k,v])=>[v,k]));

// Maps tech stack names → skill category (frontend / backend / software)
const STACK_CATEGORY = {
  // Frontend
  'React': 'frontend', 'Vue': 'frontend', 'Next.js': 'frontend', 'Nuxt.js': 'frontend',
  'Angular': 'frontend', 'TypeScript': 'frontend', 'JavaScript': 'frontend',
  'HTML/CSS': 'frontend', 'Tailwind CSS': 'frontend', 'Bootstrap': 'frontend',
  'Flutter': 'frontend', 'React Native': 'frontend', 'Svelte': 'frontend',
  'Astro': 'frontend', 'Vite': 'frontend', 'Webpack': 'frontend',
  // Backend
  'Node.js': 'backend', 'Express': 'backend', 'Nest.js': 'backend',
  'MongoDB': 'backend', 'PostgreSQL': 'backend', 'MySQL': 'backend',
  'PHP': 'backend', 'Laravel': 'backend', 'Python': 'backend', 'Django': 'backend',
  'Redis': 'backend', 'GraphQL': 'backend', 'REST API': 'backend',
  'Firebase': 'backend', 'Supabase': 'backend', 'Prisma': 'backend',
  // Software / Tools
  'WordPress': 'software', 'Figma': 'software', 'Git': 'software', 'GitHub': 'software',
  'Docker': 'software', 'Postman': 'software', 'VS Code': 'software',
  'Adobe XD': 'software', 'Photoshop': 'software', 'Illustrator': 'software',
};

// ══════════════════════════════════════════════════════
// ADMIN SELECT — RSS-style dropdown (single & multi)
// ══════════════════════════════════════════════════════

const CHEVRON_SVG = `<svg class="as-chevron" width="11" height="7" viewBox="0 0 11 7" fill="none"><path d="M1 1l4.5 4.5L10 1" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ── Single select ──
function initAdminSelect(id, options, currentValue, placeholder) {
  const el = document.getElementById(id);
  if (!el) return;
  el._as = { options: [...options], value: currentValue || '', placeholder: placeholder || 'Pilih...' };
  renderAdminSelect(el);
}

function renderAdminSelect(el) {
  const s = el._as;
  el.innerHTML = `
    <div class="as-wrap">
      <div class="as-control" tabindex="0">
        ${s.value
          ? `<span class="as-display">${s.value}</span>`
          : `<span class="as-display as-ph">${s.placeholder}</span>`}
        ${CHEVRON_SVG}
      </div>
      <div class="as-drop" style="display:none">
        <input class="as-search" type="text" placeholder="Cari atau tambah baru..." autocomplete="off">
        <div class="as-list"></div>
      </div>
    </div>`;

  const control = el.querySelector('.as-control');
  const drop    = el.querySelector('.as-drop');
  const search  = el.querySelector('.as-search');
  const list    = el.querySelector('.as-list');

  function renderList(q) {
    const filtered = s.options.filter(o => !q || o.toLowerCase().includes(q.toLowerCase()));
    list.innerHTML = '';
    filtered.forEach(o => {
      const opt = document.createElement('div');
      opt.className = 'as-option' + (o === s.value ? ' as-option--active' : '');
      opt.textContent = o;
      opt.addEventListener('mousedown', () => { s.value = o; renderAdminSelect(el); });
      list.appendChild(opt);
    });
    if (q && !s.options.some(o => o.toLowerCase() === q.toLowerCase())) {
      const add = document.createElement('div');
      add.className = 'as-option as-option--add';
      add.textContent = `+ Tambah "${q}"`;
      add.addEventListener('mousedown', () => { s.options.push(q); s.value = q; renderAdminSelect(el); });
      list.appendChild(add);
    }
    if (!list.children.length) {
      list.innerHTML = '<div class="as-option as-option--empty">Tidak ada opsi</div>';
    }
  }

  function openDrop()  { renderList(''); drop.style.display='block'; control.classList.add('open'); setTimeout(()=>search.focus(),0); }
  function closeDrop() { drop.style.display='none'; control.classList.remove('open'); }

  control.addEventListener('mousedown', e => { e.preventDefault(); drop.style.display==='none' ? openDrop() : closeDrop(); });
  search.addEventListener('input', () => renderList(search.value));
  search.addEventListener('blur',  () => setTimeout(closeDrop, 150));
}

function getAdminSelect(id) { return document.getElementById(id)?._as?.value || ''; }

// ── Multi select ──
function initAdminMulti(id, options, currentValues) {
  const el = document.getElementById(id);
  if (!el) return;
  el._am = { options: [...options], selected: [...(currentValues || [])] };
  renderAdminMulti(el);
}

function renderAdminMulti(el) {
  const s = el._am;
  const chipsHTML = s.selected.map(v =>
    `<span class="am-chip">${v}<button type="button" class="am-chip-del" data-val="${v}">✕</button></span>`
  ).join('');
  el.innerHTML = `
    ${chipsHTML ? `<div class="am-chips">${chipsHTML}</div>` : ''}
    <div class="as-wrap">
      <div class="as-control am-control">
        <input class="am-search" type="text" placeholder="${s.selected.length ? 'Tambah lebih...' : 'Cari atau tambah stack...'}">
        ${CHEVRON_SVG}
      </div>
      <div class="as-drop" style="display:none">
        <div class="as-list"></div>
      </div>
    </div>`;

  el.querySelectorAll('.am-chip-del').forEach(btn => {
    btn.addEventListener('click', () => { s.selected = s.selected.filter(v => v !== btn.dataset.val); renderAdminMulti(el); });
  });

  const control = el.querySelector('.am-control');
  const search  = el.querySelector('.am-search');
  const drop    = el.querySelector('.as-drop');
  const list    = el.querySelector('.as-list');

  function renderList(q) {
    const available = s.options.filter(o => !s.selected.includes(o));
    const filtered  = available.filter(o => !q || o.toLowerCase().includes(q.toLowerCase()));
    list.innerHTML = '';
    filtered.forEach(o => {
      const opt = document.createElement('div');
      opt.className = 'as-option';
      opt.textContent = o;
      opt.addEventListener('mousedown', () => { s.selected.push(o); search.value=''; renderAdminMulti(el); setTimeout(()=>search.focus(),0); });
      list.appendChild(opt);
    });
    if (q && !s.options.some(o => o.toLowerCase() === q.toLowerCase())) {
      const add = document.createElement('div');
      add.className = 'as-option as-option--add';
      add.textContent = `+ Tambah "${q}"`;
      add.addEventListener('mousedown', () => { if(!s.options.includes(q))s.options.push(q); s.selected.push(q); search.value=''; renderAdminMulti(el); setTimeout(()=>search.focus(),0); });
      list.appendChild(add);
    }
    if (!list.children.length) list.innerHTML = '<div class="as-option as-option--empty">Semua opsi sudah dipilih</div>';
  }

  function openDrop()  { renderList(search.value); drop.style.display='block'; control.classList.add('open'); }
  function closeDrop() { drop.style.display='none'; control.classList.remove('open'); }

  search.addEventListener('focus', openDrop);
  search.addEventListener('input', () => { renderList(search.value); drop.style.display='block'; });
  search.addEventListener('blur',  () => setTimeout(closeDrop, 150));
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = search.value.trim();
      if (val && !s.selected.includes(val)) { if(!s.options.includes(val))s.options.push(val); s.selected.push(val); search.value=''; renderAdminMulti(el); setTimeout(()=>search.focus(),0); }
    }
  });
  el.querySelector('.as-chevron').addEventListener('mousedown', e => {
    e.preventDefault();
    drop.style.display==='none' ? (openDrop(), search.focus()) : closeDrop();
  });
}

function getAdminMulti(id) { return document.getElementById(id)?._am?.selected || []; }

// Backward-compat wrapper
function getTagSelect(id) {
  const el = document.getElementById(id);
  if (!el) return [];
  if (el._am) return el._am.selected;
  if (el._as) return el._as.value ? [el._as.value] : [];
  return [];
}

function initAdminSelects(p) {
  const typeLabel = p?.type ? (p.type.charAt(0).toUpperCase() + p.type.slice(1)) : '';
  initAdminSelect('ts_category', ['Web Dev','Web Design'],
    CATEGORY_TO_LABEL[p?.category] || '', 'Select category...');
  initAdminSelect('ts_type', ['Education','Company','Private'],
    typeLabel, 'Select type...');
  initAdminSelect('ts_year',
    [String(_CY-3),String(_CY-2),String(_CY-1),String(_CY),String(_CY+1)],
    p?.year || String(_CY), 'Select year...');
  initAdminSelect('ts_month',
    ['January','February','March','April','May','June','July','August','September','October','November','December'],
    p?.month || '', 'Select month (optional)...');
  initAdminSelect('ts_role',
    ['Full Stack Dev','Frontend Dev','Backend Dev','UI/UX Designer','Web Designer','Mobile Dev'],
    p?.role || '', 'Select role...');

  // techStack: map [{name, logoUrl}] → string array for multi-select
  const stackNames = (p?.techStack || []).map(t => (typeof t === 'string' ? t : t.name)).filter(Boolean);
  // Fallback: old caseStudy.stack
  const legacyStack = p?.caseStudy?.stack || [];
  initAdminMulti('ts_stack',
    ['React','Vue','Next.js','Nuxt.js','Angular','Node.js','Express','Nest.js','MongoDB','PostgreSQL','MySQL','TypeScript','JavaScript','HTML/CSS','Tailwind CSS','Bootstrap','PHP','Laravel','WordPress','Python','Django','Flutter','React Native','Figma','Adobe XD'],
    stackNames.length ? stackNames : (Array.isArray(legacyStack) ? legacyStack : []));
}

// ══════════════════════════════════════════════════════
// LIST INPUT — interactive add/delete per item
// ══════════════════════════════════════════════════════

function initListInput(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el._li = [...(items || [])];
  renderListInput(el);
}

function renderListInput(el) {
  const items = el._li;
  el.innerHTML = `
    <div class="li-items">
      ${items.map((item, i) => `
        <div class="li-item" data-idx="${i}">
          <span class="li-num">${i + 1}</span>
          <span class="li-text">${item.replace(/</g,'&lt;')}</span>
          <button type="button" class="li-del">✕</button>
        </div>`).join('')}
    </div>
    <div class="li-add-row">
      <input class="li-add-input form-input" type="text" placeholder="Tambah item lalu tekan Enter...">
      <button type="button" class="li-add-btn">+</button>
    </div>`;
  el.querySelectorAll('.li-del').forEach(btn => {
    btn.addEventListener('click', () => {
      el._li.splice(parseInt(btn.closest('.li-item').dataset.idx), 1);
      renderListInput(el);
    });
  });
  const input = el.querySelector('.li-add-input');
  function addItem() {
    const val = input.value.trim();
    if (!val) return;
    el._li.push(val); input.value = ''; renderListInput(el);
    el.querySelector('.li-add-input').focus();
  }
  el.querySelector('.li-add-btn').addEventListener('click', addItem);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
}

function getListInput(id) { return document.getElementById(id)?._li || []; }

// ══════════════════════════════════════════════════════
// ROW INPUT — multi-column interactive rows
// ══════════════════════════════════════════════════════

function initRowInput(id, rows, cols) {
  const el = document.getElementById(id);
  if (!el) return;
  el._ri = { rows: (rows || []).map(r => ({...r})), cols };
  renderRowInput(el);
}

function renderRowInput(el) {
  const { rows, cols } = el._ri;
  el.innerHTML = `
    <div class="ri-rows">
      ${rows.map((row, i) => `
        <div class="ri-row" data-idx="${i}">
          ${cols.map(col => `
            <input class="form-input ri-col" data-key="${col.key}" type="${col.type||'text'}"
              value="${(row[col.key]||'').replace(/"/g,'&quot;')}"
              placeholder="${col.placeholder}">`).join('')}
          <button type="button" class="ri-del">✕</button>
        </div>`).join('')}
    </div>
    <button type="button" class="ri-add-btn">+ Tambah baris</button>`;
  el.querySelectorAll('.ri-row input').forEach(input => {
    input.addEventListener('input', () => {
      el._ri.rows[parseInt(input.closest('.ri-row').dataset.idx)][input.dataset.key] = input.value;
    });
  });
  el.querySelectorAll('.ri-del').forEach(btn => {
    btn.addEventListener('click', () => {
      el._ri.rows.splice(parseInt(btn.closest('.ri-row').dataset.idx), 1);
      renderRowInput(el);
    });
  });
  el.querySelector('.ri-add-btn').addEventListener('click', () => {
    const empty = {}; cols.forEach(c => empty[c.key] = '');
    el._ri.rows.push(empty); renderRowInput(el);
    el.querySelectorAll('.ri-row').item(el._ri.rows.length - 1)?.querySelector('input')?.focus();
  });
}

function getRowInput(id) { return document.getElementById(id)?._ri?.rows || []; }

function initGalleryBuilder(existingGallery) {
  const builder = document.getElementById('galleryBuilder');
  const addBtn  = document.getElementById('addGalleryTabBtn');
  let tabCount  = 0;

  function makeRow(tab) {
    const idx       = tabCount++;
    const label     = tab?.label || '';
    const existImgs = tab?.images?.length ? tab.images : (tab?.image ? [tab.image] : []);

    const row = document.createElement('div');
    row.className  = 'gallery-row';
    row.dataset.idx = idx;
    row.innerHTML = `
      <div class="gallery-row-head">
        <input type="text" class="form-input gal-label" placeholder="Tab label (e.g. Wireframe)" value="${label.replace(/"/g,'&quot;')}">
        <button type="button" class="gallery-row-del" title="Remove tab">✕</button>
      </div>
      <div class="gallery-thumbs" id="galThumbs_${idx}">
        ${existImgs.map(url => `
          <div class="gallery-thumb-item" data-url="${url}">
            <img src="${url}" class="gallery-thumb-img" loading="lazy">
            <button type="button" class="gallery-thumb-del" title="Remove image">✕</button>
          </div>`).join('')}
      </div>
      <div class="img-upload-area gal-upload-area">
        <input type="file" name="gal_${idx}" accept="image/*" multiple>
        <p class="img-upload-text">Click to add images · multiple select allowed (carousel)</p>
        <div class="gal-upload-previews" id="galPreviews_${idx}"></div>
      </div>`;

    row.querySelector('.gallery-row-del').addEventListener('click', () => row.remove());
    row.querySelectorAll('.gallery-thumb-del').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.gallery-thumb-item').remove());
    });
    row.querySelector(`input[name="gal_${idx}"]`).addEventListener('change', e => {
      const prev = document.getElementById(`galPreviews_${idx}`);
      prev.innerHTML = '';
      [...e.target.files].forEach(f => {
        const img = document.createElement('img');
        img.className = 'gal-preview-img';
        img.src = URL.createObjectURL(f);
        prev.appendChild(img);
      });
    });

    return row;
  }

  (existingGallery || []).forEach(tab => builder.appendChild(makeRow(tab)));
  addBtn.addEventListener('click', () => builder.appendChild(makeRow()));
}

function openProjectForm(p = null) {
  const isEdit = !!p;
  const links  = p?.links || {};

  // Existing images HTML (for edit mode)
  const existingImgsHtml = (p?.images || []).map(img => `
    <div class="img-thumb-item" data-image-id="${esc(img.imageId||'')}">
      <img src="${esc(img.url)}" class="img-thumb" loading="lazy">
      <span class="img-thumb-caption">${esc(img.caption||'')}</span>
      <button type="button" class="img-thumb-del" title="Remove">✕</button>
    </div>`).join('');

  openModal(isEdit ? 'Edit Project' : 'Add Project', `
    <form class="modal-form" id="projectForm">

      <!-- ── PROJECT INFO ── -->
      <div class="form-section">
        <div class="form-section-hd">Project Info</div>

        <div class="form-field">
          <label class="form-label">Title *</label>
          <input class="form-input" name="title" value="${esc(p?.title||'')}" required>
        </div>

        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Tag <span class="form-hint">shown above title</span></label>
            <input class="form-input" name="tag" value="${esc(p?.tag||'')}" placeholder="e.g. Case Study, UI Design">
          </div>
          <div class="form-field">
            <label class="form-label">Order <span class="form-hint">lower = first</span></label>
            <input class="form-input" type="number" name="order" value="${p?.order??0}">
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Category *</label>
            <div class="tag-select" id="ts_category"></div>
          </div>
          <div class="form-field">
            <label class="form-label">Type *</label>
            <div class="tag-select" id="ts_type"></div>
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Year *</label>
            <div class="tag-select" id="ts_year"></div>
          </div>
          <div class="form-field">
            <label class="form-label">Month</label>
            <div class="tag-select" id="ts_month"></div>
          </div>
        </div>

        <div class="form-field">
          <div class="toggle-wrap">
            <input type="checkbox" class="toggle-input" name="featured" id="featuredToggle" ${p?.featured?'checked':''}>
            <label class="toggle-label" for="featuredToggle"></label>
            <span class="toggle-text">Featured on Homepage</span>
          </div>
        </div>
      </div>

      <!-- ── IMAGES ── -->
      <div class="form-section">
        <div class="form-section-hd">Images <span class="form-hint">slider — up to 20</span></div>
        ${existingImgsHtml ? `<div class="img-thumbs-row" id="existingImgsRow">${existingImgsHtml}</div>` : ''}
        <div class="img-upload-area" id="imgUploadArea">
          <input type="file" id="imgFileInput" accept="image/*" multiple>
          <p class="img-upload-text">Click to upload · JPG, PNG, WEBP · multiple allowed</p>
          <div class="img-new-previews" id="imgNewPreviews"></div>
        </div>
      </div>

      <!-- ── HEADER META ── -->
      <div class="form-section">
        <div class="form-section-hd">Header Meta</div>
        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Role</label>
            <div class="tag-select" id="ts_role"></div>
          </div>
          <div class="form-field">
            <label class="form-label">Period <span class="form-hint">e.g. 3 Months</span></label>
            <input class="form-input" name="period" value="${esc(p?.period||p?.caseStudy?.duration||'')}" placeholder="e.g. 3 Months, Jan–Mar 2024">
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">Live URL</label>
          <input class="form-input" type="url" name="liveUrl" value="${esc(p?.liveUrl||p?.caseStudy?.liveUrl||'')}" placeholder="https://yourproject.com">
        </div>
      </div>

      <!-- ── CONTENT ── -->
      <div class="form-section">
        <div class="form-section-hd">Content</div>
        <div class="form-field">
          <label class="form-label">Overview</label>
          <textarea class="form-input" name="overview" rows="4" placeholder="Brief description of the project...">${esc(p?.overview||p?.description||'')}</textarea>
        </div>
        <div class="form-field">
          <label class="form-label">Collaboration</label>
          <textarea class="form-input" name="collaboration" rows="2" placeholder="Who did you work with? Client, team, freelance...">${esc(p?.collaboration||'')}</textarea>
        </div>
      </div>

      <!-- ── TECH STACK ── -->
      <div class="form-section">
        <div class="form-section-hd">Tech Stack</div>
        <div class="form-field">
          <div class="tag-select" id="ts_stack"></div>
        </div>
      </div>

      <!-- ── METRICS ── -->
      <div class="form-section">
        <div class="form-section-hd">Metrics <span class="form-hint">key numbers / achievements</span></div>
        <div class="ri-wrap" id="ri_metrics"></div>
      </div>

      <!-- ── RESPONSIBILITIES ── -->
      <div class="form-section">
        <div class="form-section-hd">Responsibilities</div>
        <div class="li-wrap" id="li_responsibilities"></div>
      </div>

      <!-- ── OUTCOME ── -->
      <div class="form-section">
        <div class="form-section-hd">Outcome</div>
        <div class="form-field">
          <textarea class="form-input" name="outcome" rows="3" placeholder="What was the result or impact?">${esc(p?.outcome||'')}</textarea>
        </div>
        <div class="form-section-hd" style="margin-top:12px;font-size:11px">Proof-of-Work Links</div>
        <div class="form-row-3">
          <div class="form-field">
            <label class="form-label">GitHub</label>
            <input class="form-input" type="url" name="link_github" value="${esc(links.github||'')}" placeholder="https://github.com/...">
          </div>
          <div class="form-field">
            <label class="form-label">Figma</label>
            <input class="form-input" type="url" name="link_figma" value="${esc(links.figma||'')}" placeholder="https://figma.com/...">
          </div>
          <div class="form-field">
            <label class="form-label">Prototype</label>
            <input class="form-input" type="url" name="link_prototype" value="${esc(links.prototype||'')}" placeholder="https://...">
          </div>
        </div>
      </div>

      <!-- ── DETAIL SECTIONS ── -->
      <div class="form-section">
        <div class="form-section-hd">Detail Sections</div>
        <div class="form-field">
          <label class="form-label">Detailed Information</label>
          <textarea class="form-input" name="detailedInfo" rows="3" placeholder="In-depth project information...">${esc(p?.detailedInfo||'')}</textarea>
        </div>
        <div class="form-field">
          <label class="form-label">Problem &amp; Solution</label>
          <textarea class="form-input" name="problemSolution" rows="3" placeholder="Problem encountered and how it was solved...">${esc(p?.problemSolution||'')}</textarea>
        </div>
        <div class="form-field">
          <label class="form-label">Application Flow</label>
          <textarea class="form-input" name="appFlow" rows="3" placeholder="How the application flows / user journey...">${esc(p?.appFlow||'')}</textarea>
        </div>
        <div class="form-field">
          <label class="form-label">Technical Notes</label>
          <textarea class="form-input" name="technicalNotes" rows="3" placeholder="Architecture decisions, trade-offs, interesting technical choices...">${esc(p?.technicalNotes||'')}</textarea>
        </div>
      </div>

      <!-- ── IMPLEMENT FLOW ── -->
      <div class="form-section">
        <div class="form-section-hd">Implementation Flow <span class="form-hint">ordered steps</span></div>
        <div class="ri-wrap" id="ri_implFlow"></div>
      </div>

      <!-- ── IMPLEMENT DETAILS ── -->
      <div class="form-section">
        <div class="form-section-hd">Implementation Details</div>
        <div class="li-wrap" id="li_implDetails"></div>
      </div>

      <!-- ── KEY LEARNINGS ── -->
      <div class="form-section">
        <div class="form-section-hd">Key Learnings</div>
        <div class="li-wrap" id="li_keyLearnings"></div>
      </div>

      <!-- ── PROCESS (Editor.js) ── -->
      <div class="form-section">
        <div class="form-section-hd">Process <span class="form-hint">rich text editor</span></div>
        <div id="processEditorHolder" class="process-editor-holder"></div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="modalCancelBtn">Cancel</button>
        <button type="submit" class="btn-save">${isEdit?'Save Changes':'Create Project'}</button>
      </div>
    </form>`);

  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

  // New image file previews
  document.getElementById('imgFileInput').addEventListener('change', e => {
    const prev = document.getElementById('imgNewPreviews');
    if (!prev) return;
    prev.innerHTML = '';
    [...e.target.files].forEach(f => {
      const img = document.createElement('img');
      img.className = 'img-new-preview';
      img.src = URL.createObjectURL(f);
      prev.appendChild(img);
    });
  });

  // Remove existing image (immediate API call in edit mode)
  document.querySelectorAll('.img-thumb-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!isEdit) { btn.closest('.img-thumb-item').remove(); return; }
      const item    = btn.closest('.img-thumb-item');
      const imageId = item.dataset.imageId;
      if (!imageId) { item.remove(); return; }
      btn.disabled = true;
      try {
        const rfd = new FormData();
        rfd.append('removeImageId', imageId);
        await api('PUT', '/projects/' + p._id, rfd, true);
        item.remove();
      } catch (ex) {
        toast(ex.message, 'error');
        btn.disabled = false;
      }
    });
  });

  // Init selects + list + row inputs
  initAdminSelects(p);

  initRowInput('ri_metrics', p?.metrics || [],
    [{key:'value',placeholder:'e.g. 98',type:'number'},{key:'label',placeholder:'Label (e.g. % Satisfaction)'}]);

  initListInput('li_responsibilities', p?.responsibilities || []);

  initRowInput('ri_implFlow', p?.implementFlow || [],
    [{key:'step',placeholder:'Step name'},{key:'desc',placeholder:'Description'}]);

  initListInput('li_implDetails',   p?.implementDetails || []);
  initListInput('li_keyLearnings',  p?.keyLearnings     || []);

  // Init Editor.js for Process section
  if (window.EditorJS) {
    if (window._processEditor) {
      window._processEditor.destroy?.();
      window._processEditor = null;
    }
    const existingProcess = p?.process
      ? (typeof p.process === 'string' ? JSON.parse(p.process) : p.process)
      : {};
    window._processEditor = new window.EditorJS({
      holder: 'processEditorHolder',
      data: existingProcess,
      placeholder: 'Write the project process here...',
      tools: {
        header:    window.Header    ? { class: window.Header,    inlineToolbar: true } : undefined,
        list:      window.List      ? { class: window.List,      inlineToolbar: true } : undefined,
        quote:     window.Quote     ? { class: window.Quote,     inlineToolbar: true } : undefined,
        code:      window.CodeTool  ? { class: window.CodeTool }                       : undefined,
        delimiter: window.Delimiter ? { class: window.Delimiter }                      : undefined,
        table:     window.Table     ? { class: window.Table,     inlineToolbar: true } : undefined,
        checklist: window.Checklist ? { class: window.Checklist, inlineToolbar: true } : undefined,
        warning:   window.Warning   ? { class: window.Warning,   inlineToolbar: true } : undefined,
        marker:    window.Marker    ? { class: window.Marker }                         : undefined,
        inlineCode: window.InlineCode ? { class: window.InlineCode } : undefined,
      },
      minHeight: 200,
    });
  }

  // Form submit
  document.getElementById('projectForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const btn  = form.querySelector('.btn-save');
    btn.textContent = 'Saving...'; btn.disabled = true;

    try {
      const fd = new FormData();
      fd.append('title',    form.title.value.trim());
      fd.append('tag',      form.tag.value.trim());
      fd.append('order',    form.order.value);
      fd.append('featured', form.featured.checked);

      const catLabel = getTagSelect('ts_category')[0] || '';
      fd.append('category', CATEGORY_TO_VAL[catLabel] || catLabel.toLowerCase().replace(/\s+/g,'-'));
      const typeLabel = getTagSelect('ts_type')[0] || '';
      fd.append('type',  typeLabel.toLowerCase() || '');
      fd.append('year',  getTagSelect('ts_year')[0]  || '');
      fd.append('month', getTagSelect('ts_month')[0] || '');

      // New images
      const imgFiles = document.getElementById('imgFileInput').files;
      [...imgFiles].forEach(f => fd.append('images', f));

      // Header meta
      fd.append('role',    getTagSelect('ts_role')[0] || '');
      fd.append('period',  form.period.value.trim());
      fd.append('liveUrl', form.liveUrl.value.trim());

      // Content
      fd.append('overview',      form.overview.value.trim());
      fd.append('collaboration', form.collaboration.value.trim());

      // Tech stack → array of {name}
      const stackNames = getTagSelect('ts_stack');
      fd.append('techStack', JSON.stringify(stackNames.map(name => ({ name }))));

      // Metrics
      fd.append('metrics', JSON.stringify(getRowInput('ri_metrics').filter(r => r.value)));

      // Responsibilities
      fd.append('responsibilities', JSON.stringify(getListInput('li_responsibilities')));

      // Outcome + links
      fd.append('outcome', form.outcome.value.trim());
      fd.append('links', JSON.stringify({
        github:    form.link_github.value.trim(),
        figma:     form.link_figma.value.trim(),
        prototype: form.link_prototype.value.trim(),
      }));

      // Detail sections
      fd.append('detailedInfo',    form.detailedInfo.value.trim());
      fd.append('problemSolution', form.problemSolution.value.trim());
      fd.append('appFlow',         form.appFlow.value.trim());
      fd.append('technicalNotes',  form.technicalNotes.value.trim());

      // Implement flow + details
      fd.append('implementFlow',    JSON.stringify(getRowInput('ri_implFlow').filter(r => r.step)));
      fd.append('implementDetails', JSON.stringify(getListInput('li_implDetails')));

      // Key learnings
      fd.append('keyLearnings', JSON.stringify(getListInput('li_keyLearnings')));

      // Process (Editor.js)
      if (window._processEditor) {
        try {
          const processData = await window._processEditor.save();
          if (processData.blocks?.length) {
            fd.append('process', JSON.stringify(processData));
          }
        } catch { /* editor not ready */ }
      }

      let saved;
      if (isEdit) {
        // PUT uses newImages field for new uploads
        const fd2 = new FormData();
        for (const [k, v] of fd.entries()) {
          if (k === 'images') fd2.append('newImages', v);
          else fd2.append(k, v);
        }
        saved = await api('PUT', '/projects/' + p._id, fd2, true);
      } else {
        saved = await api('POST', '/projects', fd, true);
      }

      // Auto-sync tech stack → Skills
      if (stackNames.length) {
        try {
          const payload = stackNames.map(name => ({ name, category: STACK_CATEGORY[name] || 'frontend' }));
          const result  = await api('POST', '/skills/sync', payload);
          toast(result.added > 0
            ? `Saved! ${result.added} skill${result.added > 1 ? 's' : ''} added to Tech Stack.`
            : (isEdit ? 'Project updated!' : 'Project created!'));
        } catch {
          toast(isEdit ? 'Project updated!' : 'Project created!');
        }
      } else {
        toast(isEdit ? 'Project updated!' : 'Project created!');
      }

      closeModal();
      fetchProjects();
      if (document.getElementById('sec-skills').style.display !== 'none') fetchSkills();
    } catch (ex) { toast(ex.message, 'error'); }
    finally { btn.textContent = isEdit ? 'Save Changes' : 'Create Project'; btn.disabled = false; }
  });
}

async function deleteProject(id, title) {
  if (!confirm(`Delete "${title}"?`)) return;
  try {
    await api('DELETE', '/projects/' + id);
    toast('Project deleted');
    fetchProjects();
  } catch (ex) { toast(ex.message, 'error'); }
}

document.getElementById('addProjectBtn').addEventListener('click', () => openProjectForm());


// ══════════════════════════════════════════════════════
// TESTIMONIALS
// ══════════════════════════════════════════════════════
async function fetchTestimonials() {
  const tbody = document.getElementById('testiTbody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="5">Loading...</td></tr>';
  try {
    allTestimonials = await api('GET', '/testimonials?all=true');
    renderTestimonials();
  } catch { toast('Failed to load testimonials', 'error'); }
}

function renderTestimonials() {
  const tbody = document.getElementById('testiTbody');
  const filtered = allTestimonials.filter(t =>
    currentTestiTab === 'approved' ? t.approved : !t.approved
  );
  const pending = allTestimonials.filter(t => !t.approved).length;
  document.getElementById('pendingBadge').textContent = pending ? `(${pending})` : '';
  document.getElementById('testiCount').textContent = allTestimonials.length + ' total';

  tbody.innerHTML = '';
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted)">${currentTestiTab === 'pending' ? 'No pending reviews' : 'No approved reviews'}</td></tr>`;
    return;
  }
  filtered.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600">${esc(t.name)}</td>
      <td class="td-muted">${esc(t.role || '—')}</td>
      <td class="td-quote td-muted">${esc(t.quote)}</td>
      <td class="td-muted">${new Date(t.createdAt).toLocaleDateString('id-ID')}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        ${!t.approved ? `<button class="btn-approve" data-id="${esc(t._id)}">Approve</button>` : ''}
        <button class="btn-danger" data-id="${esc(t._id)}">Delete</button>
      </td>`;
    tr.querySelector('.btn-danger').addEventListener('click', async () => {
      if (!confirm('Delete this review?')) return;
      try { await api('DELETE', '/testimonials/' + t._id); toast('Deleted'); fetchTestimonials(); }
      catch (ex) { toast(ex.message, 'error'); }
    });
    const appBtn = tr.querySelector('.btn-approve');
    if (appBtn) appBtn.addEventListener('click', async () => {
      try { await api('PATCH', '/testimonials/' + t._id + '/approve'); toast('Approved!'); fetchTestimonials(); }
      catch (ex) { toast(ex.message, 'error'); }
    });
    tbody.appendChild(tr);
  });
}

document.querySelectorAll('.tab-bar-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-bar-btn[data-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTestiTab = btn.dataset.tab;
    renderTestimonials();
  });
});

// ══════════════════════════════════════════════════════
// EXPERIENCE
// ══════════════════════════════════════════════════════
async function fetchExperience() {
  const tbody = document.getElementById('expTbody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="4">Loading...</td></tr>';
  try {
    const items = await api('GET', '/experience');
    document.getElementById('expCount').textContent = items.length + ' total';
    tbody.innerHTML = '';
    if (!items.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--muted)">No experience entries yet.</td></tr>'; return; }
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600">${esc(item.role)}</td>
        <td>${esc(item.company)}</td>
        <td class="td-muted">${esc(item.period)}</td>
        <td style="display:flex;gap:6px">
          <button class="btn-edit" data-id="${esc(item._id)}">Edit</button>
          <button class="btn-danger" data-id="${esc(item._id)}">Delete</button>
        </td>`;
      tr.querySelector('.btn-edit').addEventListener('click',   () => openExpForm(item));
      tr.querySelector('.btn-danger').addEventListener('click', () => deleteExp(item._id));
      tbody.appendChild(tr);
    });
  } catch { toast('Failed to load experience', 'error'); }
}

function openExpForm(item = null) {
  const isEdit = !!item;
  openModal(isEdit ? 'Edit Experience' : 'Add Experience', `
    <form class="modal-form" id="expForm">
      <div class="form-field">
        <label class="form-label">Role *</label>
        <input class="form-input" name="role" value="${item?.role || ''}" required>
      </div>
      <div class="form-field">
        <label class="form-label">Company *</label>
        <input class="form-input" name="company" value="${item?.company || ''}" required>
      </div>
      <div class="form-field">
        <label class="form-label">Period *</label>
        <input class="form-input" name="period" value="${item?.period || ''}" placeholder="NOV 2025 - DEC 2025" required>
      </div>
      <div class="form-field">
        <label class="form-label">Order</label>
        <input class="form-input" type="number" name="order" value="${item?.order ?? 0}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="expCancel">Cancel</button>
        <button type="submit" class="btn-save">${isEdit ? 'Save Changes' : 'Add Experience'}</button>
      </div>
    </form>`);
  document.getElementById('expCancel').addEventListener('click', closeModal);
  document.getElementById('expForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target; const btn = form.querySelector('.btn-save');
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
      const body = { role: form.role.value, company: form.company.value, period: form.period.value, order: form.order.value };
      if (isEdit) await api('PUT',  '/experience/' + item._id, body);
      else        await api('POST', '/experience',              body);
      toast(isEdit ? 'Updated!' : 'Added!'); closeModal(); fetchExperience();
    } catch (ex) { toast(ex.message, 'error'); }
    finally { btn.textContent = isEdit ? 'Save Changes' : 'Add Experience'; btn.disabled = false; }
  });
}

async function deleteExp(id) {
  if (!confirm('Delete this experience?')) return;
  try { await api('DELETE', '/experience/' + id); toast('Deleted'); fetchExperience(); }
  catch (ex) { toast(ex.message, 'error'); }
}

document.getElementById('addExpBtn').addEventListener('click', () => openExpForm());

document.getElementById('syncExpBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncExpBtn');
  btn.textContent = 'Syncing...';
  btn.disabled = true;
  try {
    const projects = await api('GET', '/projects');
    const entries = projects
      .filter(p => p.caseStudy?.role && p.caseStudy?.client)
      .map(p => ({
        role:    p.caseStudy.role,
        company: p.caseStudy.client,
        period:  [p.month, p.year].filter(Boolean).join(' ') || p.year || '',
      }));

    if (!entries.length) {
      toast('Tidak ada project dengan Role + Client yang terisi.', 'info');
      return;
    }

    const result = await api('POST', '/experience/sync', entries);
    if (result.added > 0) {
      toast(`${result.added} experience baru ditambahkan dari projects!`);
      fetchExperience();
    } else {
      toast('Semua experience sudah ada — tidak ada yang ditambahkan.');
    }
  } catch (ex) { toast(ex.message, 'error'); }
  finally {
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 0l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Sync from Projects`;
    btn.disabled = false;
  }
});

// ══════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════
async function fetchSkills() {
  document.getElementById('skillsGrid').innerHTML = '<div class="empty-state">Loading...</div>';
  try {
    allSkills = await api('GET', '/skills');
    document.getElementById('skillsCount').textContent = allSkills.length + ' total';
    renderSkills();
  } catch { toast('Failed to load skills', 'error'); }
}

function renderSkills() {
  const grid = document.getElementById('skillsGrid');
  const filtered = currentSkillsTab === 'all' ? allSkills : allSkills.filter(s => s.category === currentSkillsTab);
  grid.innerHTML = '';
  if (!filtered.length) { grid.innerHTML = '<div class="empty-state">No skills in this category.</div>'; return; }
  filtered.forEach(s => {
    const el = document.createElement('div');
    el.className = 'skill-pill-admin';
    el.innerHTML = `<span class="cat-dot cat-${esc(s.category)}"></span>${esc(s.name)}<button class="skill-del-btn" title="Delete"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`;
    el.querySelector('.skill-del-btn').addEventListener('click', async () => {
      if (!confirm(`Delete "${s.name}"?`)) return;
      try { await api('DELETE', '/skills/' + s._id); toast('Deleted'); fetchSkills(); }
      catch (ex) { toast(ex.message, 'error'); }
    });
    grid.appendChild(el);
  });
}

document.querySelectorAll('.tab-bar-btn[data-stab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-bar-btn[data-stab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSkillsTab = btn.dataset.stab;
    renderSkills();
  });
});

function skillRowHTML(index) {
  return `
    <div class="skill-row" data-index="${index}">
      <div class="skill-row-fields">
        <input class="form-input skill-name-input" placeholder="e.g. React" required>
        <select class="form-input skill-cat-input">
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="software">Software</option>
        </select>
      </div>
      <button type="button" class="skill-row-remove" title="Remove">&#10005;</button>
    </div>`;
}

document.getElementById('syncSkillsBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncSkillsBtn');
  btn.textContent = 'Syncing...';
  btn.disabled = true;
  try {
    const projects = await api('GET', '/projects');
    const allStack = projects.flatMap(p => p.caseStudy?.stack || []);
    const unique   = [...new Set(allStack.map(s => s.trim()).filter(Boolean))];
    if (!unique.length) { toast('No stack items found in projects', 'info'); return; }

    const payload = unique.map(name => ({ name, category: STACK_CATEGORY[name] || 'frontend' }));
    const result  = await api('POST', '/skills/sync', payload);
    if (result.added > 0) {
      toast(`${result.added} skill${result.added > 1 ? 's' : ''} added from projects!`);
      fetchSkills();
    } else {
      toast('All skills already exist — nothing to add.');
    }
  } catch (ex) { toast(ex.message, 'error'); }
  finally {
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 0l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Sync from Projects`;
    btn.disabled = false;
  }
});

document.getElementById('addSkillBtn').addEventListener('click', () => {
  openModal('Add Skill', `
    <form class="modal-form" id="skillForm">
      <div id="skillRows">
        ${skillRowHTML(0)}
      </div>
      <button type="button" class="btn-add-more" id="addMoreSkillBtn">+ Add More</button>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="skillCancel">Cancel</button>
        <button type="submit" class="btn-save">Add Skill</button>
      </div>
    </form>`);

  document.getElementById('skillCancel').addEventListener('click', closeModal);

  document.getElementById('addMoreSkillBtn').addEventListener('click', () => {
    const rows = document.getElementById('skillRows');
    const index = rows.querySelectorAll('.skill-row').length;
    rows.insertAdjacentHTML('beforeend', skillRowHTML(index));
    rows.querySelectorAll('.skill-row')[index].querySelector('.skill-row-remove').addEventListener('click', function() {
      this.closest('.skill-row').remove();
    });
    const saveBtn = document.querySelector('#skillForm .btn-save');
    const count = rows.querySelectorAll('.skill-row').length;
    saveBtn.textContent = `Add ${count} Skills`;
  });

  document.getElementById('skillForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.btn-save');
    const rows = document.getElementById('skillRows').querySelectorAll('.skill-row');
    const skills = Array.from(rows).map(row => ({
      name: row.querySelector('.skill-name-input').value.trim(),
      category: row.querySelector('.skill-cat-input').value
    })).filter(s => s.name);

    if (!skills.length) return;
    btn.textContent = 'Adding...'; btn.disabled = true;
    try {
      await Promise.all(skills.map(s => api('POST', '/skills', s)));
      toast(skills.length > 1 ? `${skills.length} skills added!` : 'Skill added!');
      closeModal(); fetchSkills();
    } catch (ex) { toast(ex.message, 'error'); }
    finally { btn.textContent = 'Add Skill'; btn.disabled = false; }
  });

  // Initial remove button (disabled when only 1 row)
  document.querySelector('.skill-row-remove').addEventListener('click', function() {
    const rows = document.getElementById('skillRows');
    if (rows.querySelectorAll('.skill-row').length > 1) {
      this.closest('.skill-row').remove();
      const count = rows.querySelectorAll('.skill-row').length;
      const saveBtn = document.querySelector('#skillForm .btn-save');
      saveBtn.textContent = count > 1 ? `Add ${count} Skills` : 'Add Skill';
    }
  });
});

// ══════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════
function updateBioCount() {
  const bio   = document.getElementById('bioInput');
  const count = document.getElementById('bioCharCount');
  if (bio && count) count.textContent = bio.value.length + ' chars';
}

async function fetchProfile() {
  try {
    const p = await api('GET', '/profile');
    const form = document.getElementById('profileForm');
    ['name','email','tagline','bio','linkedin','instagram','whatsapp'].forEach(key => {
      if (form[key]) form[key].value = p[key] || '';
    });
    updateBioCount();
    if (p.photo) {
      const prev = document.getElementById('photoPreview');
      prev.src = p.photo;
      prev.style.display = 'block';
    }
  } catch { toast('Failed to load profile', 'error'); }
}

document.getElementById('bioInput').addEventListener('input', updateBioCount);

document.getElementById('photoInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const prev = document.getElementById('photoPreview');
  prev.src = URL.createObjectURL(file);
  prev.style.display = 'block';
});

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const btn  = document.getElementById('saveProfileBtn');
  const form = document.getElementById('profileForm');
  btn.textContent = 'Saving...';
  try {
    const fd = new FormData();
    ['name','email','tagline','bio','linkedin','instagram','whatsapp'].forEach(k => {
      if (form[k]) fd.append(k, form[k].value);
    });
    const file = document.getElementById('photoInput').files[0];
    if (file) fd.append('photo', file);
    await api('PUT', '/profile', fd, true);
    toast('Profile saved!');
  } catch (ex) { toast(ex.message, 'error'); }
  finally { btn.textContent = 'Save Changes'; }
});

// ══════════════════════════════════════════════════════
// SUBMISSIONS
// ══════════════════════════════════════════════════════
async function fetchSubmissions() {
  const tbody = document.getElementById('submissionsTbody');
  const empty = document.getElementById('submissionsEmpty');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;opacity:.5">Loading...</td></tr>';
  empty.style.display = 'none';
  try {
    const list = await api('GET', '/projects/pending');
    tbody.innerHTML = '';
    if (!list.length) {
      empty.style.display = 'block';
      return;
    }
    list.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          ${p.image ? `<img src="${esc(p.image)}" style="width:56px;height:40px;object-fit:cover;border-radius:6px;">` : '—'}
        </td>
        <td><strong>${esc(p.title)}</strong></td>
        <td>${esc(p.submittedBy?.name || '—')}<br><small style="opacity:.5">${esc(p.submittedBy?.email || '')}</small></td>
        <td><span class="meta-tag">${esc(p.category || '—')}</span></td>
        <td>${esc(p.year || '—')}</td>
        <td style="max-width:180px;font-size:12px;opacity:.65">${esc(p.submittedBy?.note || '—')}</td>
        <td>
          <div style="display:flex;gap:8px">
            <button class="btn-edit btn-approve" data-id="${esc(p._id)}">Approve</button>
            <button class="btn-danger btn-reject" data-id="${esc(p._id)}">Reject</button>
          </div>
        </td>`;
      tr.querySelector('.btn-approve').addEventListener('click', () => approveSubmission(p._id));
      tr.querySelector('.btn-reject').addEventListener('click',  () => rejectSubmission(p._id, p.title));
      tbody.appendChild(tr);
    });
  } catch { toast('Failed to load submissions', 'error'); }
}

async function approveSubmission(id) {
  if (!confirm('Approve this submission and publish it?')) return;
  try {
    await api('PATCH', '/projects/' + id + '/approve');
    toast('Project published!');
    fetchSubmissions();
    // Refresh badge
    const pending = await api('GET', '/projects/pending');
    const badge = document.getElementById('submissionsBadge');
    if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? '' : 'none'; }
  } catch (ex) { toast(ex.message, 'error'); }
}

async function rejectSubmission(id, title) {
  if (!confirm('Reject and delete "' + title + '"? This cannot be undone.')) return;
  try {
    await api('PATCH', '/projects/' + id + '/reject');
    toast('Submission rejected.');
    fetchSubmissions();
    const pending = await api('GET', '/projects/pending');
    const badge = document.getElementById('submissionsBadge');
    if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? '' : 'none'; }
  } catch (ex) { toast(ex.message, 'error'); }
}

// ══════════════════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════════════════
const SUN_SVG  = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.2" stroke="currentColor" stroke-width="1.4"/><line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="3.05" y1="3.05" x2="4.46" y2="4.46" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="11.54" y1="11.54" x2="12.95" y2="12.95" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="12.95" y1="3.05" x2="11.54" y2="4.46" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="4.46" y1="11.54" x2="3.05" y2="12.95" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const MOON_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function applyTheme(light) {
  document.documentElement.classList.toggle('light', light);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = light ? MOON_SVG : SUN_SVG;
}

// Init theme from localStorage
applyTheme(document.documentElement.classList.contains('light'));

document.getElementById('themeToggle').addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('porto_admin_theme', isLight ? 'light' : 'dark');
  document.getElementById('themeToggle').innerHTML = isLight ? MOON_SVG : SUN_SVG;
});

// ══════════════════════════════════════════════
// SEO PANEL
// ══════════════════════════════════════════════

let _seoData = {};

function seoCounter(inputId, countId, max) {
  const el = document.getElementById(inputId);
  const ct = document.getElementById(countId);
  if (!el || !ct) return;
  function update() {
    const len = el.value.length;
    ct.textContent = `${len}/${max}`;
    ct.style.color = len > max * 0.9 ? '#f87171' : '';
  }
  el.addEventListener('input', update);
  update();
}

function updateSeoPreview() {
  const title = document.getElementById('seoHomeTitle')?.value ||
    'Imanuel — Frontend Developer & UI/UX Designer Jakarta';
  const desc = document.getElementById('seoHomeDesc')?.value ||
    'Imanuel adalah Frontend Developer dan UI/UX Designer berbasis di Jakarta...';
  const base = document.getElementById('seoCanonical')?.value || 'helloimanuel.netlify.app';
  const url  = base.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const pt = document.getElementById('seoPreviewTitle');
  const pd = document.getElementById('seoPreviewDesc');
  const pu = document.getElementById('seoPreviewUrl');
  if (pt) pt.textContent = title.slice(0, 60) + (title.length > 60 ? '…' : '');
  if (pd) pd.textContent = desc.slice(0, 160) + (desc.length > 160 ? '…' : '');
  if (pu) pu.textContent = url;
}

function generateMetaTags() {
  const s = {
    siteName:      document.getElementById('seoSiteName')?.value      || '',
    canonicalBase: document.getElementById('seoCanonical')?.value     || '',
    gaId:          document.getElementById('seoGaId')?.value          || '',
    gscCode:       document.getElementById('seoGscCode')?.value       || '',
    homeTitle:     document.getElementById('seoHomeTitle')?.value     || '',
    homeDesc:      document.getElementById('seoHomeDesc')?.value      || '',
    homeKeywords:  document.getElementById('seoHomeKeywords')?.value  || '',
    ogImage:       _seoData.ogImage || '',
    noIndex:       document.getElementById('seoNoIndex')?.checked,
  };

  const base = s.canonicalBase.replace(/\/$/, '');
  const lines = [
    `<!-- Primary SEO -->`,
    s.homeTitle    ? `<title>${s.homeTitle}</title>` : '',
    s.homeDesc     ? `<meta name="description" content="${s.homeDesc}">` : '',
    s.homeKeywords ? `<meta name="keywords" content="${s.homeKeywords}">` : '',
    s.noIndex      ? `<meta name="robots" content="noindex, nofollow">` : `<meta name="robots" content="index, follow">`,
    base           ? `<link rel="canonical" href="${base}/">` : '',
    ``,
    `<!-- Open Graph -->`,
    base           ? `<meta property="og:url" content="${base}/">` : '',
    s.homeTitle    ? `<meta property="og:title" content="${s.homeTitle}">` : '',
    s.homeDesc     ? `<meta property="og:description" content="${s.homeDesc}">` : '',
    s.ogImage      ? `<meta property="og:image" content="${s.ogImage}">` : '',
    ``,
    `<!-- Google Analytics -->`,
    s.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${s.gaId}"></script>` : '',
    s.gaId ? `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${s.gaId}');</script>` : '',
    ``,
    s.gscCode ? `<!-- Google Search Console -->` : '',
    s.gscCode ? `<meta name="google-site-verification" content="${s.gscCode}">` : '',
  ].filter(l => l !== '').join('\n');

  const el = document.getElementById('seoCodeOutput');
  if (el) el.textContent = lines;
}

async function fetchSeo() {
  try {
    const s = await api('GET', '/seo');
    _seoData = s;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('seoSiteName',      s.siteName);
    set('seoCanonical',     s.canonicalBase);
    set('seoGaId',          s.gaId);
    set('seoGscCode',       s.gscCode);
    set('seoHomeTitle',     s.homeTitle);
    set('seoHomeDesc',      s.homeDesc);
    set('seoHomeKeywords',  s.homeKeywords);
    set('seoProjectsTitle', s.projectsTitle);
    set('seoProjectsDesc',  s.projectsDesc);
    const noIdx = document.getElementById('seoNoIndex');
    if (noIdx) noIdx.checked = !!s.noIndex;
    if (s.ogImage) {
      const prev = document.getElementById('ogPreview');
      if (prev) { prev.src = s.ogImage; prev.style.display = 'block'; }
    }
    updateSeoPreview();
    generateMetaTags();
  } catch (e) { console.warn('SEO fetch failed', e); }
}

// Init counters & live preview listeners
['seoHomeTitle','seoHomeDesc','seoCanonical','seoProjectsTitle','seoProjectsDesc'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { updateSeoPreview(); generateMetaTags(); });
});
seoCounter('seoHomeTitle',     'homeTitleCount', 60);
seoCounter('seoHomeDesc',      'homeDescCount',  160);
seoCounter('seoProjectsTitle', 'projTitleCount', 60);
seoCounter('seoProjectsDesc',  'projDescCount',  160);

// OG image preview
document.getElementById('ogImageInput')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const prev = document.getElementById('ogPreview');
  if (prev) { prev.src = URL.createObjectURL(file); prev.style.display = 'block'; }
  generateMetaTags();
});

// Copy button
document.getElementById('seoCopyBtn')?.addEventListener('click', () => {
  const code = document.getElementById('seoCodeOutput')?.textContent || '';
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('seoCopyBtn');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }
  });
});

// Save
document.getElementById('saveSeoBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('saveSeoBtn');
  btn.textContent = 'Saving...';
  try {
    const fd = new FormData();
    const append = (k, id) => { const el = document.getElementById(id); if (el) fd.append(k, el.value || ''); };
    append('siteName',      'seoSiteName');
    append('canonicalBase', 'seoCanonical');
    append('gaId',          'seoGaId');
    append('gscCode',       'seoGscCode');
    append('homeTitle',     'seoHomeTitle');
    append('homeDesc',      'seoHomeDesc');
    append('homeKeywords',  'seoHomeKeywords');
    append('projectsTitle', 'seoProjectsTitle');
    append('projectsDesc',  'seoProjectsDesc');
    fd.append('noIndex', document.getElementById('seoNoIndex')?.checked ? 'true' : 'false');
    const file = document.getElementById('ogImageInput')?.files[0];
    if (file) fd.append('ogImage', file);
    const saved = await api('PUT', '/seo', fd, true);
    _seoData = saved;
    generateMetaTags();
    toast('SEO settings saved!');
    btn.textContent = 'Saved ✓';
  } catch (e) {
    toast(e.message, 'error');
    btn.textContent = 'Save Changes';
    return;
  }
  setTimeout(() => btn.textContent = 'Save Changes', 2000);
});

// ══════════════════════════════════════════════
// ANALYTICS PANEL
// ══════════════════════════════════════════════

let _anRange = 7;

function anFmt(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function anTrend(pct) {
  if (pct === null || pct === undefined) return '';
  const arrow = pct >= 0 ? '↑' : '↓';
  const cls   = pct >= 0 ? 'trend-up' : 'trend-down';
  return `<span class="${cls}">${arrow} ${Math.abs(pct)}%</span> vs prev period`;
}

async function fetchAnalytics() {
  _anRange = parseInt(document.getElementById('analyticsRange')?.value) || 7;
  await Promise.all([fetchAnSummary(), fetchAnFunnel(), fetchAnSources(), fetchAnProjects(), fetchAnActivity(), fetchAnSparkline()]);
}

async function fetchAnSummary() {
  try {
    const s = await api('GET', `/analytics/summary?days=${_anRange}`);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
    set('anViews',     anFmt(s.totalViews));
    set('anViewsTrend', anTrend(s.trend));
    set('anSessions',  anFmt(s.uniqueSessions));
    set('anProjViews', anFmt(s.projectViews));
    set('anContact',   anFmt(s.contactClicks));
    set('anConvRate',  `<span class="trend-neutral">${s.convRate}% conversion</span>`);
    const split = document.getElementById('anVisitorSplit');
    if (split) {
      const total = (s.newVisitors || 0) + (s.returnCount || 0) || 1;
      const newPct = Math.round((s.newVisitors || 0) / total * 100);
      const retPct = 100 - newPct;
      split.innerHTML = `
        <div class="vsplit-bar">
          <div class="vsplit-new" style="width:${newPct}%"></div>
          <div class="vsplit-ret" style="width:${retPct}%"></div>
        </div>
        <div class="vsplit-legend">
          <span><span class="vsplit-dot vsplit-dot--new"></span>New  ${newPct}%  (${anFmt(s.newVisitors)})</span>
          <span><span class="vsplit-dot vsplit-dot--ret"></span>Returning  ${retPct}%  (${anFmt(s.returnCount)})</span>
        </div>`;
    }
  } catch (e) { console.warn('analytics summary', e); }
}

async function fetchAnFunnel() {
  try {
    const f = await api('GET', `/analytics/funnel?days=${_anRange}`);
    const wrap = document.getElementById('anFunnel');
    if (!wrap) return;
    const steps = [
      { label: 'Home', count: f.home, icon: '🏠' },
      { label: 'Projects', count: f.projects, icon: '📁' },
      { label: 'Case Study', count: f.cases, icon: '📖' },
      { label: 'Contact', count: f.contact, icon: '✉️' },
    ];
    const max = steps[0].count || 1;
    wrap.innerHTML = steps.map(s => {
      const pct = Math.round(s.count / max * 100);
      return `<div class="funnel-step">
        <div class="funnel-label"><span>${s.icon} ${s.label}</span><span>${anFmt(s.count)}</span></div>
        <div class="funnel-bar-bg"><div class="funnel-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  } catch (e) { console.warn('analytics funnel', e); }
}

async function fetchAnSources() {
  try {
    const sources = await api('GET', `/analytics/sources?days=${_anRange}`);
    const wrap = document.getElementById('anSources');
    if (!wrap) return;
    const colors = { Direct:'#E8F55F', Search:'#4B81FF', LinkedIn:'#0A66C2', Instagram:'#E1306C', 'Twitter/X':'#1DA1F2', Facebook:'#1877F2', Other:'#888' };
    if (!sources.length) { wrap.innerHTML = '<p class="an-empty">No data yet.</p>'; return; }
    wrap.innerHTML = sources.map(s => `
      <div class="source-row">
        <div class="source-dot" style="background:${colors[s.name] || '#888'}"></div>
        <span class="source-name">${s.name}</span>
        <div class="source-bar-bg"><div class="source-bar-fill" style="width:${s.pct}%;background:${colors[s.name] || '#888'}"></div></div>
        <span class="source-pct">${s.pct}%</span>
      </div>`).join('');
  } catch (e) { console.warn('analytics sources', e); }
}

let _topProjectId = null;

async function fetchAnProjects() {
  try {
    const projects = await api('GET', `/analytics/projects?days=${_anRange}`);
    const wrap = document.getElementById('anProjPerf');
    if (!wrap) return;
    if (!projects.length) { wrap.innerHTML = '<p class="an-empty">No project views yet.</p>'; return; }

    // Smart suggestion: show top performer if it has notable views
    const top = projects[0];
    const suggBox  = document.getElementById('anSuggestion');
    const suggText = document.getElementById('anSuggestionText');
    if (top && top.views >= 3 && suggBox && suggText) {
      _topProjectId = top.projectId;
      const trendStr = top.trend !== null ? ` (${top.trend >= 0 ? '↑' : '↓'}${Math.abs(top.trend)}% this period)` : '';
      suggText.innerHTML = `<strong>${top.title}</strong> is your best-performing project with ${top.views} views${trendStr}. Consider setting it as featured.`;
      suggBox.style.display = 'flex';
    } else if (suggBox) {
      suggBox.style.display = 'none';
    }

    wrap.innerHTML = projects.map(p => {
      const trendHtml = p.trend !== null
        ? `<span class="${p.trend >= 0 ? 'trend-up' : 'trend-down'}">${p.trend >= 0 ? '↑' : '↓'}${Math.abs(p.trend)}%</span>`
        : '';
      const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
      const barW  = Math.min(100, Math.round(p.score / (projects[0].score || 1) * 100));
      return `<div class="perf-row">
        <span class="perf-rank">${medal}</span>
        <div class="perf-info">
          <p class="perf-title">${p.title}</p>
          <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${barW}%"></div></div>
        </div>
        <div class="perf-stats">
          <span class="perf-views">${anFmt(p.views)} views</span>
          ${trendHtml}
        </div>
        <span class="perf-score">Score ${p.score}</span>
      </div>`;
    }).join('');
  } catch (e) { console.warn('analytics projects', e); }
}

async function fetchAnActivity() {
  try {
    const events = await api('GET', '/analytics/activity');
    const wrap = document.getElementById('anActivity');
    if (!wrap) return;
    if (!events.length) { wrap.innerHTML = '<p class="an-empty">No activity yet.</p>'; return; }
    const labels = { pageview: '👁 Viewed', project_view: '📖 Opened project', contact_click: '✉️ Clicked contact', cta_click: '🔗 Clicked CTA' };
    wrap.innerHTML = events.map(e => {
      const ago = Math.round((Date.now() - new Date(e.createdAt)) / 60000);
      const agoStr = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.round(ago/60)}h ago`;
      const page = e.page ? ` on ${e.page.replace('/index.html','/')}` : '';
      return `<div class="activity-row">
        <span class="activity-event">${labels[e.event] || e.event}${page}</span>
        <span class="activity-time">${agoStr}</span>
      </div>`;
    }).join('');
  } catch (e) { console.warn('analytics activity', e); }
}

document.getElementById('analyticsRange')?.addEventListener('change', fetchAnalytics);
document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', fetchAnalytics);

async function fetchAnSparkline() {
  try {
    const days = _anRange;
    const s = await api('GET', `/analytics/sparkline?days=${days}`);
    const wrap = document.getElementById('anSparkline');
    if (!wrap || !s.length) return;
    const max = Math.max(...s.map(d => d.count), 1);
    wrap.innerHTML = s.map(d => {
      const h = Math.max(4, Math.round(d.count / max * 100));
      return `<div class="spark-bar" style="height:${h}%" title="${d.label}: ${d.count} views"></div>`;
    }).join('');
  } catch (e) {}
}

// "Set as Featured" button in suggestion banner
document.getElementById('anSuggestFeatureBtn')?.addEventListener('click', async () => {
  if (!_topProjectId) return;
  const btn = document.getElementById('anSuggestFeatureBtn');
  try {
    btn.textContent = 'Saving…';
    await api('PUT', `/projects/${_topProjectId}`, { featured: true });
    btn.textContent = 'Done ✓';
    toast('Project set as featured!');
    setTimeout(() => { btn.textContent = 'Set as Featured'; }, 2000);
  } catch (e) {
    toast(e.message, 'error');
    btn.textContent = 'Set as Featured';
  }
});

// Auto-refresh activity feed every 30s when analytics is active
let _anRefreshTimer = null;
(function () {
  const origLoad = window._loadSection;
  // Hook into section visibility: start/stop auto-refresh
  const observer = new MutationObserver(() => {
    const sec = document.getElementById('sec-analytics');
    if (!sec) return;
    if (sec.style.display !== 'none') {
      if (!_anRefreshTimer) _anRefreshTimer = setInterval(fetchAnActivity, 30000);
    } else {
      clearInterval(_anRefreshTimer);
      _anRefreshTimer = null;
    }
  });
  const sec = document.getElementById('sec-analytics');
  if (sec) observer.observe(sec, { attributes: true, attributeFilter: ['style'] });
})();

// ══════════════════════════════════════════════════════
// EDIT REQUESTS
// ══════════════════════════════════════════════════════
let _editReqFilter = 'pending';

async function fetchEditRequests() {
  const list = document.getElementById('editRequestsList');
  if (!list) return;
  list.innerHTML = '<div class="empty-state">Loading…</div>';

  // Refresh notification badge after viewing
  pollNotifBadge();

  try {
    const requests = await api('GET', `/edit-requests?status=${_editReqFilter}`);
    const countEl  = document.getElementById('editRequestsCount');
    if (countEl) countEl.textContent = requests.length + ' requests';

    list.innerHTML = '';
    if (!requests.length) {
      list.innerHTML = `<div class="empty-state">No ${_editReqFilter} edit requests.</div>`;
      return;
    }

    requests.forEach(r => list.appendChild(makeEditRequestCard(r)));
  } catch (e) {
    toast('Failed to load edit requests', 'error');
    list.innerHTML = '<div class="empty-state">Failed to load.</div>';
  }
}

function makeEditRequestCard(r) {
  const date = new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const fields = Object.keys(r.fieldChanges || {});
  const hasImages = r.newImages?.length > 0;

  const card = document.createElement('div');
  card.className = 'er-admin-card glass' + (r.status === 'pending' ? ' er-pending' : '');
  card.innerHTML = `
    <div class="er-card-header">
      <div class="er-card-meta">
        <span class="er-card-project">${esc(r.projectTitle || r.projectId)}</span>
        <span class="er-card-status er-status-${r.status}">${r.status}</span>
      </div>
      <span class="er-card-date">${date}</span>
    </div>
    <div class="er-card-from">
      <strong>${esc(r.requesterName)}</strong>
      <span class="er-card-email">&lt;${esc(r.requesterEmail)}&gt;</span>
    </div>
    ${r.message ? `<p class="er-card-msg">"${esc(r.message)}"</p>` : ''}
    <div class="er-card-changes">
      ${fields.length ? `<span class="er-change-tag">Fields: ${fields.map(esc).join(', ')}</span>` : ''}
      ${hasImages ? `<span class="er-change-tag">+${r.newImages.length} image${r.newImages.length > 1 ? 's' : ''}</span>` : ''}
      ${!fields.length && !hasImages ? '<span class="er-change-tag er-change-empty">No field changes</span>' : ''}
    </div>
    ${r.status === 'pending' ? `
    <div class="er-card-actions">
      <button class="btn-sm btn-approve" onclick="approveEditRequest('${r._id}', this)">Approve</button>
      <button class="btn-sm btn-reject"  onclick="rejectEditRequest('${r._id}', this)">Reject</button>
      <button class="btn-sm btn-outline" onclick="viewEditRequest('${r._id}')">View Details</button>
    </div>` : (r.adminNote ? `<p class="er-card-note">Note: ${esc(r.adminNote)}</p>` : '')}
  `;
  return card;
}

async function approveEditRequest(id, btn) {
  if (!confirm('Apply these changes to the project?')) return;
  const note = prompt('Admin note (optional):') || '';
  btn.textContent = 'Approving…'; btn.disabled = true;
  try {
    await api('PATCH', `/edit-requests/${id}/approve`, { adminNote: note });
    toast('Edit request approved and applied!');
    fetchEditRequests();
  } catch (e) {
    toast(e.message, 'error');
    btn.textContent = 'Approve'; btn.disabled = false;
  }
}

async function rejectEditRequest(id, btn) {
  const note = prompt('Reason for rejection (optional):') || '';
  btn.textContent = 'Rejecting…'; btn.disabled = true;
  try {
    await api('PATCH', `/edit-requests/${id}/reject`, { adminNote: note });
    toast('Edit request rejected.');
    fetchEditRequests();
  } catch (e) {
    toast(e.message, 'error');
    btn.textContent = 'Reject'; btn.disabled = false;
  }
}

async function viewEditRequest(id) {
  try {
    const r = await api('GET', `/edit-requests/${id}`);
    const fields = r.fieldChanges || {};
    const fieldsHTML = Object.entries(fields).map(([k, v]) =>
      `<tr><td><strong>${esc(k)}</strong></td><td>${esc(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v))}</td></tr>`
    ).join('');

    const imagesHTML = (r.newImages || []).map(img =>
      `<img src="${esc(img.url)}" style="max-width:120px;max-height:90px;border-radius:6px;object-fit:cover;">`
    ).join('');

    openModal(`Edit Request — ${esc(r.projectTitle)}`, `
      <p><strong>From:</strong> ${esc(r.requesterName)} &lt;${esc(r.requesterEmail)}&gt;</p>
      ${r.message ? `<p><strong>Message:</strong> ${esc(r.message)}</p>` : ''}
      ${fieldsHTML ? `<h4 style="margin:16px 0 8px">Field Changes</h4>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid rgba(255,255,255,.1)">Field</th>
          <th style="text-align:left;padding:6px;border-bottom:1px solid rgba(255,255,255,.1)">New Value</th></tr></thead>
          <tbody>${fieldsHTML}</tbody></table>` : ''}
      ${imagesHTML ? `<h4 style="margin:16px 0 8px">New Images</h4><div style="display:flex;gap:8px;flex-wrap:wrap">${imagesHTML}</div>` : ''}
    `);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// Filter tabs for edit requests
document.querySelectorAll('[data-er-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-er-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _editReqFilter = btn.dataset.erFilter;
    fetchEditRequests();
  });
});

// Start notification polling when logged in
document.addEventListener('DOMContentLoaded', () => {
  // Will be started in showApp() — no-op here unless already logged in
});

// ══════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════
let allMessages = [];
let msgTab = 'unanswered';

// Tab switching
document.querySelectorAll('.msg-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.msg-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    msgTab = btn.dataset.tab;
    renderMessages();
  });
});

async function loadMessages() {
  const list = document.getElementById('msgAdminList');
  list.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    allMessages = await api('GET', '/messages');
    const unanswered = allMessages.filter(m => !m.isAnswered).length;
    document.getElementById('msgCount').textContent = `${allMessages.length} total · ${unanswered} unanswered`;
    const badge = document.getElementById('msgBadge');
    if (unanswered > 0) { badge.textContent = unanswered; badge.style.display = 'inline-flex'; }
    else badge.style.display = 'none';
    renderMessages();
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${esc(e.message)}</div>`;
  }
}

function renderMessages() {
  const list = document.getElementById('msgAdminList');
  const filtered = allMessages.filter(m => msgTab === 'unanswered' ? !m.isAnswered : m.isAnswered);
  if (!filtered.length) { list.innerHTML = '<div class="empty-state">No messages here.</div>'; return; }

  list.innerHTML = filtered.map(m => `
    <div class="msg-admin-card" id="msgcard-${esc(m._id)}">
      <div class="msg-admin-meta">
        <span class="msg-admin-name">${esc(m.name)}</span>
        <span class="msg-admin-phone">${esc(m.phone)}</span>
        <span class="msg-admin-date">${new Date(m.createdAt).toLocaleString('id-ID')}</span>
        <button class="msg-admin-del" onclick="deleteMessage('${esc(m._id)}')">Delete</button>
      </div>
      <p class="msg-admin-text">${esc(m.message)}</p>
      ${m.isAnswered
        ? `<div class="msg-admin-answered"><span class="msg-admin-answered-label">Your answer:</span><p class="msg-admin-answer-text">${esc(m.answer)}</p></div>`
        : `<div class="msg-admin-reply">
            <textarea class="admin-input msg-admin-textarea" id="ans-${esc(m._id)}" placeholder="Type your answer…" rows="3"></textarea>
            <button class="btn-primary msg-admin-send" onclick="answerMessage('${esc(m._id)}')">Send Answer</button>
           </div>`
      }
    </div>
  `).join('');
}

async function answerMessage(id) {
  const textarea = document.getElementById('ans-' + id);
  const answer = textarea ? textarea.value.trim() : '';
  if (!answer) { toast('Please type an answer first.', 'error'); return; }
  try {
    await api('PUT', `/messages/${id}/answer`, { answer });
    toast('Answer sent!');
    await loadMessages();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  try {
    await api('DELETE', `/messages/${id}`);
    toast('Message deleted.');
    await loadMessages();
  } catch (e) {
    toast(e.message, 'error');
  }
}

