// Lightweight analytics tracker — Opsi 4 Hybrid
// visitorId  = UUID permanen di localStorage (cross-session, same browser)
// sessionId  = UUID di localStorage, reset setelah 30 menit idle
// isNew      = ditentukan server berdasarkan visitorId (bukan trust client)
(function () {
  const API  = window.API_BASE || '/api';
  const VID_KEY  = 'porto_vid';   // visitor id — permanent
  const SID_KEY  = 'porto_sid';   // session id
  const STS_KEY  = 'porto_sts';   // session timestamp (last activity)
  const SESSION_TTL = 30 * 60 * 1000; // 30 menit idle = new session

  // ── Visitor ID (permanent per browser) ──────────────────────────────
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  let visitorId = localStorage.getItem(VID_KEY);
  if (!visitorId) { visitorId = uuid(); localStorage.setItem(VID_KEY, visitorId); }

  // ── Session ID (reset after 30 min idle) ─────────────────────────────
  let sessionId  = localStorage.getItem(SID_KEY);
  const lastSeen = parseInt(localStorage.getItem(STS_KEY) || '0');
  const now      = Date.now();

  if (!sessionId || (now - lastSeen) > SESSION_TTL) {
    sessionId = uuid();
    localStorage.setItem(SID_KEY, sessionId);
  }
  localStorage.setItem(STS_KEY, String(now));

  // Refresh session timestamp on any interaction
  ['click', 'scroll', 'keydown'].forEach(ev =>
    document.addEventListener(ev, () => localStorage.setItem(STS_KEY, String(Date.now())), { passive: true })
  );

  // ── Track function ────────────────────────────────────────────────────
  const page = window.location.pathname;
  const ref  = document.referrer || '';

  function track(event, extra) {
    fetch(API + '/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, page, referrer: ref, sessionId, visitorId, ...extra }),
      keepalive: true,
    }).catch(() => {});
  }

  // Pageview
  track('pageview');

  // Project view (case.html)
  if (/case\.html/.test(page) || /\/case/.test(page)) {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) track('project_view', { projectId: id });
  }

  // Contact click
  document.addEventListener('click', function (e) {
    if (e.target.closest('.email-btn, [href^="mailto:"]')) track('contact_click');
  }, true);

  window.porto_track = track;
})();
