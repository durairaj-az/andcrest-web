(function () {
  var doc = document.documentElement;

  // Theme switcher (the saved choice is applied early by a small inline script in <head>)
  var tb = document.querySelector('.theme-btn');
  if (tb) {
    var sync = function () {
      var light = doc.getAttribute('data-theme') === 'light';
      tb.setAttribute('aria-pressed', String(light));
      tb.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    };
    sync();
    tb.addEventListener('click', function () {
      var next = doc.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      doc.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
    });
  }

  // Mobile menu
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  // Header background once scrolled
  var head = document.querySelector('.site-head');
  function onScroll() { if (head) head.classList.toggle('scrolled', window.scrollY > 24); }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Gentle reveal on scroll
  var items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Contact form: posts to the Worker at /api/contact, which stores the message in KV
  var form = document.getElementById('contact-form');
  if (form) {
    var msg = document.getElementById('form-msg');
    var send = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        msg.textContent = 'Please fill in your name, work email and message.';
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      send.disabled = true;
      msg.textContent = 'Sending...';
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok && b.ok, error: b.error }; });
      }).then(function (res) {
        if (res.ok) {
          form.reset();
          msg.textContent = 'Thank you. We have your message and will reply within one business day.';
        } else {
          msg.textContent = res.error || 'We could not send your message. Please try again shortly.';
        }
      }).catch(function () {
        msg.textContent = 'We could not send your message. Please check your connection and try again.';
      }).then(function () { send.disabled = false; });
    });
  }
})();
