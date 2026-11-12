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
   btn.setAttribute('aria-label', 'Back to top');
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

   /* Mark the current page in the menu */
   var page = location.pathname.split('/').pop() || 'index.html';
   document.querySelectorAll('.navbar-nav .nav-link').forEach(function (a) {
      if (a.getAttribute('href') === page) {
         a.classList.add('active');
         a.setAttribute('aria-current', 'page');
      }
   });
})();
