/* =====================================================================
   FRSM 2.0.8 — Minigame: "Which phase is it?"
   A simulated powder XRD pattern (Cu Kα) of one of the lab structures is
   shown; the player picks the right phase among four options.
   Needs: structures-data.js, xrd-engine.js
   ===================================================================== */
(function () {
   'use strict';
   var DATA = window.FRSM_STRUCTURES, X = window.FRSM_XRD;
   var $ = function (id) { return document.getElementById(id); };
   if (!DATA || !X || !$('gd-plot')) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function L(o) { return o ? T(o.en, o.es) : ''; }
   function fmt(x, d) { var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
   function getBest() { try { return +localStorage.getItem('frsm-game-drx') || 0; } catch (e) { return 0; } }
   function setBest(v) { try { localStorage.setItem('frsm-game-drx', v); } catch (e) { } }

   var KEYS = Object.keys(DATA), ROUNDS = 10, cache = {};
   function pattern(k) {
      return cache[k] || (cache[k] = X.simulate(DATA[k], { lambda: 1.5406, D: 40, min: 10, max: 80, inst: 0.05, B: 0.5, step: 0.04 }));
   }
   var st = {};

   function newGame() {
      st = { round: 0, score: 0, streak: 0, order: shuffle(KEYS.slice()).concat(shuffle(KEYS.slice())).slice(0, ROUNDS), hint: false, done: false };
      $('gd-over').hidden = true;
      nextRound();
   }
   function nextRound() {
      st.round++; st.hint = false; st.done = false;
      st.key = st.order[st.round - 1];
      var others = shuffle(KEYS.filter(function (k) { return k !== st.key; })).slice(0, 3);
      st.opts = shuffle(others.concat([st.key]));
      $('gd-feedback').hidden = true;
      $('gd-next').hidden = true;
      $('gd-hint').disabled = false;
      $('gd-hint-text').hidden = true;
      render();
   }
   function hud() {
      $('gd-round').textContent = Math.min(st.round, ROUNDS) + ' / ' + ROUNDS;
      $('gd-score').textContent = st.score;
      $('gd-streak').textContent = st.streak ? '×' + st.streak : '—';
      $('gd-best').textContent = getBest() || '—';
   }
   function render() {
      hud();
      draw(st.done);
      var h = '';
      st.opts.forEach(function (k) {
         var cls = '';
         if (st.done) cls = k === st.key ? ' ok' : (k === st.pick ? ' bad' : '');
         h += '<button type="button" class="game-opt' + cls + '" data-k="' + k + '"' + (st.done ? ' disabled' : '') + '>' + DATA[k].formula + '<small>' + L(DATA[k].name) + '</small></button>';
      });
      $('gd-opts').innerHTML = h;
      if (st.hint) { $('gd-hint-text').hidden = false; $('gd-hint-text').innerHTML = '<i class="fa fa-lightbulb-o" aria-hidden="true"></i> ' + T('Hint', 'Pista') + ': ' + L(DATA[st.key].type) + ' · ' + DATA[st.key].sg; }
      if (st.done) feedback();
   }
   function draw(labels) {
      var svg = $('gd-plot'), narrow = (svg.parentNode.clientWidth || 800) < 560;
      var W = narrow ? 480 : 860, H = narrow ? 300 : 300, PL = narrow ? 14 : 20, PR = 14, PT = 26, PB = 40;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var r = pattern(st.key), t0 = 10, t1 = 80;
      var Xp = function (t) { return PL + (t - t0) / (t1 - t0) * (W - PL - PR); }, Yp = function (y) { return H - PB - y / 100 * (H - PT - PB); };
      var g = '', t;
      for (t = 10; t <= 80; t += 10) g += '<line class="g-grid" x1="' + Xp(t) + '" x2="' + Xp(t) + '" y1="' + PT + '" y2="' + (H - PB) + '"/><text class="g-tick" x="' + Xp(t) + '" y="' + (H - PB + 17) + '" text-anchor="middle">' + t + '</text>';
      g += '<line class="g-axis" x1="' + PL + '" x2="' + (W - PR) + '" y1="' + (H - PB) + '" y2="' + (H - PB) + '"/>';
      var p = '';
      r.profile.forEach(function (q, i) { p += (i ? 'L' : 'M') + Xp(q[0]).toFixed(1) + ' ' + Yp(q[1]).toFixed(1); });
      g += '<path class="g-fill" d="' + p + 'L' + Xp(t1) + ' ' + Yp(0) + 'L' + Xp(t0) + ' ' + Yp(0) + 'Z"/><path class="g-curve" d="' + p + '"/>';
      /* label the strongest peaks: 2θ while playing, hkl after answering */
      var top = r.peaks.slice().sort(function (a, b) { return b.rel - a.rel; }).slice(0, narrow ? 3 : 4);
      top.forEach(function (pk) {
         var txt = labels ? '(' + pk.hkl[0].join('') + ')' : fmt(pk.tth, 1) + '°';
         var yy = Math.max(PT - 6, Yp(Math.min(100, pk.rel * 1.0)) - 8);
         g += '<text class="g-peak" x="' + Xp(pk.tth) + '" y="' + Math.max(14, yy) + '" text-anchor="middle">' + txt + '</text>';
      });
      g += '<text class="g-lab" x="' + (W - PR) + '" y="' + (H - 4) + '" text-anchor="end">2θ (°) · Cu Kα</text>';
      svg.innerHTML = g;
   }
   function feedback() {
      var ok = st.pick === st.key, d = DATA[st.key], r = pattern(st.key);
      var top = r.peaks.slice().sort(function (a, b) { return b.rel - a.rel; })[0];
      var fb = $('gd-feedback');
      fb.hidden = false;
      fb.className = 'game-feedback ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '<b>' + T('Correct!', '¡Correcto!') + '</b> ' : '<b>' + T('Not quite.', 'No es esa.') + '</b> ' + T('It was', 'Era') + ' ' + d.formula + '. ') +
         L(d.name) + ' — ' + L(d.type) + ' (' + d.sg + '). ' +
         T('Its strongest peak is', 'Su pico más intenso es') + ' (' + top.hkl[0].join('') + ') ' + T('at', 'en') + ' 2θ = ' + fmt(top.tth, 2) + '°, d = ' + fmt(top.d, 3) + ' Å.';
      $('gd-next').hidden = false;
      $('gd-next-label').textContent = st.round >= ROUNDS ? T('See result', 'Ver resultado') : T('Next pattern', 'Siguiente difractograma');
   }
   function answer(k) {
      if (st.done) return;
      st.done = true; st.pick = k;
      if (k === st.key) { st.streak++; st.score += (st.hint ? 50 : 100) + 10 * (st.streak - 1); }
      else st.streak = 0;
      $('gd-hint').disabled = true;
      render();
      $('gd-next').focus({ preventScroll: true });
   }
   function finish() {
      st.rec = st.score > getBest();
      if (st.rec) setBest(st.score);
      hud(); overText();
      $('gd-over').hidden = false;
      $('gd-again').focus({ preventScroll: true });
   }
   function overText() {
      var rec = st.rec, max = ROUNDS * 100 + 10 * (ROUNDS * (ROUNDS - 1) / 2);
      $('gd-over-title').textContent = rec ?T('New record!', '¡Nuevo récord!') : T('Game over', 'Fin del juego');
      $('gd-over-score').textContent = st.score;
      var pct = st.score / max;
      $('gd-over-msg').textContent = pct > .8 ? T('You read diffraction patterns like a crystallographer.', 'Lees difractogramas como un cristalógrafo.')
         : pct > .45 ? T('Good eye! Look at the position of the first peaks: they come from the largest d-spacings.', '¡Buen ojo! Fíjate en la posición de los primeros picos: vienen de las distancias d más grandes.')
            : T('Tip: few, sharp, widely spaced peaks mean a small, highly symmetric cell (like Ag); many peaks mean a large or low-symmetry cell.', 'Pista: pocos picos y muy separados indican una celda pequeña y muy simétrica (como la Ag); muchos picos, una celda grande o de baja simetría.');
   }
   $('gd-opts').addEventListener('click', function (e) { var b = e.target.closest('.game-opt'); if (b) answer(b.getAttribute('data-k')); });
   $('gd-hint').addEventListener('click', function () { if (!st.done) { st.hint = true; $('gd-hint').disabled = true; render(); } });
   $('gd-next').addEventListener('click', function () { if (st.round >= ROUNDS) finish(); else nextRound(); });
   $('gd-again').addEventListener('click', newGame);
   $('gd-restart').addEventListener('click', newGame);
   var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { draw(st.done); }, 150); });
   if (window.frsmI18n) window.frsmI18n.onChange(function () { render(); if (!$('gd-over').hidden) overText(); });
   newGame();
})();
