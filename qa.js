// ── Q&A Page ──
(function () {
  const API = (() => {
    const isLocal = ['localhost','127.0.0.1'].includes(location.hostname);
    return isLocal ? 'http://localhost:5500/api' : '/api';
  })();

  const list    = document.getElementById('qaList');
  const loading = document.getElementById('qaLoading');
  const empty   = document.getElementById('qaEmpty');

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30)  return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
  }

  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  }

  function renderItem(msg, idx) {
    const item = document.createElement('div');
    item.className = 'qa-item';
    item.style.animationDelay = `${idx * 0.06}s`;
    item.innerHTML = `
      <div class="qa-question-block">
        <div class="qa-avatar q-avatar">${esc(initials(msg.name))}</div>
        <div class="qa-body">
          <p class="qa-sender q-sender">${esc(msg.name)}</p>
          <p class="qa-text">${esc(msg.message)}</p>
          <p class="qa-date">${timeAgo(msg.createdAt)}</p>
        </div>
      </div>
      <div class="qa-answer-block">
        <div class="qa-avatar a-avatar">IM</div>
        <div class="qa-body">
          <p class="qa-sender a-sender">Imanuel</p>
          <p class="qa-text">${esc(msg.answer)}</p>
          <p class="qa-date">${timeAgo(msg.answeredAt)}</p>
        </div>
      </div>`;
    return item;
  }

  async function load() {
    try {
      const res  = await fetch(API + '/messages/public');
      const msgs = await res.json();
      loading.style.display = 'none';
      if (!msgs.length) { empty.style.display = 'block'; return; }
      msgs.forEach((msg, i) => list.appendChild(renderItem(msg, i)));
    } catch {
      loading.style.display = 'none';
      empty.textContent = 'Failed to load. Please try again later.';
      empty.style.display = 'block';
    }
  }

  load();
})();
