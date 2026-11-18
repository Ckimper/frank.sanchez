/* =====================================================================
   FRSM 2.0.6 — Optical band gap from UV-Vis data (Tauc method)
   hν (eV) = 1239.84 / λ (nm)
   Absorbance:            α ∝ A            (thickness only rescales α; Eg does not change)
   Diffuse reflectance:   F(R) = (1 − R)² / (2R)   (Kubelka–Munk, F(R) ∝ α)
   Tauc:  (α hν)^(1/n) = B (hν − Eg)
          n = 1/2 direct allowed → exponent 2       n = 2 indirect allowed → exponent 1/2
          n = 3/2 direct forbidden → exponent 2/3   n = 3 indirect forbidden → exponent 1/3
   Eg = −intercept / slope of the linear part of the absorption edge.
   ===================================================================== */
(function (root) {
   'use strict';
   var HC = 1239.84;

   /* --- parse two numeric columns (comma, semicolon, tab or space; decimal comma accepted) --- */
   function parse(text) {
      var x = [], y = [], skipped = 0;
      String(text || '').split(/\r?\n/).forEach(function (line) {
         line = line.trim();
         if (!line || /^[#%!;/]/.test(line)) return;
         var parts;
         if (/\t/.test(line)) parts = line.split(/\t+/);
         else if (/;/.test(line)) parts = line.split(/\s*;\s*/);
         else if (/\d,\d+\s*,/.test(line) || /,\s+/.test(line) || (line.match(/,/g) || []).length === 1 && /\s/.test(line) === false && !/^\s*-?\d+,\d+\s*$/.test(line)) parts = line.split(/\s*,\s*/);
         else parts = line.split(/\s+/);
         parts = parts.filter(function (p) { return p !== ''; });
         if (parts.length < 2) { skipped++; return; }
         var a = parseFloat(parts[0].replace(',', '.')), b = parseFloat(parts[1].replace(',', '.'));
         if (!isFinite(a) || !isFinite(b)) { skipped++; return; }
         x.push(a); y.push(b);
      });
      return { x: x, y: y, skipped: skipped };
   }

   /* --- build Tauc points --- */
   function prepare(d, o) {
      o = o || {};
      var n = d.x.length; if (!n) return { pts: [], info: {} };
      var maxX = Math.max.apply(null, d.x), maxY = Math.max.apply(null, d.y);
      var xunit = o.xunit && o.xunit !== 'auto' ? o.xunit : (maxX > 20 ? 'nm' : 'eV');
      var runit = o.runit && o.runit !== 'auto' ? o.runit : (maxY > 1.5 ? 'pct' : 'frac');
      var p = o.p || 2, pts = [];
      for (var i = 0; i < n; i++) {
         var E = xunit === 'nm' ? HC / d.x[i] : d.x[i];
         if (!(E > 0) || !isFinite(E)) continue;
         var raw = d.y[i], f;
         if (o.mode === 'R') {
            var R = runit === 'pct' ? raw / 100 : raw;
            R = Math.min(0.9999, Math.max(1e-4, R));
            f = (1 - R) * (1 - R) / (2 * R);
         } else {
            f = Math.max(0, raw);
         }
         pts.push({ E: E, raw: raw, f: f, y: Math.pow(f * E, p), lam: xunit === 'nm' ? d.x[i] : HC / d.x[i] });
      }
      pts.sort(function (a, b) { return a.E - b.E; });
      /* optional baseline: subtract the mean F (or A) of the lowest-energy 8% of the spectrum (below the edge) */
      var base = 0;
      if (o.baseline && pts.length > 10) {
         var k = Math.max(3, Math.round(pts.length * 0.08));
         for (var j = 0; j < k; j++) base += pts[j].f;
         base /= k;
         pts.forEach(function (q) { q.f = Math.max(0, q.f - base); q.y = Math.pow(q.f * q.E, p); });
      }
      return { pts: pts, info: { xunit: xunit, runit: runit, n: pts.length, base: base } };
   }

   function linfit(pts) {
      var n = pts.length; if (n < 2) return null;
      var sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
      pts.forEach(function (q) { sx += q.E; sy += q.y; sxx += q.E * q.E; sxy += q.E * q.y; syy += q.y * q.y; });
      var den = n * sxx - sx * sx; if (Math.abs(den) < 1e-15) return null;
      var m = (n * sxy - sx * sy) / den, b = (sy - m * sx) / n;
      var ym = sy / n, ssr = 0, sst = 0;
      pts.forEach(function (q) { ssr += Math.pow(q.y - (m * q.E + b), 2); sst += Math.pow(q.y - ym, 2); });
      return { m: m, b: b, r2: sst > 0 ? 1 - ssr / sst : 1, n: n };
   }

   function fit(pts, e0, e1) {
      var sel = pts.filter(function (q) { return q.E >= Math.min(e0, e1) && q.E <= Math.max(e0, e1); });
      var r = linfit(sel); if (!r) return null;
      r.Eg = r.m !== 0 ? -r.b / r.m : NaN;
      r.e0 = Math.min(e0, e1); r.e1 = Math.max(e0, e1);
      return r;
   }

   /* --- automatic choice of the linear region: steepest, straightest part of the edge --- */
   function auto(pts) {
      var n = pts.length; if (n < 8) return null;
      var ymax = 0; pts.forEach(function (q) { if (q.y > ymax) ymax = q.y; });
      if (!(ymax > 0)) return null;
      var w = Math.max(6, Math.round(n * 0.04)), best = null;
      for (var i = 0; i + w <= n; i++) {
         var win = pts.slice(i, i + w), lo = win[0].y / ymax, hi = win[w - 1].y / ymax;
         if (lo < 0.08 || hi > 0.92) continue;
         var r = linfit(win); if (!r || r.m <= 0 || r.r2 < 0.98) continue;
         var score = r.m * r.r2 * r.r2;
         if (!best || score > best.score) best = { i: i, j: i + w - 1, score: score };
      }
      if (!best) return null;
      var i0 = best.i, j0 = best.j, grow = true;
      /* widen only while the new point lies on the current straight line (residual < 1.5% of the maximum) */
      function onLine(k, r) { return Math.abs(pts[k].y - (r.m * pts[k].E + r.b)) < 0.015 * ymax; }
      while (grow) {
         grow = false;
         var cur = linfit(pts.slice(i0, j0 + 1));
         if (i0 > 0 && pts[i0 - 1].y / ymax >= 0.04 && onLine(i0 - 1, cur)) { i0--; grow = true; cur = linfit(pts.slice(i0, j0 + 1)); }
         if (j0 < n - 1 && pts[j0 + 1].y / ymax <= 0.97 && onLine(j0 + 1, cur)) { j0++; grow = true; }
      }
      return { e0: pts[i0].E, e1: pts[j0].E };
   }

   /* --- Urbach energy: alpha = alpha0 exp((hv - E0)/Eu)  ->  ln(alpha) linear in hv, slope 1/Eu --- */
   function lnPoints(pts) {
      return pts.filter(function (q) { return q.f > 0; }).map(function (q) { return { E: q.E, y: Math.log(q.f), f: q.f, lam: q.lam, raw: q.raw }; });
   }
   function urbachFit(lp, e0, e1) {
      var r = fit(lp, e0, e1); if (!r) return null;
      r.Eu = r.m > 0 ? 1000 / r.m : NaN;      // meV
      return r;
   }
   function urbachAuto(lp, egMax) {
      var cand = lp.filter(function (q) { return !egMax || q.E <= egMax; });
      var n = cand.length; if (n < 8) return null;
      var w = Math.max(6, Math.round(lp.length * 0.03)), best = null;
      for (var i = 0; i + w <= n; i++) {
         var r = linfit(cand.slice(i, i + w)); if (!r || r.m <= 0 || r.r2 < 0.99) continue;
         if (!best || r.m > best.m) best = { i: i, j: i + w - 1, m: r.m };
      }
      if (!best) return null;
      var i0 = best.i, j0 = best.j, grow = true, span = cand[n - 1].y - cand[0].y || 1;
      function onLine(k, r) { return Math.abs(cand[k].y - (r.m * cand[k].E + r.b)) < 0.02 * span; }
      while (grow) {
         grow = false;
         var cur = linfit(cand.slice(i0, j0 + 1));
         if (i0 > 0 && onLine(i0 - 1, cur)) { i0--; grow = true; cur = linfit(cand.slice(i0, j0 + 1)); }
         if (j0 < n - 1 && onLine(j0 + 1, cur)) { j0++; grow = true; }
      }
      return { e0: cand[i0].E, e1: cand[j0].E };
   }

   /* --- simulated spectra for the example (not measured data) --- */
   function example(mode, Eg, kind, bg, opt) {
      bg = bg == null ? 0.004 : bg; opt = opt || {};
      var eu = opt.eu || 0.06, tail = opt.tail == null ? 0.012 : opt.tail;
      var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; }
      var lines = ['# wavelength_nm, ' + (mode === 'R' ? 'R_percent' : 'absorbance') + '  (simulated: Eg = ' + Eg + ' eV ' + kind + (opt.eu ? ', Urbach Eu = ' + Math.round(eu * 1000) + ' meV' : '') + ')'];
      for (var lam = 300; lam <= 800; lam += 1) {
         var E = HC / lam, dE = E - Eg;
         var edge = dE > 0 ? (kind === 'direct' ? Math.sqrt(dE) : dE * dE) / E : 0;
         var a0 = 2.2 * edge, alpha = a0 / (1 + Math.pow(a0 / 2.2, 3)) + (dE < 0 ? tail * Math.exp(dE / eu) : tail) * (bg > 0 || opt.eu ? 1 : 0) + bg;   // edge (saturating) + Urbach tail + background
         if (mode === 'R') {
            var F = alpha * 1.4, R = 1 + F - Math.sqrt(F * F + 2 * F);
            lines.push(lam + ', ' + (100 * R * (1 + 0.002 * rnd())).toFixed(4));
         } else {
            lines.push(lam + ', ' + (alpha * 1.6 * (1 + 0.002 * rnd())).toFixed(5));
         }
      }
      return lines.join('\n');
   }
   var api = { parse: parse, prepare: prepare, fit: fit, auto: auto, example: example, lnPoints: lnPoints, urbachFit: urbachFit, urbachAuto: urbachAuto, HC: HC };
   root.FRSM_TAUC = api;
   if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
