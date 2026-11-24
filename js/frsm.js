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

   /* Scroll reveal (2.0.9): cards and blocks below the first screen fade up
      when they come into view. Things already visible are left alone, so
      nothing flashes; the hero has its own CSS entrance. */
   var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if ('IntersectionObserver' in window && !reduce) {
      var SEL = '.frsm-card, .lab-tool, .tl-item, .lab-panel, .game-stage, .game-learn, .pano-section, .box_main, .container_main, ' +
         '.about-sub, .chips, .profile-links, .lab-hub-title, .pub-item, .contact-info, .contact-form, .formula, .frsm-lead';
      var vh = window.innerHeight || 800, items = [];
      document.querySelectorAll(SEL).forEach(function (el) {
         if (el.closest('.lab-top, .game-over, .reveal')) return;     // nested inside something that already animates
         if (el.getBoundingClientRect().top < vh * 0.92) return;      // already on screen
         el.classList.add('reveal');
         items.push(el);
      });
      if (items.length) {
         document.documentElement.classList.add('js-reveal');
         var done = function (e) {
            if (e.target !== this || e.propertyName !== 'opacity') return;
            this.classList.remove('reveal', 'in'); this.style.removeProperty('--rd');
            this.removeEventListener('transitionend', done);
         };
         var ro = new IntersectionObserver(function (ents) {
            var k = 0;
            ents.forEach(function (en) {
               if (!en.isIntersecting) return;
               var el = en.target;
               el.style.setProperty('--rd', Math.min(k++, 5) * 0.08 + 's');   // small stagger inside a row
               el.classList.add('in');
               el.addEventListener('transitionend', done);
               ro.unobserve(el);
            });
         }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
         items.forEach(function (el) { ro.observe(el); });
         /* safety net: if the observer never fires (old browser, embedded page…), reveal by position on scroll */
         var sweep = function () {
            var left = 0, h = window.innerHeight;
            items.forEach(function (el) {
               if (!el.classList.contains('reveal') || el.classList.contains('in')) return;
               left++;
               var r = el.getBoundingClientRect();
               if (r.top < h && r.bottom > 0) { el.classList.add('in'); el.addEventListener('transitionend', done); ro.unobserve(el); }
            });
            if (!left) window.removeEventListener('scroll', onScroll);
         };
         var tick = 0, onScroll = function () { if (!tick) tick = setTimeout(function () { tick = 0; sweep(); }, 120); };
         window.addEventListener('scroll', onScroll, { passive: true });
      }
   }

   /* Lab tools menu: bring the current tool into view on small screens */
   var cur = document.querySelector('.lab-subnav a.active');
   if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) {
      cur.parentNode.scrollLeft = cur.offsetLeft - (cur.parentNode.clientWidth - cur.offsetWidth) / 2;
   }
})();