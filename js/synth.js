/* =====================================================================
   FRSM 2.0.7 — Synthesis calculator
   1) mass of precursor for a solution   m = C · V · MW / purity
   2) dilution                           C1·V1 = C2·V2
   3) theoretical yield of a reaction    m_prod = n_prec · ratio · MW_prod
   ===================================================================== */
(function () {
   'use strict';
   var $ = function (id) { return document.getElementById(id); };
   if (!$('sy-compound')) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function fmt(x, d) { if (!isFinite(x)) return '—'; var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }
   function num(id) { return parseFloat(String($(id).value).replace(',', '.')); }
   function sig(x) { if (!isFinite(x)) return '—'; var a = Math.abs(x); return fmt(x, a >= 100 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : a >= 0.01 ? 5 : 6); }

   /* molar masses (g/mol) from IUPAC atomic weights */
   var C = [
      ['MnCl2·4H2O', 'MnCl<sub>2</sub>·4H<sub>2</sub>O', 197.91],
      ['Mn(CH3COO)2·4H2O', 'Mn(CH<sub>3</sub>COO)<sub>2</sub>·4H<sub>2</sub>O', 245.09],
      ['MnSO4·H2O', 'MnSO<sub>4</sub>·H<sub>2</sub>O', 169.01],
      ['KMnO4', 'KMnO<sub>4</sub>', 158.03],
      ['Zn(CH3COO)2·2H2O', 'Zn(CH<sub>3</sub>COO)<sub>2</sub>·2H<sub>2</sub>O', 219.50],
      ['Zn(NO3)2·6H2O', 'Zn(NO<sub>3</sub>)<sub>2</sub>·6H<sub>2</sub>O', 297.48],
      ['ZnCl2', 'ZnCl<sub>2</sub>', 136.29],
      ['FeCl2·4H2O', 'FeCl<sub>2</sub>·4H<sub>2</sub>O', 198.81],
      ['FeCl3·6H2O', 'FeCl<sub>3</sub>·6H<sub>2</sub>O', 270.30],
      ['Fe(NO3)3·9H2O', 'Fe(NO<sub>3</sub>)<sub>3</sub>·9H<sub>2</sub>O', 404.00],
      ['NH4VO3', 'NH<sub>4</sub>VO<sub>3</sub>', 116.98],
      ['V2O5', 'V<sub>2</sub>O<sub>5</sub>', 181.88],
      ['AgNO3', 'AgNO<sub>3</sub>', 169.87],
      ['Mg(NO3)2·6H2O', 'Mg(NO<sub>3</sub>)<sub>2</sub>·6H<sub>2</sub>O', 256.41],
      ['Al(NO3)3·9H2O', 'Al(NO<sub>3</sub>)<sub>3</sub>·9H<sub>2</sub>O', 375.13],
      ['NaOH', 'NaOH', 40.00],
      ['KOH', 'KOH', 56.11],
      ['NaBH4', 'NaBH<sub>4</sub>', 37.83],
      ['Na3C6H5O7·2H2O', 'Citrato de sodio dihidratado / Sodium citrate dihydrate', 294.10],
      ['custom', null, null]
   ];
   var MW = { 'Mn3O4': 228.81, 'ZnO': 81.38, 'Fe3O4': 231.53, 'V2O5': 181.88, 'Ag': 107.87, 'MgAl2O4': 142.27 };

   /* reactions: precursor, product, mol of product per mol of precursor, base per mol precursor, co-precursors */
   var R = [
      { id: 'mn3o4', prec: 'MnCl2·4H2O', prod: 'Mn3O4', ratio: 1 / 3, base: ['NaOH', 2], eq: '3 MnCl<sub>2</sub> + 6 NaOH + &frac12; O<sub>2</sub> &rarr; Mn<sub>3</sub>O<sub>4</sub> + 6 NaCl + 3 H<sub>2</sub>O',
        en: 'Mn<sub>3</sub>O<sub>4</sub> by coprecipitation (MnCl<sub>2</sub> + NaOH, room temperature)', es: 'Mn<sub>3</sub>O<sub>4</sub> por coprecipitación (MnCl<sub>2</sub> + NaOH, temperatura ambiente)' },
      { id: 'mn3o4ac', prec: 'Mn(CH3COO)2·4H2O', prod: 'Mn3O4', ratio: 1 / 3, base: ['NaOH', 2], eq: '3 Mn(CH<sub>3</sub>COO)<sub>2</sub> + 6 NaOH + &frac12; O<sub>2</sub> &rarr; Mn<sub>3</sub>O<sub>4</sub> + 6 CH<sub>3</sub>COONa + 3 H<sub>2</sub>O',
        en: 'Mn<sub>3</sub>O<sub>4</sub> from manganese acetate', es: 'Mn<sub>3</sub>O<sub>4</sub> a partir de acetato de manganeso' },
      { id: 'zno', prec: 'Zn(CH3COO)2·2H2O', prod: 'ZnO', ratio: 1, base: ['NaOH', 2], eq: 'Zn(CH<sub>3</sub>COO)<sub>2</sub> + 2 NaOH &rarr; ZnO + 2 CH<sub>3</sub>COONa + H<sub>2</sub>O',
        en: 'ZnO from zinc acetate (sol-gel / precipitation)', es: 'ZnO a partir de acetato de zinc (sol-gel / precipitación)' },
      { id: 'zno2', prec: 'Zn(NO3)2·6H2O', prod: 'ZnO', ratio: 1, base: ['NaOH', 2], eq: 'Zn(NO<sub>3</sub>)<sub>2</sub> + 2 NaOH &rarr; ZnO + 2 NaNO<sub>3</sub> + H<sub>2</sub>O',
        en: 'ZnO from zinc nitrate', es: 'ZnO a partir de nitrato de zinc' },
      { id: 'fe3o4', prec: 'FeCl2·4H2O', prod: 'Fe3O4', ratio: 1, base: ['NaOH', 8], co: [['FeCl3·6H2O', 2]], eq: 'FeCl<sub>2</sub> + 2 FeCl<sub>3</sub> + 8 NaOH &rarr; Fe<sub>3</sub>O<sub>4</sub> + 8 NaCl + 4 H<sub>2</sub>O',
        en: 'Fe<sub>3</sub>O<sub>4</sub> by coprecipitation (Massart, Fe<sup>2+</sup>:Fe<sup>3+</sup> = 1:2)', es: 'Fe<sub>3</sub>O<sub>4</sub> por coprecipitación (Massart, Fe<sup>2+</sup>:Fe<sup>3+</sup> = 1:2)' },
      { id: 'v2o5', prec: 'NH4VO3', prod: 'V2O5', ratio: 1 / 2, eq: '2 NH<sub>4</sub>VO<sub>3</sub> &rarr; V<sub>2</sub>O<sub>5</sub> + 2 NH<sub>3</sub> + H<sub>2</sub>O (&Delta;)',
        en: 'V<sub>2</sub>O<sub>5</sub> by calcination of NH<sub>4</sub>VO<sub>3</sub>', es: 'V<sub>2</sub>O<sub>5</sub> por calcinación de NH<sub>4</sub>VO<sub>3</sub>' },
      { id: 'ag', prec: 'AgNO3', prod: 'Ag', ratio: 1, eq: 'Ag<sup>+</sup> + e<sup>&minus;</sup> &rarr; Ag<sup>0</sup> (NaBH<sub>4</sub> or citrate / NaBH<sub>4</sub> o citrato)',
        en: 'Ag nanoparticles by chemical reduction', es: 'Nanopartículas de Ag por reducción química' },
      { id: 'mgal2o4', prec: 'Mg(NO3)2·6H2O', prod: 'MgAl2O4', ratio: 1, co: [['Al(NO3)3·9H2O', 2]], eq: 'Mg(NO<sub>3</sub>)<sub>2</sub> + 2 Al(NO<sub>3</sub>)<sub>3</sub> &rarr; MgAl<sub>2</sub>O<sub>4</sub> (sol-gel / combustion + &Delta;)',
        en: 'MgAl<sub>2</sub>O<sub>4</sub> spinel from nitrates', es: 'Espinela MgAl<sub>2</sub>O<sub>4</sub> a partir de nitratos' }
   ];
   var PROD_HTML = { Mn3O4: 'Mn<sub>3</sub>O<sub>4</sub>', ZnO: 'ZnO', Fe3O4: 'Fe<sub>3</sub>O<sub>4</sub>', V2O5: 'V<sub>2</sub>O<sub>5</sub>', Ag: 'Ag', MgAl2O4: 'MgAl<sub>2</sub>O<sub>4</sub>' };
   function mwOf(key) { for (var i = 0; i < C.length; i++) if (C[i][0] === key) return C[i][2]; return NaN; }
   function htmlOf(key) { for (var i = 0; i < C.length; i++) if (C[i][0] === key) return C[i][1]; return key; }

   /* ---------- fill selects ---------- */
   function fillCompounds() {
      var sel = $('sy-compound'), v = sel.value;
      sel.innerHTML = C.map(function (c) {
         var label = c[0] === 'custom' ? T('Other (enter molar mass)', 'Otro (escribe la masa molar)') : c[0].replace('Na3C6H5O7·2H2O', T('Sodium citrate dihydrate', 'Citrato de sodio dihidratado')) + ' — ' + c[2].toFixed(2) + ' g/mol';
         return '<option value="' + c[0] + '">' + label + '</option>';
      }).join('');
      sel.value = v || 'MnCl2·4H2O';
      var rs = $('sy-reaction'), rv = rs.value;
      rs.innerHTML = R.map(function (r) { return '<option value="' + r.id + '">' + T(r.en, r.es).replace(/<[^>]+>/g, '') + '</option>'; }).join('');
      rs.value = rv || 'mn3o4';
   }

   /* ---------- 1) mass of precursor ---------- */
   function calcMass() {
      var key = $('sy-compound').value, custom = key === 'custom';
      $('sy-mw').readOnly = !custom;
      if (!custom) $('sy-mw').value = mwOf(key).toFixed(2);
      var mw = num('sy-mw'), pur = (num('sy-purity') || 100) / 100;
      var V = num('sy-vol') * ($('sy-vol-u').value === 'L' ? 1 : 1e-3);
      var reverse = $('sy-reverse').checked;
      $('sy-conc-wrap').hidden = reverse; $('sy-mass-wrap').hidden = !reverse;
      var n, m, c;
      if (!reverse) {
         c = num('sy-conc') * ($('sy-conc-u').value === 'mM' ? 1e-3 : 1);
         n = c * V; m = n * mw / pur;
         $('sy-out-main').innerHTML = sig(m) + ' <em>g</em>';
         $('sy-out-label').innerHTML = T('Mass to weigh', 'Masa a pesar');
      } else {
         m = num('sy-mass'); n = m * pur / mw; c = n / V;
         $('sy-out-main').innerHTML = sig(c) + ' <em>mol/L</em>';
         $('sy-out-label').innerHTML = T('Concentration obtained', 'Concentración obtenida');
      }
      $('sy-out-n').textContent = sig(n * 1000) + ' mmol';
      $('sy-out-mg').textContent = reverse ? sig(c * 1000) + ' mM' : sig(m * 1000) + ' mg';
      $('sy-out-mg-label').textContent = reverse ? T('In millimolar', 'En milimolar') : T('In milligrams', 'En miligramos');
      $('sy-formula').innerHTML = custom ? T('Custom compound', 'Compuesto personalizado') : htmlOf(key);
      state.lastMoles = n; state.lastKey = key;
   }

   /* ---------- 2) dilution ---------- */
   function calcDil() {
      var target = document.querySelector('input[name="sy-dil-x"]:checked').value;
      ['c1', 'v1', 'c2', 'v2'].forEach(function (k) { var el = $('sy-' + k); el.readOnly = k === target; el.classList.toggle('sy-solved', k === target); });
      var c1 = num('sy-c1'), v1 = num('sy-v1'), c2 = num('sy-c2'), v2 = num('sy-v2'), r;
      if (target === 'c1') r = c2 * v2 / v1; else if (target === 'v1') r = c2 * v2 / c1; else if (target === 'c2') r = c1 * v1 / v2; else r = c1 * v1 / c2;
      if (isFinite(r) && r > 0) $('sy-' + target).value = +r.toPrecision(5);
      var vv1 = target === 'v1' ? r : v1, vv2 = target === 'v2' ? r : v2;
      $('sy-dil-note').innerHTML = isFinite(vv1) && isFinite(vv2) && vv2 > vv1
         ? T('Take ' + sig(vv1) + ' of the stock solution and add solvent up to ' + sig(vv2) + ' (same volume units).', 'Toma ' + sig(vv1) + ' de la solución madre y completa con solvente hasta ' + sig(vv2) + ' (mismas unidades de volumen).')
         : (isFinite(vv1) && isFinite(vv2) && vv2 < vv1 ? T('The final volume is smaller than the stock volume: that would be a concentration, not a dilution.', 'El volumen final es menor que el de la solución madre: eso sería una concentración, no una dilución.') : '');
   }

   /* ---------- 3) theoretical yield ---------- */
   var state = { lastMoles: null, lastKey: null };
   function reaction() { var id = $('sy-reaction').value; for (var i = 0; i < R.length; i++) if (R[i].id === id) return R[i]; return R[0]; }
   function calcYield() {
      var r = reaction(), mwp = mwOf(r.prec), mwProd = MW[r.prod];
      $('sy-eq').innerHTML = r.eq;
      $('sy-prec-name').innerHTML = htmlOf(r.prec) + ' (' + fmt(mwp, 2) + ' g/mol)';
      var mp = num('sy-pmass'), pur = (num('sy-ppur') || 100) / 100;
      var n = mp * pur / mwp, nProd = n * r.ratio, mTheo = nProd * mwProd;
      $('sy-theo').innerHTML = sig(mTheo) + ' <em>g</em>';
      $('sy-theo-label').innerHTML = T('Theoretical mass of ', 'Masa teórica de ') + PROD_HTML[r.prod];
      $('sy-nprec').textContent = sig(n * 1000) + ' mmol';
      var extra = [];
      if (r.co) r.co.forEach(function (c) { extra.push('<li>' + T('Also needs ', 'Necesita además ') + '<b>' + sig(n * c[1] * mwOf(c[0])) + ' g</b> ' + T('of ', 'de ') + htmlOf(c[0]) + ' (' + c[1] + ' mol ' + T('per mol of ', 'por mol de ') + htmlOf(r.prec) + ')</li>'); });
      if (r.base) extra.push('<li>' + T('Stoichiometric base: ', 'Base estequiométrica: ') + '<b>' + sig(n * r.base[1] * mwOf(r.base[0])) + ' g</b> ' + T('of ', 'de ') + r.base[0] + ' (' + r.base[1] + ' mol ' + T('per mol of precursor; an excess is usually used', 'por mol de precursor; normalmente se usa un exceso') + ')</li>');
      $('sy-extra').innerHTML = extra.join('');
      var mexp = num('sy-exp');
      $('sy-yield').textContent = mexp > 0 && mTheo > 0 ? fmt(100 * mexp / mTheo, 1) + ' %' : '—';
      $('sy-yield-warn').hidden = !(mexp > 0 && mTheo > 0 && mexp / mTheo > 1.02);
   }
   $('sy-use-mass').addEventListener('click', function () {
      var r = reaction();
      if (state.lastKey === r.prec && $('sy-reverse').checked === false) {
         var mw = mwOf(r.prec); $('sy-pmass').value = +(state.lastMoles * mw).toPrecision(5); $('sy-ppur').value = 100;
      } else {
         $('sy-compound').value = r.prec; calcMass();
         $('sy-pmass').value = +(state.lastMoles * mwOf(r.prec)).toPrecision(5); $('sy-ppur').value = 100;
      }
      calcYield();
   });

   ['sy-compound', 'sy-mw', 'sy-conc', 'sy-conc-u', 'sy-vol', 'sy-vol-u', 'sy-purity', 'sy-mass', 'sy-reverse'].forEach(function (id) { $(id).addEventListener('input', calcMass); $(id).addEventListener('change', calcMass); });
   ['sy-c1', 'sy-v1', 'sy-c2', 'sy-v2'].forEach(function (id) { $(id).addEventListener('input', calcDil); });
   document.querySelectorAll('input[name="sy-dil-x"]').forEach(function (r) { r.addEventListener('change', calcDil); });
   ['sy-reaction', 'sy-pmass', 'sy-ppur', 'sy-exp'].forEach(function (id) { $(id).addEventListener('input', calcYield); $(id).addEventListener('change', calcYield); });

   function all() { fillCompounds(); calcMass(); calcDil(); calcYield(); }
   all();
   if (window.frsmI18n) window.frsmI18n.onChange(all);
})();
