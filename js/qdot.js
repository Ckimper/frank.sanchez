/* =====================================================================
   FRSM 2.0.7 — Quantum dot: size-dependent gap (Brus effective-mass model)
   E(R) = Eg + (ħ²π² / 2R²)(1/me* + 1/mh*) − 1.786 e² / (4π ε0 εr R)
        = Eg + 0.37603 eV·nm² /R² · (1/me + 1/mh) − 1.43996 eV·nm · 1.786 / (εr R)
   Exciton Bohr radius a_B = εr (m0/μ) · 0.0529 nm
   CdSe also: empirical sizing curve of Yu et al., Chem. Mater. 15 (2003) 2854.
   ===================================================================== */
(function () {
   'use strict';
   var $ = function (id) { return document.getElementById(id); };
   if (!$('qd-mat')) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function fmt(x, d) { if (!isFinite(x)) return '—'; var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   var HC = 1239.84;
   /* bulk gap (eV, 300 K), electron and hole effective masses (m0), relative permittivity */
   var M = {
      CdSe: { eg: 1.74, me: 0.13, mh: 0.45, er: 10.6, html: 'CdSe' },
      CdS: { eg: 2.42, me: 0.21, mh: 0.80, er: 8.9, html: 'CdS' },
      CdTe: { eg: 1.50, me: 0.11, mh: 0.35, er: 10.2, html: 'CdTe' },
      InP: { eg: 1.34, me: 0.077, mh: 0.64, er: 12.5, html: 'InP' },
      ZnO: { eg: 3.37, me: 0.26, mh: 0.59, er: 8.5, html: 'ZnO' },
      ZnS: { eg: 3.68, me: 0.25, mh: 0.59, er: 8.3, html: 'ZnS' },
      PbS: { eg: 0.41, me: 0.085, mh: 0.085, er: 17.2, html: 'PbS' }
   };
   function brus(m, D) { var R = D / 2; return m.eg + 0.37603 / (R * R) * (1 / m.me + 1 / m.mh) - 1.786 * 1.43996 / (m.er * R); }
   function bohr(m) { var mu = m.me * m.mh / (m.me + m.mh); return m.er / mu * 0.0529; }
   function yuD(l) { return 1.6122e-9 * Math.pow(l, 4) - 2.6575e-6 * Math.pow(l, 3) + 1.6242e-3 * l * l - 0.4277 * l + 41.57; }
   function yuLambda(D) {          // invert Yu's curve (valid ~ 450–650 nm)
      var best = null;
      for (var l = 450; l <= 650; l += 0.25) { var e = Math.abs(yuD(l) - D); if (!best || e < best.e) best = { l: l, e: e }; }
      return best && best.e < 0.08 ? best.l : NaN;
   }
   /* wavelength (nm) → sRGB (approximate, after D. Bruton) */
   function rgb(l) {
      var r = 0, g = 0, b = 0;
      if (l >= 380 && l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = -(l - 510) / 20; }
      else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else if (l <= 780) { r = 1; }
      var f = l < 380 || l > 780 ? 0 : l < 420 ? .3 + .7 * (l - 380) / 40 : l > 700 ? .3 + .7 * (780 - l) / 80 : 1;
      function c(v) { return Math.round(255 * Math.pow(v * f, .8)); }
      return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
   }
   function region(l) {
      return l < 380 ? T('ultraviolet (invisible)', 'ultravioleta (invisible)') : l > 780 ? T('infrared (invisible)', 'infrarrojo (invisible)')
         : l < 450 ? T('violet', 'violeta') : l < 495 ? T('blue', 'azul') : l < 570 ? T('green', 'verde') : l < 590 ? T('yellow', 'amarillo') : l < 620 ? T('orange', 'naranja') : T('red', 'rojo');
   }

   function fill() {
      var s = $('qd-mat'), v = s.value || 'CdSe';
      s.innerHTML = Object.keys(M).map(function (k) { return '<option value="' + k + '">' + k + ' (E<sub>g</sub> ' + fmt(M[k].eg, 2) + ' eV)</option>'.replace(/<\/?sub>/g, ''); }).join('');
      s.value = v;
   }
   function update() {
      var m = M[$('qd-mat').value], D = +$('qd-d').value, E = brus(m, D), l = HC / E, aB = bohr(m);
      $('qd-d-out').textContent = fmt(D, 1) + ' nm';
      $('qd-e').textContent = fmt(E, 2);
      $('qd-l').textContent = fmt(l, 0);
      $('qd-shift').textContent = '+' + fmt(E - m.eg, 2) + ' eV';
      $('qd-ab').textContent = fmt(aB, 1) + ' nm';
      var ratio = D / 2 / aB;
      $('qd-regime').textContent = ratio < 1 ? T('strong confinement (R < a_B)', 'confinamiento fuerte (R < a_B)') : ratio < 3 ? T('intermediate confinement', 'confinamiento intermedio') : T('weak confinement: almost bulk', 'confinamiento débil: casi como el material en bloque');
      $('qd-color').textContent = region(l);
      var col = rgb(l), vis = l >= 380 && l <= 780;
      /* glowing dot */
      var r = 30 + D * 9;
      $('qd-dot').innerHTML = '<defs><radialGradient id="qd-g"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="' + (vis ? col : '#777') + '"/><stop offset="1" stop-color="' + (vis ? col : '#777') + '" stop-opacity="0"/></radialGradient></defs>' +
         '<circle cx="150" cy="150" r="' + Math.min(140, r * 1.6) + '" fill="url(#qd-g)" opacity="' + (vis ? .9 : .35) + '"/>' +
         '<circle cx="150" cy="150" r="' + r + '" fill="' + (vis ? col : '#5c6466') + '" stroke="rgba(255,255,255,.35)" stroke-width="2"/>' +
         (vis ? '' : '<text x="150" y="155" text-anchor="middle" class="qd-inv">' + (l < 380 ? 'UV' : 'IR') + '</text>');
      /* spectrum bar */
      var bar = $('qd-bar'), pos = Math.max(0, Math.min(100, (l - 380) / 400 * 100));
      bar.style.setProperty('--qd-pos', pos + '%');
      $('qd-marker').hidden = !vis;
      $('qd-out-of').textContent = vis ? '' : (l < 380 ? '◄ UV ' + fmt(l, 0) + ' nm' : 'IR ' + fmt(l, 0) + ' nm ►');
      /* empirical CdSe */
      var yu = m === M.CdSe ? yuLambda(D) : NaN;
      $('qd-yu-wrap').hidden = m !== M.CdSe;
      $('qd-yu').textContent = isFinite(yu) ? fmt(yu, 0) + ' nm (' + fmt(HC / yu, 2) + ' eV)' : T('outside the 1.5–8 nm range of the curve', 'fuera del rango 1,5–8 nm de la curva');
      plot(m, D, E);
      series(m);
   }
   function plot(m, D, E) {
      var svg = $('qd-plot'), narrow = (svg.parentNode.clientWidth || 600) < 500;
      var W = narrow ? 460 : 560, H = narrow ? 320 : 280, L = 50, R = 14, Tp = 14, B = 42;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var d0 = 1.5, d1 = 12, e0 = Math.max(0, m.eg - .2), e1 = brus(m, d0) * 1.02;
      if (e1 - m.eg > 4) e1 = m.eg + 4;
      var X = function (x) { return L + (x - d0) / (d1 - d0) * (W - L - R); }, Y = function (y) { return H - B - (y - e0) / (e1 - e0) * (H - Tp - B); };
      var g = '', t, st = (e1 - e0) > 2 ? 1 : 0.5;
      for (t = 2; t <= 12; t += 2) g += '<line class="wh-grid" x1="' + X(t) + '" x2="' + X(t) + '" y1="' + Tp + '" y2="' + (H - B) + '"/><text class="wh-tick" x="' + X(t) + '" y="' + (H - B + 17) + '" text-anchor="middle">' + t + '</text>';
      for (t = Math.ceil(e0 / st) * st; t <= e1; t += st) g += '<line class="wh-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="wh-tick" x="' + (L - 7) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + fmt(t, st < 1 ? 1 : 0) + '</text>';
      g += '<line class="wh-axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/><line class="wh-axis" x1="' + L + '" x2="' + L + '" y1="' + Tp + '" y2="' + (H - B) + '"/>';
      g += '<line class="tc-edge" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(m.eg) + '" y2="' + Y(m.eg) + '"/><text class="tc-eg-lbl small" x="' + (W - R - 4) + '" y="' + (Y(m.eg) - 6) + '" text-anchor="end">' + T('bulk', 'en bloque') + ' ' + fmt(m.eg, 2) + ' eV</text>';
      var p = '';
      for (var x = d0; x <= d1 + 1e-9; x += 0.05) { var y = Math.min(e1, brus(m, x)); p += (x === d0 ? 'M' : 'L') + X(x).toFixed(1) + ' ' + Y(y).toFixed(1); }
      g += '<path class="tc-curve" d="' + p + '"/>';
      if (m === M.CdSe) {
         var q = '', first = true;
         for (x = 1.6; x <= 8; x += 0.05) { var l = yuLambda(x); if (!isFinite(l)) continue; q += (first ? 'M' : 'L') + X(x).toFixed(1) + ' ' + Y(HC / l).toFixed(1); first = false; }
         g += '<path class="qd-yu-line" d="' + q + '"/>';
      }
      g += '<circle class="tc-eg" cx="' + X(D) + '" cy="' + Y(Math.min(e1, E)) + '" r="7"/>';
      g += '<text class="wh-axt" x="' + ((L + W - R) / 2) + '" y="' + (H - 5) + '" text-anchor="middle">' + T('Diameter (nm)', 'Diámetro (nm)') + '</text>';
      g += '<text class="wh-axt" transform="translate(14 ' + ((Tp + H - B) / 2) + ') rotate(-90)" text-anchor="middle">' + T('Gap energy (eV)', 'Energía de la brecha (eV)') + '</text>';
      svg.innerHTML = g;
   }
   function series(m) {
      var h = '';
      [2, 2.5, 3, 4, 5, 6, 8].forEach(function (D) {
         var l = HC / brus(m, D), vis = l >= 380 && l <= 780;
         h += '<button type="button" class="qd-chip" data-d="' + D + '"><i style="background:' + (vis ? rgb(l) : '#5c6466') + ';width:' + (12 + D * 3) + 'px;height:' + (12 + D * 3) + 'px"></i><span>' + fmt(D, 1) + ' nm</span><small>' + (vis ? fmt(l, 0) + ' nm' : (l < 380 ? 'UV' : 'IR')) + '</small></button>';
      });
      $('qd-series').innerHTML = h;
   }
   $('qd-series').addEventListener('click', function (e) { var b = e.target.closest('.qd-chip'); if (b) { $('qd-d').value = b.getAttribute('data-d'); update(); } });
   ['qd-mat', 'qd-d'].forEach(function (id) { $(id).addEventListener('input', update); $(id).addEventListener('change', update); });
   var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(update, 150); });
   fill(); update();
   if (window.frsmI18n) window.frsmI18n.onChange(function () { fill(); update(); });
})();
