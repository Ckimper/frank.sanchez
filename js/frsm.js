/* FRSM 2.0.1 — small site-wide helpers */

/* =====================================================================
   VISIT COUNTER (GoatCounter: free, no cookies, privacy-friendly)
   Put here the code you chose when you created your account at
   https://www.goatcounter.com  (example: if your dashboard is
   https://franksm.goatcounter.com, write 'franksm').
   Leave it empty ('') to disable the counter.
   ===================================================================== */
var GOATCOUNTER_CODE = 'franksm';

(function () {
   'use strict';

   /* Load GoatCounter only on the published site (not when testing locally) */
   var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
   if (GOATCOUNTER_CODE && !isLocal) {
      var gc = document.createElement('script');
      gc.async = true;
      gc.src = 'https://gc.zgo.at/count.js';
      gc.setAttribute('data-goatcounter', 'https://' + GOATCOUNTER_CODE + '.goatcounter.com/count');
      document.head.appendChild(gc);
   }

   /* "Back to top" button */
   var btn = document.createElement('button');
   btn.type = 'button';
   btn.className = 'back-to-top';
   btn.setAttribute('data-i18n-src-aria-label', 'Back to top');
   btn.setAttribute('data-es-aria-label', 'Volver arriba');
   btn.setAttribute('aria-label', (window.frsmI18n && window.frsmI18n.lang === 'es') ? 'Volver arriba' : 'Back to top');
   btn.innerHTML = '<i class="fa fa-angle-up" aria-hidden="true"></i>';
   document.body.appendChild(btn);

   function toggle() {
      btn.classList.toggle('show', window.pageYOffset > 600);
   }
   window.addEventListener('scroll', toggle, { passive: true });
   toggle();

   btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
   });

   /* "My Information" circles: the whole circle opens its link (phones have no hover) */
   document.querySelectorAll('.box_main').forEach(function (box) {
      var link = box.querySelector('a[href]');
      if (!link) return;
      box.addEventListener('click', function (ev) {
         if (ev.target.closest('a')) return;
         if (link.target === '_blank') window.open(link.href, '_blank', 'noopener'); else location.href = link.href;
      });
   });

   /* Mark the current page in the menu */
   var page = location.pathname.split('/').pop() || 'index.html';
   if (/^lab-.*\.html$/.test(page)) page = 'lab.html';   /* every lab tool belongs to the Lab menu item */
   document.querySelectorAll('.navbar-nav .nav-link').forEach(function (a) {
      if (a.getAttribute('href') === page) {
         a.classList.add('active');
         a.setAttribute('aria-current', 'page');
      }
   });

   /* Lab pages: keep the site menu + lab tools menu visible while scrolling.
      Both bars go into one wrapper; once the full header has scrolled out of
      view the wrapper becomes a compact fixed bar (a spacer keeps the page
      from jumping). */
   var sub = document.querySelector('.lab-subnav'), hdr = document.querySelector('.header_section');
   if (sub && hdr) {
      var bar = document.createElement('div'), spacer = document.createElement('div');
      bar.className = 'lab-top'; spacer.className = 'lab-top-spacer';
      hdr.parentNode.insertBefore(spacer, hdr);
      hdr.parentNode.insertBefore(bar, hdr);
      bar.appendChild(hdr); bar.appendChild(sub);
      document.documentElement.classList.add('has-lab-top');
      var full = 0;
      var stick = function () {
         var on = document.body.classList.contains('lab-stuck');
         if (!on) full = bar.offsetHeight;
         var want = window.pageYOffset > full;
         if (want !== on) {
            document.body.classList.toggle('lab-stuck', want);
            spacer.style.height = want ? full + 'px' : '0';
            if (!want) { var open = hdr.querySelector('.navbar-collapse.show'); if (open) open.classList.remove('show'); }
         }
      };
      window.addEventListener('scroll', stick, { passive: true });
      window.addEventListener('resize', function () {
         if (document.body.classList.contains('lab-stuck')) {
            document.body.classList.remove('lab-stuck'); full = bar.offsetHeight;
            document.body.classList.add('lab-stuck'); spacer.style.height = full + 'px';
         }
         stick();
      });
      /* in the compact bar, picking a menu link closes the phone menu */
      hdr.addEventListener('click', function (e) {
         if (e.target.closest('.nav-link') && document.body.classList.contains('lab-stuck')) {
            var open = hdr.querySelector('.navbar-collapse.show'); if (open) open.classList.remove('show');
         }
      });
      stick();
   }

   /* Lab tools menu: bring the current tool into view on small screens */
   var cur = document.querySelector('.lab-subnav a.active');
   if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) {
      cur.parentNode.scrollLeft = cur.offsetLeft - (cur.parentNode.clientWidth - cur.offsetWidth) / 2;
   }
})();