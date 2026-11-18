/* =====================================================================
   FRSM 2.0.8 — Minigame: "Bragg target"
   Each round gives a real reflection (material, hkl, d) and an X-ray tube.
   Move the detector to the angle 2θ where the peak appears
   (nλ = 2d sinθ, n = 1). The closer, the more points.
   Needs: structures-data.js, xrd-engine.js
   ===================================================================== */
(function () {
   'use strict';
   var DATA = window.FRSM_STRUCTURES, X = window.FRSM_XRD;
   var $ = function (id) { return document.getElementById(id); };
   if (!DATA || !X || !$('bt-svg')) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function L(o) { return o ? T(o.en, o.es) : ''; }
   function fmt(x, d) { var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   function num(s) { return parseFloat(String(s).replace(',', '.')); }
   function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
   function getBest() { try { return +localStorage.getItem('frsm-game-bragg') || 0; } catch (e) { return 0; } }
   function setBest(v) { try { localStorage.setItem('frsm-game-bragg', v); } catch (e) { } }
   var RAD = Math.PI / 180, ROUNDS = 8, MIN = 5, MAX = 160;
   var TUBES = [{ n: 'Cu Kα', l: 1.5406 }, { n: 'Co Kα', l: 1.7890 }, { n: 'Mo Kα', l: 0.7107 }];
   var KEYS = Object.keys(DATA), st = {};

   function makeRound(i) {
      var tube = i < 3 ? TUBES[0] : pick(i < 6 ? TUBES.slice(0, 2) : TUBES);
      for (var tries = 0; tries < 30; tries++) {
         var k = pick(KEYS);
         var r = X.simulate(DATA[k], { lambda: tube.l, D: 40, min: 12, max: 150, step: 0.5 });
         var pk = r.peaks.filter(function (p) { return p.tth > 15 && p.tth < 145; }).sort(function (a, b) { return b.rel - a.rel; }).slice(0, 6);
         if (pk.length) { var p = pick(pk); return { key: k, tube: tube, d: p.d, hkl: p.hkl[0], tth: p.tth }; }
      }
   }
   function newGame() {
      st = { round: 0, score: 0, ang: 60 };
      $('bt-over').hidden = true;
      next();
   }
   function next() {
      st.round++; st.q = makeRound(st.round - 1); st.done = false; st.hint = false; st.pts = 0;
      $('bt-feedback').hidden = true; $('bt-next').hidden = true; $('bt-shoot').disabled = false; $('bt-hint').disabled = false;
      setAng(st.ang);
      render();
   }
   function hud() {
      $('bt-round').textContent = Math.min(st.round, ROUNDS) + ' / ' + ROUNDS;
      $('bt-score').textContent = st.score;
      $('bt-last').textContent = st.done ? '+' + st.pts : '—';
      $('bt-best').textContent = getBest() || '—';
   }
   function render() {
      hud();
      var q = st.q, d = DATA[q.key];
      $('bt-plane').innerHTML = d.formula + ' (' + q.hkl.join('') + ')';
      $('bt-name').textContent = L(d.name);
      $('bt-d').textContent = fmt(q.d, 4) + ' Å';
      $('bt-tube').textContent = q.tube.n;
      $('bt-lambda').textContent = fmt(q.tube.l, 4) + ' Å';
      $('bt-hint-row').hidden = !st.hint && !st.done;
      $('bt-sin').textContent = fmt(q.tube.l / (2 * q.d), 4);
      draw();
      if (st.done) feedback();
   }
   function setAng(a) {
      st.ang = Math.max(MIN, Math.min(MAX, Math.round(a * 100) / 100));
      var inp = $('bt-angle');
      if (document.activeElement !== inp) inp.value = fmt(st.ang, 2);
      draw();
   }
   function draw() {
      var svg = $('bt-svg'), W = 520, H = 320, cx = 270, cy = 280, R = 215;
      var P = function (deg, rr) { return [cx + rr * Math.cos(deg * RAD), cy - rr * Math.sin(deg * RAD)]; };
      var g = '';
      /* detector circle */
      var a0 = P(0, R), a1 = P(MAX, R);
      g += '<path class="bt-arc" d="M' + a0[0] + ' ' + a0[1] + ' A' + R + ' ' + R + ' 0 0 0 ' + a1[0].toFixed(1) + ' ' + a1[1].toFixed(1) + '"/>';
      for (var t = 0; t <= 150; t += 30) { var q1 = P(t, R + 18); g += '<text class="bt-deg" x="' + q1[0].toFixed(1) + '" y="' + (q1[1] + 4).toFixed(1) + '" text-anchor="middle">' + t + '°</text>'; }
      /* tube, incident and direct beam */
      g += '<rect class="bt-src" x="18" y="' + (cy - 12) + '" width="34" height="24" rx="4"/><text class="bt-deg" x="35" y="' + (cy + 30) + '" text-anchor="middle">' + (st.q ? st.q.tube.n : '') + '</text>';
      g += '<line class="bt-beam" x1="52" y1="' + cy + '" x2="' + cx + '" y2="' + cy + '"/>';
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + R - 10) + '" y2="' + cy + '" stroke="rgba(240,138,60,.25)" stroke-width="2" stroke-dasharray="3 5"/>';
      /* sample (rotates by θ, as in a θ–2θ scan) with its lattice planes */
      var th = st.ang / 2;
      g += '<g transform="rotate(' + (-th).toFixed(2) + ' ' + cx + ' ' + cy + ')"><rect class="bt-sample" x="' + (cx - 34) + '" y="' + cy + '" width="68" height="16" rx="2"/>';
      for (var k = 1; k <= 3; k++) g += '<line x1="' + (cx - 30) + '" x2="' + (cx + 30) + '" y1="' + (cy + 4 * k) + '" y2="' + (cy + 4 * k) + '" stroke="#2c5566" stroke-width="1"/>';
      g += '</g>';
      /* true peak after answering */
      if (st.done) { var tp = P(st.q.tth, R); g += '<line class="bt-true" x1="' + cx + '" y1="' + cy + '" x2="' + tp[0].toFixed(1) + '" y2="' + tp[1].toFixed(1) + '"/><circle cx="' + tp[0].toFixed(1) + '" cy="' + tp[1].toFixed(1) + '" r="9" fill="#3fbf7f"/>'; }
      /* diffracted direction + detector */
      var dp = P(st.ang, R);
      g += '<line class="bt-out" x1="' + cx + '" y1="' + cy + '" x2="' + dp[0].toFixed(1) + '" y2="' + dp[1].toFixed(1) + '"/>';
      g += '<g transform="translate(' + dp[0].toFixed(1) + ' ' + dp[1].toFixed(1) + ') rotate(' + (-st.ang).toFixed(2) + ')"><rect class="bt-det" x="-6" y="-13" width="22" height="26" rx="4"/></g>';
      /* angle labels */
      var lab = P(st.ang / 2, 70);
      g += '<path d="M' + (cx + 50) + ' ' + cy + ' A50 50 0 0 0 ' + P(st.ang, 50)[0].toFixed(1) + ' ' + P(st.ang, 50)[1].toFixed(1) + '" fill="none" stroke="#f5c729" stroke-width="1.5"/>';
      g += '<text class="g-lab" x="' + lab[0].toFixed(1) + '" y="' + (lab[1] + 4).toFixed(1) + '" text-anchor="middle">2θ</text>';
      svg.innerHTML = g;
   }
   function angFromEvent(e) {
      var svg = $('bt-svg'), r = svg.getBoundingClientRect(), s = 520 / r.width;
      var x = (e.clientX - r.left) * s, y = (e.clientY - r.top) * s;
      var a = Math.atan2(280 - y, x - 270) / RAD;
      if (a < -90) a += 360;
      return a;
   }
   var drag = false;
   $('bt-svg').addEventListener('pointerdown', function (e) { if (st.done) return; drag = true; this.setPointerCapture(e.pointerId); setAng(angFromEvent(e)); });
   $('bt-svg').addEventListener('pointermove', function (e) { if (drag && !st.done) setAng(angFromEvent(e)); });
   $('bt-svg').addEventListener('pointerup', function () { drag = false; });
   $('bt-angle').addEventListener('input', function () { var v = num(this.value); if (isFinite(v) && !st.done) setAng(v); });
   $('bt-angle').addEventListener('change', function () { this.value = fmt(st.ang, 2); });
   $('bt-angle').addEventListener('keydown', function (e) { if (e.key === 'Enter') shoot(); });
   document.querySelectorAll('[data-bt-step]').forEach(function (b) {
      b.addEventListener('click', function () { if (!st.done) { setAng(st.ang + num(b.getAttribute('data-bt-step'))); $('bt-angle').value = fmt(st.ang, 2); } });
   });

   function shoot() {
      if (st.done) return;
      var err = Math.abs(st.ang - st.q.tth);
      st.pts = err <= 0.15 ? 100 : Math.max(0, Math.round(100 * (1 - (err - 0.15) / 4)));
      if (st.hint) st.pts = Math.round(st.pts / 2);
      st.score += st.pts; st.done = true; st.err = err;
      $('bt-shoot').disabled = true; $('bt-hint').disabled = true;
      render();
      $('bt-next').hidden = false;
      $('bt-next').focus({ preventScroll: true });
   }
   function feedback() {
      var q = st.q, th = q.tth / 2, fb = $('bt-feedback'), good = st.err <= 0.5;
      fb.hidden = false; fb.className = 'game-feedback ' + (good ? 'ok' : 'bad');
      fb.innerHTML = '<b>' + (st.err <= 0.15 ? T('Bullseye!', '¡En el blanco!') : good ? T('Very close!', '¡Muy cerca!') : st.err <= 3 ? T('Close.', 'Cerca.') : T('Far away.', 'Lejos.')) + '</b> ' +
         T('The peak is at', 'El pico está en') + ' 2θ = <b>' + fmt(q.tth, 2) + '°</b> (' + T('you aimed at', 'apuntaste a') + ' ' + fmt(st.ang, 2) + '°, +' + st.pts + ' ' + T('pts', 'pts') + ').<br>' +
         'sin θ = λ / 2d = ' + fmt(q.tube.l, 4) + ' / (2 × ' + fmt(q.d, 4) + ') = ' + fmt(Math.sin(th * RAD), 4) + ' → θ = ' + fmt(th, 2) + '°';
      $('bt-next-label').textContent = st.round >= ROUNDS ? T('See result', 'Ver resultado') : T('Next reflection', 'Siguiente reflexión');
   }
   function finish() {
      st.rec = st.score > getBest(); if (st.rec) setBest(st.score);
      hud(); overText();
      $('bt-over').hidden = false;
      $('bt-again').focus({ preventScroll: true });
   }
   function overText() {
      $('bt-over-title').textContent = st.rec ? T('New record!', '¡Nuevo récord!') : T('Game over', 'Fin del juego');
      $('bt-over-score').textContent = st.score + ' / ' + ROUNDS * 100;
      $('bt-over-msg').textContent = st.score > 650 ? T('Your detector is perfectly aligned. Bragg would be proud.', 'Tu detector está perfectamente alineado. Bragg estaría orgulloso.')
         : T('Tip: compute θ = arcsin(λ / 2d) and double it. A shorter wavelength (Mo) moves every peak to lower angles.', 'Pista: calcula θ = arcsen(λ / 2d) y multiplícalo por 2. Una longitud de onda más corta (Mo) mueve todos los picos a ángulos más bajos.');
   }
   $('bt-shoot').addEventListener('click', shoot);
   $('bt-hint').addEventListener('click', function () { if (!st.done) { st.hint = true; this.disabled = true; render(); } });
   $('bt-next').addEventListener('click', function () { if (st.round >= ROUNDS) finish(); else next(); });
   $('bt-again').addEventListener('click', newGame);
   $('bt-restart').addEventListener('click', newGame);
   if (window.frsmI18n) window.frsmI18n.onChange(function () { $('bt-angle').value = fmt(st.ang, 2); render(); if (!$('bt-over').hidden) overText(); });
   newGame();
})();
