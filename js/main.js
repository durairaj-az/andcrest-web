(function () {
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  var form = document.getElementById('contact-form');
  if (form) {
    var msg = document.getElementById('form-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        msg.textContent = 'Please fill in your name, work email and message.';
        return;
      }
      // No mail address or backend is configured yet; this only validates.
      msg.textContent = 'The form is not connected yet. Contact details will be added soon.';
    });
  }
})();
