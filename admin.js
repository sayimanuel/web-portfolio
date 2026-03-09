// ═══════════════════════════════════════════════════
// PORTO ADMIN PANEL
// ═══════════════════════════════════════════════════
// Update PROD_URL below before deploying to production
const API = (() => {
  const PROD_URL = '';  // e.g. 'https://api.helloimanuel.com/api'
  const isLocal  = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocal ? 'http://localhost:5500/api' : (PROD_URL || '/api');
})();
let TOKEN = localStorage.getItem('porto_admin_token') || '';
let currentTestiTab  = 'approved';
let currentSkillsTab = 'all';
let allTestimonials  = [];
let allSkills        = [];

// ── API helper ─────────────────────────────────────
async function api(method, path, body, isForm = false) {
  const opts = {
    method,
    headers: { Authorization: 'Bearer ' + TOKEN },
  };
  if (body) {
    if (isForm) {
      opts.body = body; // FormData
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    }).then(r => r.json());
    if (!data.token) throw new Error(data.error || 'Failed');
    TOKEN = data.token;
    localStorage.setItem('porto_admin_token', TOKEN);
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

document.getElementById('logoutBtn').addEventListener('click', () => {
  TOKEN = '';
  localStorage.removeItem('porto_admin_token');
  document.getElementById('adminApp').style.display = 'none';
  document.getElementById('adminLogin').style.display = 'flex';
});

// ── Section routing ─────────────────────────────────
const sectionTitles = {
  projects: 'Projects', testimonials: 'Testimonials',
  experience: 'Experience', skills: 'Skills', profile: 'Profile',
  submissions: 'Submissions',
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
}

if (TOKEN) showApp();

document.querySelectorAll('.sidebar-link[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadSection(btn.dataset.section);
  });
});

function loadSection(name) {
  document.querySelectorAll('.admin-content section').forEach(s => s.style.display = 'none');
  document.getElementById('sec-' + name).style.display = 'block';
  document.getElementById('topbarTitle').textContent = sectionTitles[name];
  if (name === 'projects')     fetchProjects();
  if (name === 'testimonials') fetchTestimonials();
  if (name === 'experience')   fetchExperience();
  if (name === 'skills')       fetchSkills();
  if (name === 'profile')      fetchProfile();
  if (name === 'submissions')  fetchSubmissions();
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
  const card = document.createElement('div');
  card.className = 'admin-card glass';
  card.innerHTML = `
    ${p.image
      ? `<img class="admin-card-img" src="${p.image}" alt="${p.title}" loading="lazy">`
      : `<div class="admin-card-img-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><circle cx="8.5" cy="10.5" r="1.5" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><path d="M3 16l5-4 4 3 3-2 6 5" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`
    }
    <div class="admin-card-body">
      <div class="admin-card-title">${p.title}</div>
      <div class="admin-card-meta">
        <span class="meta-tag">${p.year || '—'}</span>
        <span class="meta-tag">${p.category || '—'}</span>
        <span class="meta-tag">${p.type || '—'}</span>
        ${p.featured ? '<span class="meta-tag featured">Featured</span>' : ''}
      </div>
    </div>
    <div class="admin-card-actions">
      ${p.caseUrl ? `<a class="btn-case" href="${p.caseUrl}" target="_blank">Preview</a>` : ''}
      <button class="btn-edit" data-id="${p._id}">Edit</button>
      <button class="btn-danger" data-id="${p._id}">Delete</button>
    </div>`;
  card.querySelector('.btn-edit').addEventListener('click',   () => openProjectForm(p));
  card.querySelector('.btn-danger').addEventListener('click', () => deleteProject(p._id, p.title));
  return card;
}

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
  const cs = p?.caseStudy || {};
  const toLines   = arr => (arr || []).join('\n');
  const pairLines = (arr, k1, k2) => (arr || []).map(i => `${i[k1]||''} | ${i[k2]||''}`).join('\n');
  const triLines  = (arr, k1, k2, k3) => (arr || []).map(i => `${i[k1]||''} | ${i[k2]||''} | ${i[k3]||''}`).join('\n');
  openModal(isEdit ? 'Edit Project' : 'Add Project', `
    <form class="modal-form" id="projectForm">

      <div class="form-section">
        <div class="form-section-hd">Project Info</div>

        <div class="form-field">
          <label class="form-label">Title *</label>
          <input class="form-input" name="title" value="${p?.title||''}" required>
        </div>

        <div class="form-field">
          <label class="form-label">Description</label>
          <textarea class="form-input" name="description" rows="2">${p?.description||''}</textarea>
        </div>

        <div class="form-row-4">
          <div class="form-field">
            <label class="form-label">Category *</label>
            <select class="form-input" name="category">
              <option value="web-dev"    ${p?.category==='web-dev'   ?'selected':''}>Web Dev</option>
              <option value="web-design" ${p?.category==='web-design'?'selected':''}>Web Design</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">Type *</label>
            <select class="form-input" name="type">
              <option value="education" ${p?.type==='education'?'selected':''}>Education</option>
              <option value="company"   ${p?.type==='company'  ?'selected':''}>Company</option>
              <option value="private"   ${p?.type==='private'  ?'selected':''}>Private</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">Year *</label>
            <input class="form-input" name="year" value="${p?.year||new Date().getFullYear()}" required>
          </div>
          <div class="form-field">
            <label class="form-label">Month</label>
            <input class="form-input" name="month" value="${p?.month||''}" placeholder="January">
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-field">
            <label class="form-label">Order <span class="form-hint">lower = first</span></label>
            <input class="form-input" type="number" name="order" value="${p?.order??0}">
          </div>
          <div class="form-field">
            <label class="form-label">Case Study URL <span class="form-hint">blank = auto-set</span></label>
            <input class="form-input" type="url" name="caseUrl" value="${p?.caseUrl||''}" placeholder="auto: case.html?id=...">
          </div>
        </div>

        <div class="form-field">
          <div class="toggle-wrap">
            <input type="checkbox" class="toggle-input" name="featured" id="featuredToggle" ${p?.featured?'checked':''}>
            <label class="toggle-label" for="featuredToggle"></label>
            <span class="toggle-text">Featured on Homepage</span>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Project Image</label>
          <div class="img-upload-area" id="imgUploadArea">
            <input type="file" id="imgFileInput" accept="image/*">
            ${p?.image?`<img class="img-upload-preview" src="${p.image}" style="display:block">`:'<img class="img-upload-preview" id="imgPreview">'}
            <p class="img-upload-text">Click to upload · JPG, PNG, WEBP · max 5MB</p>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-hd">Case Study</div>

        <div class="form-row-4">
          <div class="form-field">
            <label class="form-label">Tech Stack <span class="form-hint">comma-separated</span></label>
            <input class="form-input" name="cs_stack" value="${(cs.stack||[]).join(', ')}" placeholder="React, Node.js">
          </div>
          <div class="form-field">
            <label class="form-label">Role</label>
            <input class="form-input" name="cs_role" value="${cs.role||''}" placeholder="Full Stack Dev">
          </div>
          <div class="form-field">
            <label class="form-label">Duration</label>
            <input class="form-input" name="cs_duration" value="${cs.duration||''}" placeholder="3 Weeks">
          </div>
          <div class="form-field">
            <label class="form-label">Platform</label>
            <input class="form-input" name="cs_platform" value="${cs.platform||''}" placeholder="Web App">
          </div>
        </div>

        <div class="form-row-3">
          <div class="form-field">
            <label class="form-label">Problems <span class="form-hint">one per line</span></label>
            <textarea class="form-input" name="cs_problems" rows="4" placeholder="Sekolah tidak punya website&#10;Admin tidak bisa update konten">${toLines(cs.problems)}</textarea>
          </div>
          <div class="form-field">
            <label class="form-label">Goals <span class="form-hint">one per line</span></label>
            <textarea class="form-input" name="cs_goals" rows="4" placeholder="Website mudah dikelola&#10;SEO Friendly">${toLines(cs.goals)}</textarea>
          </div>
          <div class="form-field">
            <label class="form-label">Features <span class="form-hint">one per line</span></label>
            <textarea class="form-input" name="cs_features" rows="4" placeholder="Admin Panel&#10;CRUD Article">${toLines(cs.features)}</textarea>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Architecture Description</label>
          <textarea class="form-input" name="cs_archDesc" rows="2" placeholder="Describe the system architecture...">${cs.architectureDesc||''}</textarea>
        </div>

        <div class="form-field">
          <label class="form-label">Architecture Image</label>
          <div class="img-upload-area" id="archUploadArea">
            <input type="file" id="archFileInput" accept="image/*">
            ${cs.architectureImage?`<img class="img-upload-preview" src="${cs.architectureImage}" style="display:block">`:'<img class="img-upload-preview" style="display:none">'}
            <p class="img-upload-text">Click to upload architecture diagram</p>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">UI Gallery <span class="form-hint">tabs — multiple images per tab = carousel</span></label>
          <div id="galleryBuilder" class="gallery-builder"></div>
          <button type="button" id="addGalleryTabBtn" class="btn-add-gallery-tab">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Add Tab
          </button>
        </div>

        <div class="form-field">
          <label class="form-label">Timeline <span class="form-hint">Phase | Description | Duration</span></label>
          <textarea class="form-input" name="cs_timeline" rows="4" placeholder="Discovery | Research &amp; requirements | 3 Days&#10;Design | UI/UX in Figma | 1 Week">${triLines(cs.timeline,'phase','desc','duration')}</textarea>
        </div>

        <div class="form-field">
          <label class="form-label">Challenges &amp; Solutions <span class="form-hint">Challenge | Solution</span></label>
          <textarea class="form-input" name="cs_challenges" rows="4" placeholder="No existing data model | Designed schema from scratch">${pairLines(cs.challenges,'challenge','solution')}</textarea>
        </div>

        <div class="form-field">
          <label class="form-label">Results <span class="form-hint">Value | Metric | Description</span></label>
          <textarea class="form-input" name="cs_results" rows="4" placeholder="98% | Lighthouse Score | Performance &amp; SEO">${triLines(cs.results,'value','metric','desc')}</textarea>
        </div>

        <div class="form-field">
          <label class="form-label">Live URL</label>
          <input class="form-input" type="url" name="cs_liveUrl" value="${cs.liveUrl||''}" placeholder="https://yourproject.com">
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="modalCancelBtn">Cancel</button>
        <button type="submit" class="btn-save">${isEdit?'Save Changes':'Create Project'}</button>
      </div>
    </form>`);

  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

  // Hero image preview
  document.getElementById('imgFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.querySelector('#imgUploadArea .img-upload-preview');
    if (preview) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; }
  });

  // Architecture image preview
  document.getElementById('archFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.querySelector('#archUploadArea .img-upload-preview');
    if (preview) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; }
  });

  // Gallery builder
  initGalleryBuilder(cs.uiGallery || []);

  document.getElementById('projectForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const btn  = form.querySelector('.btn-save');
    btn.textContent = 'Saving...'; btn.disabled = true;

    const parseLines    = val => val.split('\n').map(s => s.trim()).filter(Boolean);
    const parsePairs    = (val, k1, k2) => parseLines(val).map(line => {
      const [a, b] = line.split('|').map(s => s.trim());
      return { [k1]: a||'', [k2]: b||'' };
    });
    const parseTriplets = (val, k1, k2, k3) => parseLines(val).map(line => {
      const [a, b, c] = line.split('|').map(s => s.trim());
      return { [k1]: a||'', [k2]: b||'', [k3]: c||'' };
    });

    try {
      const fd = new FormData();
      fd.append('title',       form.title.value);
      fd.append('description', form.description.value);
      fd.append('category',    form.category.value);
      fd.append('type',        form.type.value);
      fd.append('year',        form.year.value);
      fd.append('month',       form.month.value);
      fd.append('order',       form.order.value);
      fd.append('featured',    form.featured.checked);
      fd.append('caseUrl',     form.caseUrl.value.trim());

      const heroFile = document.getElementById('imgFileInput').files[0];
      if (heroFile) fd.append('image', heroFile);

      const caseStudy = {
        stack:    form.cs_stack.value.split(',').map(s => s.trim()).filter(Boolean),
        role:     form.cs_role.value,
        duration: form.cs_duration.value,
        platform: form.cs_platform.value,
        problems: parseLines(form.cs_problems.value),
        goals:    parseLines(form.cs_goals.value),
        features: parseLines(form.cs_features.value),
        architectureDesc:    form.cs_archDesc.value,
        architectureImage:   p?.caseStudy?.architectureImage   || '',
        architectureImageId: p?.caseStudy?.architectureImageId || '',
        uiGallery: [...document.querySelectorAll('#galleryBuilder .gallery-row')].map(row => ({
          label:  row.querySelector('.gal-label').value.trim(),
          images: [...row.querySelectorAll('.gallery-thumb-item')].map(i => i.dataset.url).filter(Boolean),
        })).filter(r => r.label),
        timeline:   parseTriplets(form.cs_timeline.value,   'phase', 'desc', 'duration'),
        challenges: parsePairs(form.cs_challenges.value,    'challenge', 'solution'),
        results:    parseTriplets(form.cs_results.value,    'value', 'metric', 'desc'),
        liveUrl:    form.cs_liveUrl.value,
      };
      fd.append('caseStudy', JSON.stringify(caseStudy));

      const archFile = document.getElementById('archFileInput')?.files[0];
      if (archFile) fd.append('archImage', archFile);

      // Gallery new image uploads
      document.querySelectorAll('#galleryBuilder .gallery-row').forEach(row => {
        const idx = row.dataset.idx;
        const fileInput = row.querySelector(`input[name="gal_${idx}"]`);
        if (fileInput?.files?.length) {
          [...fileInput.files].forEach(file => fd.append(`gal_${idx}`, file));
        }
      });

      let saved;
      if (isEdit) {
        saved = await api('PUT',  '/projects/' + p._id, fd, true);
      } else {
        saved = await api('POST', '/projects', fd, true);
        // Auto-set caseUrl if left blank
        if (!form.caseUrl.value.trim() && saved._id) {
          const pfd = new FormData();
          pfd.append('title',    form.title.value);
          pfd.append('category', form.category.value);
          pfd.append('type',     form.type.value);
          pfd.append('year',     form.year.value);
          pfd.append('caseUrl',  `case.html?id=${saved._id}`);
          await api('PUT', '/projects/' + saved._id, pfd, true);
        }
      }

      toast(isEdit ? 'Project updated!' : 'Project created!');
      closeModal();
      fetchProjects();
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
      <td style="font-weight:600">${t.name}</td>
      <td class="td-muted">${t.role || '—'}</td>
      <td class="td-quote td-muted">${t.quote}</td>
      <td class="td-muted">${new Date(t.createdAt).toLocaleDateString('id-ID')}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        ${!t.approved ? `<button class="btn-approve" data-id="${t._id}">Approve</button>` : ''}
        <button class="btn-danger" data-id="${t._id}">Delete</button>
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
        <td style="font-weight:600">${item.role}</td>
        <td>${item.company}</td>
        <td class="td-muted">${item.period}</td>
        <td style="display:flex;gap:6px">
          <button class="btn-edit" data-id="${item._id}">Edit</button>
          <button class="btn-danger" data-id="${item._id}">Delete</button>
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
    el.innerHTML = `<span class="cat-dot cat-${s.category}"></span>${s.name}<button class="skill-del-btn" title="Delete"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`;
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

document.getElementById('addSkillBtn').addEventListener('click', () => {
  openModal('Add Skill', `
    <form class="modal-form" id="skillForm">
      <div class="form-field">
        <label class="form-label">Skill Name *</label>
        <input class="form-input" name="name" placeholder="e.g. React" required>
      </div>
      <div class="form-field">
        <label class="form-label">Category *</label>
        <select class="form-input" name="category">
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="software">Software</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="skillCancel">Cancel</button>
        <button type="submit" class="btn-save">Add Skill</button>
      </div>
    </form>`);
  document.getElementById('skillCancel').addEventListener('click', closeModal);
  document.getElementById('skillForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target; const btn = form.querySelector('.btn-save');
    btn.textContent = 'Adding...'; btn.disabled = true;
    try {
      await api('POST', '/skills', { name: form.name.value, category: form.category.value });
      toast('Skill added!'); closeModal(); fetchSkills();
    } catch (ex) { toast(ex.message, 'error'); }
    finally { btn.textContent = 'Add Skill'; btn.disabled = false; }
  });
});

// ══════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════
async function fetchProfile() {
  try {
    const p = await api('GET', '/profile');
    const form = document.getElementById('profileForm');
    ['name','email','tagline','bio','linkedin','instagram','whatsapp'].forEach(key => {
      if (form[key]) form[key].value = p[key] || '';
    });
    if (p.photo) {
      const prev = document.getElementById('photoPreview');
      prev.src = p.photo;
      prev.style.display = 'block';
    }
  } catch { toast('Failed to load profile', 'error'); }
}

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
          ${p.image ? `<img src="${p.image}" style="width:56px;height:40px;object-fit:cover;border-radius:6px;">` : '—'}
        </td>
        <td><strong>${p.title}</strong></td>
        <td>${p.submittedBy?.name || '—'}<br><small style="opacity:.5">${p.submittedBy?.email || ''}</small></td>
        <td><span class="meta-tag">${p.category || '—'}</span></td>
        <td>${p.year || '—'}</td>
        <td style="max-width:180px;font-size:12px;opacity:.65">${p.submittedBy?.note || '—'}</td>
        <td>
          <div style="display:flex;gap:8px">
            <button class="btn-edit btn-approve" data-id="${p._id}">Approve</button>
            <button class="btn-danger btn-reject" data-id="${p._id}">Reject</button>
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

