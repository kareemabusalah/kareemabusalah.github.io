// Pixel starfield behind every page: three depth layers, twinkle, slow drift, scroll parallax.
// Static (drawn once) under prefers-reduced-motion.
(() => {
  const cv = document.createElement('canvas');
  cv.className = 'stars';
  cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PX = 3;  // one star pixel = 3 css px, drawn on a low-res canvas and scaled up crisp
  const COLORS = ['#ffffff', '#cfe8ff', '#ffe9a8', '#9dffb5', '#ffb3d9'];
  let w, h, stars = [];

  function seed() {
    w = cv.width = Math.ceil(innerWidth / PX);
    h = cv.height = Math.ceil(innerHeight / PX);
    const n = Math.round(w * h / 170);
    stars = Array.from({length: n}, () => {
      const z = Math.random() < 0.7 ? 1 : Math.random() < 0.75 ? 2 : 3;  // 1 far ... 3 near
      return {x: Math.random() * w, y: Math.random() * h * 3, z, c: COLORS[Math.random() * COLORS.length | 0],
              t: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6};
    });
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY / PX;
    for (const s of stars) {
      const drift = calm ? 0 : time * 0.0012 * s.z;
      const x = ((s.x - drift) % w + w) % w;
      const y = ((s.y - sy * s.z * 0.15) % (h * 3) + h * 3) % (h * 3);
      if (y > h) continue;
      const tw = calm ? 1 : 0.55 + 0.45 * Math.sin(time * 0.002 * s.s + s.t);
      ctx.globalAlpha = (0.5 + 0.2 * s.z) * tw;
      ctx.fillStyle = s.c;
      ctx.fillRect(x | 0, y | 0, 1, 1);
      if (s.z === 3 && tw > 0.85) {  // the near stars flash a plus-shaped glint
        ctx.globalAlpha *= 0.5;
        ctx.fillRect((x | 0) - 1, y | 0, 3, 1);
        ctx.fillRect(x | 0, (y | 0) - 1, 1, 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  let raf = 0;
  const loop = t => { draw(t); raf = requestAnimationFrame(loop); };
  seed();
  addEventListener('resize', () => { seed(); if (calm) draw(0); });
  if (calm) { draw(0); addEventListener('scroll', () => draw(0), {passive: true}); }
  else {
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    });
  }
})();
