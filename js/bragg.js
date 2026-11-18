/* =====================================================================
   FRSM 2.0.7 — Bragg's law simulator (didactic)
   Path difference Δ = 2 d sinθ ; constructive when Δ = n λ
   N planes: I(θ) = sin²(Nφ/2) / (N² sin²(φ/2)),  φ = 2π Δ / λ
   ===================================================================== */
(function () {
   'use strict';
   var $ = function (id) { return document.getElementById(id); };
   var scene = $('bg-scene'), waves = $('bg-waves'), curve = $('bg-curve');
   if (!scene) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function fmt(x, d) { if (!isFinite(x)) return '—'; var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   var RAD = Math.PI / 180, phase = 0, playing = true, last = 0;

   function P() {
      var lamSel = $('bg-lambda').value;
      return { th: +$('bg-theta').value, d: +$('bg-d').value, lam: lamSel === 'custom' ? +$('bg-lam-custom').value : +lamSel, N: +$('bg-n').value };
   }
   function inten(th, p) {
      var phi = 2 * Math.PI * 2 * p.d * Math.sin(th * RAD) / p.lam, s = Math.sin(phi / 2);
      if (Math.abs(s) < 1e-9) return 1;
      var v = Math.sin(p.N * phi / 2) / (p.N * s); return v * v;
   }

   /* ---------- crystal + rays ---------- */
   function drawScene(p) {
      var W = 560, H = 380, cx = 280, top = 150;
      var scale = Math.min(26, 190 / (3 * p.d)), dpx = p.d * scale;
      var nPl = Math.max(2, Math.min(6, Math.floor(200 / dpx) + 1));
      var th = p.th * RAD, u = [Math.cos(th), Math.sin(th)], v = [Math.cos(th), -Math.sin(th)], L = 230;
      var g = '<defs><marker id="bg-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#f5c729"/></marker></defs>';
      for (var k = 0; k < nPl; k++) {
         var y = top + k * dpx;
         g += '<line class="bg-plane" x1="20" x2="' + (W - 20) + '" y1="' + y + '" y2="' + y + '"/>';
         for (var x = cx - 230; x <= cx + 230; x += 46) g += '<circle class="bg-atom' + (x === cx && k < 2 ? ' hot' : '') + '" cx="' + x + '" cy="' + y + '" r="' + (x === cx && k < 2 ? 8 : 6) + '"/>';
      }
      /* rays to the central atom of every plane (first two highlighted) */
      for (k = nPl - 1; k >= 0; k--) {
         var ay = top + k * dpx, cls = k < 2 ? 'bg-ray' : 'bg-ray faint';
         g += '<line class="' + cls + '" x1="' + (cx - L * u[0]) + '" y1="' + (ay - L * u[1]) + '" x2="' + cx + '" y2="' + ay + '"/>';
         g += '<line class="' + cls + '" x1="' + cx + '" y1="' + ay + '" x2="' + (cx + L * v[0]) + '" y2="' + (ay + L * v[1]) + '"' + (k === 0 ? ' marker-end="url(#bg-arr)"' : '') + '/>';
      }
      /* extra path of the 2nd plane: 2 d sinθ */
      var a1 = [cx, top + dpx], s = dpx * Math.sin(th);
      var f1 = [a1[0] - s * u[0], a1[1] - s * u[1]], f2 = [a1[0] + s * v[0], a1[1] + s * v[1]];
      g += '<line class="bg-perp" x1="' + cx + '" y1="' + top + '" x2="' + f1[0] + '" y2="' + f1[1] + '"/><line class="bg-perp" x1="' + cx + '" y1="' + top + '" x2="' + f2[0] + '" y2="' + f2[1] + '"/>';
      g += '<line class="bg-extra" x1="' + f1[0] + '" y1="' + f1[1] + '" x2="' + a1[0] + '" y2="' + a1[1] + '"/><line class="bg-extra" x1="' + a1[0] + '" y1="' + a1[1] + '" x2="' + f2[0] + '" y2="' + f2[1] + '"/>';
      g += '<text class="bg-lbl red" x="' + (cx + 12) + '" y="' + (a1[1] + 22) + '">d sin&theta;</text>';
      /* d marker */
      g += '<line class="bg-dim" x1="' + (W - 40) + '" x2="' + (W - 40) + '" y1="' + top + '" y2="' + (top + dpx) + '"/><text class="bg-lbl" x="' + (W - 34) + '" y="' + (top + dpx / 2 + 4) + '">d</text>';
      /* θ arc */
      var r = 46, ax = cx - r, sx = cx - r * Math.cos(th), sy = top - r * Math.sin(th);
      g += '<path class="bg-arc" d="M' + ax + ' ' + top + ' A' + r + ' ' + r + ' 0 0 1 ' + sx + ' ' + sy + '"/><text class="bg-lbl yel" x="' + (cx - r - 22) + '" y="' + (top - 8) + '">&theta;</text>';
      g += '<text class="bg-lbl dim" x="24" y="24">' + T('Incident X-rays', 'Rayos X incidentes') + '</text><text class="bg-lbl dim" x="' + (W - 24) + '" y="24" text-anchor="end">' + T('Diffracted', 'Difractados') + '</text>';
      scene.innerHTML = g;
   }

   /* ---------- waves from plane 1, plane 2 and the sum of N planes ---------- */
   function drawWaves(p) {
      var W = 340, H = 380, x0 = 20, x1 = W - 16, amp = 26;
      var delta = 2 * p.d * Math.sin(p.th * RAD), phi = 2 * Math.PI * delta / p.lam;
      function path(yc, a, ph, n) {
         var d = '';
         for (var x = x0; x <= x1; x += 3) {
            var t = (x - x0) / 60 * 2 * Math.PI - phase, y = 0;
            if (n) { for (var k = 0; k < n; k++) y += Math.sin(t - k * phi); y *= a / n; } else y = a * Math.sin(t - ph);
            d += (x === x0 ? 'M' : 'L') + x + ' ' + (yc - y).toFixed(1);
         }
         return d;
      }
      var g = '<text class="bg-lbl dim" x="' + x0 + '" y="26">' + T('Wave from plane 1', 'Onda del plano 1') + '</text><path class="bg-w1" d="' + path(70, amp, 0) + '"/>';
      g += '<text class="bg-lbl dim" x="' + x0 + '" y="132">' + T('Wave from plane 2 (shifted by Δ)', 'Onda del plano 2 (desfasada por Δ)') + '</text><path class="bg-w2" d="' + path(176, amp, phi) + '"/>';
      g += '<text class="bg-lbl dim" x="' + x0 + '" y="240">' + T('Sum of ', 'Suma de ') + p.N + T(' planes', ' planos') + '</text><path class="bg-ws" d="' + path(300, amp * 1.6, 0, p.N) + '"/>';
      waves.innerHTML = g;
   }

   /* ---------- I(θ) ---------- */
   function drawCurve(p) {
      var narrow = (curve.parentNode.clientWidth || 900) < 600;
      var W = narrow ? 460 : 900, H = narrow ? 300 : 240, L = 50, R = 16, Tp = 16, B = 40;
      curve.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var X = function (t) { return L + t / 90 * (W - L - R); }, Y = function (v) { return H - B - v * (H - Tp - B); };
      var g = '';
      for (var t = 0; t <= 90; t += 10) g += '<line class="wh-grid" x1="' + X(t) + '" x2="' + X(t) + '" y1="' + Tp + '" y2="' + (H - B) + '"/><text class="wh-tick" x="' + X(t) + '" y="' + (H - B + 17) + '" text-anchor="middle">' + t + '</text>';
      g += '<line class="wh-axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/><line class="wh-axis" x1="' + L + '" x2="' + L + '" y1="' + Tp + '" y2="' + (H - B) + '"/>';
      var d = '';
      for (var i = 0; i <= 1800; i++) { var th = i * 0.05; d += (i ? 'L' : 'M') + X(th).toFixed(1) + ' ' + Y(inten(th, p)).toFixed(1); }
      g += '<path class="xrd-fill" d="' + d + 'L' + X(90) + ' ' + Y(0) + 'L' + X(0) + ' ' + Y(0) + 'Z"/><path class="xrd-line" d="' + d + '"/>';
      for (var n = 1; n * p.lam / (2 * p.d) <= 1; n++) {
         var tb = Math.asin(n * p.lam / (2 * p.d)) / RAD;
         g += '<text class="xrd-lbl" x="' + X(tb) + '" y="' + (Tp + 10) + '" text-anchor="middle">n=' + n + '</text>';
      }
      g += '<line class="xrd-cross" x1="' + X(p.th) + '" x2="' + X(p.th) + '" y1="' + Tp + '" y2="' + (H - B) + '" visibility="visible"/><circle class="tc-eg" cx="' + X(p.th) + '" cy="' + Y(inten(p.th, p)) + '" r="6"/>';
      g += '<text class="wh-axt" x="' + ((L + W - R) / 2) + '" y="' + (H - 5) + '" text-anchor="middle">&theta; (&deg;)</text>';
      g += '<text class="wh-axt" transform="translate(14 ' + ((Tp + H - B) / 2) + ') rotate(-90)" text-anchor="middle">' + T('Intensity', 'Intensidad') + '</text>';
      curve.innerHTML = g;
   }

   function info(p) {
      var delta = 2 * p.d * Math.sin(p.th * RAD), ratio = delta / p.lam, n = Math.round(ratio), frac = Math.abs(ratio - n), I = inten(p.th, p);
      $('bg-theta-out').textContent = fmt(p.th, 1) + '°';
      $('bg-d-out').textContent = fmt(p.d, 2) + ' Å';
      $('bg-n-out').textContent = p.N;
      $('bg-delta').textContent = fmt(delta, 3) + ' Å';
      $('bg-ratio').textContent = fmt(ratio, 3);
      $('bg-int').textContent = fmt(I * 100, 1) + ' %';
      var st = $('bg-state');
      if (n >= 1 && I > 0.5) { st.className = 'bg-state ok'; st.innerHTML = T('Constructive interference: Bragg reflection of order n = ' + n, 'Interferencia constructiva: reflexión de Bragg de orden n = ' + n); }
      else if (frac > 0.4) { st.className = 'bg-state bad'; st.innerHTML = T('Destructive interference: the waves cancel', 'Interferencia destructiva: las ondas se cancelan'); }
      else { st.className = 'bg-state mid'; st.innerHTML = T('Partial interference: with many planes the intensity drops quickly', 'Interferencia parcial: con muchos planos la intensidad cae rápido'); }
      var list = [];
      for (var k = 1; k * p.lam / (2 * p.d) <= 1; k++) list.push('n=' + k + ': ' + fmt(Math.asin(k * p.lam / (2 * p.d)) / RAD, 2) + '° (2θ = ' + fmt(2 * Math.asin(k * p.lam / (2 * p.d)) / RAD, 2) + '°)');
      $('bg-angles').innerHTML = list.length ? list.join('<br>') : T('No reflection possible: λ &gt; 2d', 'Ninguna reflexión posible: λ &gt; 2d');
   }

   function update() { var p = P(); drawScene(p); drawWaves(p); drawCurve(p); info(p); $('bg-lam-custom-wrap').hidden = $('bg-lambda').value !== 'custom'; }
   function tick(t) {
      if (playing && t - last > 40) { phase += 0.18; last = t; drawWaves(P()); }
      requestAnimationFrame(tick);
   }
   ['bg-theta', 'bg-d', 'bg-lambda', 'bg-lam-custom', 'bg-n'].forEach(function (id) { $(id).addEventListener('input', update); $(id).addEventListener('change', update); });
   $('bg-play').addEventListener('click', function () { playing = !playing; this.setAttribute('aria-pressed', playing ? 'true' : 'false'); });
   $('bg-snap').addEventListener('click', function () {
      var p = P(), s = p.lam / (2 * p.d); if (s > 1) return;
      $('bg-theta').value = (Math.asin(s) / RAD).toFixed(1); update();
   });
   var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(update, 150); });
   if (window.frsmI18n) window.frsmI18n.onChange(update);
   update(); requestAnimationFrame(tick);
})();
