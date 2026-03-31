// ── Electric Lightning Cursor ──
(function () {
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.location.pathname.includes('admin')) return;

  // Inject cursor:none globally
  const s = document.createElement('style');
  s.textContent = '* { cursor: none !important; }';
  document.head.appendChild(s);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:999999;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W, H;
  let cx = -300, cy = -300;
  let prevX = null, prevY = null;
  let bolts = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function arrowPath() {
    ctx.beginPath();
    ctx.moveTo(0,  0);
    ctx.lineTo(0,  16);
    ctx.lineTo(4,  12);
    ctx.lineTo(7,  20);
    ctx.lineTo(10, 18.5);
    ctx.lineTo(7,  11);
    ctx.lineTo(12, 11);
    ctx.closePath();
  }

  function drawCursor(x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur  = 18;
    ctx.shadowColor = '#7733ff';
    ctx.fillStyle   = '#ffffff';
    ctx.strokeStyle = '#9966ff';
    ctx.lineWidth   = 1.2;
    ctx.lineJoin    = 'round';
    arrowPath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur  = 30;
    ctx.shadowColor = '#5522cc';
    ctx.globalAlpha = 0.4;
    arrowPath();
    ctx.fill();

    ctx.restore();
  }

  function makeLightning(x1, y1, x2, y2, segs, chaos) {
    const pts = [{ x: x1, y: y1 }];
    const dx = x2 - x1, dy = y2 - y1;
    const perp = Math.atan2(dy, dx) + Math.PI / 2;
    for (let i = 1; i < segs; i++) {
      const t   = i / segs;
      const off = (Math.random() - 0.5) * chaos;
      pts.push({
        x: x1 + dx * t + Math.cos(perp) * off,
        y: y1 + dy * t + Math.sin(perp) * off,
      });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  function strokeBolt(pts, alpha, width, core, glow) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha * 0.45;
    ctx.lineWidth   = width * 4;
    ctx.strokeStyle = glow;
    ctx.shadowBlur  = 24;
    ctx.shadowColor = glow;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth   = width;
    ctx.strokeStyle = core;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = core;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    bolts = bolts.filter(b => b.life > 0);
    for (const b of bolts) {
      strokeBolt(b.pts, b.life, b.width, b.core, b.glow);
      b.life -= b.decay;
    }

    drawCursor(cx, cy);
    requestAnimationFrame(draw);
  }

  document.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;

    if (prevX !== null) {
      const vx    = cx - prevX, vy = cy - prevY;
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (speed > 2) {
        const chaos = Math.min(speed * 0.6, 28);
        const segs  = Math.max(5, Math.floor(speed * 0.4));

        bolts.push({
          pts:   makeLightning(cx, cy, prevX, prevY, segs, chaos),
          life:  1,
          decay: 0.07 + Math.random() * 0.06,
          width: 1.6,
          core:  '#ffffff',
          glow:  '#6633ff',
        });

        if (speed > 12 && Math.random() > 0.45) {
          const mx   = (cx + prevX) / 2, my = (cy + prevY) / 2;
          const bAng = Math.atan2(vy, vx) + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.6);
          const bLen = speed * (0.35 + Math.random() * 0.4);
          bolts.push({
            pts:   makeLightning(mx, my, mx + Math.cos(bAng) * bLen, my + Math.sin(bAng) * bLen, 4, chaos * 0.6),
            life:  0.75,
            decay: 0.1 + Math.random() * 0.07,
            width: 0.9,
            core:  '#ccaaff',
            glow:  '#4422bb',
          });
        }
      }
    }

    prevX = cx; prevY = cy;
  });

  resize();
  window.addEventListener('resize', resize);
  draw();
})();
