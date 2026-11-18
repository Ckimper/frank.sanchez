/* =====================================================================
   FRSM 2.0.8 — Minigame: "Materials memory"
   Find the pairs: each material goes with one of its properties
   (band gap, structure, mineral name...). 8 pairs drawn from a larger pool.
   ===================================================================== */
(function () {
   'use strict';
   var $ = function (id) { return document.getElementById(id); };
   if (!$('mm-grid')) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
   function getBest() { try { return +localStorage.getItem('frsm-game-memory') || 0; } catch (e) { return 0; } }
   function setBest(v) { try { localStorage.setItem('frsm-game-memory', v); } catch (e) { } }
   var PAIRS = 8;

   /* [material, property (en, es), small print (en, es), fact shown when matched (en, es)] */
   var POOL = [
      ['ZnO', ['E<sub>g</sub> = 3.37 eV', 'E<sub>g</sub> = 3,37 eV'], ['wide gap', 'brecha ancha'], ['ZnO absorbs only UV light, so it looks white: it is used in sunscreens.', 'El ZnO solo absorbe luz UV, por eso se ve blanco: se usa en protectores solares.']],
      ['CdSe', ['E<sub>g</sub> = 1.74 eV', 'E<sub>g</sub> = 1,74 eV'], ['quantum dots', 'puntos cuánticos'], ['As nanocrystals its colour depends on size: the classic quantum dot.', 'En nanocristales su color depende del tamaño: es el punto cuántico clásico.']],
      ['Si', ['E<sub>g</sub> = 1.12 eV', 'E<sub>g</sub> = 1,12 eV'], ['indirect', 'indirecta'], ['Its gap is indirect, so it absorbs light weakly near the edge and barely emits light.', 'Su brecha es indirecta: absorbe poco cerca del borde y casi no emite luz.']],
      ['GaAs', ['E<sub>g</sub> = 1.42 eV', 'E<sub>g</sub> = 1,42 eV'], ['direct', 'directa'], ['Direct gap: efficient for LEDs, lasers and high-efficiency solar cells.', 'Brecha directa: eficiente para LEDs, láseres y celdas solares de alta eficiencia.']],
      ['Ag', ['FCC, a = 4.086 Å', 'FCC, a = 4,086 Å'], ['Fm-3m', 'Fm-3m'], ['Silver nanoparticles show a plasmon resonance near 400 nm.', 'Las nanopartículas de plata tienen una resonancia de plasmón cerca de 400 nm.']],
      ['Mn<sub>3</sub>O<sub>4</sub>', ['Hausmannite', 'Hausmannita'], ['tetragonal spinel', 'espinela tetragonal'], ['Mn³⁺ (Jahn–Teller) stretches the spinel cell into a tetragonal one (I4₁/amd).', 'El Mn³⁺ (Jahn–Teller) estira la celda de espinela y la vuelve tetragonal (I4₁/amd).']],
      ['Fe<sub>3</sub>O<sub>4</sub>', ['Inverse spinel', 'Espinela inversa'], ['magnetite', 'magnetita'], ['Fe³⁺ fills the tetrahedral sites; Fe²⁺/Fe³⁺ share the octahedral ones. It is ferrimagnetic.', 'El Fe³⁺ ocupa los sitios tetraédricos; Fe²⁺ y Fe³⁺ se reparten los octaédricos. Es ferrimagnética.']],
      ['MgAl<sub>2</sub>O<sub>4</sub>', ['Normal spinel', 'Espinela normal'], ['Fd-3m', 'Fd-3m'], ['Mg²⁺ in tetrahedral and Al³⁺ in octahedral sites: the mineral that names the family.', 'Mg²⁺ en sitios tetraédricos y Al³⁺ en octaédricos: el mineral que da nombre a la familia.']],
      ['V<sub>2</sub>O<sub>5</sub>', ['Layered, Pmmn', 'Laminar, Pmmn'], ['orthorhombic', 'ortorrómbico'], ['Its layers can host Li⁺ or Zn²⁺ ions: a classic battery cathode.', 'Sus láminas pueden alojar iones Li⁺ o Zn²⁺: un cátodo clásico de baterías.']],
      ['Mg<sub>2</sub>SiO<sub>4</sub>', ['Forsterite', 'Forsterita'], ['olivine', 'olivino'], ['The magnesium end-member of olivine, a major mineral of the Earth’s upper mantle.', 'El extremo magnésico del olivino, mineral principal del manto superior terrestre.']],
      ['NH<sub>4</sub>VO<sub>3</sub>', ['Precursor of V<sub>2</sub>O<sub>5</sub>', 'Precursor del V<sub>2</sub>O<sub>5</sub>'], ['on heating', 'al calentarlo'], ['Heating it releases NH₃ and H₂O and leaves V₂O₅.', 'Al calentarlo libera NH₃ y H₂O y deja V₂O₅.']],
      ['TiO<sub>2</sub>', ['Anatase / rutile', 'Anatasa / rutilo'], ['E<sub>g</sub> ≈ 3.2 eV', 'E<sub>g</sub> ≈ 3,2 eV'], ['The best-known photocatalyst: UV light creates electron–hole pairs at its surface.', 'El fotocatalizador más conocido: la luz UV crea pares electrón–hueco en su superficie.']],
      ['NaCl', ['Rock salt', 'Sal de roca'], ['Fm-3m', 'Fm-3m'], ['Two interpenetrating FCC lattices; ZnO also takes this structure at high pressure.', 'Dos redes FCC interpenetradas; el ZnO también adopta esta estructura a alta presión.']],
      ['C', ['Diamond, E<sub>g</sub> ≈ 5.5 eV', 'Diamante, E<sub>g</sub> ≈ 5,5 eV'], ['Fd-3m', 'Fd-3m'], ['Each carbon is bonded to four others in a tetrahedron; transparent because its gap is in the deep UV.', 'Cada carbono se enlaza a otros cuatro en un tetraedro; es transparente porque su brecha está en el UV profundo.']]
   ];
   var st = {};

   function newGame() {
      var set = shuffle(POOL.slice()).slice(0, PAIRS), cards = [];
      set.forEach(function (p, i) { cards.push({ id: i, kind: 'mat' }); cards.push({ id: i, kind: 'prop' }); });
      st = { set: set, cards: shuffle(cards), open: [], found: 0, moves: 0, t0: 0, time: 0, lock: false, timer: 0 };
      $('mm-over').hidden = true;
      $('mm-fact').innerHTML = T('Flip two cards: a material and one of its properties.', 'Voltea dos cartas: un material y una de sus propiedades.');
      clearInterval(st.timer);
      build(); hud();
   }
   function face(c) {
      var p = st.set[c.id];
      /* one inner block per face: the face is a flex box, so loose <sub> tags would become separate lines */
      if (c.kind === 'mat') return '<span class="mm-face mm-front mat"><span class="mm-txt">' + p[0] + '</span></span>';
      return '<span class="mm-face mm-front"><span class="mm-txt">' + T(p[1][0], p[1][1]) + '<small>' + T(p[2][0], p[2][1]) + '</small></span></span>';
   }
   function build() {
      var h = '';
      st.cards.forEach(function (c, i) {
         var cls = c.done ? ' done' : (st.open.indexOf(i) >= 0 ? ' open' : '');
         h += '<button type="button" class="mm-card' + cls + '" data-i="' + i + '" aria-label="' + T('Card', 'Carta') + ' ' + (i + 1) + '"><span class="mm-inner"><span class="mm-face mm-back"><i class="fa fa-flask" aria-hidden="true"></i></span>' + face(c) + '</span></button>';
      });
      $('mm-grid').innerHTML = h;
   }
   function hud() {
      $('mm-pairs').textContent = st.found + ' / ' + PAIRS;
      $('mm-moves').textContent = st.moves;
      $('mm-time').textContent = st.time + ' s';
      var b = getBest(); $('mm-best').textContent = b ? b + ' ' + T('moves', 'jugadas') : '—';
   }
   function flip(i) {
      var c = st.cards[i];
      if (st.lock || c.done || st.open.indexOf(i) >= 0) return;
      if (!st.t0) { st.t0 = Date.now(); st.timer = setInterval(function () { st.time = Math.round((Date.now() - st.t0) / 1000); hud(); }, 500); }
      st.open.push(i);
      var el = $('mm-grid').children[i]; el.classList.add('open');
      el.setAttribute('aria-label', el.querySelector('.mm-front').textContent);
      if (st.open.length < 2) return;
      st.moves++;
      var a = st.cards[st.open[0]], b = st.cards[st.open[1]], els = st.open.map(function (k) { return $('mm-grid').children[k]; });
      if (a.id === b.id && a.kind !== b.kind) {
         a.done = b.done = true; st.found++;
         els.forEach(function (e) { e.classList.remove('open'); e.classList.add('done'); });
         var p = st.set[a.id];
         $('mm-fact').innerHTML = '<b>' + p[0] + '</b> — ' + T(p[3][0], p[3][1]);
         st.open = [];
         hud();
         if (st.found === PAIRS) finish();
      } else {
         st.lock = true;
         els.forEach(function (e) { e.classList.add('miss'); });
         setTimeout(function () {
            els.forEach(function (e) { e.classList.remove('open', 'miss'); e.setAttribute('aria-label', T('Card', 'Carta')); });
            st.open = []; st.lock = false;
         }, 900);
         hud();
      }
   }
   function finish() {
      clearInterval(st.timer);
      st.time = Math.round((Date.now() - st.t0) / 1000);
      var best = getBest(); st.rec = !best || st.moves < best;
      if (st.rec) setBest(st.moves);
      hud(); overText();
      setTimeout(function () { $('mm-over').hidden = false; $('mm-again').focus({ preventScroll: true }); }, 500);
   }
   function overText() {
      $('mm-over-title').textContent = st.rec ? T('New record!', '¡Nuevo récord!') : T('All pairs found!', '¡Encontraste todas las parejas!');
      $('mm-over-score').textContent = st.moves + ' ' + T('moves', 'jugadas');
      $('mm-over-msg').textContent = T('Time', 'Tiempo') + ': ' + st.time + ' s. ' + (st.moves <= 12 ? T('Excellent memory!', '¡Memoria excelente!') : T('A perfect game takes 8 moves. Try again!', 'Una partida perfecta son 8 jugadas. ¡Inténtalo de nuevo!'));
   }
   $('mm-grid').addEventListener('click', function (e) { var b = e.target.closest('.mm-card'); if (b) flip(+b.getAttribute('data-i')); });
   $('mm-again').addEventListener('click', newGame);
   $('mm-restart').addEventListener('click', newGame);
   if (window.frsmI18n) window.frsmI18n.onChange(function () { build(); hud(); if (!$('mm-over').hidden) overText(); });
   newGame();
})();
