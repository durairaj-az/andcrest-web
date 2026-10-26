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

  // Contact form (validation only until a backend or mail address is set)
  var form = document.getElementById('contact-form');
  if (form) {
    var msg = document.getElementById('form-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        msg.textContent = 'Please fill in your name, work email and message.';
        return;
      }
      msg.textContent = 'The form is not connected yet. Contact details will be added soon.';
    });
  }
})();
