/* =====================================================================
   FRSM 2.0.5 — Structure selector + simulated XRD pattern (Virtual Lab)
   Needs: structures-data.js, xrd-engine.js (and crystal3d.js for 3D)
   ===================================================================== */
(function () {
   'use strict';

   var DATA = window.FRSM_STRUCTURES, X = window.FRSM_XRD;
   var svg = document.getElementById('xrd-plot');
   if (!DATA || !X || !svg) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function L(o) { return o ? T(o.en, o.es) : ''; }
   function fmt(x, d) { var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   var $ = function (id) { return document.getElementById(id); };

   var cur = null, res = null;
   var W = 900, H = 340, PL = 54, PR = 16, PT = 18, PB = 44;

   function opts() {
      return {
         lambda: parseFloat($('xrd-lambda').value),
         D: parseFloat($('xrd-size').value),
         min: parseFloat($('xrd-min').value) || 10,
         max: parseFloat($('xrd-max').value) || 80,
         inst: 0.05, B: 0.5
      };
   }
   function hklText(h) { return h.map(function (x) { return x.join(''); }).join('/'); }

   function run() {
      var o = opts();
      if (!(o.max > o.min + 5)) { o.max = o.min + 5; }
      $('xrd-size-out').textContent = o.D;
      res = X.simulate(DATA[cur], o);
      res.o = o;
      draw(); table();
   }

   function draw() {
      var narrow = (svg.parentNode.clientWidth || 900) < 600;
      W = narrow ? 460 : 900; H = narrow ? 400 : 340;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var o = res.o, x0 = o.min, x1 = o.max;
      var X_ = function (v) { return PL + (v - x0) / (x1 - x0) * (W - PL - PR); };
      var Y_ = function (v) { return H - PB - v / 108 * (H - PT - PB); };
      var g = '';
      var stepX = (x1 - x0) > (narrow ? 30 : 60) ? 10 : 5;
      for (var t = Math.ceil(x0 / stepX) * stepX; t <= x1; t += stepX) {
         g += '<line class="wh-grid" x1="' + X_(t) + '" x2="' + X_(t) + '" y1="' + PT + '" y2="' + (H - PB) + '"/>';
         g += '<text class="wh-tick" x="' + X_(t) + '" y="' + (H - PB + 18) + '" text-anchor="middle">' + t + '</text>';
      }
      [0, 25, 50, 75, 100].forEach(function (v) {
         g += '<text class="wh-tick" x="' + (PL - 8) + '" y="' + (Y_(v) + 4) + '" text-anchor="end">' + v + '</text>';
      });
      g += '<line class="wh-axis" x1="' + PL + '" x2="' + (W - PR) + '" y1="' + (H - PB) + '" y2="' + (H - PB) + '"/>';
      g += '<line class="wh-axis" x1="' + PL + '" x2="' + PL + '" y1="' + PT + '" y2="' + (H - PB) + '"/>';
      /* reflection markers */
      res.peaks.forEach(function (p) {
         g += '<line class="xrd-tick" x1="' + X_(p.tth) + '" x2="' + X_(p.tth) + '" y1="' + (H - PB) + '" y2="' + (H - PB + 6) + '"/>';
      });
      /* profile */
      var d = '';
      res.profile.forEach(function (pt, i) { d += (i ? 'L' : 'M') + X_(pt[0]).toFixed(1) + ' ' + Y_(pt[1]).toFixed(1); });
      g += '<path class="xrd-fill" d="' + d + 'L' + X_(x1) + ' ' + Y_(0) + 'L' + X_(x0) + ' ' + Y_(0) + 'Z"/>';
      g += '<path class="xrd-line" d="' + d + '"/>';
      /* labels on the strongest peaks (no overlaps) */
      var lab = res.peaks.filter(function (p) { return p.rel >= 12; }).sort(function (a, b) { return b.rel - a.rel; });
      var used = [];
      lab.forEach(function (p) {
         var x = X_(p.tth), top = peakTop(p.tth);
         if (used.some(function (u) { return Math.abs(u - x) < (narrow ? 30 : 34); })) return;
         used.push(x);
         g += '<text class="xrd-lbl" x="' + x + '" y="' + (Y_(top) - 6) + '" text-anchor="middle">(' + hklText(p.hkl.slice(0, 1)) + ')</text>';
      });
      g += '<text class="wh-axt" x="' + ((PL + W - PR) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">2θ (°)</text>';
      g += '<text class="wh-axt" transform="translate(15 ' + ((PT + H - PB) / 2) + ') rotate(-90)" text-anchor="middle">' + T('Intensity (a.u.)', 'Intensidad (u.a.)') + '</text>';
      g += '<line id="xrd-cross" class="xrd-cross" x1="0" x2="0" y1="' + PT + '" y2="' + (H - PB) + '" visibility="hidden"/>';
      svg.innerHTML = g;
      svg._map = { X: X_, x0: x0, x1: x1 };
   }
   function peakTop(tth) {
      var best = 0;
      res.profile.forEach(function (p) { if (Math.abs(p[0] - tth) < .08 && p[1] > best) best = p[1]; });
      return best;
   }

   /* hover readout */
   var tip = $('xrd-tip');
   svg.addEventListener('pointermove', function (e) {
      if (!svg._map) return;
      var r = svg.getBoundingClientRect(), xs = (e.clientX - r.left) / r.width * W;
      var m = svg._map, t = m.x0 + (xs - PL) / (W - PL - PR) * (m.x1 - m.x0);
      if (t < m.x0 || t > m.x1) { tip.hidden = true; return; }
      var near = null;
      res.peaks.forEach(function (p) { if (!near || Math.abs(p.tth - t) < Math.abs(near.tth - t)) near = p; });
      var cross = document.getElementById('xrd-cross');
      if (near && Math.abs(near.tth - t) < 1.2) {
         cross.setAttribute('x1', m.X(near.tth)); cross.setAttribute('x2', m.X(near.tth)); cross.setAttribute('visibility', 'visible');
         tip.innerHTML = '<b>(' + hklText(near.hkl) + ')</b> 2θ = ' + fmt(near.tth, 2) + '° &middot; d = ' + fmt(near.d, 4) + ' Å &middot; I = ' + fmt(near.rel, 1);
         tip.hidden = false;
      } else { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; }
   });
   svg.addEventListener('pointerleave', function () {
      tip.hidden = true; var c = document.getElementById('xrd-cross'); if (c) c.setAttribute('visibility', 'hidden');
   });

   function table() {
      var rows = res.peaks.filter(function (p) { return p.rel >= 1; }), html = '';
      rows.forEach(function (p, i) {
         html += '<tr><td>' + fmt(p.tth, 2) + '</td><td>' + fmt(p.d, 4) + '</td><td>(' + hklText(p.hkl) + ')</td><td>' + p.mult + '</td>' +
            '<td><span class="xrd-bar" style="width:' + Math.max(2, p.rel * .6) + 'px"></span>' + fmt(p.rel, 1) + '</td><td>' + fmt(p.fwhm, 3) + '</td>' +
            '<td><button type="button" class="xrd-use" data-i="' + res.peaks.indexOf(p) + '" title="' + T('Open in the Scherrer calculator', 'Abrir en la calculadora de Scherrer') + '">Scherrer &rarr;</button></td></tr>';
      });
      $('xrd-rows').innerHTML = html;
      $('xrd-count').textContent = rows.length;
   }
   $('xrd-rows').addEventListener('click', function (e) {
      var b = e.target.closest('.xrd-use'); if (!b) return;
      var p = res.peaks[+b.getAttribute('data-i')];
      var lam = $('sch-lambda');
      if (!lam) {   /* calculator lives on its own page: pass the peak in the URL */
         location.href = 'lab-scherrer.html?tth=' + p.tth.toFixed(2) + '&fwhm=' + p.fwhm.toFixed(3) + '&inst=0.05&lambda=' + res.lambda.toFixed(4) + '#scherrer';
         return;
      }
      if (lam) {
         var v = String(res.lambda.toFixed(4));
         var opt = [].slice.call(lam.options).filter(function (o) { return o.value === v; })[0];
         if (opt) lam.value = v; else { lam.value = 'custom'; $('sch-lambda-custom').value = v; $('sch-lambda-custom-wrap').hidden = false; }
         $('sch-inst').value = '0.05';
         $('sch-2theta').value = p.tth.toFixed(2);
         $('sch-fwhm').value = p.fwhm.toFixed(3);
         $('sch-2theta').dispatchEvent(new Event('input', { bubbles: true }));
         var t = document.getElementById('scherrer');
         window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' });
      }
   });

   /* CSV download */
   $('xrd-csv').addEventListener('click', function () {
      var st = DATA[cur], o = res.o;
      var lines = ['# Simulated powder XRD - ' + st.name.en + ' (' + st.formula.replace(/<[^>]+>/g, '') + ')',
                   '# lambda = ' + res.lambda + ' A, crystallite size = ' + o.D + ' nm, instrumental FWHM = 0.05 deg, B = 0.5 A^2',
                   '2theta_deg,intensity'];
      res.profile.forEach(function (p) { lines.push(p[0].toFixed(3) + ',' + p[1].toFixed(3)); });
      lines.push('', '# Reflections', '2theta_deg,d_A,hkl,multiplicity,I_rel,FWHM_deg');
      res.peaks.forEach(function (p) { lines.push([p.tth.toFixed(3), p.d.toFixed(5), '"' + hklText(p.hkl) + '"', p.mult, p.rel.toFixed(2), p.fwhm.toFixed(4)].join(',')); });
      var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'XRD_' + cur + '_simulated.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
   });

   /* structure selector */
   function select(k) {
      cur = k;
      document.querySelectorAll('[data-structure-btn]').forEach(function (b) {
         b.setAttribute('aria-pressed', b.getAttribute('data-structure-btn') === k ? 'true' : 'false');
      });
      $('xrd-size').value = DATA[k].D;
      $('xrd-name').innerHTML = L(DATA[k].name) + ' ' + DATA[k].formula;
      if (window.FRSM_XTAL) window.FRSM_XTAL.load(k);
      run();
   }
   document.querySelectorAll('[data-structure-btn]').forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-structure-btn')); });
   });
   ['xrd-lambda', 'xrd-size', 'xrd-min', 'xrd-max'].forEach(function (id) { $(id).addEventListener('input', run); });

   var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (res) draw(); }, 150); });
   select(document.querySelector('[data-structure-btn]').getAttribute('data-structure-btn'));
   if (window.frsmI18n) window.frsmI18n.onChange(function () { $('xrd-name').innerHTML = L(DATA[cur].name) + ' ' + DATA[cur].formula; run(); });
})();
