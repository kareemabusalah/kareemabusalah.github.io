// Engineering toys for the case studies: the solar sail node-mass sweep and the McRocket snap-fit stack-up.
// Numbers come straight from the white paper and the McRocket drawing package.

// Solar sail: the first mode is a single-DOF oscillator (white paper 5.2-5.3).
// k is the FEA out-of-plane stiffness at the free node; the two active beams add 1.40 g of Rayleigh effective mass.
const K_PERP = 344.5, BEAM_MEFF = 1.40, FLOOR = 20;
const f1 = mNode => Math.sqrt(K_PERP / ((mNode + BEAM_MEFF) / 1000)) / (2 * Math.PI);
const floorMass = () => K_PERP / (2 * Math.PI * FLOOR) ** 2 * 1000 - BEAM_MEFF;

// McRocket: 0.250" peg into a 0.254" hole, both molded to +/-0.002".
const PEG = 0.250, HOLE = 0.254, TOL = 0.002;
const mold = () => (HOLE + (Math.random() * 2 - 1) * TOL) - (PEG + (Math.random() * 2 - 1) * TOL);

if (typeof document === 'undefined') {  // node toys.js: check against the white paper's numbers
  const near = (a, b, tol) => { if (Math.abs(a - b) > tol) throw new Error(`${a} != ${b}`); };
  near(f1(10), 27.67, 0.01); near(f1(5), 36.9, 0.05); near(f1(30), 16.7, 0.05); near(floorMass(), 20.4, 0.1);
  for (let i = 0; i < 1e4; i++) { const c = mold(); if (c < -1e-9 || c > 0.008 + 1e-9) throw new Error('clearance ' + c); }
  console.log('toys ok');
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const css = (v, d) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d;
  const G = css('--g', '#7ee8ff'), PINK = css('--pink', '#ff6ad5'), SUN = css('--sun', '#ffd23f'),
        LINE = css('--line', '#2a2560'), DIM = css('--dim', '#7a72d6'), TXT = css('--txt', '#e6e8ff');
  const pen = cv => { const cx = cv.getContext('2d'); cx.font = '8px "Press Start 2P", monospace'; cx.imageSmoothingEnabled = false; return cx; };

  if ($('sweep')) {
    const cv = $('sw_c'), cx = pen(cv), W = cv.width, H = cv.height, P = 34;
    const X = m => P + (m - 5) / 25 * (W - 2 * P), Y = f => H - P - (f - 10) / 30 * (H - 2 * P);
    const mFloor = floorMass();
    const draw = () => {
      const m = +$('sw').value, f = f1(m);
      $('sw_m').value = m.toFixed(1); $('sw_f').value = f.toFixed(1);
      $('sw_ok').textContent = f >= FLOOR ? `CLEARS THE FLOOR BY ${Math.round((f / FLOOR - 1) * 100)}%` : 'BELOW THE 20 Hz FLOOR';
      $('sw_ok').style.color = f >= FLOOR ? G : PINK;
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = LINE; for (let fq = 10; fq <= 40; fq += 10) cx.fillRect(P, Y(fq), W - 2 * P, 1);
      cx.fillStyle = DIM; cx.textAlign = 'right';
      for (let fq = 10; fq <= 40; fq += 10) cx.fillText(fq, P - 6, Y(fq) + 4);
      cx.textAlign = 'center'; for (let mm = 5; mm <= 30; mm += 5) cx.fillText(mm + 'g', X(mm), H - P + 16);
      cx.fillStyle = PINK; for (let x = P; x < W - P; x += 8) cx.fillRect(x, Y(FLOOR), 4, 2);
      cx.textAlign = 'left'; cx.fillText('20 Hz FLOOR', X(22.5), Y(FLOOR) - 6);
      cx.fillStyle = SUN; for (let y = Y(40); y < H - P; y += 8) cx.fillRect(X(15), y, 2, 4);
      cx.fillText('15 g BUDGET', X(15) + 6, Y(38));
      cx.fillStyle = PINK; cx.fillRect(X(mFloor) - 1, Y(FLOOR) - 1, 4, 4);
      cx.fillStyle = G;
      for (let x = P; x < W - P; x += 2) { const mm = 5 + (x - P) / (W - 2 * P) * 25; cx.fillRect(x, Y(f1(mm)), 2, 2); }
      cx.fillStyle = f >= FLOOR ? G : PINK; cx.fillRect(X(m) - 5, Y(f) - 5, 10, 10);
      cx.fillStyle = TXT; cx.textAlign = X(m) > W - 140 ? 'right' : 'left';
      cx.fillText(f.toFixed(1) + ' Hz', X(m) + (cx.textAlign === 'right' ? -10 : 10), Y(f) - 10);
    };
    $('sw').oninput = draw;
    draw();
    document.fonts && document.fonts.ready.then(draw);
  }

  if ($('stack')) {
    const cv = $('st_cv'), cx = pen(cv), W = cv.width, H = cv.height, P = 30, BINS = 32;
    const X = c => 150 + c / 0.008 * (W - 150 - P);
    let hist = null;
    const draw = () => {
      const p = +$('st_p').value, h = +$('st_h').value, c = h - p;
      $('st_pv').value = p.toFixed(4); $('st_hv').value = h.toFixed(4); $('st_c').value = c.toFixed(4);
      cx.clearRect(0, 0, W, H);
      // cross-section, gap exaggerated about 6000x so a thousandth of an inch reads
      const R = 52, gap = c / 0.008 * 22, cy = H / 2 - 6;
      cx.fillStyle = DIM; cx.beginPath(); cx.arc(68, cy, R + 12, 0, 7); cx.fill();
      cx.fillStyle = '#05040f'; cx.beginPath(); cx.arc(68, cy, R, 0, 7); cx.fill();
      cx.fillStyle = c < 0.001 ? PINK : G; cx.beginPath(); cx.arc(68, cy, R - gap, 0, 7); cx.fill();
      cx.fillStyle = TXT; cx.textAlign = 'center'; cx.fillText('HOLE + PEG', 68, H - 10);
      // clearance axis with the worst-case band and the measured print
      const ay = H - P - 10;
      cx.fillStyle = LINE; cx.fillRect(X(0), ay, X(0.008) - X(0), 2);
      cx.fillStyle = DIM; for (let t = 0; t <= 0.008; t += 0.002) { cx.fillRect(X(t), ay - 3, 2, 8); cx.fillText(t.toFixed(3), X(t), ay + 20); }
      if (hist) {
        const max = Math.max(...hist), bw = (X(0.008) - X(0)) / BINS;
        cx.fillStyle = DIM; hist.forEach((n, i) => { const bh = n / max * (ay - 40); cx.fillRect(X(0) + i * bw, ay - 4 - bh, bw - 1, bh); });
      }
      cx.fillStyle = SUN; cx.fillRect(X(0.004), 18, 2, ay - 18); cx.fillText('FDM PRINT 0.004', X(0.004), 12);
      cx.fillStyle = c < 0.001 ? PINK : G; cx.fillRect(X(c) - 5, ay - 5, 10, 12);
    };
    $('st_p').oninput = $('st_h').oninput = draw;
    $('st_roll').onclick = () => {
      const cs = Array.from({length: 1000}, mold).sort((a, b) => a - b);
      hist = new Array(BINS).fill(0);
      cs.forEach(c => hist[Math.min(BINS - 1, Math.floor(c / 0.008 * BINS))]++);
      const tight = cs.filter(c => c < 0.001).length;
      $('st_note').textContent = `1,000 pairs, each part uniform within ±0.002″: clearance ran ${cs[0].toFixed(4)}″ to ${cs[999].toFixed(4)}″, and ${tight} landed under 0.001″, near line-to-line. Worst case says 0.000″ to 0.008″; random pairs cluster around 0.004″.`;
      draw();
    };
    draw();
    document.fonts && document.fonts.ready.then(draw);
  }
}
