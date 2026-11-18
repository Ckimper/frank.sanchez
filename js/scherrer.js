/* =====================================================================
   FRSM 2.0.4 — Scherrer calculator + Williamson–Hall analysis
   D = K·λ / (β·cos θ)          (β in radians, corrected for the instrument)
   ε = β / (4·tan θ)            (microstrain)
   δ = 1 / D²                   (dislocation density)
   W–H:  β·cos θ = K·λ/D + 4·ε·sin θ
   ===================================================================== */
(function () {
   'use strict';

   var form = document.getElementById('sch-form');
   if (!form) return;

   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function num(v) { return parseFloat(String(v).replace(',', '.')); }
   function fmt(x, d) {
      if (!isFinite(x)) return '—';
      var s = x.toFixed(d);
      return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s;
   }
   var RAD = Math.PI / 180;
   var $ = function (id) { return document.getElementById(id); };

   /* ---------- shared settings ---------- */
   function settings() {
      var lamSel = $('sch-lambda').value;
      var lam = lamSel === 'custom' ? num($('sch-lambda-custom').value) : num(lamSel);   // Å
      return { lam: lam, K: num($('sch-k').value), inst: num($('sch-inst').value) || 0 };
   }

   function corrected(fwhm, inst) {           // quadratic (Gaussian) correction
      if (!(inst > 0)) return fwhm;
      return fwhm > inst ? Math.sqrt(fwhm * fwhm - inst * inst) : NaN;
   }

   function calc(twoTheta, fwhm, s) {
      var th = twoTheta / 2 * RAD;
      var b = corrected(fwhm, s.inst) * RAD;          // rad
      var lamNm = s.lam / 10;
      var D = s.K * lamNm / (b * Math.cos(th));       // nm
      return {
         theta: th, beta: b, D: D,
         d: s.lam / (2 * Math.sin(th)),                // Å
         eps: b / (4 * Math.tan(th)),
         delta: 1000 / (D * D)                         // ×10^15 m^-2
      };
   }

   /* ---------- single peak ---------- */
   function single() {
      var s = settings();
      var tt = num($('sch-2theta').value), fw = num($('sch-fwhm').value);
      var msg = $('sch-msg');
      var err = '';
      if (!(s.lam > 0)) err = T('Enter a valid wavelength.', 'Ingresa una longitud de onda válida.');
      else if (!(s.K > 0)) err = T('Enter a valid shape factor K.', 'Ingresa un factor de forma K válido.');
      else if (!(tt > 0 && tt < 180)) err = T('2θ must be between 0° and 180°.', '2θ debe estar entre 0° y 180°.');
      else if (!(fw > 0)) err = T('The FWHM must be greater than 0.', 'El FWHM debe ser mayor que 0.');
      else if (s.inst >= fw) err = T('The instrumental broadening must be smaller than the measured FWHM.', 'El ensanchamiento instrumental debe ser menor que el FWHM medido.');
      msg.textContent = err; msg.hidden = !err;
      var r = err ? null : calc(tt, fw, s);
      $('sch-D').textContent = r ? fmt(r.D, 2) : '—';
      $('sch-d').textContent = r ? fmt(r.d, 4) : '—';
      $('sch-eps').textContent = r ? fmt(r.eps * 1000, 2) : '—';
      $('sch-delta').textContent = r ? fmt(r.delta, 2) : '—';
      $('sch-beta').textContent = r ? fmt(r.beta, 5) : '—';
      $('sch-warn').hidden = !(r && r.D > 100);
      wh();                                    // settings are shared
   }

   $('sch-lambda').addEventListener('change', function () {
      $('sch-lambda-custom-wrap').hidden = this.value !== 'custom';
      single();
   });
   form.addEventListener('input', single);
   form.addEventListener('submit', function (e) { e.preventDefault(); single(); });

   /* ---------- several peaks + Williamson–Hall ---------- */
   var tbody = $('wh-rows');

   function addRow(hkl, tt, fw) {
      var tr = document.createElement('tr');
      tr.innerHTML =
         '<td><input type="text" class="wh-hkl" maxlength="8" value="' + (hkl || '') + '" aria-label="hkl"></td>' +
         '<td><input type="number" class="wh-tt" step="0.01" min="0" max="180" inputmode="decimal" value="' + (tt || '') + '" aria-label="2θ"></td>' +
         '<td><input type="number" class="wh-fw" step="0.001" min="0" inputmode="decimal" value="' + (fw || '') + '" aria-label="FWHM"></td>' +
         '<td class="wh-D">—</td>' +
         '<td><button type="button" class="wh-del" aria-label="' + T('Remove peak', 'Quitar pico') + '">&times;</button></td>';
      tbody.appendChild(tr);
   }

   tbody.addEventListener('input', wh);
   tbody.addEventListener('click', function (e) {
      if (e.target.closest('.wh-del')) { e.target.closest('tr').remove(); wh(); }
   });
   $('wh-add').addEventListener('click', function () { addRow(); wh(); tbody.lastElementChild.querySelector('.wh-tt').focus(); });
   $('wh-clear').addEventListener('click', function () { tbody.innerHTML = ''; addRow(); addRow(); wh(); });

   /* Example: simulated Mn3O4 (hausmannite) peaks, Cu Kα1, D = 22 nm, ε = 1.5×10⁻³ */
   $('wh-example').addEventListener('click', function () {
      var a = 5.76, c = 9.46, lam = 1.5406, K = 0.9, D = 220, eps = 0.0015;   // D in Å
      $('sch-lambda').value = '1.5406'; $('sch-lambda-custom-wrap').hidden = true;
      $('sch-k').value = '0.9'; $('sch-inst').value = '0';
      tbody.innerHTML = '';
      [[1, 1, 2], [1, 0, 3], [2, 1, 1], [2, 2, 0], [2, 2, 4]].forEach(function (h) {
         var d = 1 / Math.sqrt((h[0] * h[0] + h[1] * h[1]) / (a * a) + h[2] * h[2] / (c * c));
         var th = Math.asin(lam / (2 * d));
         var beta = (K * lam / (D * Math.cos(th)) + 4 * eps * Math.tan(th)) / RAD;
         addRow('(' + h.join('') + ')', (2 * th / RAD).toFixed(2), beta.toFixed(3));
      });
      single();
      $('wh-note').hidden = false;
   });

   function wh() {
      var s = settings();
      var pts = [];
      tbody.querySelectorAll('tr').forEach(function (tr) {
         var tt = num(tr.querySelector('.wh-tt').value), fw = num(tr.querySelector('.wh-fw').value);
         var cell = tr.querySelector('.wh-D');
         if (tt > 0 && tt < 180 && fw > 0 && s.lam > 0 && s.K > 0 && fw > s.inst) {
            var r = calc(tt, fw, s);
            cell.textContent = fmt(r.D, 1);
            pts.push({ x: 4 * Math.sin(r.theta), y: r.beta * Math.cos(r.theta), D: r.D, label: tr.querySelector('.wh-hkl').value });
         } else cell.textContent = '—';
      });

      var out = $('wh-out');
      var mean = pts.length ? pts.reduce(function (t, p) { return t + p.D; }, 0) / pts.length : NaN;
      $('wh-mean').textContent = pts.length ? fmt(mean, 1) : '—';
      $('wh-n').textContent = pts.length;

      if (pts.length < 2) {
         $('wh-Dwh').textContent = '—'; $('wh-eps').textContent = '—'; $('wh-r2').textContent = '—';
         out.textContent = T('Enter at least 2 peaks to fit the Williamson–Hall line.', 'Ingresa al menos 2 picos para ajustar la recta de Williamson–Hall.');
         plot(pts, null); return;
      }
      var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
      pts.forEach(function (p) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
      var den = n * sxx - sx * sx;
      if (Math.abs(den) < 1e-12) { out.textContent = T('The peaks need different 2θ values.', 'Los picos deben tener valores de 2θ distintos.'); plot(pts, null); return; }
      var m = (n * sxy - sx * sy) / den, b = (sy - m * sx) / n;
      var ym = sy / n, ssr = 0, sst = 0;
      pts.forEach(function (p) { ssr += Math.pow(p.y - (m * p.x + b), 2); sst += Math.pow(p.y - ym, 2); });
      var r2 = sst > 0 ? 1 - ssr / sst : 1;
      var Dwh = b > 0 ? s.K * (s.lam / 10) / b : NaN;

      $('wh-Dwh').textContent = b > 0 ? fmt(Dwh, 1) : '—';
      $('wh-eps').textContent = fmt(m * 1000, 2);
      $('wh-r2').textContent = n > 2 ? fmt(r2, 3) : '—';
      out.textContent = b > 0
         ? (m < 0 ? T('Negative slope: the peaks suggest compressive strain or a non-uniform size distribution.', 'Pendiente negativa: los picos sugieren deformación compresiva o una distribución de tamaños no uniforme.') : '')
         : T('The intercept is not positive, so the size cannot be obtained. Check the FWHM values.', 'El intercepto no es positivo, así que no se puede obtener el tamaño. Revisa los valores de FWHM.');
      plot(pts, { m: m, b: b });
   }

   /* ---------- small SVG plot ---------- */
   function plot(pts, fit) {
      var svg = $('wh-plot');
      var W = 520, H = 300, L = 62, R = 16, Tp = 16, B = 46;
      if (!pts.length) { svg.innerHTML = '<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle" class="wh-empty">' + T('The Williamson–Hall plot will appear here', 'Aquí aparecerá el gráfico de Williamson–Hall') + '</text>'; return; }
      var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y * 1000; });
      var x0 = 0, x1 = Math.max.apply(null, xs) * 1.1;
      var lineYs = fit ? [fit.b * 1000, (fit.m * x1 + fit.b) * 1000] : [];
      var y0 = Math.min(0, Math.min.apply(null, ys.concat(lineYs))), y1 = Math.max.apply(null, ys.concat(lineYs)) * 1.15 || 1;
      var X = function (v) { return L + (v - x0) / (x1 - x0) * (W - L - R); };
      var Y = function (v) { return H - B - (v - y0) / (y1 - y0) * (H - Tp - B); };
      var g = '';
      for (var i = 0; i <= 4; i++) {
         var yv = y0 + (y1 - y0) * i / 4, xv = x0 + (x1 - x0) * i / 4;
         g += '<line class="wh-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/>';
         g += '<text class="wh-tick" x="' + (L - 8) + '" y="' + (Y(yv) + 4) + '" text-anchor="end">' + fmt(yv, 2) + '</text>';
         g += '<text class="wh-tick" x="' + X(xv) + '" y="' + (H - B + 18) + '" text-anchor="middle">' + fmt(xv, 2) + '</text>';
      }
      g += '<line class="wh-axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/>';
      g += '<line class="wh-axis" x1="' + L + '" x2="' + L + '" y1="' + Tp + '" y2="' + (H - B) + '"/>';
      if (fit) g += '<line class="wh-fit" x1="' + X(x0) + '" y1="' + Y(fit.b * 1000) + '" x2="' + X(x1) + '" y2="' + Y((fit.m * x1 + fit.b) * 1000) + '"/>';
      pts.forEach(function (p) {
         g += '<circle class="wh-pt" cx="' + X(p.x) + '" cy="' + Y(p.y * 1000) + '" r="5.5"><title>' + (p.label ? p.label + ' · ' : '') + 'D = ' + fmt(p.D, 1) + ' nm</title></circle>';
         if (p.label) g += '<text class="wh-lbl" x="' + X(p.x) + '" y="' + (Y(p.y * 1000) - 10) + '" text-anchor="middle">' + p.label.replace(/[<>&"]/g, '') + '</text>';
      });
      g += '<text class="wh-axt" x="' + ((L + W - R) / 2) + '" y="' + (H - 8) + '" text-anchor="middle">4 sin θ</text>';
      g += '<text class="wh-axt" transform="translate(16 ' + ((Tp + H - B) / 2) + ') rotate(-90)" text-anchor="middle">β cos θ (×10⁻³ rad)</text>';
      svg.innerHTML = g;
   }

   addRow(); addRow();
   single();
   if (window.frsmI18n) window.frsmI18n.onChange(single);
})();
