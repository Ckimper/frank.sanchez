/* =====================================================================
   FRSM 2.0.5 — Interactive 3D crystal viewer (several structures)
   Data: js/structures-data.js (window.FRSM_STRUCTURES)
   Uses three.js r128 + OrbitControls (loaded in lab.html).
   Public: window.FRSM_XTAL.load(key)
   ===================================================================== */
(function () {
   'use strict';

   var host = document.getElementById('xtal-view');
   var DATA = window.FRSM_STRUCTURES;
   if (!host || !DATA) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function L(o) { return o ? T(o.en, o.es) : ''; }
   function fmt(x, d) { var s = x.toFixed(d); return (window.frsmI18n && window.frsmI18n.lang === 'es') ? s.replace('.', ',') : s; }

   var fallback = document.getElementById('xtal-fallback');
   function fail() { if (fallback) fallback.hidden = false; }
   if (!window.THREE || !THREE.OrbitControls) { fail(); return; }
   var probe = document.createElement('canvas');
   if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) { fail(); return; }

   var st = null, KEY = null, LAT = null; // current structure + lattice vectors (rows a, b, c; Cartesian, z up)
   function lattice(c) {
      var R = Math.PI / 180, al = (c[3] || 90) * R, be = (c[4] || 90) * R, ga = (c[5] || 90) * R;
      var cx = c[2] * Math.cos(be), cy = c[2] * (Math.cos(al) - Math.cos(be) * Math.cos(ga)) / Math.sin(ga);
      return [[c[0], 0, 0], [c[1] * Math.cos(ga), c[1] * Math.sin(ga), 0], [cx, cy, Math.sqrt(c[2] * c[2] - cx * cx - cy * cy)]];
   }
   function cart(f) {
      return [0, 1, 2].map(function (k) { return f[0] * LAT[0][k] + f[1] * LAT[1][k] + f[2] * LAT[2][k]; });
   }
   function bondMax(e1, e2) {
      for (var i = 0; i < st.bonds.length; i++) {
         var b = st.bonds[i];
         if ((b[0] === e1 && b[1] === e2) || (b[0] === e2 && b[1] === e1)) return b[2];
      }
      return 0;
   }
   function cartDist(f, g) {
      var p = cart(f), q = cart(g); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
   }
   /* neighbours (any lattice image) of a position f that are bonded to element el */
   function around(f, el) {
      var out = [];
      st.atoms.forEach(function (q) {
         var s = st.sites[q[0]], r = bondMax(el, s.el);
         if (!r || s.el === el) return;
         for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) for (var k = -1; k <= 1; k++) {
            var g = [q[1] + Math.floor(f[0]) + i, q[2] + Math.floor(f[1]) + j, q[3] + Math.floor(f[2]) + k];
            var d = cartDist(f, g);
            if (d > .1 && d < r) out.push({ f: g, d: d, si: q[0] });
         }
      });
      return out.sort(function (x, y) { return x.d - y.d; });
   }

   /* ---------- three.js setup ---------- */
   var renderer = new THREE.WebGLRenderer({ antialias: true });
   renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
   renderer.setClearColor(0x1e2725);
   host.appendChild(renderer.domElement);
   var scene = new THREE.Scene();
   var camera = new THREE.PerspectiveCamera(35, 1, .1, 600);
   var controls = new THREE.OrbitControls(camera, renderer.domElement);
   controls.enableDamping = true; controls.dampingFactor = .08;
   controls.minDistance = 6; controls.maxDistance = 140; controls.autoRotateSpeed = 1.2;
   scene.add(new THREE.AmbientLight(0xffffff, .55));
   var sun = new THREE.DirectionalLight(0xffffff, .75); sun.position.set(12, 20, 16); scene.add(sun);
   var rim = new THREE.DirectionalLight(0xffffff, .25); rim.position.set(-14, -6, -10); scene.add(rim);
   var group = new THREE.Group(); scene.add(group);
   var layers = { atoms: new THREE.Group(), bonds: new THREE.Group(), poly: new THREE.Group(), cell: new THREE.Group() };
   Object.keys(layers).forEach(function (k) { group.add(layers[k]); });
   var state = { n: 1, poly: true, bonds: true, spin: false };
   var atomMeshes = [], picked = null, halo = null;
   var sphereGeo = new THREE.SphereGeometry(1, 26, 18);
   var bondMat = new THREE.MeshPhongMaterial({ color: 0xcfd6d4, shininess: 30 });
   var matCache = {};
   function mat(color, kind) {
      var k = color + kind;
      if (matCache[k]) return matCache[k];
      var c = new THREE.Color(color), m;
      if (kind === 'atom') m = new THREE.MeshPhongMaterial({ color: c, shininess: 60, specular: 0x333333 });
      else if (kind === 'poly') m = new THREE.MeshPhongMaterial({ color: c, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false });
      else m = new THREE.LineBasicMaterial({ color: c.clone().lerp(new THREE.Color(0xffffff), .35), transparent: true, opacity: .55 });
      return (matCache[k] = m);
   }

   function toXYZ(f) {
      var n = state.n;
      var p = cart([f[0] - n / 2, f[1] - n / 2, f[2] - .5]);
      return new THREE.Vector3(p[0], p[2], -p[1]);
   }
   function clear(g) {
      while (g.children.length) { var o = g.children.pop(); if (o.geometry && o.geometry !== sphereGeo) o.geometry.dispose(); }
   }
   function key(f) { return f.map(function (v) { return v.toFixed(3); }).join(','); }

   function addAtom(si, f, extra) {
      var s = st.sites[si];
      var m = new THREE.Mesh(sphereGeo, mat(s.color, 'atom'));
      var r = s.r * (extra ? .85 : 1);
      m.scale.set(r, r, r); m.position.copy(toXYZ(f));
      m.userData = { si: si, f: f };
      layers.atoms.add(m); atomMeshes.push(m);
   }
   function addBond(p, q) {
      var dir = new THREE.Vector3().subVectors(q, p), len = dir.length();
      var m = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, len, 10, 1, true), bondMat);
      m.position.copy(p).addScaledVector(dir, .5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      layers.bonds.add(m);
   }
   function addPolyhedron(color, pts) {
      var faces = [], c = new THREE.Vector3();
      pts.forEach(function (p) { c.add(p); }); c.divideScalar(pts.length);
      for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) for (var k = j + 1; k < pts.length; k++) {
         var nrm = new THREE.Vector3().subVectors(pts[j], pts[i]).cross(new THREE.Vector3().subVectors(pts[k], pts[i]));
         if (nrm.lengthSq() < 1e-6) continue;
         var side = 0, ok = true;
         for (var l = 0; l < pts.length && ok; l++) {
            if (l === i || l === j || l === k) continue;
            var s = nrm.dot(new THREE.Vector3().subVectors(pts[l], pts[i]));
            if (Math.abs(s) < 1e-4) continue;
            if (!side) side = Math.sign(s); else if (Math.sign(s) !== side) ok = false;
         }
         if (!ok) continue;
         faces.push(nrm.dot(new THREE.Vector3().subVectors(pts[i], c)) < 0 ? [pts[i], pts[k], pts[j]] : [pts[i], pts[j], pts[k]]);
      }
      var pos = [];
      faces.forEach(function (t) { t.forEach(function (v) { pos.push(v.x, v.y, v.z); }); });
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      layers.poly.add(new THREE.Mesh(geo, mat(color, 'poly')));
      layers.poly.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat(color, 'edge')));
   }
   function cellBox() {
      var n = state.n, pos = [];
      function seg(f, g) { var p = toXYZ(f), q = toXYZ(g); pos.push(p.x, p.y, p.z, q.x, q.y, q.z); }
      for (var z = 0; z <= 1; z++) for (var k = 0; k <= n; k++) { seg([0, k, z], [n, k, z]); seg([k, 0, z], [k, n, z]); }
      for (var i = 0; i <= n; i++) for (var j = 0; j <= n; j++) seg([i, j, 0], [i, j, 1]);
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      layers.cell.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .45 })));
      [['a', [n + .1, 0, 0]], ['b', [0, n + .1, 0]], ['c', [0, 0, 1.06]]].forEach(function (ax) {
         var cv = document.createElement('canvas'); cv.width = cv.height = 64;
         var g = cv.getContext('2d'); g.font = 'italic bold 46px Georgia, serif'; g.fillStyle = '#f5c729';
         g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ax[0], 32, 34);
         var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
         sp.scale.set(.9, .9, .9); sp.position.copy(toXYZ(ax[1]));
         layers.cell.add(sp);
      });
   }

   function build() {
      ['atoms', 'bonds', 'poly', 'cell'].forEach(function (k) { clear(layers[k]); });
      atomMeshes = [];
      if (halo) { group.remove(halo); halo = null; }
      var n = state.n, eps = .002, seen = {};
      cellBox();
      function inBox(f) { return f[0] >= -eps && f[0] <= n + eps && f[1] >= -eps && f[1] <= n + eps && f[2] >= -eps && f[2] <= 1 + eps; }
      /* cations (with their polyhedra), then the anions that remain inside the box */
      st.atoms.forEach(function (q) {
         var s = st.sites[q[0]];
         if (!s.geom) return;
         for (var i = -1; i <= n; i++) for (var j = -1; j <= n; j++) for (var k = -1; k <= 1; k++) {
            var f = [q[1] + i, q[2] + j, q[3] + k];
            if (!inBox(f) || seen[key(f)]) continue;
            seen[key(f)] = true;
            addAtom(q[0], f);
            var p = toXYZ(f), verts = [];
            around(f, s.el).forEach(function (o) {
               var v = toXYZ(o.f); verts.push(v); addBond(p, v);
               var kk = key(o.f);
               if (!seen[kk]) { seen[kk] = true; addAtom(o.si, o.f, !inBox(o.f)); }
            });
            if (verts.length >= 4) addPolyhedron(s.color, verts);
         }
      });
      st.atoms.forEach(function (q) {
         if (st.sites[q[0]].geom) return;
         for (var i = -1; i <= n; i++) for (var j = -1; j <= n; j++) for (var k = -1; k <= 1; k++) {
            var f = [q[1] + i, q[2] + j, q[3] + k];
            if (inBox(f) && !seen[key(f)]) { seen[key(f)] = true; addAtom(q[0], f); }
         }
      });
      layers.poly.visible = state.poly;
      layers.bonds.visible = state.bonds;
   }

   function frame() {
      var span = Math.max(state.n * Math.max(st.cell[0], st.cell[1]), st.cell[2]);
      if (st.cell[5] && Math.abs(st.cell[5] - 90) > 1) span *= 1.2;
      var dir = new THREE.Vector3(1.1, .55, 1.35).normalize();
      camera.position.copy(dir.multiplyScalar(span * 2.4 + 8));
      controls.target.set(0, 0, 0); controls.update();
   }
   function view(dir) {
      var r = camera.position.length(), d = dir.clone();
      if (Math.abs(d.x) < 1e-3 && Math.abs(d.z) < 1e-3) d.z = 1e-3;
      camera.position.copy(d.normalize().multiplyScalar(r)); controls.update();
   }

   /* ---------- info panel ---------- */
   var info = document.getElementById('xtal-info');
   var pick = document.getElementById('xtal-pick');
   function cellCount() {
      var c = {};
      st.atoms.forEach(function (q) { var s = st.sites[q[0]]; c[s.el] = (c[s.el] || 0) + s.occ; });
      return Object.keys(c).map(function (e) { return e + '<sub>' + (+c[e].toFixed(2)) + '</sub>'; }).join('');
   }
   function bondSummary(si) {
      var q = st.atoms.filter(function (a) { return a[0] === si; })[0];
      var ds = around([q[1], q[2], q[3]], st.sites[si].el).map(function (o) { return +o.d.toFixed(2); });
      var g = {};
      ds.forEach(function (d) { g[d] = (g[d] || 0) + 1; });
      return Object.keys(g).sort(function (x, y) { return x - y; }).map(function (d) { return g[d] + ' &times; ' + fmt(+d, 2); }).join(' + ') + '&nbsp;Å';
   }
   function renderInfo() {
      if (!info) return;
      var legend = '', seenLab = {};
      st.sites.forEach(function (s) {
         if (s.hide || seenLab[s.label]) return; seenLab[s.label] = 1;
         legend += '<li><i class="dot" style="background:' + s.color + (s.geom ? '' : ';width:12px;height:12px;margin:0 2px') + '"></i><span><b>' + s.label + '</b>' +
            (s.geom ? ' &middot; ' + L(s.geom) + (s.wy ? ' (' + s.wy + ')' : '') : s.el === 'O' ? ' &middot; ' + T('oxygen', 'oxígeno') : s.el === 'H' ? ' &middot; ' + T('hydrogen', 'hidrógeno') : s.el === 'Ag' ? ' &middot; ' + T('metal atom (fcc)', 'átomo metálico (fcc)') : '') + '</span></li>';
      });
      var c6 = st.cell, ang = '';
      if (Math.abs(c6[4] - 90) > .01) ang = ' &middot; &beta; = ' + fmt(c6[4], 2) + '&deg;';
      if (Math.abs(c6[5] - 90) > .01) ang += ' &middot; &gamma; = ' + fmt(c6[5], 0) + '&deg;';
      var cell = c6[0] === c6[1] && c6[1] === c6[2] ? 'a = ' + fmt(c6[0], 4) + ' &Aring;'
         : c6[0] === c6[1] ? 'a = b = ' + fmt(c6[0], 3) + ' &Aring; &middot; c = ' + fmt(c6[2], 3) + ' &Aring;'
         : 'a = ' + fmt(c6[0], 3) + ', b = ' + fmt(c6[1], 3) + ', c = ' + fmt(c6[2], 3) + ' &Aring;';
      cell += ang;
      var dl = '<dt>' + T('Space group', 'Grupo espacial') + '</dt><dd>' + st.sg + '</dd>' +
               '<dt>' + T('Lattice', 'Red') + '</dt><dd>' + cell + '</dd>' +
               '<dt>' + T('Cell content', 'Contenido de la celda') + '</dt><dd>' + cellCount() + ' (Z = ' + st.Z + ')</dd>';
      var done = {};
      st.sites.forEach(function (s, i) {
         if (!s.geom) return;
         var row = bondSummary(i), lig = s.el === 'N' ? 'H' : 'O';
         if (done[s.label + row]) return; done[s.label + row] = 1;
         dl += '<dt>' + s.label + '&ndash;' + lig + '</dt><dd>' + row + '</dd>';
      });
      if (st.extra) dl += '<dt>' + st.extra.en + '</dt><dd>' + T(st.extra.value, st.extra.valueEs) + '</dd>';
      info.innerHTML = '<h3>' + L(st.name) + ' <small>' + st.formula + '</small></h3>' +
         '<p class="xtal-type">' + L(st.type) + '</p>' +
         '<ul class="xtal-legend">' + legend + '</ul><dl class="xtal-data">' + dl + '</dl>' +
         '<div class="did-you-know">' + L(st.note) + '</div><p class="xtal-ref">' + L(st.source) + '</p>';
   }
   function describe(m) {
      if (!m) { pick.innerHTML = T('<b>Tip:</b> tap or click an atom to see its site and bond lengths.', '<b>Consejo:</b> toca o haz clic en un átomo para ver su sitio y sus distancias de enlace.'); return; }
      var s = st.sites[m.userData.si], f = m.userData.f;
      var wrap = f.map(function (v) { var w = v % 1; return w < 0 ? w + 1 : w; });
      var nb = around(wrap, s.el), lines = [];
      lines.push('<b>' + s.label + '</b>' + (s.wy ? ' &middot; Wyckoff ' + s.wy : '') + (s.geom ? ' &middot; ' + T('site', 'sitio') + ' ' + L(s.geom) : ''));
      if (s.geom) lines.push(s.el + '–' + (s.el === 'N' ? 'H' : 'O') + ': ' + nb.map(function (o) { return fmt(o.d, 2); }).join(', ') + '&nbsp;Å');
      else if (nb.length) lines.push(T('Bonded to: ', 'Enlazado a: ') + nb.map(function (o) { return st.sites[o.si].label + ' ' + fmt(o.d, 2) + '&nbsp;Å'; }).join(', '));
      if (st.extra && !s.geom && !nb.length) lines.push(st.extra.en + ': ' + T(st.extra.value, st.extra.valueEs));
      lines.push('<small>' + T('Fractional coordinates', 'Coordenadas fraccionarias') + ': (' + wrap.map(function (v) { return fmt(v, 3); }).join(', ') + ')</small>');
      pick.innerHTML = lines.join('<br>');
   }

   /* ---------- render loop (only while visible) ---------- */
   function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
   }
   new ResizeObserver(resize).observe(host);
   var visible = true, raf = 0;
   function loop() {
      raf = 0; if (!visible) return;
      controls.autoRotate = state.spin; controls.update(); renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
   }
   if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop);
   }).observe(host);

   /* ---------- picking ---------- */
   var ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), down = null;
   renderer.domElement.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
   renderer.domElement.addEventListener('pointerup', function (e) {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      var r = renderer.domElement.getBoundingClientRect();
      mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(mouse, camera);
      var hit = ray.intersectObjects(atomMeshes)[0];
      picked = hit ? hit.object : null;
      if (halo) { group.remove(halo); halo.geometry.dispose(); halo = null; }
      if (picked) {
         halo = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false }));
         var s = picked.scale.x * 1.35; halo.scale.set(s, s, s); halo.position.copy(picked.position); group.add(halo);
      }
      describe(picked);
   });

   /* ---------- toolbar ---------- */
   function bindToggle(id, prop, apply) {
      var b = document.getElementById(id); if (!b) return;
      b.setAttribute('aria-pressed', state[prop] ? 'true' : 'false');
      b.addEventListener('click', function () {
         state[prop] = !state[prop]; b.setAttribute('aria-pressed', state[prop] ? 'true' : 'false'); if (apply) apply();
      });
   }
   bindToggle('xt-poly', 'poly', function () { layers.poly.visible = state.poly; });
   bindToggle('xt-bonds', 'bonds', function () { layers.bonds.visible = state.bonds; });
   bindToggle('xt-spin', 'spin');
   document.querySelectorAll('[data-xt-cell]').forEach(function (b) {
      b.addEventListener('click', function () {
         state.n = +b.getAttribute('data-xt-cell');
         document.querySelectorAll('[data-xt-cell]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
         picked = null; describe(null); build(); frame();
      });
   });
   var views = { c: new THREE.Vector3(0, 1, 0), a: new THREE.Vector3(1, 0, 0), iso: new THREE.Vector3(1.1, .55, 1.35) };
   document.querySelectorAll('[data-xt-view]').forEach(function (b) {
      b.addEventListener('click', function () { view(views[b.getAttribute('data-xt-view')]); });
   });

   function load(k) {
      if (!DATA[k] || k === KEY) return;
      KEY = k; st = DATA[k]; LAT = lattice(st.cell); picked = null;
      build(); frame(); renderInfo(); describe(null);
   }
   window.FRSM_XTAL = { load: load, get key() { return KEY; } };

   resize();
   load(host.getAttribute('data-structure') || Object.keys(DATA)[0]);
   raf = requestAnimationFrame(loop);
   if (window.frsmI18n) window.frsmI18n.onChange(function () { renderInfo(); describe(picked); });
   host.classList.add('ready');
})();
