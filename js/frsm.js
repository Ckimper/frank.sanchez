/* FRSM 2.0.1 — small site-wide helpers */
(function () {
   'use strict';

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
