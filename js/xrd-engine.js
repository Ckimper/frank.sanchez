/* =====================================================================
   FRSM 2.0.5 — Powder XRD simulation from a crystal structure
   I(hkl) ∝ |F(hkl)|² · Lp(θ)        (multiplicity: every hkl is summed)
   F(hkl) = Σ_j occ_j · f_j(s) · exp(−B s²) · exp[2πi(hx_j + ky_j + lz_j)],  s = sinθ/λ
   f_j(s): Cromer–Mann coefficients (International Tables for Crystallography, Vol. C)
   Lp = (1 + cos²2θ) / (sin²θ · cosθ)
   Peak width (FWHM): Scherrer size broadening + instrumental width, pseudo-Voigt profile.
   Only orthogonal cells (cubic, tetragonal, orthorhombic) are needed here.
   ===================================================================== */
(function (root) {
   'use strict';

   var CM = {   // a1 b1 a2 b2 a3 b3 a4 b4 c
      O:  [3.0485, 13.2771, 2.2868, 5.7011, 1.5463, 0.3239, 0.867, 32.9089, 0.2508],
      Mg: [5.4204, 2.8275, 2.1735, 79.2611, 1.2269, 0.3808, 2.3073, 7.1937, 0.8584],
      Al: [6.4202, 3.0387, 1.9002, 0.7426, 1.5936, 31.5472, 1.9646, 85.0886, 1.1151],
      Si: [6.2915, 2.4386, 3.0353, 32.3337, 1.9891, 0.6785, 1.541, 81.6937, 1.1407],
      Mn: [11.2819, 5.3409, 7.3573, 0.3432, 3.0193, 17.8674, 2.2441, 83.7543, 1.0896],
      Fe: [11.7695, 4.7611, 7.3573, 0.3072, 3.5222, 15.3535, 2.3045, 76.8805, 1.0369],
      H:  [0.489918, 20.6593, 0.262003, 7.74039, 0.196767, 49.5519, 0.049879, 2.20159, 0.001305],
      N:  [12.2126, 0.0057, 3.1322, 9.8933, 2.0125, 28.9975, 1.1663, 0.5826, -11.529],
      V:  [10.2971, 6.8657, 7.3511, 0.4385, 2.0703, 26.8938, 2.0571, 102.478, 1.2199],
      Zn: [14.0743, 3.2655, 7.0318, 0.2333, 5.1652, 10.3163, 2.41, 58.7097, 1.3041],
      Ag: [19.2808, 0.6446, 16.6885, 7.4726, 4.8045, 24.6605, 1.0463, 99.8156, 5.179]
   };
   function fAtom(el, s2) {   // s2 = (sinθ/λ)²
      var c = CM[el], f = c[8];
      for (var i = 0; i < 8; i += 2) f += c[i] * Math.exp(-c[i + 1] * s2);
      return f;
   }
   var RAD = Math.PI / 180;

   function simulate(st, o) {
      o = o || {};
      var lam = o.lambda || 1.5406, t0 = o.min == null ? 10 : o.min, t1 = o.max || 90;
      var B = o.B == null ? 0.5 : o.B, D = (o.D || 40) * 10, K = o.K || 0.9, inst = o.inst == null ? 0.05 : o.inst;
      var a = st.cell[0], b = st.cell[1], c = st.cell[2];
      var al = (st.cell[3] || 90) * RAD, be = (st.cell[4] || 90) * RAD, ga = (st.cell[5] || 90) * RAD;
      /* reciprocal metric tensor (any cell): G* = G^-1 */
      var G = [[a * a, a * b * Math.cos(ga), a * c * Math.cos(be)], [a * b * Math.cos(ga), b * b, b * c * Math.cos(al)], [a * c * Math.cos(be), b * c * Math.cos(al), c * c]];
      var det = G[0][0] * (G[1][1] * G[2][2] - G[1][2] * G[2][1]) - G[0][1] * (G[1][0] * G[2][2] - G[1][2] * G[2][0]) + G[0][2] * (G[1][0] * G[2][1] - G[1][1] * G[2][0]);
      var R = [[(G[1][1] * G[2][2] - G[1][2] * G[2][1]) / det, (G[0][2] * G[2][1] - G[0][1] * G[2][2]) / det, (G[0][1] * G[1][2] - G[0][2] * G[1][1]) / det],
               [(G[1][2] * G[2][0] - G[1][0] * G[2][2]) / det, (G[0][0] * G[2][2] - G[0][2] * G[2][0]) / det, (G[0][2] * G[1][0] - G[0][0] * G[1][2]) / det],
               [(G[1][0] * G[2][1] - G[1][1] * G[2][0]) / det, (G[0][1] * G[2][0] - G[0][0] * G[2][1]) / det, (G[0][0] * G[1][1] - G[0][1] * G[1][0]) / det]];
      var dmin = lam / (2 * Math.sin(t1 / 2 * RAD));
      var H = Math.ceil(a / dmin) + 1, Kk = Math.ceil(b / dmin) + 1, L = Math.ceil(c / dmin) + 1;
      var right = Math.abs(al - Math.PI / 2) < 1e-6 && Math.abs(be - Math.PI / 2) < 1e-6 && Math.abs(ga - Math.PI / 2) < 1e-6;
      var cubic = right && Math.abs(a - b) < 1e-6 && Math.abs(a - c) < 1e-6;
      /* label of a reflection: the most "natural" member (non-negative indices first, then largest h,k,l) */
      function score(v) { var n = 0; v.forEach(function (x) { if (x >= 0) n++; }); return n * 1e9 + (v[1] >= 0 && v[2] >= 0 ? 1e8 : 0) + (v[0] + 50) * 1e4 + (v[1] + 50) * 100 + (v[2] + 50); }
      var groups = {};
      for (var h = -H; h <= H; h++) for (var k = -Kk; k <= Kk; k++) for (var l = -L; l <= L; l++) {
         if (!h && !k && !l) continue;
         var hv = [h, k, l], inv = 0;
         for (var r = 0; r < 3; r++) for (var q = 0; q < 3; q++) inv += hv[r] * R[r][q] * hv[q];
         var d = 1 / Math.sqrt(inv);
         if (d < dmin) continue;
         var sth = lam / (2 * d); if (sth >= 1) continue;
         var tth = 2 * Math.asin(sth) / RAD; if (tth < t0) continue;
         var s2 = inv / 4, re = 0, im = 0, fcache = {};
         for (var j = 0; j < st.atoms.length; j++) {
            var at = st.atoms[j], site = st.sites[at[0]];
            var f = fcache[site.el] || (fcache[site.el] = fAtom(site.el, s2) * Math.exp(-B * s2));
            var ph = 2 * Math.PI * (h * at[1] + k * at[2] + l * at[3]);
            re += site.occ * f * Math.cos(ph); im += site.occ * f * Math.sin(ph);
         }
         var F2 = re * re + im * im;
         var key = d.toFixed(5);
         var g = groups[key] || (groups[key] = { d: d, tth: tth, F2: 0, n: 0, fam: {} });
         g.F2 += F2; g.n++;
         if (F2 > 1e-6) {
            /* cubic: (511) and (333) share d but are different families -> keep both labels */
            var fk = cubic ? [Math.abs(h), Math.abs(k), Math.abs(l)].sort(function (x, y) { return y - x; }).join(' ') : 'all';
            var fm = g.fam[fk] || (g.fam[fk] = { F2: 0, rep: hv, sc: -1 });
            fm.F2 += F2;
            var sc = score(hv); if (sc > fm.sc) { fm.sc = sc; fm.rep = hv; }
         }
      }
      var peaks = [];
      Object.keys(groups).forEach(function (key) {
         var g = groups[key], th = g.tth / 2 * RAD;
         var lp = (1 + Math.pow(Math.cos(2 * th), 2)) / (Math.sin(th) * Math.sin(th) * Math.cos(th));
         var I = g.F2 * lp;
         var fams = Object.keys(g.fam).sort(function (x, y) { return g.fam[y].F2 - g.fam[x].F2; });
         if (!fams.length) return;
         peaks.push({ tth: g.tth, d: g.d, I: I, hkl: fams.map(function (f) { return g.fam[f].rep; }), mult: g.n,
                      F: Math.sqrt(g.F2 / g.n) });
      });
      var Imax = Math.max.apply(null, peaks.map(function (p) { return p.I; }));
      peaks = peaks.filter(function (p) { return p.I / Imax > 1e-3; });
      peaks.forEach(function (p) {
         p.rel = 100 * p.I / Imax;
         var th = p.tth / 2 * RAD;
         var bs = K * lam / (D * Math.cos(th)) / RAD;                 // size broadening, degrees
         p.fwhm = Math.sqrt(bs * bs + inst * inst);
      });
      peaks.sort(function (x, y) { return x.tth - y.tth; });

      /* pseudo-Voigt profile (η = 0.5), integrated intensity preserved */
      var step = o.step || 0.02, n = Math.round((t1 - t0) / step) + 1, y = new Float64Array(n), eta = 0.5;
      peaks.forEach(function (p) {
         var w = p.fwhm, gs = w / (2 * Math.sqrt(2 * Math.log(2))), hl = w / 2;
         var i0 = Math.max(0, Math.floor((p.tth - 12 * w - t0) / step)), i1 = Math.min(n - 1, Math.ceil((p.tth + 12 * w - t0) / step));
         for (var i = i0; i <= i1; i++) {
            var x = t0 + i * step - p.tth;
            var G = Math.exp(-x * x / (2 * gs * gs)) / (gs * Math.sqrt(2 * Math.PI));
            var Lr = hl / (Math.PI * (x * x + hl * hl));
            y[i] += p.rel * (eta * Lr + (1 - eta) * G);
         }
      });
      var ymax = 0; for (var i = 0; i < n; i++) if (y[i] > ymax) ymax = y[i];
      var prof = [];
      for (i = 0; i < n; i++) prof.push([t0 + i * step, ymax ? 100 * y[i] / ymax : 0]);
      return { peaks: peaks, profile: prof, lambda: lam };
   }

   var api = { simulate: simulate, fAtom: fAtom };
   root.FRSM_XRD = api;
   if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
