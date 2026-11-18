/* =====================================================================
   FRSM 2.0.7 — Spectroscopy unit converter + Raman shift calculator
   E(eV) = 1239.84198 / λ(nm) ; 1 eV = 8065.544 cm⁻¹ = 241.7989 THz = 96.4853 kJ/mol
   Raman: 1/λs = 1/λ0 − Δν̃  (Stokes) ;  1/λas = 1/λ0 + Δν̃  (anti-Stokes)
   ===================================================================== */
(function () {
   'use strict';
   var $ = function (id) { return document.getElementById(id); };
   if (!$('un-val')) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function loc(s) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   function sig(x) { if (!isFinite(x) || x <= 0) return '—'; var a = Math.abs(x); return loc(a >= 1e5 || a < 1e-3 ? x.toExponential(4) : x.toPrecision(6).replace(/\.?0+$/, '')); }
   var HC = 1239.84198;
   var U = {   // to eV and back
      nm: { toE: function (v) { return HC / v; }, fromE: function (e) { return HC / e; }, lab: 'nm' },
      um: { toE: function (v) { return HC / (v * 1000); }, fromE: function (e) { return HC / e / 1000; }, lab: 'µm' },
      A: { toE: function (v) { return HC / (v / 10); }, fromE: function (e) { return HC / e * 10; }, lab: 'Å' },
      eV: { toE: function (v) { return v; }, fromE: function (e) { return e; }, lab: 'eV' },
      meV: { toE: function (v) { return v / 1000; }, fromE: function (e) { return e * 1000; }, lab: 'meV' },
      cm: { toE: function (v) { return v / 8065.544; }, fromE: function (e) { return e * 8065.544; }, lab: 'cm⁻¹' },
      THz: { toE: function (v) { return v / 241.79893; }, fromE: function (e) { return e * 241.79893; }, lab: 'THz' },
      kJ: { toE: function (v) { return v / 96.485332; }, fromE: function (e) { return e * 96.485332; }, lab: 'kJ/mol' }
   };
   function region(nm) {
      if (nm < 0.01) return T('gamma rays', 'rayos gamma');
      if (nm < 10) return T('X-rays', 'rayos X');
      if (nm < 100) return T('extreme UV', 'UV extremo');
      if (nm < 280) return 'UV-C';
      if (nm < 315) return 'UV-B';
      if (nm < 380) return 'UV-A';
      if (nm <= 780) return T('visible', 'visible') + ' (' + (nm < 450 ? T('violet', 'violeta') : nm < 495 ? T('blue', 'azul') : nm < 570 ? T('green', 'verde') : nm < 590 ? T('yellow', 'amarillo') : nm < 620 ? T('orange', 'naranja') : T('red', 'rojo')) + ')';
      if (nm < 2500) return T('near infrared (NIR)', 'infrarrojo cercano (NIR)');
      if (nm < 25000) return T('mid infrared (MIR, FTIR)', 'infrarrojo medio (MIR, FTIR)');
      if (nm < 1e6) return T('far infrared / terahertz', 'infrarrojo lejano / terahercios');
      return T('microwaves', 'microondas');
   }
   function convert() {
      var v = parseFloat(String($('un-val').value).replace(',', '.')), u = $('un-unit').value, e = U[u].toE(v);
      var rows = '';
      Object.keys(U).forEach(function (k) { rows += '<tr' + (k === u ? ' class="un-src"' : '') + '><td>' + U[k].lab + '</td><td><b>' + sig(U[k].fromE(e)) + '</b></td></tr>'; });
      $('un-rows').innerHTML = rows;
      $('un-region').textContent = isFinite(e) && e > 0 ? region(HC / e) : '—';
   }
   function raman() {
      var l0 = parseFloat(String($('rm-l0').value).replace(',', '.')), sh = parseFloat(String($('rm-shift').value).replace(',', '.'));
      var k0 = 1e7 / l0, ls = 1e7 / (k0 - sh), las = 1e7 / (k0 + sh);
      $('rm-stokes').textContent = sig(ls) + ' nm';
      $('rm-anti').textContent = sig(las) + ' nm';
      $('rm-de').textContent = sig(sh / 8065.544 * 1000) + ' meV';
      var lobs = parseFloat(String($('rm-obs').value).replace(',', '.'));
      $('rm-back').textContent = lobs > 0 ? sig(k0 - 1e7 / lobs) + ' cm⁻¹' : '—';
   }
   ['un-val', 'un-unit'].forEach(function (id) { $(id).addEventListener('input', convert); $(id).addEventListener('change', convert); });
   ['rm-l0', 'rm-shift', 'rm-obs'].forEach(function (id) { $(id).addEventListener('input', raman); });
   document.querySelectorAll('[data-un-preset]').forEach(function (b) {
      b.addEventListener('click', function () { var p = b.getAttribute('data-un-preset').split('|'); $('un-val').value = p[0]; $('un-unit').value = p[1]; convert(); });
   });
   convert(); raman();
   if (window.frsmI18n) window.frsmI18n.onChange(function () { convert(); raman(); });
})();
