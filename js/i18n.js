/* =====================================================================
   FRSM 2.0.2 — ES / EN language switch
   ---------------------------------------------------------------------
   How to mark text in the HTML:
   • Text written in ENGLISH that needs a Spanish version:
       <h2 data-es="Mi investigación">My research</h2>
   • Text written in SPANISH that needs an English version:
       <h3 data-en="Graphene">Grafeno</h3>
   • Long blocks: write both versions and mark each one:
       <div data-only="en"> ... </div>
       <div data-only="es"> ... </div>
   • Attributes: data-es-placeholder, data-es-aria-label, data-es-title
     (or data-en-... for Spanish originals).
   The choice is remembered in the browser (localStorage).
   ===================================================================== */
(function () {
   'use strict';

   var KEY = 'frsm-lang';
   var ATTRS = ['placeholder', 'aria-label', 'title'];
   var root = document.documentElement;
   var listeners = [];

   function detect() {
      try { var s = localStorage.getItem(KEY); if (s === 'es' || s === 'en') return s; } catch (e) {}
      return /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
   }

   var lang = root.getAttribute('data-lang') || detect();

   /* swap the content of one element */
   function swap(el, cur) {
      var other = el.hasAttribute('data-es') ? 'es' : 'en';     // language stored in the attribute
      /* the original text is kept in an attribute, so it survives when
         another script copies and restores innerHTML (e.g. "Sending...") */
      if (!el.hasAttribute('data-i18n-src')) el.setAttribute('data-i18n-src', el.tagName === 'TITLE' ? el.textContent : el.innerHTML);
      var html = cur === other ? el.getAttribute('data-' + other) : el.getAttribute('data-i18n-src');
      if (el.tagName === 'TITLE') el.textContent = html; else el.innerHTML = html;
   }

   function swapAttr(el, attr, cur) {
      var key = 'data-i18n-src-' + attr;
      ['es', 'en'].forEach(function (l) {
         var alt = el.getAttribute('data-' + l + '-' + attr);
         if (alt === null) return;
         if (!el.hasAttribute(key)) el.setAttribute(key, el.getAttribute(attr) || '');
         el.setAttribute(attr, cur === l ? alt : el.getAttribute(key));
      });
   }

   function apply(l) {
      lang = l;
      root.setAttribute('data-lang', l);
      root.lang = l;
      document.querySelectorAll('[data-es],[data-en]').forEach(function (el) { swap(el, l); });
      ATTRS.forEach(function (a) {
         document.querySelectorAll('[data-es-' + a + '],[data-en-' + a + ']').forEach(function (el) { swapAttr(el, a, l); });
      });
      document.querySelectorAll('[data-set-lang]').forEach(function (b) {
         var on = b.getAttribute('data-set-lang') === l;
         b.classList.toggle('active', on);
         b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      listeners.forEach(function (fn) { try { fn(l); } catch (e) {} });
   }

   function set(l) {
      try { localStorage.setItem(KEY, l); } catch (e) {}
      apply(l);
   }

   /* language buttons in the menu */
   var nav = document.querySelector('.navbar-nav');
   if (nav && !nav.querySelector('.lang-switch')) {
      var li = document.createElement('li');
      li.className = 'nav-item lang-item';
      li.innerHTML = '<div class="lang-switch" role="group" aria-label="Language / Idioma">' +
         '<button type="button" data-set-lang="en" lang="en" title="English">EN</button>' +
         '<button type="button" data-set-lang="es" lang="es" title="Español">ES</button></div>';
      nav.appendChild(li);
   }
   document.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-set-lang]');
      if (b) set(b.getAttribute('data-set-lang'));
   });

   /* public helpers for other scripts */
   window.frsmI18n = {
      get lang() { return lang; },
      set: set,
      t: function (en, es) { return lang === 'es' ? es : en; },
      onChange: function (fn) { listeners.push(fn); }
   };

   apply(lang);
})();
