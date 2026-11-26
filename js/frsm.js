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

   /* Site menu (and Lab tools menu) in one wrapper, .lab-top */
   var sub = document.querySelector('.lab-subnav'), hdr = document.querySelector('.header_section');
   var navRow = hdr && hdr.querySelector('.navbar') && hdr.querySelector('.navbar').closest('.container');
   /* 2.0.13: the home page (the one with the banner) keeps its normal header —
      no compact fixed bar and no fade-in animations there */
   var isHome = !!document.querySelector('.header_section .banner_section');
   /* 2.0.14: on every page except Home the header is the compact bar from the
      start and stays at the top while scrolling (position: sticky) — no
      fade, no slide, no jump. On Lab pages the tools menu goes with it. */
   if (hdr && navRow && !isHome) {
      var bar = document.createElement('div'), spacer = document.createElement('div');
      bar.className = 'lab-top'; spacer.className = 'compact-spacer';
      hdr.parentNode.insertBefore(spacer, hdr);
      hdr.parentNode.insertBefore(bar, hdr);
      bar.appendChild(hdr);
      if (sub) bar.appendChild(sub);
      document.documentElement.classList.add('has-lab-top');
      document.body.classList.add('lab-stuck', 'compact-top');
      /* the bar is fixed (sticky fails here: body clips overflow and does not wrap
         the template's floats), so a spacer of the same height keeps its place.
         The height is measured with the phone menu closed. */
      var fit = function () {
         if (hdr.querySelector('.navbar-collapse.show, .navbar-collapse.collapsing')) return;
         spacer.style.height = bar.offsetHeight + 'px';
      };
      fit();
      window.addEventListener('resize', fit);
      window.addEventListener('load', fit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      /* picking a menu link closes the phone menu */
      hdr.addEventListener('click', function (e) {
         if (e.target.closest('.nav-link')) {
            var open = hdr.querySelector('.navbar-collapse.show'); if (open) open.classList.remove('show');
         }
      });
   }

   /* 2.0.13 · "Skip to content": first stop for keyboard users, hidden until focused */
   (function () {
      var h = document.querySelector('.header_section');
      if (!h) return;
      var target = h.querySelector('.banner_section');          /* Home: the hero */
      if (!target) {
         var top = h.closest('.lab-top') || h;                    /* other pages: what follows the header */
         target = top.nextElementSibling;
         while (target && /^(SCRIPT|NAV)$/.test(target.tagName)) target = target.nextElementSibling;
      }
      if (!target) return;
      if (!target.id) target.id = 'main-content';
      target.setAttribute('tabindex', '-1');
      target.classList.add('skip-target');
      var skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#' + target.id;
      var label = function () {
         skip.textContent = (window.frsmI18n && window.frsmI18n.lang === 'es') ? 'Saltar al contenido' : 'Skip to content';
      };
      label();
      if (window.frsmI18n) window.frsmI18n.onChange(label);
      document.body.insertBefore(skip, document.body.firstChild);
   })();

   /* Scroll animations: content blocks fade and slide in as they come into
      view; items of the same group (cards, steps…) arrive one after another.
      Skipped when the visitor asked the system for reduced motion. */
   var REVEAL = [
      '.frsm-title', '.frsm-lead', '.frsm-sub', '.about-sub', '.lab-hub-title',
      '.services_taital', '.portfolio_taital', '.services_section_2 .row > div', '.readmore_bt', '.seemore_bt',
      '.portfolio_section_2 .row > div', '.container_main', '.blog_box',
      '.lab-tool', '.lab-jump-card', '.lab-panel', '.lab-back',
      '.frsm-card', '.post-card', '.pub-card', '.frsm-grid > *', '.frsm-step', '.frsm-stat',
      '.tl-item', '.scale-item', '.did-you-know', '.frsm-note', '.frsm-cta',
      '.pano-h', '.pano-lead', '.pano-frame', '.pano-info', '.sf-col', '.poster-card'
   ].join(',');
   var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if ('IntersectionObserver' in window && !reduce && !isHome) {
      var items = [];
      /* document order: a block is skipped when an ancestor already animates,
         and nothing inside the fixed menus, a game board or a hidden article */
      document.querySelectorAll(REVEAL).forEach(function (el) {
         if (el.closest('.lab-top, .game-stage, .post-full, .modal') || el.parentNode.closest('.reveal')) return;
         /* 2.0.13: what is already on screen when the page opens shows at once;
            only content further down animates in */
         var rr = el.getBoundingClientRect();
         if (rr.top < window.innerHeight && rr.bottom > 0) return;
         items.push(el);
         el.classList.add('reveal');
      });
      var io = new IntersectionObserver(function (entries) {
         var n = 0;   /* blocks that appear together arrive one after another */
         entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            en.target.style.setProperty('--reveal-delay', Math.min(n++, 6) * 90 + 'ms');
            en.target.classList.add('is-in');
            io.unobserve(en.target);
         });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      items.forEach(function (el) { io.observe(el); });
   }

   /* 2.0.15 · Gallery filters: buttons with data-filter show the elements whose
      data-group matches ("all" shows everything); each button shows its photo count */
   var galFilters = document.querySelectorAll('.gal-filter');
   if (galFilters.length) {
      var groupEls = document.querySelectorAll('[data-group]');
      galFilters.forEach(function (b) {
         var f = b.getAttribute('data-filter');
         var n = document.querySelectorAll('.gal-item' + (f === 'all' ? '' : '[data-group="' + f + '"]')).length;
         var c = document.createElement('small'); c.textContent = n; c.setAttribute('aria-hidden', 'true');
         b.appendChild(c);
         b.addEventListener('click', function () {
            galFilters.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
            groupEls.forEach(function (el) { el.hidden = !(f === 'all' || el.getAttribute('data-group') === f); });
            window.dispatchEvent(new Event('resize'));   /* lets the 360° viewer re-measure when shown again */
         });
      });
   }

   /* 2.0.12 · Lightbox: links with data-lightbox open their image full screen
      (click the image to zoom in/out; Esc, the X or the backdrop closes it) */
   var lbLinks = document.querySelectorAll('a[data-lightbox]');
   if (lbLinks.length) {
      var t = function (en, es) { return (window.frsmI18n && window.frsmI18n.lang === 'es') ? es : en; };
      var lb = document.createElement('div');
      lb.className = 'frsm-lightbox';
      lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.hidden = true;
      lb.innerHTML = '<div class="frsm-lb-bar"><span class="frsm-lb-count" aria-live="polite"></span><span class="frsm-lb-cap"></span>' +
         '<a class="frsm-lb-open" target="_blank" rel="noopener"><i class="fa fa-external-link" aria-hidden="true"></i></a>' +
         '<button type="button" class="frsm-lb-close"><i class="fa fa-times" aria-hidden="true"></i></button></div>' +
         '<div class="frsm-lb-stage"><img alt=""></div>' +
         '<button type="button" class="frsm-lb-nav prev"><i class="fa fa-chevron-left" aria-hidden="true"></i></button>' +
         '<button type="button" class="frsm-lb-nav next"><i class="fa fa-chevron-right" aria-hidden="true"></i></button>';
      document.body.appendChild(lb);
      var lbImg = lb.querySelector('img'), lbStage = lb.querySelector('.frsm-lb-stage'),
          lbCap = lb.querySelector('.frsm-lb-cap'), lbOpen = lb.querySelector('.frsm-lb-open'),
          lbClose = lb.querySelector('.frsm-lb-close'), lbCount = lb.querySelector('.frsm-lb-count'),
          lbPrev = lb.querySelector('.frsm-lb-nav.prev'), lbNext = lb.querySelector('.frsm-lb-nav.next'),
          lbBack = null, lbList = [], lbIdx = 0;
      var closeLb = function () {
         lb.classList.remove('open');
         document.documentElement.classList.remove('lb-open');
         setTimeout(function () { if (!lb.classList.contains('open')) { lb.hidden = true; lbImg.removeAttribute('src'); } }, 260);
         if (lbBack) lbBack.focus();
      };
      /* caption in the visitor's language: data-caption (EN) / data-caption-es */
      var capOf = function (a) {
         return t(a.getAttribute('data-caption') || '', a.getAttribute('data-caption-es') || a.getAttribute('data-caption') || '');
      };
      var show = function (i) {
         lbIdx = (i + lbList.length) % lbList.length;
         var a = lbList[lbIdx];
         lbStage.classList.remove('zoomed');
         lbImg.src = a.getAttribute('href');
         lbImg.alt = capOf(a);
         lbCap.textContent = capOf(a);
         lbOpen.href = a.getAttribute('href');
         lb.setAttribute('aria-label', lbCap.textContent);
         var many = lbList.length > 1;
         lbCount.textContent = many ? (lbIdx + 1) + ' / ' + lbList.length : '';
         lbPrev.hidden = lbNext.hidden = !many;
      };
      lbLinks.forEach(function (a) {
         a.addEventListener('click', function (e) {
            e.preventDefault();
            lbBack = a;
            /* 2.0.15: links that share a data-lightbox name form a series (only the visible
               ones, so a gallery filter is respected); one entry per image */
            var group = a.getAttribute('data-lightbox'), seen = {};
            lbList = group ? [].filter.call(document.querySelectorAll('a[data-lightbox="' + group + '"]'), function (x) {
               if (!x.offsetParent || seen[x.getAttribute('href')]) return false;
               seen[x.getAttribute('href')] = true; return true;
            }) : [a];
            if (!lbList.length) lbList = [a];
            var start = 0;
            lbList.forEach(function (x, k) { if (x.getAttribute('href') === a.getAttribute('href')) start = k; });
            lbOpen.setAttribute('aria-label', t('Open in a new tab', 'Abrir en una pestaña nueva'));
            lbClose.setAttribute('aria-label', t('Close', 'Cerrar'));
            lbPrev.setAttribute('aria-label', t('Previous photo', 'Foto anterior'));
            lbNext.setAttribute('aria-label', t('Next photo', 'Foto siguiente'));
            show(start);
            lb.hidden = false;
            document.documentElement.classList.add('lb-open');
            requestAnimationFrame(function () { lb.classList.add('open'); lbClose.focus(); });
         });
      });
      lbPrev.addEventListener('click', function () { show(lbIdx - 1); });
      lbNext.addEventListener('click', function () { show(lbIdx + 1); });
      document.addEventListener('keydown', function (e) {
         if (!lb.classList.contains('open') || lbList.length < 2) return;
         if (e.key === 'ArrowLeft') { e.preventDefault(); show(lbIdx - 1); }
         if (e.key === 'ArrowRight') { e.preventDefault(); show(lbIdx + 1); }
      });
      /* swipe left / right on touch screens (not while zoomed in) */
      var sx = null, sy = 0;
      lbStage.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
      lbStage.addEventListener('touchend', function (e) {
         if (sx === null || lbStage.classList.contains('zoomed') || lbList.length < 2) { sx = null; return; }
         var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
         if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(lbIdx + (dx < 0 ? 1 : -1));
      });
      lbImg.addEventListener('click', function (e) {
         var zoomed = lbStage.classList.toggle('zoomed');
         if (zoomed) {   /* keep the clicked spot under the pointer */
            var r = lbImg.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
            requestAnimationFrame(function () {
               lbStage.scrollLeft = fx * lbImg.offsetWidth - lbStage.clientWidth / 2;
               lbStage.scrollTop = fy * lbImg.offsetHeight - lbStage.clientHeight / 2;
            });
         }
      });
      lbClose.addEventListener('click', closeLb);
      lbStage.addEventListener('click', function (e) { if (e.target === lbStage) closeLb(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) closeLb(); });
   }

   /* Lab tools menu: bring the current tool into view on small screens */
   var cur = document.querySelector('.lab-subnav a.active');
   if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) {
      cur.parentNode.scrollLeft = cur.offsetLeft - (cur.parentNode.clientWidth - cur.offsetWidth) / 2;
   }
})();