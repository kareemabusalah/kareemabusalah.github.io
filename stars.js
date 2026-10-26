// Ink-sketch space behind every page: scribbled stars, a sun, planets, a satellite, shooting stars, and aliens you can click to pop.
// Every doodle is built once as a jittered Path2D so the lines look hand drawn but hold still. Hidden by CSS when interactive mode is off (html.calm).
(() => {
  const cv = document.createElement('canvas');
  cv.className = 'stars';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  const calm = window.KAS_CALM ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = '#1d1d1d', PAPER = '#e4e2dd';
  const j = a => (Math.random() - 0.5) * a;

  // pen primitives, all in local coordinates around (0,0)
  const line = (p, x0, y0, x1, y1, w = 0.8) => {
    p.moveTo(x0 + j(w), y0 + j(w));
    p.quadraticCurveTo((x0 + x1) / 2 + j(w * 2), (y0 + y1) / 2 + j(w * 2), x1 + j(w), y1 + j(w));
  };
  const loop = (p, cx, cy, rx, ry = rx, from = 0, to = Math.PI * 2.15) => {  // a circle that overshoots its start, like a pen
    const n = Math.max(10, Math.round(Math.max(rx, ry) * 1.2)), a0 = from + j(0.6);
    for (let i = 0; i <= n; i++) {
      const a = a0 + (to - from) * i / n, k = 1 + j(0.06);
      p[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
    }
  };
  const hatch = (p, r, n) => {  // shading strokes across the lower right of a disc
    for (let i = 1; i <= n; i++) {
      const d = r * (0.2 + 0.75 * i / (n + 1)), c = Math.sqrt(r * r - d * d) * 0.9;
      line(p, d * 0.7 - c * 0.7, d * 0.7 + c * 0.7, d * 0.7 + c * 0.7, d * 0.7 - c * 0.7, 0.6);
    }
  };
  const make = f => { const p = new Path2D(); f(p); return p; };

  const SUN = () => make(p => {
    loop(p, 0, 0, 22); loop(p, 0, 0, 21);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + j(0.1), r1 = 29, r2 = k % 2 ? 37 : 44; line(p, Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2); }
  });
  const CRATERED = () => make(p => { loop(p, 0, 0, 20); hatch(p, 20, 5); loop(p, -7, -6, 4); loop(p, 5, -10, 2.5); });
  const RING_BACK = () => make(p => loop(p, 0, 4, 50, 11, Math.PI, Math.PI * 2));
  const RING_FRONT = () => make(p => loop(p, 0, 4, 50, 11, 0, Math.PI));
  const GIANT = () => make(p => { loop(p, 0, 0, 27); for (const y of [-14, -4, 8]) line(p, -Math.sqrt(729 - y * y) + 3, y, Math.sqrt(729 - y * y) - 3, y + 2, 0.6); });
  const SMALL = () => make(p => { loop(p, 0, 0, 10); p.moveTo(3, 2); p.arc(2, 2, 1, 0, 7); p.moveTo(-3, -3); p.arc(-4, -3, 1.2, 0, 7); });
  const SAT = () => make(p => {
    p.rect(-5 + j(1), -5 + j(1), 10, 10);
    for (const s of [-1, 1]) {
      const x0 = s * 8, x1 = s * 30;
      line(p, s * 5, 0, x0, 0); p.rect(Math.min(x0, x1), -7, 22, 14);
      for (let k = 1; k < 4; k++) line(p, x0 + (x1 - x0) * k / 4, -7, x0 + (x1 - x0) * k / 4, 7, 0.4);
    }
    line(p, 0, -5, 2, -13); loop(p, 2, -15, 2);
  });
  const UFO = () => make(p => { loop(p, 0, 0, 22, 6); loop(p, 0, -4, 10, 9, Math.PI, Math.PI * 2); for (const x of [-12, 0, 12]) loop(p, x, 1, 1.6); });
  const BUG = () => make(p => {  // a round little alien with antennae and three legs
    loop(p, 0, 0, 12, 10);
    line(p, -5, -9, -9, -18); loop(p, -9.5, -19.5, 1.8); line(p, 5, -9, 9, -18); loop(p, 9.5, -19.5, 1.8);
    p.moveTo(-3, -1); p.arc(-4, -1, 1.2, 0, 7); p.moveTo(5, -1); p.arc(4, -1, 1.2, 0, 7);
    line(p, -4, 4, 4, 4, 0.4);
    for (const x of [-7, 0, 7]) line(p, x, 9, x + j(4), 15);
  });
  const ROCKET = () => make(p => {
    p.moveTo(0, -16); p.bezierCurveTo(7, -9, 7, 3, 5, 9); p.lineTo(-5, 9); p.bezierCurveTo(-7, 3, -7, -9, 0.4, -15.6);
    loop(p, 0, -4, 2.6); line(p, -5, 3, -9, 12); line(p, -9, 12, -5, 9); line(p, 5, 3, 9, 12); line(p, 9, 12, 5, 9);
  });
  const FLAME = () => make(p => { line(p, -3, 11, 0, 20); line(p, 0, 20, 3, 11); });
  const STARS = [
    () => make(p => { line(p, -4, 0, 4, 0, 0.5); line(p, 0, -4, 0, 4, 0.5); }),                                                    // +
    () => make(p => { for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; line(p, -Math.cos(a) * 4, -Math.sin(a) * 4, Math.cos(a) * 4, Math.sin(a) * 4, 0.5); } }),  // *
    () => make(p => { p.moveTo(0, -6); p.quadraticCurveTo(0.6, -0.6, 6, 0); p.quadraticCurveTo(0.6, 0.6, 0, 6); p.quadraticCurveTo(-0.6, 0.6, -6, 0); p.quadraticCurveTo(-0.6, -0.6, 0, -6); }),  // sparkle
    () => make(p => { p.arc(0, 0, 1.1, 0, 7); }),                                                                                  // dot
  ];

  const body = {sun: SUN(), cratered: CRATERED(), ringB: RING_BACK(), ringF: RING_FRONT(), giant: GIANT(), small: SMALL(), sat: SAT()};
  const KINDS = [{draw: [BUG(), BUG()], sp: 0.5, r: 16}, {draw: [UFO()], sp: 0.9, r: 22, ufo: true}, {draw: [ROCKET()], sp: 1.3, r: 16, rocket: true}];
  const flame = FLAME();

  let w, h, dpr, stars = [], aliens = [], pops = [], meteors = [], nextAlien = 6000, nextMeteor = 8000;
  const seed = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    stars = Array.from({length: Math.round(w * h / 11000)}, () => {
      const z = Math.random() < 0.7 ? 1 : Math.random() < 0.75 ? 2 : 3;  // 1 far ... 3 near
      const k = Math.random();
      return {x: Math.random() * w, y: Math.random() * h * 3, z, p: STARS[k < 0.35 ? 3 : k < 0.65 ? 0 : k < 0.85 ? 1 : 2](),
              rot: Math.random() * 6.28, t: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6};
    });
  };

  // place a doodle at (x,y) in css px and ink it; fill paper first so things behind stay hidden
  const ink = (path, x, y, {s = 1, rot = 0, fill = false, alpha = 1} = {}) => {
    const c = Math.cos(rot) * s * dpr, n = Math.sin(rot) * s * dpr;
    ctx.setTransform(c, n, -n, c, x * dpr, y * dpr);
    ctx.globalAlpha = alpha;
    if (fill) { ctx.fillStyle = PAPER; ctx.fill(path); ctx.fillStyle = INK; }
    ctx.stroke(path);
  };

  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = ctx.fillStyle = INK;
    ctx.lineWidth = 1.5; ctx.lineCap = ctx.lineJoin = 'round';
    const sy = scrollY;
    for (const s of stars) {
      const x = ((s.x - (calm ? 0 : t * 0.0036 * s.z)) % w + w) % w;
      const y = ((s.y - sy * s.z * 0.15) % (h * 3) + h * 3) % (h * 3);
      if (y > h) continue;
      const tw = calm ? 1 : 0.85 + 0.15 * Math.sin(t * 0.001 * s.s + s.t);
      ink(s.p, x, y, {s: 0.6 + 0.25 * s.z, rot: s.rot, alpha: (0.25 + 0.12 * s.z) * tw});
    }
    // background bodies sit back so text over them stays readable
    const A = 0.45;
    ink(body.sun, w * 0.6, h * 0.1 - sy * 0.04, {rot: calm ? 0 : t * 0.00008, alpha: A});
    ink(body.cratered, w * 0.92, h * 0.62 - sy * 0.1, {fill: true, alpha: A});
    const gx = w * 0.1, gy = h * 0.86 - sy * 0.18;
    ink(body.ringB, gx, gy, {rot: -0.2, alpha: A});
    ink(body.giant, gx, gy, {fill: true, alpha: A});
    ink(body.ringF, gx, gy, {rot: -0.2, alpha: A});
    const p3y = h * 1.2 - sy * 0.3;
    if (p3y < h + 20) ink(body.small, w * 0.6, p3y, {fill: true, alpha: A});
    const a = calm ? 1 : t * 0.00012;
    ink(body.sat, w * 0.5 + Math.cos(a) * w * 0.42, h * 0.35 + Math.sin(a * 1.3) * h * 0.18 - sy * 0.06, {rot: Math.sin(a) * 0.3, fill: true, alpha: A});
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (calm) return;

    if (t > nextMeteor) { meteors.push({x: Math.random() * w * 0.8, y: Math.random() * h * 0.3, life: 0}); nextMeteor = t + 12000 + Math.random() * 10000; }
    meteors = meteors.filter(m => ++m.life < 40);
    for (const m of meteors) {
      const x = (m.x + m.life * 6) * dpr, y = (m.y + m.life * 3) * dpr;
      ctx.globalAlpha = 0.6 * (1 - m.life / 40);
      ctx.beginPath();
      for (const o of [-3, 0, 3]) { ctx.moveTo(x + o * dpr, y - o * 2 * dpr); ctx.lineTo(x - (40 - Math.abs(o) * 6) * dpr + o * dpr, y - (20 - Math.abs(o) * 3) * dpr - o * 2 * dpr); }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 2 * dpr, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (t > nextAlien && aliens.length < 1) {
      const k = Math.random(), dir = Math.random() < 0.5 ? 1 : -1, kind = KINDS[k < 0.5 ? 0 : k < 0.85 ? 1 : 2];
      aliens.push(Object.assign({}, kind, {x: dir > 0 ? -40 : w + 40, y: 40 + Math.random() * h * 0.7, dir, wob: Math.random() * 6}));
      nextAlien = t + 15000 + Math.random() * 15000;
    }
    aliens = aliens.filter(a => a.x > -60 && a.x < w + 60);
    for (const a of aliens) {
      a.x += a.dir * a.sp;
      a.cy = a.y + Math.sin(t * 0.004 + a.wob) * (a.ufo ? 8 : 3);
      const rot = a.rocket ? a.dir * Math.PI / 2 : Math.sin(t * 0.003 + a.wob) * 0.08;
      if (a.ufo && Math.floor(t / 600) % 3 === 0) {  // tractor beam
        ctx.setTransform(dpr, 0, 0, dpr, a.x * dpr, a.cy * dpr);
        ctx.globalAlpha = 0.35; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-18, 50); ctx.moveTo(8, 8); ctx.lineTo(18, 50); ctx.stroke();
        ctx.setLineDash([]);
      }
      ink(a.draw[Math.floor(t / 400) % a.draw.length], a.x, a.cy, {rot, fill: true, alpha: 0.85});
      if (a.rocket && Math.floor(t / 120) % 2) ink(flame, a.x, a.cy, {rot, alpha: 0.85});
    }
    pops = pops.filter(p => t - p.t < 700);
    for (const p of pops) {
      const k = (t - p.t) / 700;
      ctx.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * 0.628, r0 = 6 + k * 14, r1 = r0 + 6; ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); }
      ctx.stroke();
      ctx.font = '700 20px Caveat, cursive';
      ctx.fillText('+100', -14, -18 - k * 16);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  // Click an alien to pop it, unless the click landed on something interactive.
  let popped = 0;
  addEventListener('click', e => {
    if (calm || e.target.closest('a,button,input,label,select,textarea,iframe,.arcade,.v3d')) return;
    const hit = aliens.find(a => Math.hypot(e.clientX - a.x, e.clientY - a.cy) < a.r + 8);
    if (!hit) return;
    aliens.splice(aliens.indexOf(hit), 1);
    pops.push({x: hit.x, y: hit.cy, t: performance.now()});
    const b = document.getElementById('alienscore');
    if (b) { b.textContent = '👾 ' + ++popped; b.hidden = false; }
  });

  let raf = 0;
  const tick = t => { draw(t); raf = requestAnimationFrame(tick); };
  seed();
  addEventListener('resize', () => { seed(); if (calm) draw(0); });
  if (calm) { draw(0); addEventListener('scroll', () => draw(0), {passive: true}); }
  else {
    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick); });
  }
})();
