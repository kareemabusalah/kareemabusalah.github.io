// Interactive cursor: a pixel ship that follows the mouse, banks with movement, leaves exhaust,
// locks targeting brackets onto anything clickable (React Bits "Target Cursor"), and fires on click.
// Mouse only; touch screens keep their normal behavior.
(() => {
  // no pointer media check: some touch laptops report no fine pointer even with a touchpad; we wake on the first mouse move
  const calm = window.KAS_CALM;
  const CLICKABLE = 'a,button,input,label,select,summary,[data-yt],.card,.ph,[data-species],.v3d canvas';
  const root = document.documentElement;

  const ship = document.createElement('div');
  ship.className = 'cur-ship';
  const tgt = document.createElement('div');
  tgt.className = 'cur-tgt';
  tgt.innerHTML = '<i></i><i></i><i></i><i></i>';
  const cv = document.createElement('canvas');
  cv.className = 'cur-fx';
  const ctx = cv.getContext('2d');
  document.body.append(cv, tgt, ship);

  let x = -100, y = -100, px = x, py = y, tilt = 0, over = null, parts = [], shots = [], shown = false, raf = 0;
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
  size();
  addEventListener('resize', size);

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!shown) { shown = true; root.classList.add('cur-on'); }
    wake();
  }, {passive: true});
  document.addEventListener('pointerleave', () => { shown = false; root.classList.remove('cur-on'); });
  addEventListener('pointerover', e => {
    const el = e.target.closest && e.target.closest(CLICKABLE);
    over = el && !el.closest('.arcade') ? el : null;  // the game draws its own ship
    ship.classList.toggle('hot', !!over);
    wake();
  });
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || calm) return;
    shots.push({x: e.clientX, y: e.clientY, t: performance.now()});
    ship.classList.add('fire');
    setTimeout(() => ship.classList.remove('fire'), 120);
    wake();
  });

  function frame(now) {
    raf = 0;
    const vx = x - px, vy = y - py;
    px = x; py = y;
    tilt += ((calm ? 0 : Math.max(-28, Math.min(28, vx * 1.6))) - tilt) * 0.25;
    ship.style.transform = `translate(${x - 3}px,${y - 3}px) rotate(${tilt.toFixed(1)}deg)`;

    // exhaust from the tail (down-right of the tip) when moving
    const speed = Math.hypot(vx, vy);
    if (!calm && shown && speed > 2) {
      for (let i = 0; i < Math.min(1, speed / 10); i++) {
        parts.push({x: x + 18 + Math.random() * 4, y: y + 22 + Math.random() * 4, vx: -vx * 0.05 + Math.random() - 0.3,
                    vy: -vy * 0.05 + Math.random() * 0.8, life: 1, c: Math.random() < 0.5 ? '#ffd23f' : '#ff7a1a'});
      }
    }
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => (p.life -= 0.05) > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.c;
      const s = p.life > 0.5 ? 4 : 2;
      ctx.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, s, s);
    }
    // laser: a short beam out of the nose plus an expanding pixel ring
    shots = shots.filter(s => now - s.t < 280);
    for (const s of shots) {
      const k = (now - s.t) / 280;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#7ee8ff';
      for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(s.x - i * 5 * (1 + k * 3)), Math.round(s.y - i * 5 * (1 + k * 3)), 3, 3);
      ctx.fillStyle = '#ff6ad5';
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 4 + k * 22; ctx.fillRect(Math.round(s.x + Math.cos(a) * r), Math.round(s.y + Math.sin(a) * r), 3, 3); }
    }
    ctx.globalAlpha = 1;

    // targeting brackets hug the hovered element (they follow it on scroll)
    if (over && shown) {
      const r = over.getBoundingClientRect(), pad = 6;
      tgt.style.transform = `translate(${r.left - pad}px,${r.top - pad}px)`;
      tgt.style.width = r.width + pad * 2 + 'px';
      tgt.style.height = r.height + pad * 2 + 'px';
      tgt.classList.add('on');
    } else tgt.classList.remove('on');

    if (parts.length || shots.length || Math.abs(tilt) > 0.3 || over) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', wake, {passive: true});
})();
