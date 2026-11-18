/* =====================================================================
   FRSM 2.0.6 — Tauc band-gap calculator (UI)
   Needs js/tauc-engine.js
   ===================================================================== */
(function () {
   'use strict';
   var E = window.FRSM_TAUC, plot = document.getElementById('tc-plot');
   if (!E || !plot) return;
   var $ = function (id) { return document.getElementById(id); };
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function fmt(x, d) { if (!isFinite(x)) return '—'; var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }

   var state = { pts: [], info: {}, fit: null, e0: null, e1: null, manual: false };

   function mode() { return document.querySelector('input[name="tc-mode"]:checked').value; }
   function expo() { return parseFloat($('tc-trans').value); }
   function yLabel() {
      var p = expo(), q = mode() === 'R' ? 'F(R)' : '&alpha;';
      var e = p === 2 ? '2' : p === 0.5 ? '1/2' : p > 0.6 ? '2/3' : '1/3';
      return '(' + q + '&middot;h&nu;)<tspan dy="-6" font-size="70%">' + e + '</tspan>';
   }

   /* ---------- compute ---------- */
   function compute(keepRange) {
      var d = E.parse($('tc-data').value);
      var msg = $('tc-msg');
      /* remember the spectrum so the Urbach page can reuse it (this browser only) */
      try { localStorage.setItem('frsm-uvvis', JSON.stringify({ text: $('tc-data').value, mode: mode(), trans: $('tc-trans').value })); } catch (e) {}
      $('tc-runit-wrap').hidden = mode() !== 'R';
      var r = E.prepare(d, { mode: mode(), p: expo(), xunit: $('tc-xunit').value, runit: $('tc-runit').value, baseline: $('tc-baseline').checked });
      state.pts = r.pts; state.info = r.info;
      if (state.pts.length < 8) {
         state.fit = null;
         msg.hidden = !$('tc-data').value.trim();
         msg.textContent = T('Paste at least 8 data points (two columns: wavelength or energy, and absorbance or reflectance).', 'Pega al menos 8 puntos (dos columnas: longitud de onda o energía, y absorbancia o reflectancia).');
         render(); return;
      }
      msg.hidden = true;
      if (!keepRange || state.e0 == null) {
         var a = E.auto(state.pts);
         if (a) { state.e0 = a.e0; state.e1 = a.e1; state.manual = false; }
         else { state.e0 = null; }
      }
      if (state.e0 == null) {
         state.fit = null; msg.hidden = false;
         msg.textContent = T('No clear absorption edge was found. Select the linear region on the plot (drag) or type the energy range.', 'No se encontró un borde de absorción claro. Selecciona la zona lineal en el gráfico (arrastrando) o escribe el rango de energía.');
      } else {
         state.fit = E.fit(state.pts, state.e0, state.e1);
         $('tc-e0').value = state.e0.toFixed(3); $('tc-e1').value = state.e1.toFixed(3);
         if (state.fit && !(state.fit.m > 0)) { msg.hidden = false; msg.textContent = T('The selected region does not rise with energy: choose the steep part of the edge.', 'La zona elegida no sube con la energía: elige la parte empinada del borde.'); }
      }
      render();
   }

   /* ---------- results ---------- */
   function results() {
      var f = state.fit, ok = f && f.m > 0 && isFinite(f.Eg);
      $('tc-eg').textContent = ok ? fmt(f.Eg, 3) : '—';
      $('tc-edge').textContent = ok ? fmt(E.HC / f.Eg, 1) : '—';
      $('tc-r2').textContent = ok ? fmt(f.r2, 4) : '—';
      $('tc-npts').textContent = ok ? f.n : '—';
      $('tc-range').textContent = ok ? fmt(f.e0, 3) + '–' + fmt(f.e1, 3) + ' eV' : '—';
      $('tc-auto-tag').hidden = !(ok && !state.manual);
   }

   /* ---------- plots ---------- */
   var geo = {};
   function axes(svg, W, H, P, x0, x1, y0, y1, xl, yl, narrow, xticks) {
      var X = function (v) { return P.l + (v - x0) / (x1 - x0) * (W - P.l - P.r); };
      var Y = function (v) { return H - P.b - (v - y0) / (y1 - y0) * (H - P.t - P.b); };
      var g = '', step = xticks;
      for (var t = Math.ceil(x0 / step) * step; t <= x1 + 1e-9; t += step) {
         g += '<line class="wh-grid" x1="' + X(t) + '" x2="' + X(t) + '" y1="' + P.t + '" y2="' + (H - P.b) + '"/>';
         g += '<text class="wh-tick" x="' + X(t) + '" y="' + (H - P.b + 17) + '" text-anchor="middle">' + fmt(t, step < 1 ? 1 : 0) + '</text>';
      }
      g += '<line class="wh-axis" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + (H - P.b) + '" y2="' + (H - P.b) + '"/>';
      g += '<line class="wh-axis" x1="' + P.l + '" x2="' + P.l + '" y1="' + P.t + '" y2="' + (H - P.b) + '"/>';
      g += '<text class="wh-axt" x="' + ((P.l + W - P.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + xl + '</text>';
      g += '<text class="wh-axt" transform="translate(16 ' + ((P.t + H - P.b) / 2) + ') rotate(-90)" text-anchor="middle">' + yl + '</text>';
      return { g: g, X: X, Y: Y };
   }
   function niceStep(span) { var s = span / 6, p = Math.pow(10, Math.floor(Math.log10(s))), m = s / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }

   function render() {
      results();
      var narrow = (plot.parentNode.clientWidth || 900) < 600;
      var W = narrow ? 460 : 900, H = narrow ? 380 : 360, P = { l: 58, r: 16, t: 18, b: 44 };
      plot.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var pts = state.pts;
      if (pts.length < 2) {
         plot.innerHTML = '<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle" class="wh-empty">' + T('Paste your data or load the example to see the Tauc plot', 'Pega tus datos o carga el ejemplo para ver el gráfico de Tauc') + '</text>';
         $('tc-raw').innerHTML = ''; geo = {}; return;
      }
      var x0 = pts[0].E, x1 = pts[pts.length - 1].E, ymax = 0;
      pts.forEach(function (q) { if (q.y > ymax) ymax = q.y; });
      var A = axes(plot, W, H, P, x0, x1, 0, ymax * 1.08 || 1, T('Photon energy h&nu; (eV)', 'Energía del fotón h&nu; (eV)'), yLabel() + ' ' + T('(a.u.)', '(u.a.)'), narrow, niceStep(x1 - x0));
      var g = A.g, f = state.fit;
      if (f) g += '<rect class="tc-band" x="' + A.X(f.e0) + '" y="' + P.t + '" width="' + Math.max(1, A.X(f.e1) - A.X(f.e0)) + '" height="' + (H - P.t - P.b) + '"/>';
      var d = ''; pts.forEach(function (q, i) { d += (i ? 'L' : 'M') + A.X(q.E).toFixed(1) + ' ' + A.Y(q.y).toFixed(1); });
      g += '<path class="tc-curve" d="' + d + '"/>';
      if (f && f.m > 0 && isFinite(f.Eg)) {
         var xa = Math.max(x0, f.Eg), xb = Math.min(x1, f.e1 + (f.e1 - f.e0) * .35);
         var ya = f.m * xa + f.b, yb = f.m * xb + f.b;
         if (yb > ymax * 1.08) { yb = ymax * 1.08; xb = (yb - f.b) / f.m; }
         g += '<line class="tc-fit" x1="' + A.X(xa) + '" y1="' + A.Y(Math.max(0, ya)) + '" x2="' + A.X(xb) + '" y2="' + A.Y(yb) + '"/>';
         if (f.Eg >= x0 && f.Eg <= x1) {
            g += '<circle class="tc-eg" cx="' + A.X(f.Eg) + '" cy="' + A.Y(0) + '" r="6"/>';
            g += '<text class="tc-eg-lbl" x="' + A.X(f.Eg) + '" y="' + (A.Y(0) - 12) + '" text-anchor="' + (A.X(f.Eg) > W * .7 ? 'end' : 'start') + '" dx="' + (A.X(f.Eg) > W * .7 ? -8 : 8) + '">E<tspan dy="4" font-size="75%">g</tspan><tspan dy="-4"> = ' + fmt(f.Eg, 2) + ' eV</tspan></text>';
         }
      }
      g += '<rect id="tc-sel" class="tc-sel" x="0" y="' + P.t + '" width="0" height="' + (H - P.t - P.b) + '" visibility="hidden"/>';
      plot.innerHTML = g;
      geo = { X: A.X, x0: x0, x1: x1, W: W, P: P };
      renderRaw();
   }

   function renderRaw() {
      var svg = $('tc-raw'), pts = state.pts, narrow = (svg.parentNode.clientWidth || 600) < 500;
      var W = narrow ? 460 : 560, H = narrow ? 300 : 260, P = { l: 58, r: 14, t: 14, b: 42 };
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var nm = state.info.xunit === 'nm', xs = pts.map(function (q) { return nm ? q.lam : q.E; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var ys = pts.map(function (q) { return q.raw; }), y0 = Math.min(0, Math.min.apply(null, ys)), y1 = Math.max.apply(null, ys) * 1.06 || 1;
      var yl = mode() === 'R' ? (state.info.runit === 'pct' ? T('Reflectance (%)', 'Reflectancia (%)') : T('Reflectance', 'Reflectancia')) : T('Absorbance', 'Absorbancia');
      var A = axes(svg, W, H, P, x0, x1, y0, y1, nm ? T('Wavelength (nm)', 'Longitud de onda (nm)') : 'h&nu; (eV)', yl, narrow, niceStep(x1 - x0));
      var d = ''; pts.forEach(function (q, i) { d += (i ? 'L' : 'M') + A.X(nm ? q.lam : q.E).toFixed(1) + ' ' + A.Y(q.raw).toFixed(1); });
      var g = A.g + '<path class="tc-raw-line" d="' + d + '"/>';
      var f = state.fit;
      if (f && f.m > 0 && isFinite(f.Eg)) {
         var xe = nm ? E.HC / f.Eg : f.Eg;
         if (xe >= x0 && xe <= x1) g += '<line class="tc-edge" x1="' + A.X(xe) + '" x2="' + A.X(xe) + '" y1="' + P.t + '" y2="' + (H - P.b) + '"/>' +
            '<text class="tc-eg-lbl small" x="' + (A.X(xe) + 6) + '" y="' + (P.t + 14) + '">' + (nm ? fmt(xe, 0) + ' nm' : fmt(xe, 2) + ' eV') + '</text>';
      }
      svg.innerHTML = g;
   }

   /* ---------- drag to select the linear region ---------- */
   var drag = null;
   function evE(e) {
      var r = plot.getBoundingClientRect(), xs = (e.clientX - r.left) / r.width * geo.W;
      var t = (xs - geo.P.l) / (geo.W - geo.P.l - geo.P.r);
      return geo.x0 + Math.min(1, Math.max(0, t)) * (geo.x1 - geo.x0);
   }
   plot.addEventListener('pointerdown', function (e) {
      if (!geo.X) return;
      drag = { a: evE(e) }; plot.setPointerCapture(e.pointerId);
   });
   plot.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var b = evE(e), s = $('tc-sel'); if (!s) return;
      s.setAttribute('x', geo.X(Math.min(drag.a, b))); s.setAttribute('width', Math.abs(geo.X(b) - geo.X(drag.a))); s.setAttribute('visibility', 'visible');
   });
   plot.addEventListener('pointerup', function (e) {
      if (!drag) return;
      var b = evE(e), a = drag.a; drag = null;
      if (Math.abs(b - a) < (geo.x1 - geo.x0) * 0.01) { render(); return; }
      state.e0 = Math.min(a, b); state.e1 = Math.max(a, b); state.manual = true;
      state.fit = E.fit(state.pts, state.e0, state.e1);
      $('tc-e0').value = state.e0.toFixed(3); $('tc-e1').value = state.e1.toFixed(3);
      render();
   });

   /* ---------- inputs ---------- */
   var deb = 0;
   $('tc-data').addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { compute(false); }, 250); });
   document.querySelectorAll('input[name="tc-mode"]').forEach(function (r) { r.addEventListener('change', function () { compute(false); }); });
   ['tc-trans', 'tc-xunit', 'tc-runit', 'tc-baseline'].forEach(function (id) { $(id).addEventListener('change', function () { compute(false); }); });
   ['tc-e0', 'tc-e1'].forEach(function (id) {
      $(id).addEventListener('change', function () {
         var a = parseFloat($('tc-e0').value.replace(',', '.')), b = parseFloat($('tc-e1').value.replace(',', '.'));
         if (!(a > 0 && b > 0) || a === b) return;
         state.e0 = Math.min(a, b); state.e1 = Math.max(a, b); state.manual = true;
         state.fit = E.fit(state.pts, state.e0, state.e1); render();
      });
   });
   $('tc-auto').addEventListener('click', function () { compute(false); });
   $('tc-example').addEventListener('click', function () {
      var r = mode() === 'R';
      $('tc-data').value = E.example(r ? 'R' : 'A', 2.85, 'direct');
      $('tc-trans').value = '2'; $('tc-xunit').value = 'auto'; $('tc-runit').value = 'auto';
      $('tc-example-note').hidden = false;
      compute(false);
   });
   $('tc-clear').addEventListener('click', function () { $('tc-data').value = ''; $('tc-example-note').hidden = true; state.e0 = null; compute(false); });
   $('tc-file').addEventListener('change', function () {
      var file = this.files && this.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () { $('tc-data').value = rd.result; $('tc-example-note').hidden = true; compute(false); };
      rd.readAsText(file);
      this.value = '';
   });
   $('tc-csv').addEventListener('click', function () {
      if (!state.pts.length) return;
      var f = state.fit, lines = ['# Tauc analysis - ' + (mode() === 'R' ? 'Kubelka-Munk F(R)' : 'absorbance') + ', exponent ' + expo()];
      if (f) lines.push('# fit range ' + f.e0.toFixed(4) + '-' + f.e1.toFixed(4) + ' eV, Eg = ' + f.Eg.toFixed(4) + ' eV, R2 = ' + f.r2.toFixed(5));
      lines.push('energy_eV,wavelength_nm,input,' + (mode() === 'R' ? 'F_R' : 'alpha_rel') + ',tauc_y');
      state.pts.forEach(function (q) { lines.push([q.E.toFixed(5), q.lam.toFixed(2), q.raw, q.f.toPrecision(6), q.y.toPrecision(6)].join(',')); });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = 'Tauc_analysis.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
   });
   var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(render, 150); });
   if (window.frsmI18n) window.frsmI18n.onChange(function () { render(); if (!$('tc-msg').hidden) compute(true); });

   compute(false);
})();
