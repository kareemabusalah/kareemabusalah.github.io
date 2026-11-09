/* fx.js - vanilla effects layer inspired by React Bits (reactbits.dev). No deps, no build. */
(function () {
  'use strict';
  var mm = function (q) { return !!(window.matchMedia && matchMedia(q).matches); };
  var reduced = window.KAS_CALM != null ? window.KAS_CALM : mm('(prefers-reduced-motion: reduce)');  // the site's FX toggle wins
  var fine = true;  // touch laptops can report no fine pointer even with a touchpad; these effects only react to pointer movement anyway
  var GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&<>/*+';
  var rnd = function (s) { return s[(Math.random() * s.length) | 0]; };
  var css = function (v, d) {
    var s = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    return s || d;
  };
  var G = css('--g', '#39ff6a'), DIM = css('--dim', '#1f7a3a'), BG = css('--bg', '#050805');
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var hasIO = 'IntersectionObserver' in window;
  function fx(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn('fx ' + name + ':', e); } }

  // 1. Letter Glitch (React Bits <LetterGlitch>) - dim glyph field behind [data-glitch-bg]
  fx('glitch-bg', function () {
    if (reduced) return;
    $$('[data-glitch-bg]').forEach(function (host) {
      var cv = document.createElement('canvas'), cx = cv.getContext('2d');
      if (!cx) return;
      cv.className = 'fx-glitch-bg'; cv.setAttribute('aria-hidden', 'true');
      host.insertBefore(cv, host.firstChild);
      var C = 14, cols, rows, chars, hot = {}, dpr, onScreen = true, raf = 0, last = 0;
      function cell(i, a, col) {
        var x = (i % cols) * C, y = ((i / cols) | 0) * C;
        cx.clearRect(x, y, C, C);
        cx.globalAlpha = a; cx.fillStyle = col;
        cx.fillText(chars[i], x + C / 2, y + C / 2 + 1);
      }
      function size() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = host.clientWidth, h = host.clientHeight;
        cv.width = w * dpr; cv.height = h * dpr;
        cols = Math.ceil(w / C); rows = Math.ceil(h / C);
        chars = []; hot = {};
        for (var i = 0; i < cols * rows; i++) chars.push(rnd(GLYPHS));
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx.font = (C + 2) + 'px VT323, monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        for (i = 0; i < chars.length; i++) cell(i, 0.1, DIM);
      }
      function frame(t) {
        raf = 0;
        if (!onScreen || document.hidden) return;
        raf = requestAnimationFrame(frame);
        if (t - last < 50) return; // ~20 fps
        last = t;
        var n = Math.max(1, (chars.length * 0.012) | 0);
        while (n--) { var i = (Math.random() * chars.length) | 0; chars[i] = rnd(GLYPHS); hot[i] = 1; }
        for (var k in hot) {
          var b = hot[k] -= 0.12;
          if (b <= 0) { delete hot[k]; cell(+k, 0.1, DIM); } else cell(+k, 0.1 + 0.32 * b, G);
        }
      }
      var go = function () { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame); };
      size(); go();
      var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 150); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
      document.addEventListener('visibilitychange', go);
      if (hasIO) new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; go(); }).observe(host);
    });
  });

  // 2. Decrypted Text (React Bits <DecryptedText>) - scramble then reveal left to right
  fx('decrypt', function () {
    if (reduced) return;
    function run(el) {
      if (el._fxBusy) return;
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], orig = [], n;
      while ((n = w.nextNode())) { nodes.push(n); orig.push(n.nodeValue); }
      var total = orig.join('').length; if (!total) return;
      el._fxBusy = true;
      var t0 = performance.now(), done = false;
      function restore() { if (done) return; done = true; nodes.forEach(function (n, i) { n.nodeValue = orig[i]; }); el._fxBusy = false; }
      function step(t) {
        if (done) return;
        var reveal = ((t - t0) / 600) * total, k = 0;
        if (reveal >= total) return restore();
        nodes.forEach(function (n, i) {
          var s = orig[i], out = '';
          for (var j = 0; j < s.length; j++, k++) out += (k < reveal || /\s/.test(s[j])) ? s[j] : rnd(GLYPHS);
          n.nodeValue = out;
        });
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      setTimeout(restore, 1000); // fail-safe: never leave it scrambled (rAF pauses in hidden tabs)
    }
    $$('[data-decrypt]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { run(el); });
      if (el.getAttribute('data-decrypt') === 'load') run(el);
    });
  });

  // 3. Count Up (React Bits <CountUp>) - 0 -> data-to on first view, then exact original text
  fx('countup', function () {
    if (reduced || !hasIO) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, final = el.textContent, to = parseFloat(el.getAttribute('data-to'));
        if (isNaN(to)) return;
        var dec = ((el.getAttribute('data-to').split('.')[1]) || '').length, suf = el.getAttribute('data-suf') || '';
        var t0 = performance.now(), fmt = function (v) {
          return (/,/.test(final) ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)) + suf;
        };
        (function tick(t) {
          var p = Math.min(1, (t - t0) / 1200);
          if (p >= 1) { el.textContent = final; return; }
          el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
          requestAnimationFrame(tick);
        })(t0);
        setTimeout(function () { el.textContent = final; }, 1600);
      });
    }, { threshold: 0.4 });
    $$('[data-to]').forEach(function (el) { io.observe(el); });
  });

  // 4. Scroll Reveal (React Bits <AnimatedContent>/<ScrollReveal>) - stepped fade/slide up
  fx('reveal', function () {
    if (reduced || !hasIO) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var sib = Array.prototype.filter.call(e.target.parentNode.children, function (c) { return c.classList.contains('rv'); });
        e.target.style.setProperty('--fx-d', (sib.indexOf(e.target) % 6) * 80 + 'ms');
        e.target.classList.add('fx-in');
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(function (el) { el.classList.add('fx-rv'); io.observe(el); });
  });

  // 5. Spotlight Card + Tilted Card (React Bits <SpotlightCard>, <TiltedCard>)
  fx('cards', function () {
    if (!fine) return;
    $$('.card').forEach(function (el) {
      var r;
      el.classList.add('fx-card');
      el.addEventListener('pointerenter', function () { r = el.getBoundingClientRect(); el.classList.add('fx-hot'); });
      el.addEventListener('pointermove', function (e) {
        if (!r) return;
        var x = e.clientX - r.left, y = e.clientY - r.top, s = el.style;
        s.setProperty('--cx', x + 'px'); s.setProperty('--cy', y + 'px');
        if (reduced) return;
        s.setProperty('--ry', ((x / r.width - 0.5) * 16).toFixed(2) + 'deg');
        s.setProperty('--rx', ((0.5 - y / r.height) * 16).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        r = null; el.classList.remove('fx-hot');
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  });

  // 6. Magnet (React Bits <Magnet>) - pull toward cursor within 60px, max 8px
  fx('magnet', function () {
    if (!fine || reduced) return;
    var els = $$('[data-magnet]'); if (!els.length) return;
    var rects = null, px = 0, py = 0, raf = 0;
    els.forEach(function (el) { el.classList.add('fx-mag'); el._fx = [0, 0]; });
    var stale = function () { rects = null; };
    addEventListener('scroll', stale, { passive: true }); addEventListener('resize', stale);
    function apply() {
      raf = 0;
      if (!rects) rects = els.map(function (el) { // measure once, minus current pull
        var b = el.getBoundingClientRect();
        return { l: b.left - el._fx[0], t: b.top - el._fx[1], w: b.width, h: b.height };
      });
      els.forEach(function (el, i) {
        var b = rects[i], dx = px - (b.l + b.w / 2), dy = py - (b.t + b.h / 2), ox = 0, oy = 0;
        if (Math.abs(dx) < b.w / 2 + 60 && Math.abs(dy) < b.h / 2 + 60) {
          ox = dx * 0.2; oy = dy * 0.2;
          var m = Math.hypot(ox, oy); if (m > 8) { ox *= 8 / m; oy *= 8 / m; }
        }
        if (ox !== el._fx[0] || oy !== el._fx[1]) {
          el._fx = [ox, oy];
          el.style.setProperty('--mx', ox.toFixed(1) + 'px'); el.style.setProperty('--my', oy.toFixed(1) + 'px');
        }
      });
    }
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  });

  // ponytail: page-transition cover removed, it delayed every load and click

  // 11. Konami code -> 1UP toast + green flicker
  fx('konami', function () {
    var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], at = 0, toast, tm;
    function close() {
      clearTimeout(tm);
      document.documentElement.classList.remove('fx-flicker');
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
      toast = null;
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toast) return close();
      var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      at = k === seq[at] ? at + 1 : (k === seq[0] ? 1 : 0);
      if (at < seq.length) return;
      at = 0; close();
      toast = document.createElement('div');
      toast.className = 'fx-1up'; toast.setAttribute('role', 'status'); toast.textContent = '1UP!';
      document.body.appendChild(toast);
      document.documentElement.classList.add('fx-flicker');
      tm = setTimeout(close, 2000);
    });
  });
})();
