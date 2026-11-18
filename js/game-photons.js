/* =====================================================================
   FRSM 2.0.8 — Minigame: "Photon hunter"
   You are a semiconductor. Tap only the photons with enough energy to lift
   an electron across the band gap (hν ≥ Eg  ⇔  λ ≤ 1240/Eg nm) and let the
   others pass through. The material changes every stage.
   ===================================================================== */
(function () {
   'use strict';
   var $ = function (id) { return document.getElementById(id); };
   var cv = $('ph-canvas');
   if (!cv || !cv.getContext) return;
   var ctx = cv.getContext('2d');
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function fmt(x, d) { var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
   function getBest() { try { return +localStorage.getItem('frsm-game-photons') || 0; } catch (e) { return 0; } }
   function setBest(v) { try { localStorage.setItem('frsm-game-photons', v); } catch (e) { } }

   var HC = 1239.84;
   var MATS = [
      { f: 'ZnO', eg: 3.37 }, { f: 'TiO₂', eg: 3.2, n: { en: 'anatase', es: 'anatasa' } }, { f: 'CdS', eg: 2.42 },
      { f: 'α-Fe₂O₃', eg: 2.1 }, { f: 'CdSe', eg: 1.74 }, { f: 'GaAs', eg: 1.42 }, { f: 'Si', eg: 1.12, n: { en: 'indirect gap', es: 'brecha indirecta' } }
   ];
   var STAGES = 4, STAGE_T = 15, LIVES = 5;

   /* wavelength (nm) → colour */
   function rgb(l) {
      if (l < 380) return '#9b6cff';
      if (l > 780) return '#a8322d';
      var r = 0, g = 0, b = 0;
      if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = -(l - 510) / 20; }
      else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else { r = 1; }
      var f = l < 420 ? .45 + .55 * (l - 380) / 40 : l > 700 ? .45 + .55 * (780 - l) / 80 : 1;
      function c(v) { return Math.round(255 * Math.pow(v * f, .8)); }
      return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
   }

   var W = 0, H = 0, dpr = 1, st = null, raf = 0, last = 0;
   function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!st || !st.running) drawIdle();
   }

   function newGame() {
      st = { score: 0, lives: LIVES, stage: 0, t: 0, mats: shuffle(MATS.slice()).slice(0, STAGES), ph: [], fx: [], spawn: 0, combo: 0, running: true, banner: 0 };
      st.mats.sort(function (a, b) { return b.eg - a.eg; });   // wide gap first: easier
      $('ph-start').hidden = true; $('ph-over').hidden = true;
      startStage(0);
      last = performance.now();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
   }
   function startStage(i) {
      st.stage = i; st.t = 0; st.ph = []; st.banner = 1.8;
      st.mat = st.mats[i]; st.cut = HC / st.mat.eg;
      top();
   }
   function top() {
      if (!st) return;
      var m = st.mat;
      $('ph-mat').textContent = m.f + (m.n ? ' (' + T(m.n.en, m.n.es) + ')' : '');
      $('ph-rule').innerHTML = 'E<sub>g</sub> = <b>' + fmt(m.eg, 2) + ' eV</b> → ' + T('absorbs if', 'absorbe si') + ' λ ≤ <b>' + fmt(st.cut, 0) + ' nm</b>';
      hud();
   }
   function hud() {
      $('ph-score').textContent = st ? st.score : 0;
      $('ph-lives').textContent = st ? '♥'.repeat(Math.max(0, st.lives)) + '♡'.repeat(Math.max(0, LIVES - st.lives)) : '♥♥♥♥♥';
      $('ph-stage').textContent = st ? (st.stage + 1) + ' / ' + STAGES : '—';
      $('ph-best').textContent = getBest() || '—';
   }

   function spawn() {
      var lo = Math.max(200, st.cut * 0.55), hi = Math.min(1600, st.cut * 1.6);
      /* half of the photons above the gap, half below, so both choices matter */
      var l = Math.random() < 0.5 ? lo + Math.random() * (st.cut - 8 - lo) : st.cut + 8 + Math.random() * (hi - st.cut - 8);
      var r = W < 500 ? 21 : 24, speed = (H / 6.2) * (1 + 0.18 * st.stage + 0.02 * st.t);
      st.ph.push({ x: r + 6 + Math.random() * (W - 2 * r - 12), y: -r, r: r, l: l, v: speed * (0.85 + Math.random() * 0.3), abs: l <= st.cut, w: Math.random() * 6 });
   }
   function pop(x, y, txt, col) { st.fx.push({ x: x, y: y, txt: txt, col: col, t: 0 }); }

   function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (st.running) step(dt);
      draw();
      if (st.running || st.fx.length) raf = requestAnimationFrame(loop);
   }
   function step(dt) {
      if (st.banner > 0) { st.banner -= dt; return; }
      st.t += dt;
      st.spawn -= dt;
      if (st.spawn <= 0) { spawn(); st.spawn = Math.max(0.42, 0.95 - 0.12 * st.stage - 0.01 * st.t); }
      var floor = H - 34;
      for (var i = st.ph.length - 1; i >= 0; i--) {
         var p = st.ph[i]; p.y += p.v * dt; p.w += dt * 8;
         if (p.y - p.r > floor) {
            st.ph.splice(i, 1);
            if (p.abs) { st.lives--; st.combo = 0; pop(p.x, floor - 10, T('missed!', '¡se escapó!'), '#e0605a'); }
            else { st.score += 2; pop(p.x, floor - 10, T('passes', 'pasa') + ' +2', '#8a908e'); }
            hud();
         }
      }
      for (i = st.fx.length - 1; i >= 0; i--) { st.fx[i].t += dt; if (st.fx[i].t > 0.9) st.fx.splice(i, 1); }
      if (st.lives <= 0) return end(false);
      if (st.t >= STAGE_T) { if (st.stage + 1 >= STAGES) return end(true); st.score += 25; startStage(st.stage + 1); }
      $('ph-time').textContent = Math.max(0, Math.ceil(STAGE_T - st.t)) + ' s';
   }

   function draw() {
      ctx.clearRect(0, 0, W, H);
      /* background: faint energy grid */
      ctx.fillStyle = '#141b19'; ctx.fillRect(0, 0, W, H);
      /* semiconductor slab */
      var floor = H - 34;
      var grd = ctx.createLinearGradient(0, floor, 0, H);
      grd.addColorStop(0, '#3b4a46'); grd.addColorStop(1, '#252f2d');
      ctx.fillStyle = grd; ctx.fillRect(0, floor, W, H - floor);
      ctx.fillStyle = '#f5c729'; ctx.fillRect(0, floor, W, 2);
      ctx.font = '600 13px Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#dfe5e3';
      if (st) ctx.fillText(st.mat.f + '  ·  Eg = ' + fmt(st.mat.eg, 2) + ' eV  ·  λ ≤ ' + fmt(st.cut, 0) + ' nm', W / 2, floor + 18);
      if (!st) return;
      /* photons: a small wave packet with its wavelength */
      st.ph.forEach(function (p) {
         var col = rgb(p.l);
         ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
         ctx.beginPath();
         for (var k = 0; k <= 30; k++) { var yy = p.y - p.r - 4 - k * 1.6, xx = p.x + Math.sin(k * (8 / (p.l / 100)) * 0.35 + p.w) * 5; if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
         ctx.stroke(); ctx.globalAlpha = 1;
         ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
         ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
         ctx.fillStyle = p.l > 480 && p.l < 640 ? '#1b1b1b' : '#fff';
         ctx.font = '700 ' + (p.r > 22 ? 12 : 11) + 'px Poppins, sans-serif';
         ctx.fillText(Math.round(p.l), p.x, p.y - 4);
         ctx.font = '500 9px Poppins, sans-serif';
         ctx.fillText(p.l < 380 ? 'nm UV' : p.l > 780 ? 'nm IR' : 'nm', p.x, p.y + 8);
      });
      st.fx.forEach(function (f) {
         ctx.globalAlpha = Math.max(0, 1 - f.t / 0.9);
         ctx.fillStyle = f.col; ctx.font = '700 15px Poppins, sans-serif';
         ctx.fillText(f.txt, f.x, f.y - f.t * 40);
         ctx.globalAlpha = 1;
      });
      if (st.running && st.banner > 0) {
         ctx.fillStyle = 'rgba(20,27,25,.82)'; ctx.fillRect(0, H / 2 - 52, W, 104);
         ctx.fillStyle = '#f5c729'; ctx.font = '700 22px Poppins, sans-serif';
         ctx.fillText(T('Stage', 'Etapa') + ' ' + (st.stage + 1) + ': ' + st.mat.f, W / 2, H / 2 - 16);
         ctx.fillStyle = '#fff'; ctx.font = '500 15px Poppins, sans-serif';
         ctx.fillText(T('Catch photons with λ ≤ ', 'Atrapa los fotones con λ ≤ ') + fmt(st.cut, 0) + ' nm', W / 2, H / 2 + 18);
      }
   }
   function drawIdle() { var keep = st; st = null; draw(); st = keep; if (st) draw(); }

   function hit(ev) {
      if (!st || !st.running || st.banner > 0) return;
      var r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, best = -1, bd = 1e9;
      st.ph.forEach(function (p, i) { var d = Math.hypot(p.x - x, p.y - y); if (d < p.r + 14 && d < bd) { bd = d; best = i; } });
      if (best < 0) return;
      var p = st.ph.splice(best, 1)[0], E = HC / p.l;
      if (p.abs) {
         st.combo++; var pts = 10 + Math.min(20, 2 * (st.combo - 1)); st.score += pts;
         pop(p.x, p.y, '+' + pts + '  ' + fmt(E, 2) + ' eV', '#f5c729');
      } else {
         st.lives--; st.combo = 0;
         pop(p.x, p.y, fmt(E, 2) + ' eV < Eg', '#e0605a');
      }
      hud();
      if (st.lives <= 0) end(false);
   }
   function end(won) {
      st.running = false;
      if (won) st.score += st.lives * 20;
      st.rec = st.score > getBest(); if (st.rec) setBest(st.score);
      st.won = won;
      hud(); overText();
      $('ph-over').hidden = false;
      $('ph-again').focus({ preventScroll: true });
   }
   function overText() {
      $('ph-over-title').textContent = st.rec ? T('New record!', '¡Nuevo récord!') : st.won ? T('You made it!', '¡Lo lograste!') : T('Out of lives', 'Sin vidas');
      $('ph-over-score').textContent = st.score;
      $('ph-over-msg').textContent = st.won ? T('Bonus for remaining lives included. A semiconductor only absorbs photons with hν ≥ Eg: that is why ZnO looks white and CdSe looks dark red.', 'Incluye el bono por vidas restantes. Un semiconductor solo absorbe fotones con hν ≥ Eg: por eso el ZnO se ve blanco y el CdSe, rojo oscuro.')
         : T('Remember: shorter wavelength = more energy. Photons with λ larger than 1240/Eg go straight through.', 'Recuerda: menor longitud de onda = más energía. Los fotones con λ mayor que 1240/Eg atraviesan el material.');
   }

   cv.addEventListener('pointerdown', function (e) { e.preventDefault(); hit(e); });
   $('ph-go').addEventListener('click', newGame);
   $('ph-again').addEventListener('click', newGame);
   document.addEventListener('visibilitychange', function () {
      if (!st || !st.running) return;
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { last = performance.now(); raf = requestAnimationFrame(loop); }
   });
   var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(size, 120); });
   if (window.frsmI18n) window.frsmI18n.onChange(function () { top(); hud(); if (st && !$('ph-over').hidden) overText(); if (!st || !st.running) drawIdle(); });
   size(); hud();
})();
