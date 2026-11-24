/* =====================================================================
   FRSM 2.0.9 — 360° viewer for the gallery (Pannellum 2.5.6)
   Photos: Robert Marx. Drag to look around; the view turns slowly on its
   own until you touch it. Loads only when the viewer scrolls into view.
   ===================================================================== */
(function () {
   'use strict';
   var box = document.getElementById('pano');
   if (!box) return;
   function T(en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; }
   function L(o) { return T(o.en, o.es); }
   var CREDIT = 'Robert Marx';

   var SCENES = [
      {
         id: 'santa-cruz', img: 'images/360/santa-cruz-360.jpg', yaw: 95, pitch: -22,
         title: { en: 'Santa Cruz de Succhabamba', es: 'Santa Cruz de Succhabamba' },
         text: {
            en: 'My hometown seen from the air: the main square, the tiled roofs and the fields that surround the town, with the Andean hills of Cajamarca all around.',
            es: 'Mi pueblo visto desde el aire: la plaza principal, los techos de teja y los campos de cultivo que rodean la ciudad, entre los cerros andinos de Cajamarca.'
         }
      },
      {
         id: 'cotorumi', img: 'images/360/cerro-cotorumi-360.jpg', yaw: 88, pitch: -12,
         title: { en: 'Cerro Cotorumi', es: 'Cerro Cotorumi' },
         text: {
            en: 'Cerro Cotorumi, on the outskirts of the town, with the large cross on its summit and the winding road that climbs to the top. Turn around to see Santa Cruz in the valley.',
            es: 'El Cerro Cotorumi, en las inmediaciones de la ciudad, con la gran cruz en su cima y el camino que sube serpenteando. Gira la vista para ver Santa Cruz en el valle.'
         }
      }
   ];
   var byId = {}; SCENES.forEach(function (s) { byId[s.id] = s; });
   var viewer = null, cur = SCENES[0].id;

   function strings() {
      return T({}, {
         loadButtonLabel: 'Haz clic para<br>cargar la<br>panorámica',
         loadingLabel: 'Cargando…',
         bylineLabel: 'por %s',
         noPanoramaError: 'No se indicó ninguna imagen panorámica.',
         fileAccessError: 'No se pudo abrir el archivo %s.',
         malformedURLError: 'La dirección de la panorámica no es válida.',
         iOS8WebGLError: 'Tu dispositivo no puede mostrar esta panorámica.',
         genericWebGLError: 'Tu navegador no tiene el soporte WebGL necesario para mostrar esta panorámica.',
         textureSizeError: 'La panorámica es demasiado grande para tu dispositivo.',
         unknownError: 'Error desconocido.'
      });
   }

   function build(view) {
      if (viewer) {
         view = view || { pitch: viewer.getPitch(), yaw: viewer.getYaw(), hfov: viewer.getHfov() };
         viewer.destroy();
      }
      var scenes = {};
      SCENES.forEach(function (s) {
         scenes[s.id] = { type: 'equirectangular', panorama: s.img, title: L(s.title), author: CREDIT, yaw: s.yaw, pitch: s.pitch };
      });
      if (view) { scenes[cur].yaw = view.yaw; scenes[cur].pitch = view.pitch; scenes[cur].hfov = view.hfov; }
      viewer = window.pannellum.viewer('pano', {
         'default': {
            firstScene: cur, autoLoad: true, sceneFadeDuration: 700,
            /* the photos are 2000 × 1000 px: a wide view and little zoom keep them sharper */
            hfov: 120, minHfov: 95, maxHfov: 120,
            autoRotate: -2, autoRotateInactivityDelay: 6000,
            mouseZoom: 'fullscreenonly', compass: false, showZoomCtrl: true, showFullscreenCtrl: true,
            strings: strings()
         },
         scenes: scenes
      });
      viewer.on('scenechange', function (id) { cur = id; ui(); });
      viewer.on('error', function () { box.classList.add('pano-failed'); });
      ui();
   }

   function ui() {
      var s = byId[cur];
      document.getElementById('pano-title').textContent = L(s.title);
      document.getElementById('pano-text').textContent = L(s.text);
      document.querySelectorAll('[data-pano]').forEach(function (b) {
         var on = b.getAttribute('data-pano') === cur;
         b.classList.toggle('active', on);
         b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
   }

   document.querySelectorAll('[data-pano]').forEach(function (b) {
      b.addEventListener('click', function () {
         var id = b.getAttribute('data-pano');
         if (id === cur) return;
         cur = id;
         if (viewer) viewer.loadScene(id); else ui();
         ui();
      });
   });

   function start() { if (!viewer && window.pannellum) build(); }
   if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ent) { if (ent.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '300px' });
      io.observe(box);
   } else start();
   ui();
   /* Pannellum's own labels follow the site language */
   if (window.frsmI18n) window.frsmI18n.onChange(function () { if (viewer) build(); else ui(); });
})();
