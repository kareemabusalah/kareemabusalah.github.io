// Plantogachi, mini edition. A browser port of the real app's game loop:
// formulas from backend/routers/readings.py and backend/game.py, sprites from
// frontend/components/plant-sprite.tsx. The sliders stand in for the ESP32 puck.

(() => {
const SPECIES = {  // watering_interval from backend/data/species_thresholds.json
  Monstera: {name: 'MONTY', latin: 'Monstera deliciosa', interval: 7},
  Cactus: {name: 'SPIKE', latin: 'Echinocactus grusonii', interval: 14},
  SnakePlant: {name: 'SLY', latin: 'Dracaena trifasciata', interval: 14},
};

const luxToSun = lux => lux <= 100 ? Math.max(0, Math.min(100, lux)) : Math.max(0, Math.min(100, lux / 40));

function comfortFromClimate(tempF, hum) {
  const t = Math.max(0, 100 - Math.abs(tempF - 75) * 3);
  const h = hum >= 40 && hum <= 70 ? 100 : Math.max(0, 100 - Math.abs(hum - 55) * 2);
  return t * 0.7 + h * 0.3;
}

function happiness(s) {
  const pen = s.thirst > 100 ? (s.thirst - 100) * 2 : 0;
  return Math.max(0, Math.min(100, (Math.min(s.thirst, 100) + s.sun + s.comfort) / 3 - pen));
}

function resolveMood(s, tempF, dead) {
  const hp = happiness(s);
  if (dead || hp < 10) return 'Dying';
  if (hp < 20) return 'Sad';
  if (s.thirst < 15) return 'Drooping';
  if (s.thirst < 40) return 'Thirsty';
  if (s.thirst > 100) return 'Sad';
  if (s.sun > 85) return 'Sunburnt';
  if (tempF < 60) return 'Cold';
  if (s.sun < 10) return 'Sleeping';
  if (s.thirst >= 60 && s.thirst <= 100 && s.sun > 40 && s.sun < 80 && s.comfort > 70) return 'Happy';
  return 'Idle';
}

// One game tick covering `minutes` of wall-clock time (game.py _tick_one_plant, minus the DB bits).
function tick(s, minutes, interval) {
  const drop = Math.min(100, 100 / (interval * 1440) * minutes);
  s.thirst = Math.max(0, s.thirst - drop);
  s.sun = Math.max(0, s.sun - drop);
  s.comfort = Math.max(0, s.comfort - drop * 0.6);
  const hp = happiness(s);
  if (hp > 70) {
    s.xp += 5;
    s.health = Math.min(100, s.health + 2);
    while (s.xp >= 100) { s.xp -= 100; s.level += 1; }
  } else if (hp < 10) {
    const drought = Math.max(2, interval);
    s.health = Math.max(0, s.health - 100 / (drought * 1440) * minutes);
  }
  if (s.health <= 0) s.dead = true;
  return s;
}

if (typeof module !== 'undefined') module.exports = {luxToSun, comfortFromClimate, happiness, resolveMood, tick};

// ---------------- sprites (plant-sprite.tsx, recoloured for a Game Boy LCD) ----------------
const R = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${f ? ` fill="${f}"` : ''}/>`;
const P = (d, f) => `<path d="${d}"${f ? ` fill="${f}"` : ''}/>`;
const POT = R(35, 80, 30, 15) + R(32, 75, 36, 5);
const BODY = {
  Cactus: POT + R(40, 25, 20, 50) + P('M25 40 h15 v10 h-15 z') + P('M25 30 h10 v10 h-10 z') + P('M60 50 h15 v10 h-15 z')
    + P('M65 40 h10 v10 h-10 z') + R(38, 35, 2, 2) + R(60, 45, 2, 2) + R(45, 65, 2, 2) + R(55, 30, 2, 2),
  SnakePlant: POT + P('M40 15 h20 v60 h-20 z') + P('M45 5 h10 v10 h-10 z') + P('M25 30 h12 v45 h-12 z') + P('M28 20 h6 v10 h-6 z')
    + P('M63 40 h12 v35 h-12 z') + P('M66 30 h6 v10 h-6 z'),
  Monstera: POT + R(48, 60, 4, 15) + P('M20 40 h20 v20 h-20 z') + P('M15 45 h5 v10 h-5 z') + P('M25 35 h10 v5 h-10 z')
    + P('M60 35 h20 v25 h-20 z') + P('M80 40 h5 v15 h-5 z') + P('M65 30 h10 v5 h-10 z') + P('M35 20 h30 v40 h-30 z')
    + P('M40 15 h20 v5 h-20 z') + P('M45 10 h10 v5 h-10 z'),
};
const TEAR = '#306230', SPARK = '#e0f8a0';
const FACE = {
  Happy: R(42, 38, 4, 6) + R(54, 38, 4, 6) + R(42, 48, 2, 2) + R(44, 50, 12, 2) + R(56, 48, 2, 2),
  Thirsty: R(42, 42, 4, 2) + R(54, 42, 4, 2) + R(44, 50, 12, 2) + R(42, 52, 2, 2) + R(56, 52, 2, 2),
  Sunburnt: R(42, 40, 4, 2) + R(54, 40, 4, 2) + R(44, 48, 12, 4) + R(62, 34, 2, 4, TEAR),
  Cold: R(42, 38, 4, 6) + R(54, 38, 4, 6) + R(44, 48, 12, 2) + R(44, 52, 12, 2),
  Sad: R(42, 42, 4, 2) + R(54, 42, 4, 2) + R(44, 48, 12, 2) + R(42, 50, 2, 2) + R(56, 50, 2, 2) + R(42, 46, 2, 4, TEAR),
  Dying: P('M42 38 h2 v2 h-2 z M44 40 h2 v2 h-2 z M42 42 h2 v2 h-2 z M46 38 h2 v2 h-2 z M46 42 h2 v2 h-2 z')
    + P('M54 38 h2 v2 h-2 z M56 40 h2 v2 h-2 z M54 42 h2 v2 h-2 z M58 38 h2 v2 h-2 z M58 42 h2 v2 h-2 z') + R(44, 48, 12, 6),
  Sleeping: R(42, 42, 6, 2) + R(52, 42, 6, 2) + `<g class="blink">${P('M65 25 h6 v2 h-4 l4 -4 h-6 z')}${P('M75 15 h4 v2 h-2 l2 -2 h-4 z')}</g>`,
  Idle: R(42, 40, 4, 4) + R(54, 40, 4, 4) + R(46, 50, 8, 2),
};
FACE.Drooping = FACE.Thirsty;
FACE.Sparkling = FACE.Happy + `<g class="blink" fill="${SPARK}">${R(25, 20, 4, 4)}${R(75, 30, 4, 4)}${R(30, 60, 4, 4)}</g>`;

// ---------------- the toy ----------------
if (typeof document !== 'undefined' && document.getElementById('tama')) {
  const $ = id => document.getElementById(id);
  let species = 'Monstera', s, hours = 0, sparkleUntil = 0, timer = null;

  const reading = () => {  // a fresh puck reading resets the stats, like readings.py
    s.thirst = +$('tm').value;
    s.sun = luxToSun(+$('tl').value);
    s.comfort = comfortFromClimate(+$('tt').value, +$('th').value);
  };
  const fresh = () => { s = {thirst: 0, sun: 0, comfort: 0, health: 100, xp: 0, level: 1, dead: false}; hours = 0; reading(); };

  function draw() {
    const mood = Date.now() < sparkleUntil && !s.dead ? 'Sparkling' : resolveMood(s, +$('tt').value, s.dead);
    $('tsvg').innerHTML = `<g fill="#0f380f">${BODY[species]}</g><g fill="#9bbc0f">${FACE[mood]}</g>`;
    $('tname').textContent = SPECIES[species].name;
    $('tlatin').textContent = SPECIES[species].latin;
    $('tlv').textContent = s.level;
    $('txp').style.width = s.xp + '%';
    $('tmood').textContent = mood.toUpperCase();
    $('tday').textContent = `DAY ${Math.floor(hours / 24) + 1} ${String(hours % 24).padStart(2, '0')}:00`;
    const bars = {moist: s.thirst, sun: s.sun, comf: s.comfort, happy: happiness(s), hp: s.health};
    for (const k in bars) { $('b_' + k).style.width = Math.min(100, bars[k]) + '%'; $('v_' + k).textContent = Math.round(bars[k]); }
    $('tm_v').value = $('tm').value; $('tl_v').value = $('tl').value; $('tt_v').value = $('tt').value; $('th_v').value = $('th').value;
    $('tdead').hidden = !s.dead;
  }
  const step = n => { for (let i = 0; i < n && !s.dead; i++) { tick(s, 60, SPECIES[species].interval); hours++; } draw(); };

  ['tm', 'tl', 'tt', 'th'].forEach(id => $(id).oninput = () => { if (!s.dead) { reading(); draw(); } });
  document.querySelectorAll('[data-species]').forEach(b => b.onclick = () => {
    species = b.dataset.species;
    document.querySelectorAll('[data-species]').forEach(x => x.setAttribute('aria-pressed', x === b));
    fresh(); draw();
  });
  $('tpet').onclick = () => { sparkleUntil = Date.now() + 2000; draw(); setTimeout(draw, 2050); };
  $('twater').onclick = () => { $('tm').value = 90; if (!s.dead) reading(); draw(); };
  $('tday1').onclick = () => step(24);
  $('tplay').onclick = () => {
    if (timer) { clearInterval(timer); timer = null; $('tplay').textContent = '▶ RUN'; return; }
    timer = setInterval(() => step(1), 400); $('tplay').textContent = '❚❚ PAUSE';
  };
  $('tnew').onclick = () => { fresh(); draw(); };
  fresh(); draw();
}
})();
