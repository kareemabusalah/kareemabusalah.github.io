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
  function arrow(x0, y0, x1, y1) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1, bow = j(0.22, 0.1);
    const cx = mx + nx / L * bow * L, cy = my + ny / L * bow * L;
    const a = Math.atan2(y1 - cy, x1 - cx), h = 11;
    return `M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}` +
      ` M${f(x1)} ${f(y1)} L${f(x1 - h * Math.cos(a - 0.5))} ${f(y1 - h * Math.sin(a - 0.5))}` +
      ` M${f(x1)} ${f(y1)} L${f(x1 - h * Math.cos(a + 0.5))} ${f(y1 - h * Math.sin(a + 0.5))}`;
  }

  const hints = [];
  document.querySelectorAll('[data-hint]').forEach((el, i) => {
    const box = document.createElement('div');
    box.className = 'hint';
    box.setAttribute('aria-hidden', 'true');
    box.style.setProperty('--hc', ['#ffd23f', '#ff6ad5', '#7ee8ff'][i % 3]);
    const svg = document.createElementNS(NS, 'svg');
    const ring = document.createElementNS(NS, 'path'), arr = document.createElementNS(NS, 'path');
    svg.append(ring, arr);
    const note = document.createElement('span');
    note.className = 'hint-note';
    note.textContent = el.dataset.hint;
    box.append(svg, note);
    document.body.append(box);
    hints.push({el, box, svg, ring, arr, note, pos: el.dataset.hintPos || 'top', fixed: !!el.closest('nav')});
  });
  if (!hints.length) return;

  function place() {
    for (const h of hints) {
      const r = h.el.getBoundingClientRect();
      const visible = r.width > 0 && h.el.offsetParent !== null;
      h.box.hidden = !visible;
      if (!visible) continue;
      const ox = h.fixed ? 0 : scrollX, oy = h.fixed ? 0 : scrollY;
      h.box.style.position = h.fixed ? 'fixed' : 'absolute';
      const pad = 14, gap = 54;
      const nw = h.note.offsetWidth, nh = h.note.offsetHeight;
      // the overlay box covers the target plus room for the note on the chosen side
      const tx = r.left - pad, ty = r.top - pad, tw = r.width + pad * 2, th = r.height + pad * 2;
      let nx, ny;
      if (h.pos === 'bottom') { nx = r.left + r.width * 0.55; ny = r.bottom + gap; }
      else if (h.pos === 'left') { nx = r.left - gap - nw; ny = r.top + r.height / 2 - nh / 2; }
      else if (h.pos === 'right') { nx = r.right + gap; ny = r.top + r.height / 2 - nh / 2; }
      else { nx = r.left + r.width * 0.55; ny = r.top - gap - nh; }
      nx = Math.max(8, Math.min(document.documentElement.clientWidth - nw - 12, nx));  // clientWidth excludes the scrollbar
      const L = Math.min(tx, nx), T = Math.min(ty, ny), R = Math.max(tx + tw, nx + nw), B = Math.max(ty + th, ny + nh);
      Object.assign(h.box.style, {left: L + ox + 'px', top: T + oy + 'px', width: R - L + 'px', height: B - T + 'px'});
      h.svg.setAttribute('viewBox', `0 0 ${R - L} ${B - T}`);
      h.note.style.left = nx - L + 'px';
      h.note.style.top = ny - T + 'px';
      const cx = tx - L + tw / 2, cy = ty - T + th / 2;
      h.ring.setAttribute('d', scribble(cx, cy, tw / 2, th / 2));
      // arrow runs from the note toward the edge of the circle
      const sx = nx - L + nw / 2, sy = (h.pos === 'bottom' ? ny - T - 4 : h.pos === 'top' ? ny - T + nh + 2 : ny - T + nh / 2);
      const ang = Math.atan2(sy - cy, sx - cx);
      const ex = cx + Math.cos(ang) * (tw / 2 + 6), ey = cy + Math.sin(ang) * (th / 2 + 6);
      h.arr.setAttribute('d', arrow(sx, sy, ex, ey));
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
  addEventListener('load', place);
  if (document.fonts) document.fonts.ready.then(place);
  new ResizeObserver(place).observe(document.body);
})();
