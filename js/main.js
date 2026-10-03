(function () {
  'use strict';

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');

  if (!toggle || !nav) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close the mobile menu after tapping a link or moving outside it.
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', function (e) {
    if (!nav.classList.contains('is-open')) return;
    if (e.target.closest('.nav-toggle') || e.target.closest('.primary-nav')) return;
    setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // Reset state if the viewport grows into the desktop layout.
  var desktop = window.matchMedia('(min-width: 1100px)');
  function onChange(e) { if (e.matches) setOpen(false); }
  if (typeof desktop.addEventListener === 'function') {
    desktop.addEventListener('change', onChange);
  } else if (typeof desktop.addListener === 'function') {
    desktop.addListener(onChange);
  }

  // Fill any element marked data-year with the current year.
  var year = String(new Date().getFullYear());
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = year;
  });
})();