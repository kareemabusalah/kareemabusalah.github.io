// Pixel space behind every page: starfield, a sun, planets, a satellite, shooting stars, and aliens you can click to pop.
// Drawn on a low-res canvas scaled up crisp. Static scene (no movement, no aliens) when window.KAS_CALM is set.
(() => {
  const cv = document.createElement('canvas');
  cv.className = 'stars';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  const calm = window.KAS_CALM ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PX = 3;  // one sprite pixel = 3 css px
  const STAR_COLORS = ['#ffffff', '#cfe8ff', '#ffe9a8', '#c3b5ff', '#ffb3e6'];
  const PAL = {W: '#ffffff', Y: '#ffd23f', y: '#ffb000', O: '#ff7a1a', R: '#e8434f', r: '#8f2335', C: '#7ee8ff', c: '#3a8fc0',
               P: '#b26bff', p: '#6b3fc9', M: '#ff6ad5', G: '#6dff8f', g: '#2e9a55', B: '#3b5bdb', b: '#22337a', S: '#8a93a8'};
  const sprite = rows => rows.map(r => [...r]);
  const INVADER = [sprite(['..P.....P..', '...P...P...', '..PPPPPPP..', '.PP.PPP.PP.', 'PPPPPPPPPPP', 'P.PPPPPPP.P', 'P.P.....P.P', '...PP.PP...']),
                   sprite(['..P.....P..', 'P..P...P..P', 'P.PPPPPPP.P', 'PPP.PPP.PPP', 'PPPPPPPPPPP', '.PPPPPPPPP.', '..P.....P..', '.P.......P.'])];
  const SQUID = [sprite(['...MM...', '..MMMM..', '.MMMMMM.', 'MM.MM.MM', 'MMMMMMMM', '..M..M..', '.M.MM.M.', 'M.M..M.M']),
                 sprite(['...MM...', '..MMMM..', '.MMMMMM.', 'MM.MM.MM', 'MMMMMMMM', '.M.MM.M.', 'M......M', '.M....M.'])];
  const UFO = sprite(['.....CCC.....', '...CCWWWCC...', '.SSSSSSSSSSS.', 'SYSSYSSYSSYSS', '.SSSSSSSSSSS.', '...S.....S...']);
  const SAT = sprite(['BBB.....BBB', 'BbB..S..BbB', 'BBBSSWSSBBB', 'BbB..S..BbB', 'BBB.....BBB']);
  const ROCKET = sprite(['...W...', '..WWW..', '..WCW..', '..WWW..', '.RWWWR.', 'RR.W.RR', '..OYO..', '...Y...']);

  let w, h, stars = [], aliens = [], pops = [], meteors = [], nextAlien = 1500, nextMeteor = 2000;
  const seed = () => {
    w = cv.width = Math.ceil(innerWidth / PX);
    h = cv.height = Math.ceil(innerHeight / PX);
    stars = Array.from({length: Math.round(w * h / 150)}, () => {
      const z = Math.random() < 0.7 ? 1 : Math.random() < 0.75 ? 2 : 3;  // 1 far ... 3 near
      return {x: Math.random() * w, y: Math.random() * h * 3, z, c: STAR_COLORS[Math.random() * STAR_COLORS.length | 0],
              t: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6};
    });
  };

  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); };
  const blit = (spr, x, y) => spr.forEach((row, j) => row.forEach((k, i) => { if (k !== '.') px(x + i, y + j, PAL[k]); }));
  const disc = (cx, cy, r, shade) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (d <= r * r + r) px(cx + x, cy + y, shade(x, y, Math.sqrt(d) / r));
    }
  };

  function sun(t, sy) {
    const cx = (w * 0.6) | 0, cy = (h * 0.1 - sy * 0.04) | 0, r = 7;
    const flick = calm ? 0 : Math.floor(t / 260) % 2;
    for (let k = 0; k < 8; k++) {  // rays alternate long and short, swapping every few frames, slowly turning
      const a = k * Math.PI / 4 + (calm ? 0 : t * 0.0002), len = (k + flick) % 2 ? 5 : 3;
      for (let s = r + 2; s < r + 2 + len; s++) px(cx + Math.cos(a) * s, cy + Math.sin(a) * s, s % 2 ? PAL.Y : PAL.y);
    }
    disc(cx, cy, r, (x, y, d) => d > 0.85 ? PAL.O : x + y < -4 ? '#fff6c2' : d > 0.6 ? PAL.y : PAL.Y);
  }

  function planets(sy) {
    // red planet with craters on the right; ringed ice giant low left; a small green world further down the page
    const p1x = (w * 0.92) | 0, p1y = (h * 0.62 - sy * 0.1) | 0;
    disc(p1x, p1y, 6, (x, y) => (x === 2 && y === -1) || (x === -2 && y === 2) || x + y > 4 ? PAL.r : PAL.R);
    const p2x = (w * 0.1) | 0, p2y = (h * 0.86 - sy * 0.18) | 0;
    const ring = x => p2y + 1 + Math.round(x / 7);
    for (let x = -14; x <= 14; x++) px(p2x + x, ring(x), PAL.p);
    disc(p2x, p2y, 8, (x, y, d) => d > 0.85 ? PAL.b : y % 4 === 0 ? PAL.C : y % 4 === 2 ? PAL.c : PAL.B);
    for (let x = -14; x <= 14; x++) if (Math.abs(x) > 8 || x > 0) px(p2x + x, ring(x), x & 1 ? PAL.P : PAL.M);
    const p3x = (w * 0.6) | 0, p3y = (h * 1.2 - sy * 0.3) | 0;
    if (p3y < h + 6) disc(p3x, p3y, 4, (x, y, d) => d > 0.8 || (x === 1 && y === 0) ? PAL.g : PAL.G);
  }

  function satellite(t, sy) {
    const a = calm ? 1 : t * 0.00012;
    blit(SAT, (w * 0.5 + Math.cos(a) * w * 0.42) | 0, (h * 0.35 + Math.sin(a * 1.3) * h * 0.18 - sy * 0.06) | 0);
  }

  function spawnAlien() {
    const k = Math.random(), dir = Math.random() < 0.5 ? 1 : -1;
    const a = k < 0.45 ? {spr: INVADER, sp: 0.3} : k < 0.8 ? {spr: SQUID, sp: 0.35} : k < 0.93 ? {spr: [UFO], sp: 0.6, ufo: true} : {spr: [ROCKET], sp: 0.8};
    aliens.push(Object.assign(a, {x: dir > 0 ? -16 : w + 4, y: 8 + Math.random() * h * 0.7, dir, wob: Math.random() * 6}));
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY / PX;
    for (const s of stars) {
      const x = ((s.x - (calm ? 0 : t * 0.0012 * s.z)) % w + w) % w;
      const y = ((s.y - sy * s.z * 0.15) % (h * 3) + h * 3) % (h * 3);
      if (y > h) continue;
      const tw = calm ? 1 : 0.55 + 0.45 * Math.sin(t * 0.002 * s.s + s.t);
      ctx.globalAlpha = (0.5 + 0.2 * s.z) * tw;
      px(x, y, s.c);
      if (s.z === 3 && tw > 0.85) { ctx.globalAlpha *= 0.5; px(x - 1, y, s.c); px(x + 1, y, s.c); px(x, y - 1, s.c); px(x, y + 1, s.c); }
    }
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.75;  // background bodies sit a little back so text over them stays readable
    sun(t, sy);
    planets(sy);
    satellite(t, sy);
    ctx.globalAlpha = 1;
    if (calm) return;

    if (t > nextMeteor) { meteors.push({x: Math.random() * w * 0.8, y: Math.random() * h * 0.3, life: 0}); nextMeteor = t + 3500 + Math.random() * 5000; }
    meteors = meteors.filter(m => ++m.life < 40);
    for (const m of meteors) for (let k = 0; k < 7; k++) { ctx.globalAlpha = (1 - k / 7) * (1 - m.life / 40); px(m.x + m.life * 2 - k, m.y + m.life - k / 2, '#ffffff'); }
    ctx.globalAlpha = 1;

    if (t > nextAlien && aliens.length < 3) { spawnAlien(); nextAlien = t + 4000 + Math.random() * 6000; }
    aliens = aliens.filter(a => a.x > -20 && a.x < w + 20);
    for (const a of aliens) {
      a.x += a.dir * a.sp;
      const y = a.y + (a.ufo ? Math.sin(t * 0.004 + a.wob) * 3 : 0);
      a.cy = y;
      if (a.ufo && Math.floor(t / 600) % 3 === 0) {  // tractor beam
        ctx.globalAlpha = 0.25;
        for (let j = 6; j < 18; j++) for (let i = 4 - (j - 6) / 4; i < 9 + (j - 6) / 4; i++) px(a.x + i, y + j, PAL.Y);
        ctx.globalAlpha = 1;
      }
      blit(a.spr[Math.floor(t / 400) % a.spr.length], a.x | 0, y | 0);
    }
    pops = pops.filter(p => t - p.t < 700);
    for (const p of pops) {
      const k = (t - p.t) / 700;
      ctx.globalAlpha = 1 - k;
      for (let i = 0; i < 10; i++) px(p.x + Math.cos(i * 0.628) * k * 10, p.y + Math.sin(i * 0.628) * k * 10, i % 2 ? PAL.Y : PAL.M);
      ctx.fillStyle = PAL.Y;
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText('+100', p.x - 6, p.y - 4 - k * 8);
      ctx.globalAlpha = 1;
    }
  }

  // Click an alien to pop it, unless the click landed on something interactive.
  let popped = 0;
  addEventListener('click', e => {
    if (calm || e.target.closest('a,button,input,label,select,textarea,iframe,.arcade,.v3d')) return;
    const x = e.clientX / PX, y = e.clientY / PX;
    const hit = aliens.find(a => x >= a.x - 3 && x <= a.x + 16 && y >= a.cy - 3 && y <= a.cy + 11);
    if (!hit) return;
    aliens.splice(aliens.indexOf(hit), 1);
    pops.push({x: hit.x + 5, y: hit.cy + 4, t: performance.now()});
    const b = document.getElementById('alienscore');
    if (b) { b.textContent = '👾 ' + ++popped; b.hidden = false; }
  });

  let raf = 0;
  const loop = t => { draw(t); raf = requestAnimationFrame(loop); };
  seed();
  addEventListener('resize', () => { seed(); if (calm) draw(0); });
  if (calm) { draw(0); addEventListener('scroll', () => draw(0), {passive: true}); }
  else {
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(loop); });
  }
})();
