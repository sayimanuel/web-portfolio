// Lightweight analytics tracker — included on all public pages
(function () {
  const API  = window.API_BASE || '/api';
  const SKEY = 'porto_sid';
  const VKEY = 'porto_visited';

  // Session ID (per-tab)
  let sid = sessionStorage.getItem(SKEY);
  if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(SKEY, sid); }

  const isNew = !localStorage.getItem(VKEY);
  if (isNew) localStorage.setItem(VKEY, '1');

  const page = window.location.pathname;
  const ref  = document.referrer || '';

  function track(event, extra) {
    fetch(API + '/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, page, referrer: ref, sessionId: sid, isNew, ...extra }),
      keepalive: true,
    }).catch(() => {});
  }

  // Pageview
  track('pageview');

  // Project view (case.html)
  if (/case\.html/.test(page) || /case/.test(page)) {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) track('project_view', { projectId: id });
  }

  // Contact click
  document.addEventListener('click', function (e) {
    if (e.target.closest('.email-btn, [href^="mailto:"]')) track('contact_click');
  }, true);

  window.porto_track = track;
})();
