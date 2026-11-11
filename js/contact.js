/* =====================================================================
   FRSM 2.0.0 — Contact form (Web3Forms)
   ---------------------------------------------------------------------
   CONFIGURACIÓN: solo hay que cambiar estas dos líneas.
   1) WEB3FORMS_KEY: la "Access Key" que Web3Forms envía a tu correo
      (https://web3forms.com → "Create Access Key").
   2) CONTACT_EMAIL: el correo que se muestra en la página.
   ===================================================================== */
var WEB3FORMS_KEY = '61a1000a-c8af-4024-b55a-b91260cb0723';
var CONTACT_EMAIL = 'your.email@example.com';

(function () {
   'use strict';

   var keyReady = WEB3FORMS_KEY && WEB3FORMS_KEY.indexOf('YOUR_') !== 0;
   var emailReady = CONTACT_EMAIL && CONTACT_EMAIL.indexOf('example.com') === -1;

   /* ---- show the e-mail wherever [data-contact-email] is used ---- */
   document.querySelectorAll('[data-contact-email]').forEach(function (el) {
      if (!emailReady) { el.closest('[data-contact-email-wrap]') && (el.closest('[data-contact-email-wrap]').hidden = true); return; }
      el.textContent = CONTACT_EMAIL;
      if (el.tagName === 'A') el.href = 'mailto:' + CONTACT_EMAIL;
   });

   /* ---- "copy e-mail" buttons ---- */
   document.querySelectorAll('[data-copy-email]').forEach(function (btn) {
      btn.addEventListener('click', function () {
         var done = function () {
            var old = btn.innerHTML;
            btn.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i> Copied';
            setTimeout(function () { btn.innerHTML = old; }, 1600);
         };
         if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(CONTACT_EMAIL).then(done);
         } else {
            var ta = document.createElement('textarea');
            ta.value = CONTACT_EMAIL; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            document.body.removeChild(ta);
         }
      });
   });

   /* ---- forms ---- */
   function setStatus(form, type, html) {
      var box = form.querySelector('.form-status');
      if (!box) return;
      box.className = 'form-status ' + type;
      box.innerHTML = html;
      box.hidden = false;
   }

   function mailtoFallback(form) {
      if (!emailReady) return '';
      var name = (form.elements.name && form.elements.name.value) || '';
      var subject = (form.elements.subject && form.elements.subject.value) || 'Message from your website';
      var body = (form.elements.message && form.elements.message.value) || '';
      var href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) +
                 '&body=' + encodeURIComponent(body + (name ? '\n\n— ' + name : ''));
      return ' You can also <a href="' + href + '">send it by e-mail</a>.';
   }

   document.querySelectorAll('form.js-contact-form').forEach(function (form) {
      form.addEventListener('submit', function (ev) {
         ev.preventDefault();

         // honeypot: bots fill hidden fields
         if (form.elements.botcheck && form.elements.botcheck.checked) return;

         if (!form.checkValidity()) {
            form.classList.add('was-validated');
            var firstBad = form.querySelector(':invalid');
            if (firstBad) firstBad.focus();
            setStatus(form, 'error', '<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Please fill in the required fields with a valid e-mail.');
            return;
         }

         if (!keyReady) {
            setStatus(form, 'error', '<i class="fa fa-exclamation-circle" aria-hidden="true"></i> The contact form is not configured yet.' + mailtoFallback(form));
            return;
         }

         var btn = form.querySelector('[type="submit"]');
         var btnHtml = btn ? btn.innerHTML : '';
         if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i> Sending...'; }

         var data = {
            access_key: WEB3FORMS_KEY,
            subject: '[Website] ' + ((form.elements.subject && form.elements.subject.value) || 'New message'),
            from_name: 'FRSM website',
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            message: form.elements.message.value.trim()
         };
         if (form.elements.affiliation && form.elements.affiliation.value.trim()) {
            data.affiliation = form.elements.affiliation.value.trim();
         }

         fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
         })
            .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
            .then(function (res) {
               if (res && res.success) {
                  form.reset();
                  form.classList.remove('was-validated');
                  setStatus(form, 'success', '<i class="fa fa-check-circle" aria-hidden="true"></i> Thank you! Your message was sent. I will get back to you soon.');
               } else {
                  setStatus(form, 'error', '<i class="fa fa-exclamation-circle" aria-hidden="true"></i> The message could not be sent.' + mailtoFallback(form));
               }
            })
            .catch(function () {
               setStatus(form, 'error', '<i class="fa fa-exclamation-circle" aria-hidden="true"></i> Connection error. Please try again.' + mailtoFallback(form));
            })
            .then(function () {
               if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }
            });
      });
   });
})();
