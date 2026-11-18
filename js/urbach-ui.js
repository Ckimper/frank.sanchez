/* =====================================================================
   FRSM 2.0.7 — Urbach energy calculator (UI)
   ln(α) = ln(α0) + (hν − E0)/Eu  → Eu = 1 / slope   (reported in meV)
   Needs js/tauc-engine.js
   ===================================================================== */
(function () {
   'use strict';
   var E = window.FRSM_TAUC, plot = document.getElementById('ub-plot');
   if (!E || !plot) return;
   var $ = function (id) { return document.getElementById(id); };
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function fmt(x, d) { if (!isFinite(x)) return '—'; var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   var st = { lp: [], eg: null, fit: null, e0: null, e1: null, manual: false, info: {} };
   function mode() { return document.querySelector('input[name="ub-mode"]:checked').value; }

   function compute(keep) {
      var d = E.parse($('ub-data').value), msg = $('ub-msg');
      $('ub-runit-wrap').hidden = mode() !== 'R';
      var pr = E.prepare(d, { mode: mode(), p: parseFloat($('ub-trans').value), xunit: $('ub-xunit').value, runit: $('ub-runit').value, baseline: $('ub-baseline').checked });
      st.info = pr.info;
      var ta = E.auto(pr.pts), tf = ta && E.fit(pr.pts, ta.e0, ta.e1);
      st.eg = tf && tf.m > 0 && isFinite(tf.Eg) ? tf.Eg : null;
      st.lp = E.lnPoints(pr.pts);
      msg.hidden = true;
      if (st.lp.length < 8) { st.fit = null; msg.hidden = !$('ub-data').value.trim(); msg.textContent = T('Paste at least 8 data points.', 'Pega al menos 8 puntos.'); render(); return; }
      if (!keep || st.e0 == null) {
         var a = E.urbachAuto(st.lp, st.eg ? st.eg + 0.01 : null);
         if (a) { st.e0 = a.e0; st.e1 = a.e1; st.manual = false; } else st.e0 = null;
      }
      if (st.e0 == null) { st.fit = null; msg.hidden = false; msg.textContent = T('No exponential tail was found. Drag on the plot to choose the region just below the gap.', 'No se encontró una cola exponencial. Arrastra sobre el gráfico para elegir la zona justo debajo de la brecha.'); }
      else { st.fit = E.urbachFit(st.lp, st.e0, st.e1); $('ub-e0').value = st.e0.toFixed(3); $('ub-e1').value = st.e1.toFixed(3); }
      render();
   }

   function results() {
      var f = st.fit, ok = f && f.m > 0 && isFinite(f.Eu);
      $('ub-eu').textContent = ok ? fmt(f.Eu, 1) : '—';
      $('ub-eg').textContent = st.eg ? fmt(st.eg, 3) : '—';
      $('ub-r2').textContent = ok ? fmt(f.r2, 4) : '—';
      $('ub-range').textContent = ok ? fmt(f.e0, 3) + '–' + fmt(f.e1, 3) + ' eV' : '—';
      $('ub-ratio').textContent = ok && st.eg ? fmt(f.Eu / 1000 / st.eg * 100, 2) + ' %' : '—';
      $('ub-auto-tag').hidden = !(ok && !st.manual);
      var q = $('ub-quality');
      if (ok) {
         var eu = f.Eu;
         q.textContent = eu < 30 ? T('Very ordered: sharp edge, few defects.', 'Muy ordenado: borde abrupto, pocos defectos.')
            : eu < 100 ? T('Moderate disorder, typical of nanocrystalline oxides.', 'Desorden moderado, típico de óxidos nanocristalinos.')
            : eu < 250 ? T('High disorder: many defect states inside the gap.', 'Desorden alto: muchos estados de defecto dentro de la brecha.')
            : T('Very high: check the region chosen or the baseline.', 'Muy alto: revisa la zona elegida o la línea base.');
         q.hidden = false;
      } else q.hidden = true;
   }

   var geo = {};
   function niceStep(s) { s /= 6; var p = Math.pow(10, Math.floor(Math.log10(s))), m = s / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
   function render() {
      results();
      var narrow = (plot.parentNode.clientWidth || 900) < 600;
      var W = narrow ? 460 : 900, H = narrow ? 380 : 360, P = { l: 58, r: 16, t: 18, b: 44 };
      plot.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var lp = st.lp;
      if (lp.length < 2) { plot.innerHTML = '<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle" class="wh-empty">' + T('Paste your data or load the example', 'Pega tus datos o carga el ejemplo') + '</text>'; geo = {}; return; }
      var x0 = lp[0].E, x1 = lp[lp.length - 1].E, y0 = Infinity, y1 = -Infinity;
      lp.forEach(function (q) { if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; });
      var pad = (y1 - y0) * .06; y0 -= pad; y1 += pad;
      var X = function (v) { return P.l + (v - x0) / (x1 - x0) * (W - P.l - P.r); };
      var Y = function (v) { return H - P.b - (v - y0) / (y1 - y0) * (H - P.t - P.b); };
      var g = '', sx = niceStep(x1 - x0), sy = niceStep(y1 - y0), t;
      for (t = Math.ceil(x0 / sx) * sx; t <= x1 + 1e-9; t += sx) g += '<line class="wh-grid" x1="' + X(t) + '" x2="' + X(t) + '" y1="' + P.t + '" y2="' + (H - P.b) + '"/><text class="wh-tick" x="' + X(t) + '" y="' + (H - P.b + 17) + '" text-anchor="middle">' + fmt(t, sx < 1 ? 1 : 0) + '</text>';
      for (t = Math.ceil(y0 / sy) * sy; t <= y1 + 1e-9; t += sy) g += '<line class="wh-grid" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="wh-tick" x="' + (P.l - 7) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + fmt(t, sy < 1 ? 1 : 0) + '</text>';
      g += '<line class="wh-axis" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + (H - P.b) + '" y2="' + (H - P.b) + '"/><line class="wh-axis" x1="' + P.l + '" x2="' + P.l + '" y1="' + P.t + '" y2="' + (H - P.b) + '"/>';
      g += '<text class="wh-axt" x="' + ((P.l + W - P.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + T('Photon energy h&nu; (eV)', 'Energía del fotón h&nu; (eV)') + '</text>';
      g += '<text class="wh-axt" transform="translate(16 ' + ((P.t + H - P.b) / 2) + ') rotate(-90)" text-anchor="middle">ln ' + (mode() === 'R' ? 'F(R)' : '&alpha;') + '</text>';
      var f = st.fit;
      if (f) g += '<rect class="tc-band" x="' + X(f.e0) + '" y="' + P.t + '" width="' + Math.max(1, X(f.e1) - X(f.e0)) + '" height="' + (H - P.t - P.b) + '"/>';
      if (st.eg && st.eg > x0 && st.eg < x1) g += '<line class="tc-edge" x1="' + X(st.eg) + '" x2="' + X(st.eg) + '" y1="' + P.t + '" y2="' + (H - P.b) + '"/><text class="tc-eg-lbl small" x="' + (X(st.eg) + 6) + '" y="' + (P.t + 14) + '">E<tspan dy="3" font-size="75%">g</tspan><tspan dy="-3"> ' + fmt(st.eg, 2) + ' eV</tspan></text>';
      var d = ''; lp.forEach(function (q, i) { d += (i ? 'L' : 'M') + X(q.E).toFixed(1) + ' ' + Y(q.y).toFixed(1); });
      g += '<path class="tc-curve" d="' + d + '"/>';
      if (f && f.m > 0) {
         var xa = Math.max(x0, f.e0 - (f.e1 - f.e0) * .3), xb = Math.min(x1, f.e1 + (f.e1 - f.e0) * .3);
         g += '<line class="tc-fit" x1="' + X(xa) + '" y1="' + Y(f.m * xa + f.b) + '" x2="' + X(xb) + '" y2="' + Y(f.m * xb + f.b) + '"/>';
         g += '<text class="tc-eg-lbl" x="' + (X(xb) - 6) + '" y="' + (Y(f.m * xb + f.b) - 10) + '" text-anchor="end">E<tspan dy="4" font-size="75%">U</tspan><tspan dy="-4"> = ' + fmt(f.Eu, 0) + ' meV</tspan></text>';
      }
      g += '<rect id="ub-sel" class="tc-sel" x="0" y="' + P.t + '" width="0" height="' + (H - P.t - P.b) + '" visibility="hidden"/>';
      plot.innerHTML = g;
      geo = { X: X, x0: x0, x1: x1, W: W, P: P };
   }

   var drag = null;
   function evE(e) { var r = plot.getBoundingClientRect(), xs = (e.clientX - r.left) / r.width * geo.W, t = (xs - geo.P.l) / (geo.W - geo.P.l - geo.P.r); return geo.x0 + Math.min(1, Math.max(0, t)) * (geo.x1 - geo.x0); }
   plot.addEventListener('pointerdown', function (e) { if (!geo.X) return; drag = { a: evE(e) }; plot.setPointerCapture(e.pointerId); });
   plot.addEventListener('pointermove', function (e) { if (!drag) return; var b = evE(e), s = $('ub-sel'); if (!s) return; s.setAttribute('x', geo.X(Math.min(drag.a, b))); s.setAttribute('width', Math.abs(geo.X(b) - geo.X(drag.a))); s.setAttribute('visibility', 'visible'); });
   plot.addEventListener('pointerup', function (e) {
      if (!drag) return; var b = evE(e), a = drag.a; drag = null;
      if (Math.abs(b - a) < (geo.x1 - geo.x0) * .01) { render(); return; }
      st.e0 = Math.min(a, b); st.e1 = Math.max(a, b); st.manual = true; st.fit = E.urbachFit(st.lp, st.e0, st.e1);
      $('ub-e0').value = st.e0.toFixed(3); $('ub-e1').value = st.e1.toFixed(3); render();
   });

   var deb = 0;
   $('ub-data').addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { compute(false); }, 250); });
   document.querySelectorAll('input[name="ub-mode"]').forEach(function (r) { r.addEventListener('change', function () { compute(false); }); });
   ['ub-trans', 'ub-xunit', 'ub-runit', 'ub-baseline'].forEach(function (id) { $(id).addEventListener('change', function () { compute(false); }); });
   ['ub-e0', 'ub-e1'].forEach(function (id) { $(id).addEventListener('change', function () {
      var a = parseFloat($('ub-e0').value.replace(',', '.')), b = parseFloat($('ub-e1').value.replace(',', '.'));
      if (!(a > 0 && b > 0) || a === b) return;
      st.e0 = Math.min(a, b); st.e1 = Math.max(a, b); st.manual = true; st.fit = E.urbachFit(st.lp, st.e0, st.e1); render();
   }); });
   $('ub-auto').addEventListener('click', function () { compute(false); });
   $('ub-example').addEventListener('click', function () {
      $('ub-data').value = E.example(mode(), 2.85, 'direct', 0.0005, { eu: 0.08, tail: 0.05 });
      $('ub-trans').value = '2'; $('ub-baseline').checked = true; $('ub-example-note').hidden = false; compute(false);
   });
   $('ub-clear').addEventListener('click', function () { $('ub-data').value = ''; $('ub-example-note').hidden = true; st.e0 = null; compute(false); });
   $('ub-file').addEventListener('change', function () {
      var file = this.files && this.files[0]; if (!file) return;
      var rd = new FileReader(); rd.onload = function () { $('ub-data').value = rd.result; $('ub-example-note').hidden = true; compute(false); }; rd.readAsText(file); this.value = '';
   });
   /* reuse the spectrum pasted in the Tauc calculator (same browser) */
   var saved = null; try { saved = JSON.parse(localStorage.getItem('frsm-uvvis') || 'null'); } catch (e) {}
   var useBtn = $('ub-use-tauc');
   if (saved && saved.text && saved.text.trim()) {
      useBtn.hidden = false;
      useBtn.addEventListener('click', function () {
         $('ub-data').value = saved.text;
         var r = document.querySelector('input[name="ub-mode"][value="' + saved.mode + '"]'); if (r) r.checked = true;
         if (saved.trans) $('ub-trans').value = saved.trans;
         $('ub-example-note').hidden = true; compute(false);
      });
   }
   var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(render, 150); });
   if (window.frsmI18n) window.frsmI18n.onChange(function () { render(); });
   compute(false);
})();
