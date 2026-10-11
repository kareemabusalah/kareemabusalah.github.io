/* Asteroids: Portfolio Edition.
   Drop-in arcade for <div id="arcade">. Reads window.GAME_DATA {projects, skills, bands}.
   Projects are the rocks, skills are the power-ups, bands fly the bass-guitar saucer. */
(function () {
  'use strict';
  const root = document.getElementById('arcade');
  if (!root) return;

  // ---------- data ----------
  const DEMO = {
    projects: [
      { n: '01', title: 'Solar Sail', sub: 'Frame', metric: '27 Hz', label: 'first mode', href: '#', kind: 'sail' },
      { n: '02', title: 'CubeSat', sub: 'Sensing', metric: '28 km', label: 'peak altitude', href: '#', kind: 'cube' },
      { n: '03', title: 'Plant Bot', sub: 'Pet plant', metric: '3 sensors', label: 'on board', href: '#', kind: 'plant' },
      { n: '04', title: 'Rocket', sub: 'Toy rocket', metric: '120 m', label: 'apogee', href: '#', kind: 'rocket' },
      { n: '05', title: 'Sheller', sub: 'Machine', metric: '90%', label: 'yield', href: '#', kind: 'gear' },
      { n: '06', title: 'Ball', sub: 'Enrichment', metric: '1 tiger', label: 'happy', href: '#', kind: 'ball' }
    ],
    skills: ['CAD', 'FEA', 'Python', 'C++'],
    bands: ['The Band']
  };
  const D = window.GAME_DATA || {};
  const PROJ = D.projects && D.projects.length ? D.projects : DEMO.projects;
  const SKILLS = D.skills && D.skills.length ? D.skills : DEMO.skills;
  const BANDS = D.bands && D.bands.length ? D.bands : DEMO.bands;

  // ---------- constants ----------
  const W = 400, H = 250, DT = 1 / 60, TAU = Math.PI * 2;
  const RM = window.KAS_CALM ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTO = /[?&]autoplay\b/.test(location.search); // test hook only
  const TOUCH = matchMedia('(any-pointer: coarse)').matches;
  const HI_KEY = 'kas_asteroids_hi';
  const INK = '#05060c';
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.random() * a.length | 0];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pad = n => String(n).padStart(6, '0');

  const PAL = {
    sail: ['#c8d0dc', '#8a94a6', '#39ff6a', '#eef3fa'],
    cube: ['#2f6fe0', '#1b3f8a', '#e0403a', '#9cc0ff'],
    plant: ['#c0602a', '#8a3f18', '#39c060', '#e07a3a'],
    rocket: ['#e0403a', '#a82a22', '#2f6fe0', '#f4f4f4'],
    gear: ['#8a96a8', '#5a6476', '#ffd23f', '#c8d0dc'],
    ball: ['#ff8a2a', '#c0601a', '#d8b878', '#ffd0a0']
  };
  const POW = [
    { k: 'triple', name: 'TRIPLE SHOT', d: 8 },
    { k: 'shield', name: 'SHIELD', d: 6 },
    { k: 'rapid', name: 'RAPID FIRE', d: 8 }
  ];

  // ---------- 3x5 pixel font (rows as octal digits) ----------
  const FONT = { ' ': '00000' };
  ('0:75557 1:26227 2:71747 3:71317 4:55711 5:74717 6:74757 7:71122 8:75757 9:75717 ' +
   'A:25755 B:65656 C:34443 D:65556 E:74647 F:74644 G:34553 H:55755 I:72227 J:11152 K:55655 ' +
   'L:44447 M:57755 N:65555 O:25552 P:65644 Q:25563 R:65655 S:34216 T:72222 U:55557 V:55552 ' +
   'W:55775 X:55255 Y:55222 Z:71247 +:02720 -:00700 .:00002 /:11244 &:25253 ?:71202 !:22202 ::02020 #:57575')
    .split(' ').forEach(p => { FONT[p[0]] = p.slice(2); });

  // ---------- sprites ----------
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // paint pixels, then add a 1px dark outline around everything opaque
  function sprite(w, h, paint) {
    const c = mkCanvas(w, h), x = c.getContext('2d');
    paint((X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); });
    const d = x.getImageData(0, 0, w, h), a = d.data, o = new Uint8ClampedArray(a);
    const op = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && a[(Y * w + X) * 4 + 3] > 0;
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const k = (y * w + i) * 4;
      if (!a[k + 3] && (op(i - 1, y) || op(i + 1, y) || op(i, y - 1) || op(i, y + 1))) {
        o[k] = 5; o[k + 1] = 6; o[k + 2] = 12; o[k + 3] = 255;
      }
    }
    d.data.set(o); x.putImageData(d, 0, 0);
    return c;
  }
  // sprite from a per-pixel function of offset from centre
  const field = (s, f) => sprite(s, s, p => {
    const c = (s - 1) / 2;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const col = f(x - c, y - c, x, y); if (col) p(x, y, col); }
  });
  const fromRows = (rows, pal) => {
    const w = Math.max(...rows.map(r => r.length));
    return sprite(w + 2, rows.length + 2, p => rows.forEach((r, y) => [...r].forEach((ch, x) => pal[ch] && p(x + 1, y + 1, pal[ch]))));
  };

  const KIND = {
    // hexagonal silver membrane, dark CFRP frame and booms, green corner nodes
    sail() {
      const R = 10.5, V = [-90, -30, 30, 90, 150, 210].map(d => [R * Math.cos(d * Math.PI / 180), R * Math.sin(d * Math.PI / 180)]);
      return field(26, (dx, dy, x, y) => {
        if (V.some(([vx, vy]) => Math.hypot(dx - vx, dy - vy) < 1.7)) return '#39ff6a';
        const ax = Math.abs(dx), ay = Math.abs(dy), e = Math.min(R * 0.866 - ax, (R - ax / 1.732 - ay) * 0.866);
        if (e < 0) return null;
        if (e < 1.2 || Math.hypot(dx, dy) < 1.6) return '#2a3040';
        if ([-90, -30, 30].some(d => { const a = d * Math.PI / 180; return Math.abs(dx * Math.sin(a) - dy * Math.cos(a)) < 0.55; })) return '#4a5468';
        return (x + 2 * y) % 7 === 0 ? '#eef3fa' : dx + dy > 4 ? '#a9b3c3' : '#c8d0dc';
      });
    },
    // 1U CubeSat: blue solar faces, red rails, antenna
    cube() {
      return sprite(26, 26, p => {
        for (let k = 1; k <= 4; k++) for (let x = 4 + k; x <= 17 + k; x++) p(x, 9 - k, '#6f9cf5');
        for (let k = 1; k <= 4; k++) for (let y = 9 - k; y <= 22 - k; y++) p(17 + k, y, '#1b3f8a');
        for (let y = 9; y <= 22; y++) for (let x = 4; x <= 17; x++) {
          const cx = (x - 5) % 6, cy = (y - 10) % 6;
          p(x, y, x === 4 || x === 17 ? '#e0403a' : (cx === 5 || cy === 5 || y === 9 || y === 22) ? '#1b3f8a' : (cx === 0 && cy === 0 ? '#9cc0ff' : '#2f6fe0'));
        }
        for (let y = 5; y <= 18; y++) p(21, y, '#e0403a');
        for (let k = 1; k <= 4; k++) { p(4 + k, 9 - k, '#e0403a'); p(17 + k, 9 - k, '#e0403a'); }
        for (let y = 1; y <= 4; y++) p(14, y, '#c8d0dc');
      });
    },
    // potted plant with a little face on the pot
    plant() {
      return sprite(26, 26, p => {
        const leaves = [[7.5, 10, 5, 2.6], [18, 8, 5, 2.6], [12.5, 4, 3, 2.8]];
        for (let y = 1; y < 25; y++) for (let x = 1; x < 25; x++) {
          let c = null;
          if (y >= 15 && y <= 16 && x >= 5 && x <= 20) c = '#e07a3a';
          else if (y >= 17 && y <= 23) { const i = (y - 17) / 3 | 0; if (x >= 6 + i && x <= 19 - i) c = x >= 18 - i ? '#8a3f18' : '#c0602a'; }
          else if (y <= 14) {
            if (x >= 12 && x <= 13 && y >= 7) c = '#1f7a3a';
            for (const [cx, cy, rx, ry] of leaves) {
              const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
              if (e <= 1) c = Math.abs(y - cy) < 0.6 && e > 0.15 ? '#1f7a3a' : (y < cy - 0.5 && x < cx ? '#8af0a0' : '#39c060');
            }
          }
          if (c) p(x, y, c);
        }
        [[10, 19], [15, 19], [12, 21], [13, 21]].forEach(([x, y]) => p(x, y, INK));
      });
    },
    // red/blue toy rocket with a porthole
    rocket() {
      return sprite(26, 26, p => {
        const nose = { 2: [12, 13], 3: [12, 13], 4: [11, 14], 5: [11, 14], 6: [10, 15] };
        for (let y = 2; y <= 21; y++) for (let x = 5; x <= 20; x++) {
          let c = null;
          const fin = y >= 15 && ((x <= 9 && x >= 9 - ((y - 15) * 0.7 | 0)) || (x >= 16 && x <= 16 + ((y - 15) * 0.7 | 0)));
          if (nose[y] && x >= nose[y][0] && x <= nose[y][1]) c = '#2f6fe0';
          else if (y >= 7 && y <= 19 && x >= 10 && x <= 15) {
            const r = Math.hypot(x - 12.5, y - 10.5);
            c = r < 1.2 ? '#2f6fe0' : r < 2.3 ? '#f4f4f4' : y === 16 ? '#f4f4f4' : x === 11 ? '#ff7a6a' : x === 15 ? '#a82a22' : '#e0403a';
          } else if (fin) c = '#2f6fe0';
          else if (y >= 20 && x >= 11 && x <= 14) c = '#8a96a8';
          if (c) p(x, y, c);
        }
      });
    },
    // gear / roller with a yellow hub
    gear() {
      return field(26, (dx, dy) => {
        const r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
        if (r > (Math.cos(th * 8) > 0.2 ? 11.5 : 8.8) || r < 1.6) return null;
        if (r < 4) return '#ffd23f';
        if (r < 5) return '#2a3040';
        for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; if (Math.hypot(dx - 6.8 * Math.cos(a), dy - 6.8 * Math.sin(a)) < 1.5) return '#2a3040'; }
        return dx + dy > 3 ? '#5a6476' : dx + dy < -8 ? '#c8d0dc' : '#8a96a8';
      });
    },
    // orange ball wrapped in rope bands
    ball() {
      return field(26, (dx, dy, x, y) => {
        const r = Math.hypot(dx, dy);
        if (r > 10.8) return null;
        if (Math.abs(dx * 0.94 + dy * 0.34) < 1.3 || Math.abs(dy * 0.94 - dx * 0.34) < 1.3) return (x + y) % 2 ? '#d8b878' : '#8a6a38';
        if (Math.hypot(dx + 4, dy + 4) < 2.5) return '#ffd0a0';
        if (r > 9.6 && dx + dy > 0) return '#a04a10';
        return dx + dy > 6 ? '#c0601a' : '#ff8a2a';
      });
    }
  };

  // medium/small parts: irregular chunks in the project's palette
  function debris(s, pal) {
    const p1 = rand(0, TAU), p2 = rand(0, TAU), R = s / 2 - 2, hole = Math.random() < 0.5;
    return field(s, (dx, dy) => {
      const th = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
      if (r > R * (0.85 + 0.15 * Math.sin(3 * th + p1) + 0.1 * Math.sin(5 * th + p2))) return null;
      if (hole && s > 10 && r < 1.3) return null;
      if (dx + dy < -R) return pal[3];
      if (dx + dy > 1.5) return pal[1];
      return Math.random() < 0.18 ? pal[2] : pal[0];
    });
  }

  const SPR = PROJ.map(p => {
    const pal = PAL[p.kind] || PAL.gear;
    return {
      pal,
      big: (KIND[p.kind] || KIND.gear)(),
      med: [0, 1, 2].map(() => debris(14, pal)),
      small: [0, 1, 2].map(() => debris(8, pal))
    };
  });
  const SHIP = fromRows([
    'KK...........',
    'KWKK.........',
    'KCWWKK.......',
    '.KCCWWKK.....',
    '.KBCCCWWKK...',
    '..KBCCCCWWWWK',
    '.KBCCCWWKK...',
    '.KCCWWKK.....',
    'KCWWKK.......',
    'KWKK.........',
    'KK...........'
  ], { K: INK, W: '#ffffff', C: '#5ce1ff', B: '#1f7fa8' });
  const BASS = fromRows([
    '.PP.........................',
    'PPPP........................',
    'PPPPPP................Y.Y.Y.',
    'PLPWWKPPNNNNNNNNNNNNNNHHHHHH',
    'PLPWWKPPSSSSSSSSSSSSSSHHHHHH',
    'PLPWWKPPNNNNNNNNNNNNNNHHHHHH',
    'PPPPPP................Y.Y.Y.',
    'PPPP........................',
    '.PP.........................'
  ], { P: '#8b5cf6', L: '#b79bff', W: '#f4f4f4', K: INK, N: '#c8955a', S: '#e8e8e8', H: '#5a3a1a', Y: '#ffd23f' });
  const NOTE = fromRows(['..YY.', '..YYY', '..Y.Y', '..Y..', 'YYY..', 'YYY..'], { Y: '#ffd23f' });
  const CAPS = fromRows(['.GGGGWWWW.', 'GGLGGWWWWW', 'GGGGGWWWWW', 'GGGGGWWWWW', '.GGGGWWWW.'], { G: '#39ff6a', L: '#c8ffd8', W: '#d4e4ff' });
  const LIFE_ICON = (() => {
    const c = mkCanvas(13, 15), x = c.getContext('2d');
    x.translate(6.5, 7.5); x.rotate(-Math.PI / 2); x.drawImage(SHIP, -7, -6);
    return c.toDataURL();
  })();

  // ---------- DOM ----------
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }

  const css = `
.ast-wrap{position:relative;width:100%;max-width:calc(70vh * 1.6);aspect-ratio:16/10;margin:0 auto;background:#05040f;border:2px solid #5b54a8;box-shadow:0 0 0 2px #05040f,0 0 24px rgba(126,232,255,.15);overflow:hidden;font-family:VT323,monospace;color:#d4e4ff;user-select:none;-webkit-user-select:none;box-sizing:border-box}
.ast-wrap *{box-sizing:border-box}
.ast-cv{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:crisp-edges;image-rendering:pixelated}
.ast-hud{position:absolute;left:0;right:0;top:0;z-index:3;display:flex;flex-wrap:wrap;gap:.4em 1.4em;align-items:center;padding:7px 9px 14px;font:clamp(7px,1.05vw,11px)/1.4 "Press Start 2P",monospace;background:linear-gradient(rgba(4,5,13,.85),rgba(4,5,13,0));pointer-events:none}
.ast-hud b{color:#7ee8ff;font-weight:normal}
.ast-lives img{width:1.3em;height:1.5em;image-rendering:pixelated;vertical-align:middle;margin-right:2px}
.ast-snd{pointer-events:auto;margin-left:auto;font:inherit;color:#d4e4ff;background:#0d0b24;border:2px solid #5b54a8;padding:.35em .6em;cursor:pointer}
.ast-snd[aria-pressed=true]{color:#05040f;background:#7ee8ff}
.ast-snd:focus-visible,.ast-btn:focus-visible,.ast-wrap a:focus-visible{outline:3px solid #ffd23f;outline-offset:2px}
.ast-fxbar{position:absolute;left:9px;bottom:8px;z-index:3;font:clamp(7px,1vw,10px) "Press Start 2P",monospace;color:#ffd23f;pointer-events:none}
.ast-ov{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7em;text-align:center;padding:42px 6% 4%;background:rgba(4,5,13,.66);overflow:auto}
.ast-ov[hidden],.ast-touch[hidden]{display:none}
.ast-ov h2{margin:0;font:clamp(11px,2.3vw,22px)/1.5 "Press Start 2P",monospace;color:#7ee8ff;text-shadow:3px 3px 0 #0d0b24,0 0 14px rgba(126,232,255,.35)}
.ast-ov h3{margin:.3em 0 0;font:clamp(8px,1.1vw,11px) "Press Start 2P",monospace;color:#ffd23f}
.ast-ov p{margin:0;max-width:44em;font-size:clamp(16px,2vw,23px);line-height:1.15}
.ast-keys{color:#9fb0d8}.ast-keys kbd{font:inherit;color:#ffd23f}
.ast-btn{font:clamp(9px,1.25vw,13px)/1.4 "Press Start 2P",monospace;color:#05040f;background:#7ee8ff;border:0;padding:.9em 1.4em;box-shadow:4px 4px 0 #5b54a8;cursor:pointer}
.ast-pulse{animation:ast-pulse 1.1s steps(2) infinite}
@keyframes ast-pulse{50%{background:#ffd23f;box-shadow:4px 4px 0 #8b5cf6}}
.ast-log{list-style:none;margin:0;padding:.4em .8em;text-align:left;font-size:clamp(15px,1.8vw,20px);line-height:1.2;background:#0d0b24;border:2px solid #5b54a8}
.ast-log a{color:#7ee8ff;margin-left:.4em}
.ast-log .ast-unk{color:#5a6a8a}
.ast-toasts{position:absolute;right:8px;top:34px;z-index:4;width:min(280px,62%);display:flex;flex-direction:column;gap:6px;pointer-events:none}
.ast-toast{pointer-events:auto;display:flex;gap:8px;align-items:flex-start;background:#0d0b24;border:2px solid #7ee8ff;box-shadow:3px 3px 0 #05040f;padding:6px 8px;font-size:17px;line-height:1.1;transition:opacity .4s,transform .4s}
.ast-toast.ast-out{opacity:0;transform:translateX(20px)}
.ast-toast small{display:block;margin-bottom:3px;font:8px/1.3 "Press Start 2P",monospace;color:#7ee8ff}
.ast-toast img{flex:none;width:46px;height:46px;object-fit:cover;border:1px solid #5b54a8}
.ast-toast .ast-m{color:#ffd23f;font-size:20px}
.ast-toast a{display:inline-block;margin-top:4px;font:8px "Press Start 2P",monospace;color:#7ee8ff}
.ast-toast.ast-skill{border-color:#8b5cf6}.ast-toast.ast-skill small{color:#b79bff}
.ast-toast.ast-band{border-color:#ffd23f}.ast-toast.ast-band small{color:#ffd23f}
.ast-touch{position:absolute;left:0;right:0;bottom:8px;z-index:3;display:flex;justify-content:space-between;padding:0 8px;pointer-events:none}
.ast-touch div{display:flex;gap:8px}
.ast-touch button{pointer-events:auto;touch-action:none;width:clamp(44px,12vw,64px);height:clamp(44px,12vw,64px);font:20px/1 "Press Start 2P",monospace,sans-serif;color:#d4e4ff;background:rgba(10,14,31,.7);border:2px solid #5b54a8;border-radius:0;-webkit-tap-highlight-color:transparent}
.ast-touch button.ast-fire{font-size:10px}
.ast-touch button.on{background:#5b54a8;color:#05040f}
@media (prefers-reduced-motion:reduce){.ast-pulse{animation:none}.ast-toast{transition:none}}`;
  if (!document.getElementById('ast-style')) document.head.append(h('style', { id: 'ast-style' }, css));

  const cv = h('canvas', { class: 'ast-cv', role: 'img', 'aria-label': 'Asteroids: Portfolio Edition game screen' });
  const ctx = cv.getContext('2d');
  const buf = mkCanvas(W, H), g = buf.getContext('2d');
  g.imageSmoothingEnabled = false;

  const hS = h('span'), hH = h('span'), hW = h('span'), hL = h('span'), hI = h('span'), hLives = h('span', { class: 'ast-lives', 'aria-label': 'lives' });
  const sndBtn = h('button', { type: 'button', class: 'ast-snd', 'aria-pressed': 'false', onclick: toggleSound }, 'SOUND: OFF');
  const hud = h('div', { class: 'ast-hud' }, hS, hH, hW, hL, hI, hLives, sndBtn);
  const fxBar = h('div', { class: 'ast-fxbar' });
  const ov = h('div', { class: 'ast-ov' });
  const toasts = h('div', { class: 'ast-toasts', 'aria-live': 'polite' });
  const tbtn = (label, k, aria, cls) => {
    const b = h('button', { type: 'button', 'aria-label': aria, class: cls || '' }, label);
    const on = e => { e.preventDefault(); keys[k] = true; b.classList.add('on'); if (b.setPointerCapture) try { b.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { keys[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, off));
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  };
  const keys = { l: false, r: false, t: false, f: false };
  const touchEl = h('div', { class: 'ast-touch' },
    h('div', null, tbtn('◀', 'l', 'rotate left'), tbtn('▶', 'r', 'rotate right')),
    h('div', null, tbtn('▲', 't', 'thrust'), tbtn('FIRE', 'f', 'fire', 'ast-fire')));
  touchEl.hidden = true;
  const wrap = h('div', { class: 'ast-wrap' }, cv, hud, fxBar, ov, toasts, touchEl);
  root.append(wrap);

  // ---------- sound (off by default, generated) ----------
  let snd = false, ac = null, noiseBuf = null;
  function toggleSound() {
    snd = !snd;
    if (snd && !ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ac = new AC();
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
    }
    if (ac && snd) ac.resume();
    sndBtn.textContent = 'SOUND: ' + (snd ? 'ON' : 'OFF');
    sndBtn.setAttribute('aria-pressed', String(snd));
    sndBtn.blur();
  }
  function beep(f, d, type, v, f2) {
    if (!snd || !ac) return;
    const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime;
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    gn.gain.setValueAtTime(v || 0.04, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(gn).connect(ac.destination);
    o.start(t); o.stop(t + d);
  }
  function hiss(d, v) {
    if (!snd || !ac) return;
    const s = ac.createBufferSource(), gn = ac.createGain(), t = ac.currentTime;
    s.buffer = noiseBuf;
    gn.gain.setValueAtTime(v, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(gn).connect(ac.destination);
    s.start(t); s.stop(t + d);
  }

  // ---------- game state ----------
  let state = 'start', active = false, onscreen = true, raf = 0, last = 0, acc = 0;
  let hi = 0;
  try { hi = +localStorage.getItem(HI_KEY) || 0; } catch (_) {}
  let score, lives, wave, nextProj, rocks = [], bullets, notes, pows, parts = [], ufo, ufoT, ship, fx, inv;
  let clearing, waveT, respawnT, respawnWait, overT, shakeT, thrustT, banner = { text: '', t: 0 };
  const logged = new Set(); // persists across replays within the visit
  const stars = Array.from({ length: 70 }, () => ({
    x: rand(0, W), y: rand(0, H), z: pick([0.15, 0.35, 0.7]), c: pick(['#2a3458', '#4a5888', '#d4e4ff', '#8b5cf6', '#6a78a8'])
  }));

  function reset() {
    score = 0; lives = 3; wave = 0; nextProj = 0;
    rocks = []; bullets = []; notes = []; pows = []; parts = []; ufo = null;
    ufoT = AUTO ? 1.5 : rand(18, 30);
    ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, alive: true, inv: 2, cd: 0, hy: 0, thrust: false, god: AUTO };
    fx = { triple: 0, shield: 0, rapid: 0 };
    inv = [];
    clearing = false; waveT = 0; respawnT = 0; respawnWait = 0; overT = 0; shakeT = 0; thrustT = 0;
  }

  function makeRock(pi, tier, x, y) {
    const sp = [16, 30, 48][tier] * rand(0.7, 1.3) * (1 + 0.06 * Math.max(0, wave - 1)), a = rand(0, TAU), S = SPR[pi];
    return {
      pi, tier, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: rand(0, TAU), va: rand(-0.6, 0.6) * (tier + 1),
      r: [11, 6, 3][tier], img: tier === 0 ? S.big : pick(tier === 1 ? S.med : S.small)
    };
  }

  function spawnWave(n) {
    wave = n; clearing = false;
    const cnt = Math.min(3 + n, 8);
    for (let i = 0; i < cnt; i++) {
      let x, y;
      do { x = rand(0, W); y = rand(0, H); } while (Math.hypot(x - ship.x, y - ship.y) < 80);
      rocks.push(makeRock(nextProj++ % PROJ.length, 0, x, y));
    }
    say('WAVE ' + n, 1.4);
  }

  function say(text, t) { banner = { text, t }; }

  function boom(x, y, n, cols, spd) {
    n = Math.round(n * (RM ? 0.4 : 1));
    for (let i = 0; i < n && parts.length < 500; i++) {
      const a = rand(0, TAU), s = rand(0.2, 1) * (spd || 60);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: rand(0.3, 0.9), c: pick(cols) });
    }
  }

  function addScore(n) {
    const before = score;
    score += n;
    if (score > hi) hi = score;
    if (Math.floor(score / 10000) > Math.floor(before / 10000)) {
      lives++;
      toast([h('div', null, h('small', null, 'BONUS'), 'EXTRA LIFE!')], 'ast-band', 3000);
      beep(660, 0.3, 'square', 0.05, 1320);
    }
  }

  // ---------- toasts ----------
  function toast(kids, cls, ms) {
    const el = h('div', { class: 'ast-toast ' + (cls || '') }, kids);
    toasts.prepend(el);
    while (toasts.children.length > 3) toasts.lastChild.remove();
    setTimeout(() => { el.classList.add('ast-out'); setTimeout(() => el.remove(), 450); }, ms || 6500);
  }

  function logProject(pi) {
    if (logged.has(pi)) return; // only the first discovery gets a toast
    logged.add(pi);
    const p = PROJ[pi];
    const img = p.img ? h('img', { src: p.img, alt: '', loading: 'lazy' }) : null;
    if (img) img.addEventListener('error', () => img.remove());
    toast([img, h('div', null,
      h('small', null, 'MISSION LOGGED ' + logged.size + '/' + PROJ.length),
      h('b', null, p.n + ' ' + p.title), h('br'),
      h('span', { class: 'ast-m' }, p.metric), ' ', p.label || '', h('br'),
      h('a', { href: p.href, onclick: pause }, 'OPEN CASE STUDY →'))], '', 9000);
  }

  // ---------- actions ----------
  function fire() {
    const spread = fx.triple > 0 ? [-0.2, 0, 0.2] : [0];
    const max = fx.triple > 0 ? 12 : fx.rapid > 0 ? 9 : 5;
    if (bullets.length + spread.length > max) return;
    ship.cd = fx.rapid > 0 ? 0.09 : 0.22;
    for (const s of spread) {
      const a = ship.a + s;
      bullets.push({ x: ship.x + Math.cos(a) * 6, y: ship.y + Math.sin(a) * 6, vx: ship.vx + Math.cos(a) * 230, vy: ship.vy + Math.sin(a) * 230, l: 0.85 });
    }
    beep(880, 0.06, 'square', 0.03, 440);
  }

  function hyperspace() {
    if (!ship.alive || ship.hy > 0) return;
    boom(ship.x, ship.y, 12, ['#5ce1ff', '#ffffff'], 40);
    ship.x = rand(20, W - 20); ship.y = rand(20, H - 20); ship.vx = ship.vy = 0; ship.hy = 1;
    boom(ship.x, ship.y, 12, ['#5ce1ff', '#ffffff'], 40);
    beep(200, 0.25, 'sine', 0.05, 1200);
  }

  function die() {
    if (ship.god) return;
    ship.alive = false;
    boom(ship.x, ship.y, 40, ['#5ce1ff', '#ffffff', '#ffd23f', '#ff8a2a'], 80);
    hiss(0.6, 0.15);
    shakeT = 0.4;
    lives--;
    fx.triple = fx.shield = fx.rapid = 0;
    if (lives > 0) { respawnT = 1.5; respawnWait = 0; } else overT = 1.8;
  }

  function hitRock(j) {
    const r = rocks.splice(j, 1)[0], S = SPR[r.pi];
    addScore([20, 50, 100][r.tier]);
    boom(r.x, r.y, [26, 14, 8][r.tier], S.pal.concat('#ffffff'), [55, 70, 80][r.tier]);
    hiss([0.4, 0.25, 0.15][r.tier], 0.1);
    if (r.tier < 2) {
      const n = r.tier === 0 ? (Math.random() < 0.5 ? 2 : 3) : 2;
      for (let i = 0; i < n; i++) rocks.push(makeRock(r.pi, r.tier + 1, r.x + rand(-3, 3), r.y + rand(-3, 3)));
    }
    if (r.tier === 0) logProject(r.pi);
    if (r.tier < 2 && pows.length < 2 && Math.random() < (AUTO ? 0.6 : r.tier === 0 ? 0.25 : 0.1)) {
      const fresh = SKILLS.filter(s => !inv.includes(s)), a = rand(0, TAU);
      pows.push({ x: r.x, y: r.y, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10, l: 10, skill: pick(fresh.length ? fresh : SKILLS), pow: pick(POW) });
    }
  }

  function collect(p) {
    fx[p.pow.k] = p.pow.d;
    if (!inv.includes(p.skill)) inv.push(p.skill);
    toast([h('div', null, h('small', null, 'POWER-UP'), '+ SKILL: ' + p.skill + ' · ' + p.pow.name)], 'ast-skill', 3500);
    beep(520, 0.15, 'square', 0.04, 1040);
  }

  function killUfo() {
    boom(ufo.x, ufo.y, 30, ['#8b5cf6', '#b79bff', '#ffd23f', '#c8955a'], 70);
    addScore(500);
    toast([h('div', null, h('small', null, '+500'), 'BASS SOLO! ♪ ' + ufo.band)], 'ast-band', 3500);
    beep(110, 0.4, 'sawtooth', 0.05, 55);
    ufo = null; ufoT = rand(20, 35);
  }

  function wrapObj(o, m) {
    if (o.x < -m) o.x += W + 2 * m; else if (o.x > W + m) o.x -= W + 2 * m;
    if (o.y < -m) o.y += H + 2 * m; else if (o.y > H + m) o.y -= H + 2 * m;
  }

  // test hook: aim at the nearest rock and shoot
  function autopilot() {
    keys.l = keys.r = keys.t = keys.f = false;
    let best = null, bd = 1e9;
    for (const r of rocks) { const d = dist(r, ship); if (d < bd) { bd = d; best = r; } }
    if (!best || !ship.alive) return;
    let da = Math.atan2(best.y - ship.y, best.x - ship.x) - ship.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (da < -0.08) keys.l = true; else if (da > 0.08) keys.r = true;
    keys.f = Math.abs(da) < 0.3;
  }

  // ---------- update ----------
  function update(dt) {
    if (AUTO) autopilot();
    for (const s of stars) {
      s.x = (s.x - (ship.vx * 0.08 + 3) * s.z * dt + W) % W;
      s.y = (s.y - ship.vy * 0.08 * s.z * dt + H) % H;
    }

    // ship
    if (ship.alive) {
      if (keys.l) ship.a -= 4.2 * dt;
      if (keys.r) ship.a += 4.2 * dt;
      ship.thrust = keys.t;
      if (keys.t) {
        ship.vx += Math.cos(ship.a) * 140 * dt; ship.vy += Math.sin(ship.a) * 140 * dt;
        if ((thrustT -= dt) <= 0) { thrustT = 0.12; hiss(0.1, 0.03); }
      }
      const drag = 1 - 0.6 * dt, sp = Math.hypot(ship.vx, ship.vy);
      ship.vx *= drag; ship.vy *= drag;
      if (sp > 160) { ship.vx *= 160 / sp; ship.vy *= 160 / sp; }
      ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      wrapObj(ship, 5);
      ship.cd -= dt; ship.hy -= dt; ship.inv = Math.max(0, ship.inv - dt);
      if (keys.f && ship.cd <= 0) fire();
    } else if (respawnT > 0) {
      respawnT -= dt;
      if (respawnT <= 0) {
        respawnWait += dt;
        const safe = !rocks.some(r => Math.hypot(r.x - W / 2, r.y - H / 2) < 50);
        if (safe || respawnWait > 3) Object.assign(ship, { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, alive: true, inv: 2.5 });
        else respawnT = 0.001;
      }
    }
    for (const k in fx) fx[k] = Math.max(0, fx[k] - dt);

    // movers
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.l -= dt; wrapObj(b, 1); }
    bullets = bullets.filter(b => b.l > 0);
    for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.va * dt; wrapObj(r, r.r); }
    for (const p of pows) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; wrapObj(p, 6); }
    pows = pows.filter(p => p.l > 0);
    for (const n of notes) { n.x += n.vx * dt; n.y += n.vy * dt; n.l -= dt; wrapObj(n, 4); }
    notes = notes.filter(n => n.l > 0);
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.l -= dt; }
    parts = parts.filter(p => p.l > 0);

    // bass guitar saucer
    if (!ufo && (ufoT -= dt) <= 0 && rocks.length) {
      const left = Math.random() < 0.5, y = rand(40, H - 40);
      ufo = { x: left ? -16 : W + 16, y, y0: y, vx: (left ? 1 : -1) * rand(32, 42), t: 0, cd: 1.2, band: pick(BANDS) };
    }
    if (ufo) {
      ufo.t += dt; ufo.x += ufo.vx * dt; ufo.y = ufo.y0 + Math.sin(ufo.t * 1.6) * 18;
      if ((ufo.cd -= dt) <= 0 && ship.alive) {
        ufo.cd = 1.7;
        const a = Math.atan2(ship.y - ufo.y, ship.x - ufo.x) + rand(-0.25, 0.25);
        notes.push({ x: ufo.x, y: ufo.y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, l: 4 });
        beep(pick([196, 220, 247, 262]), 0.18, 'triangle', 0.05);
      }
      if (ufo.x < -24 || ufo.x > W + 24) { ufo = null; ufoT = rand(20, 35); }
    }

    // collisions: bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (ufo && Math.abs(b.x - ufo.x) < 14 && Math.abs(b.y - ufo.y) < 6) { bullets.splice(i, 1); killUfo(); continue; }
      for (let j = rocks.length - 1; j >= 0; j--) {
        if (dist(b, rocks[j]) < rocks[j].r + 1) { bullets.splice(i, 1); hitRock(j); break; }
      }
    }
    // collisions: ship
    if (ship.alive) {
      const safe = ship.inv > 0, shield = fx.shield > 0;
      for (let j = rocks.length - 1; j >= 0; j--) {
        if (dist(ship, rocks[j]) < rocks[j].r + 4) {
          if (shield) hitRock(j); else if (!safe) { die(); break; }
        }
      }
      for (let i = pows.length - 1; i >= 0; i--) if (dist(ship, pows[i]) < 9) collect(pows.splice(i, 1)[0]);
      if (ship.alive && !safe) {
        if (notes.some(n => dist(n, ship) < 5)) { if (shield) notes = notes.filter(n => dist(n, ship) >= 5); else die(); }
        if (ship.alive && ufo && Math.abs(ship.x - ufo.x) < 15 && Math.abs(ship.y - ufo.y) < 7) { if (shield) killUfo(); else die(); }
      }
    }

    // waves, banners, game over
    if (!rocks.length && !clearing) { clearing = true; waveT = 2.2; say('WAVE ' + wave + ' CLEAR', 2); beep(440, 0.4, 'square', 0.04, 880); }
    if (clearing && (waveT -= dt) <= 0) spawnWave(wave + 1);
    banner.t -= dt;
    shakeT = Math.max(0, shakeT - dt);
    if (overT > 0 && (overT -= dt) <= 0) gameOver();
  }

  // ---------- render ----------
  function text(s, x, y, col, sc) {
    s = String(s).toUpperCase(); sc = sc || 1;
    for (const [dx, c] of [[sc, INK], [0, col]]) {
      g.fillStyle = c;
      for (let i = 0; i < s.length; i++) {
        const gl = FONT[s[i]] || FONT['?'];
        for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (+gl[r] & (4 >> k)) g.fillRect(x + dx + (i * 4 + k) * sc, y + dx + r * sc, sc, sc);
      }
    }
  }
  const textW = (s, sc) => (String(s).length * 4 - 1) * (sc || 1);

  function drawRot(img, x, y, a, flip) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (a) g.rotate(a);
    if (flip) g.scale(-1, 1);
    g.drawImage(img, -(img.width / 2 | 0), -(img.height / 2 | 0));
    g.restore();
  }

  function render() {
    g.fillStyle = '#05040f';
    g.fillRect(0, 0, W, H);
    g.save();
    if (shakeT > 0 && !RM) g.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)));
    for (const s of stars) { g.fillStyle = s.c; g.fillRect(s.x | 0, s.y | 0, s.z > 0.5 ? 2 : 1, s.z > 0.5 ? 2 : 1); }

    for (const r of rocks) drawRot(r.img, r.x, r.y, r.a);
    for (const r of rocks) if (r.tier === 0) { const n = PROJ[r.pi].n; text(n, Math.round(r.x - textW(n) / 2), Math.round(r.y - r.r - 9), '#7ee8ff'); }

    for (const p of pows) {
      if (p.l < 3 && (p.l * 8 | 0) % 2) continue;
      drawRot(CAPS, p.x, p.y);
      const s = p.skill.slice(0, 12);
      text(s, Math.round(p.x - textW(s) / 2), Math.round(p.y - 11), '#b79bff');
    }
    if (ufo) {
      drawRot(BASS, ufo.x, ufo.y, 0, ufo.vx < 0);
      const s = ufo.band.slice(0, 14);
      text(s, Math.round(ufo.x - textW(s) / 2), Math.round(ufo.y + 8), '#ffd23f');
    }
    for (const n of notes) drawRot(NOTE, n.x, n.y);

    g.fillStyle = '#7ee8ff';
    for (const b of bullets) g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2);

    if (ship && ship.alive && (ship.inv <= 0 || (ship.inv * 10 | 0) % 2 === 0) && state !== 'start') {
      g.save();
      g.translate(Math.round(ship.x), Math.round(ship.y));
      g.rotate(ship.a);
      if (ship.thrust) {
        const len = 2 + (Math.random() * 4 | 0);
        g.fillStyle = '#ff8a2a'; g.fillRect(-7 - len, -1, len, 3);
        g.fillStyle = '#ffd23f'; g.fillRect(-7 - len + 1, 0, len, 1);
      }
      g.drawImage(SHIP, -7, -6);
      g.restore();
      if (fx.shield > 0 && (fx.shield > 1.5 || (fx.shield * 8 | 0) % 2)) {
        g.fillStyle = '#7ee8ff';
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; g.fillRect(Math.round(ship.x + Math.cos(a) * 9), Math.round(ship.y + Math.sin(a) * 9), 1, 1); }
      }
    }

    for (const p of parts) { g.fillStyle = p.c; const s = p.l > 0.5 ? 2 : 1; g.fillRect(p.x | 0, p.y | 0, s, s); }
    g.restore();

    if (banner.t > 0 && state !== 'start') text(banner.text, Math.round(W / 2 - textW(banner.text, 2) / 2), 96, '#ffd23f', 2);
    blit();
  }

  function blit() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cv.width, cv.height);
  }

  let hudKey = '';
  function updateHud() {
    const fxs = POW.filter(p => fx && fx[p.k] > 0).map(p => p.name + ' ' + Math.ceil(fx[p.k]) + 'S').join('  ');
    const key = [score, hi, wave, logged.size, lives, inv && inv.length, fxs, state].join('|');
    if (key === hudKey) return;
    hudKey = key;
    hS.replaceChildren('SCORE ', h('b', null, pad(score || 0)));
    hH.replaceChildren('HI ', h('b', null, pad(hi)));
    hW.replaceChildren('WAVE ', h('b', null, String(wave || 1)));
    hL.replaceChildren('LOGBOOK ', h('b', null, logged.size + '/' + PROJ.length));
    hI.replaceChildren('INV ', h('b', null, String(inv ? inv.length : 0)));
    hLives.replaceChildren(...Array.from({ length: Math.max(0, Math.min(lives == null ? 3 : lives, 8)) }, () => h('img', { src: LIFE_ICON, alt: '' })));
    hLives.setAttribute('aria-label', (lives == null ? 3 : lives) + ' lives');
    fxBar.textContent = state === 'play' ? fxs : '';
  }

  // ---------- loop (runs only while playing and on screen) ----------
  // ponytail: headless virtual time barely ticks rAF, so the test hook steps on timers
  const nextFrame = AUTO ? f => setTimeout(() => f(performance.now()), 16) : f => requestAnimationFrame(f);
  function frame(now) {
    raf = 0;
    if (state !== 'play' || !onscreen || document.hidden) return;
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= DT && state === 'play') { update(DT); acc -= DT; }
    render();
    updateHud();
    if (state === 'play') raf = nextFrame(frame);
  }
  function loop() {
    if (raf) return;
    last = performance.now(); acc = 0;
    raf = nextFrame(frame);
  }

  // ---------- screens ----------
  function screen(...kids) { ov.replaceChildren(...kids.flat().filter(Boolean)); toasts.replaceChildren(); ov.hidden = false; }
  function logbookEl() {
    return [
      h('h3', null, 'LOGBOOK ' + logged.size + '/' + PROJ.length),
      h('ul', { class: 'ast-log' }, PROJ.map((p, i) => logged.has(i)
        ? h('li', null, h('b', null, p.n + ' '), p.title + ' · ' + p.metric, h('a', { href: p.href }, 'OPEN CASE STUDY →'))
        : h('li', { class: 'ast-unk' }, p.n + ' ??? not logged yet')))
    ];
  }
  const invEl = () => h('p', null, 'INVENTORY: ' + (inv && inv.length ? inv.join(' · ') : 'none yet, shoot rocks for skill capsules'));

  function showStart() {
    screen(
      h('h2', null, 'ASTEROIDS:', h('br'), 'PORTFOLIO EDITION'),
      h('p', null, 'Every rock is one of my projects. Shoot them to log the mission.'),
      h('p', { class: 'ast-keys' }, h('kbd', null, '← →'), '/', h('kbd', null, 'A D'), ' rotate · ', h('kbd', null, '↑'), '/', h('kbd', null, 'W'), ' thrust · ',
        h('kbd', null, 'SPACE'), ' fire · ', h('kbd', null, 'SHIFT'), ' hyperspace · ', h('kbd', null, 'P'), '/', h('kbd', null, 'ESC'), ' pause'),
      TOUCH ? h('p', { class: 'ast-keys' }, 'Touch: ', h('kbd', null, '◀ ▶'), ' rotate · ', h('kbd', null, '▲'), ' thrust · ', h('kbd', null, 'FIRE'), ' shoot') : null,
      h('p', { class: 'ast-keys' }, 'Capsules are skills (power-ups). Watch for the bass guitar.'),
      h('button', { type: 'button', class: 'ast-btn ast-pulse', onclick: start }, 'PRESS START / CLICK TO PLAY'));
  }
  function showPause() {
    const btn = h('button', { type: 'button', class: 'ast-btn', onclick: resume }, 'RESUME');
    screen(h('h2', null, 'PAUSED'), h('p', null, 'SCORE ' + score + ' · WAVE ' + wave), btn, logbookEl(), invEl(),
      h('p', { class: 'ast-keys' }, 'Press ', h('kbd', null, 'P'), ' or ', h('kbd', null, 'ESC'), ' to resume'));
  }
  function showOver() {
    const btn = h('button', { type: 'button', class: 'ast-btn', onclick: start }, 'PLAY AGAIN');
    const best = score > 0 && score >= hi;
    screen(h('h2', null, 'GAME OVER'), h('p', null, 'SCORE ' + score + ' · HI ' + hi + (best ? ' · NEW HIGH SCORE!' : '')),
      btn, logbookEl(), invEl());
    btn.focus({ preventScroll: true });
  }
  ov.addEventListener('click', e => { if (state === 'start' && e.target === ov) start(); });

  function saveHi() { try { localStorage.setItem(HI_KEY, String(hi)); } catch (_) {} }
  function clearKeys() { for (const k in keys) keys[k] = false; touchEl.querySelectorAll('.on').forEach(b => b.classList.remove('on')); }

  function start() {
    active = true;
    reset();
    state = 'play';
    ov.hidden = true;
    touchEl.hidden = !TOUCH;
    if (wrap.contains(document.activeElement)) document.activeElement.blur();
    spawnWave(1);
    loop();
  }
  function pause() {
    if (state !== 'play') return;
    state = 'pause';
    clearKeys(); saveHi();
    touchEl.hidden = true;
    showPause(); render(); updateHud();
  }
  function resume() {
    if (state !== 'pause') return;
    state = 'play'; active = true;
    ov.hidden = true;
    touchEl.hidden = !TOUCH;
    if (wrap.contains(document.activeElement)) document.activeElement.blur();
    loop();
  }
  function gameOver() {
    state = 'over';
    clearKeys(); saveHi();
    touchEl.hidden = true;
    render(); updateHud(); showOver();
  }

  // ---------- input ----------
  const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 't', KeyW: 't', Space: 'f', ShiftLeft: 'h', ShiftRight: 'h' };
  addEventListener('keydown', e => {
    if (!active) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state === 'play') { e.preventDefault(); pause(); } else if (state === 'pause') { e.preventDefault(); resume(); }
      return;
    }
    const k = KEYMAP[e.code];
    if (state !== 'play' || !k) return;
    e.preventDefault();
    if (k === 'h') hyperspace(); else keys[k] = true;
  });
  addEventListener('keyup', e => {
    const k = KEYMAP[e.code];
    if (!k) return;
    if (k !== 'h') keys[k] = false;
    if (active && state === 'play') e.preventDefault();
  });
  document.addEventListener('pointerdown', e => {
    if (wrap.contains(e.target)) { active = true; return; }
    active = false;
    pause();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('blur', () => { clearKeys(); pause(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { onscreen = es[es.length - 1].isIntersecting; if (!onscreen) pause(); }).observe(wrap);
  }

  // keep the backing store an integer multiple of the logical size
  function resize() {
    const k = Math.max(1, Math.ceil((wrap.clientWidth || W) * (window.devicePixelRatio || 1) / W));
    if (cv.width !== W * k) { cv.width = W * k; cv.height = H * k; }
    blit();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(wrap);
  else addEventListener('resize', resize);

  // ---------- boot: static attract frame behind the start screen ----------
  reset();
  rocks = PROJ.map((p, i) => {
    const a = i / PROJ.length * TAU + 0.4;
    return makeRock(i, 0, W / 2 + Math.cos(a) * 160, H / 2 + Math.sin(a) * 92);
  });
  render(); resize(); updateHud(); showStart();

  if (AUTO) {
    start();
    window.__ast = { get state() { return state; }, get score() { return score; }, sprites: { SHIP, BASS, NOTE, CAPS, SPR } };
  }
})();
