// Hand-drawn hints: every [data-hint="text"] gets a scribbled circle, a wobbly arrow and a handwritten note.
// data-hint-pos = top | bottom | left | right (where the note sits). Shapes are jittered so no two look the same.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const calm = window.KAS_CALM ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const j = (v, a) => v + (Math.random() - 0.5) * a;  // jitter
  const f = v => v.toFixed(1);

  // a loose ellipse that overshoots its start, like a pen circling something
  function scribble(cx, cy, rx, ry) {
    const n = 26, start = j(-2.2, 0.6);
    let d = '';
    for (let i = 0; i <= n * 1.14; i++) {
      const a = start + (i / n) * Math.PI * 2, k = 1 + 0.05 * Math.sin(i * 0.9);
      d += (i ? ' L' : 'M') + f(cx + Math.cos(a) * rx * k + j(0, 1.5)) + ' ' + f(cy + Math.sin(a) * ry * k + j(0, 1.5));
    }
    return d;
  }
  // a bowed arrow from (x0,y0) to (x1,y1) with a two-stroke head
  function arrow(x0, y0, x1, y1, h = 11) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1, bow = j(0.22, 0.1);
    const cx = mx + nx / L * bow * L, cy = my + ny / L * bow * L;
    const a = Math.atan2(y1 - cy, x1 - cx);
    return `M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}` +
      ` M${f(x1)} ${f(y1)} L${f(x1 - h * Math.cos(a - 0.5))} ${f(y1 - h * Math.sin(a - 0.5))}` +
      ` M${f(x1)} ${f(y1)} L${f(x1 - h * Math.cos(a + 0.5))} ${f(y1 - h * Math.sin(a + 0.5))}`;
  }

  const hints = [];
  document.querySelectorAll('[data-hint]').forEach((el, i) => {
    const box = document.createElement('div');
    box.className = 'hint';
    box.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS(NS, 'svg');
    const ring = document.createElementNS(NS, 'path'), arr = document.createElementNS(NS, 'path');
    svg.append(ring, arr);
    const note = document.createElement('span');
    note.className = 'hint-note';
    note.textContent = el.dataset.hint;
    box.append(svg, note);
    document.body.append(box);
    const fixed = !!el.closest('nav');
    if (fixed) box.classList.add('tiny');
    hints.push({el, box, svg, ring, arr, note, pos: el.dataset.hintPos || 'top', fixed});
  });
  if (!hints.length) return;

  // anything a note shouldn't sit on top of
  const BLOCK = 'p,h1,h2,h3,a,button,img,canvas,iframe,input,figcaption,label,.tbn,.ct,.cs,.cm,.tags,.stats b,.stats span';
  const hit = (a, b) => Math.max(0, Math.min(a.r, b.right) - Math.max(a.l, b.left)) * Math.max(0, Math.min(a.b, b.bottom) - Math.max(a.t, b.top));

  function place() {
    const vw = document.documentElement.clientWidth;  // excludes the scrollbar
    const obstacles = [...(document.querySelector('main') || document.body).querySelectorAll(BLOCK)].map(e => ({e, r: e.getBoundingClientRect()})).filter(o => o.r.width);
    for (const h of hints) {
      const er = h.el.getBoundingClientRect();
      const visible = er.width > 0 && h.el.offsetParent !== null;
      h.box.hidden = !visible;
      if (!visible) continue;
      // hug the content, not the full row a block element stretches across
      const range = document.createRange(); range.selectNodeContents(h.el);
      const cr = range.getBoundingClientRect(), r = cr.width ? cr : er;
      const ox = h.fixed ? 0 : scrollX, oy = h.fixed ? 0 : scrollY;
      h.box.style.position = h.fixed ? 'fixed' : 'absolute';
      const big = r.width > 260 || r.height > 160;  // big targets get an arrow only; a ring would cross their content
      const pad = h.fixed ? 6 : 14, gap = h.fixed ? 30 : 46;
      const nw = h.note.offsetWidth, nh = h.note.offsetHeight;
      const tx = r.left - pad, ty = r.top - pad, tw = r.width + pad * 2, th = r.height + pad * 2;
      const spot = pos => {
        let nx, ny;
        if (pos === 'bottom') { nx = r.left + r.width * 0.55; ny = r.bottom + gap; }
        else if (pos === 'left') { nx = r.left - gap - nw; ny = r.top + r.height / 2 - nh / 2; }
        else if (pos === 'right') { nx = r.right + gap; ny = r.top + r.height / 2 - nh / 2; }
        else { nx = r.left + r.width * 0.55; ny = r.top - gap - nh; }
        if (big && (pos === 'top' || pos === 'bottom')) nx = r.left + 20;
        const off = nx < 4 || nx + nw > vw - 8;
        nx = Math.max(8, Math.min(vw - nw - 12, nx));
        const box = {l: nx - 6, t: ny - 6, r: nx + nw + 6, b: ny + nh + 6};
        let cost = off ? 1e6 : 0;
        // skip the target itself and big wrappers like the card it sits in; a small parent label still counts
        for (const o of obstacles) if (!h.el.contains(o.e) && !(o.e.contains(h.el) && o.r.width * o.r.height > 40000)) cost += hit(box, o.r);
        return {pos, nx, ny, cost};
      };
      // try the requested side first, then the others; nowhere clear = no hint
      const best = [h.pos, 'right', 'left', 'top', 'bottom'].map(spot).reduce((a, b) => b.cost < a.cost ? b : a);
      if (best.cost > 0) { h.box.hidden = true; continue; }
      const {pos, nx, ny} = best;
      const L = Math.min(tx, nx), T = Math.min(ty, ny), R = Math.max(tx + tw, nx + nw), B = Math.max(ty + th, ny + nh);
      Object.assign(h.box.style, {left: L + ox + 'px', top: T + oy + 'px', width: R - L + 'px', height: B - T + 'px'});
      h.svg.setAttribute('viewBox', `0 0 ${R - L} ${B - T}`);
      h.note.style.left = nx - L + 'px';
      h.note.style.top = ny - T + 'px';
      const cx = tx - L + tw / 2, cy = ty - T + th / 2;
      h.ring.setAttribute('d', big || h.fixed ? '' : scribble(cx, cy, tw / 2, th / 2));
      // arrow runs from the note toward the target's edge
      const sx = pos === 'left' ? nx - L + nw + 2 : pos === 'right' ? nx - L - 2 : nx - L + nw / 2;
      const sy = pos === 'bottom' ? ny - T - 4 : pos === 'top' ? ny - T + nh + 2 : ny - T + nh / 2;
      let ex, ey;
      if (big) { ex = Math.max(tx - L, Math.min(tx - L + tw, sx)); ey = Math.max(ty - T, Math.min(ty - T + th, sy)); }
      else { const ang = Math.atan2(sy - cy, sx - cx); ex = cx + Math.cos(ang) * (tw / 2 + 6); ey = cy + Math.sin(ang) * (th / 2 + 6); }
      h.arr.setAttribute('d', arrow(sx, sy, ex, ey, h.fixed ? 6 : 11));
    }
  }

  // draw the strokes on when a hint first scrolls into view
  if (!calm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const h = hints.find(x => x.el === e.target);
      if (h) h.box.classList.add('drawn');
      io.unobserve(e.target);
    }), {threshold: 0.4});
    hints.forEach(h => { h.box.classList.add('drawable'); io.observe(h.el); });
  }
  place();
  addEventListener('resize', place);
  // the nav hint floats over the page, so it only shows before you scroll
  let away;
  const top = () => { if (away === (away = scrollY > 40)) return; hints.forEach(h => h.fixed && h.box.classList.toggle('away', away)); if (!away) place(); };
  addEventListener('scroll', top, {passive: true}); top();
  addEventListener('load', place);
  if (document.fonts) document.fonts.ready.then(place);
  new ResizeObserver(place).observe(document.body);
})();
