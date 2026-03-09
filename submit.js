// submit.js — public project submission form
(function () {
  const BASE_URL = window.API_BASE || 'http://localhost:5500/api';

  // Image preview
  const imageInput   = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const placeholder  = document.getElementById('imagePlaceholder');

  if (imageInput) {
    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
        placeholder.style.display  = 'none';
      };
      reader.readAsDataURL(file);
    });
  }

  // Form submit
  const form      = document.getElementById('submitForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorEl   = document.getElementById('formError');
  const successEl = document.getElementById('submitSuccess');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
  function clearError() {
    errorEl.style.display = 'none';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const fd = new FormData(form);

    // Basic validation
    if (!fd.get('submitterName')?.trim()) return showError('Please enter your name.');
    if (!fd.get('title')?.trim())         return showError('Please enter a project title.');
    if (!fd.get('category'))              return showError('Please select a category.');
    if (!fd.get('type'))                  return showError('Please select a project type.');
    if (!fd.get('year')?.trim())          return showError('Please enter the project year.');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const res = await fetch(`${BASE_URL}/projects/submit`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Submission failed');

      // Show success state
      form.style.display        = 'none';
      successEl.style.display   = 'flex';
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
      submitBtn.disabled   = false;
      submitBtn.innerHTML  = 'Send Submission <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
  });
})();
