// ── edit-request.js ────────────────────────────────────────────────────────
// Handles the public Edit Request form.
// Security: honeypot + timing check (≥ 3s) + rate limit enforced server-side.

(function () {
  const BASE_URL = window.API_BASE || 'http://localhost:5500/api';

  const form       = document.getElementById('erForm');
  const errorEl    = document.getElementById('erError');
  const submitBtn  = document.getElementById('erSubmit');
  const submitLbl  = document.getElementById('erSubmitLabel');
  const submitSpin = document.getElementById('erSubmitSpinner');
  const successEl  = document.getElementById('erSuccess');
  const fileInput  = document.getElementById('newImages');
  const filePreview = document.getElementById('erFilePreview');

  // Set timestamp on load (timing check)
  const tsInput = document.getElementById('_ts');
  if (tsInput) tsInput.value = Date.now();

  // ── Read project id from URL ──────────────────────────────────────────────
  const params    = new URLSearchParams(window.location.search);
  const projectId = params.get('id');

  // Update back link
  const backBtn = document.getElementById('erBackBtn');
  if (backBtn && projectId) backBtn.href = `case.html?id=${projectId}`;

  const successBack = document.getElementById('erSuccessBack');
  if (successBack && projectId) successBack.href = `case.html?id=${projectId}`;

  // ── Load project title ────────────────────────────────────────────────────
  async function loadProject() {
    if (!projectId) {
      const el = document.getElementById('erProjectName');
      if (el) el.textContent = 'Unknown project';
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/projects/${projectId}`);
      if (!res.ok) return;
      const p = await res.json();
      const el = document.getElementById('erProjectName');
      if (el) el.textContent = p.title || '';
    } catch { /* silent */ }
  }

  // ── File preview ─────────────────────────────────────────────────────────
  if (fileInput) {
    const label = document.querySelector('.er-file-label');

    fileInput.addEventListener('change', () => {
      filePreview.innerHTML = '';
      const files = Array.from(fileInput.files || []).slice(0, 10);
      files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = e => {
          const thumb = document.createElement('div');
          thumb.className = 'er-thumb';
          thumb.innerHTML = `<img src="${e.target.result}" alt="${file.name}">
            <span class="er-thumb-name">${file.name}</span>`;
          filePreview.appendChild(thumb);
        };
        reader.readAsDataURL(file);
      });
    });

    // Click on label opens file input
    if (label) {
      label.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
      });
    }
  }

  // ── Show/hide error ───────────────────────────────────────────────────────
  function showError(msg) {
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = ''; }
  }
  function clearError() {
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
  }

  function setLoading(on) {
    if (submitBtn)  submitBtn.disabled = on;
    if (submitLbl)  submitLbl.style.display  = on ? 'none' : '';
    if (submitSpin) submitSpin.style.display = on ? '' : 'none';
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      clearError();

      // Basic validation
      const name  = (form.requesterName?.value || '').trim();
      const email = (form.requesterEmail?.value || '').trim();
      if (!name)  { showError('Please enter your name.'); return; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.'); return;
      }
      if (!projectId) { showError('Project ID is missing. Please go back and try again.'); return; }

      // Collect only non-empty field changes
      const fieldChanges = {};
      const FC_MAP = {
        fc_overview:       'overview',
        fc_collaboration:  'collaboration',
        fc_outcome:        'outcome',
        fc_detailedInfo:   'detailedInfo',
      };
      for (const [inputId, fieldKey] of Object.entries(FC_MAP)) {
        const val = (document.getElementById(inputId)?.value || '').trim();
        if (val) fieldChanges[fieldKey] = val;
      }

      // Nested links
      const github    = (document.getElementById('fc_links_github')?.value || '').trim();
      const figma     = (document.getElementById('fc_links_figma')?.value || '').trim();
      const prototype = (document.getElementById('fc_links_prototype')?.value || '').trim();
      if (github || figma || prototype) {
        fieldChanges.links = {};
        if (github)    fieldChanges.links.github    = github;
        if (figma)     fieldChanges.links.figma     = figma;
        if (prototype) fieldChanges.links.prototype = prototype;
      }

      const message = (form.message?.value || '').trim();

      // Build FormData
      const fd = new FormData();
      fd.append('projectId',      projectId);
      fd.append('requesterName',  name);
      fd.append('requesterEmail', email);
      fd.append('message',        message);
      fd.append('fieldChanges',   JSON.stringify(fieldChanges));
      fd.append('_ts',            tsInput?.value || String(Date.now() - 5000));
      fd.append('_hp',            document.getElementById('_hp')?.value || '');

      // Attach image files
      const files = Array.from(fileInput?.files || []).slice(0, 10);
      files.forEach(f => fd.append('newImages', f));

      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/edit-requests`, {
          method: 'POST',
          body:   fd,
        });
        const data = await res.json();

        if (!res.ok) {
          showError(data.error || 'Something went wrong. Please try again.');
          setLoading(false);
          return;
        }

        // Success
        if (form) form.style.display = 'none';
        if (successEl) successEl.style.display = '';
      } catch {
        showError('Network error. Please check your connection and try again.');
        setLoading(false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', loadProject);
})();
