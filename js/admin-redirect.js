(function () {
  'use strict';
  var origin = window.PYNSALF_ANALYTICS_ORIGIN;
  var state = document.getElementById('state');
  var link = document.getElementById('open');
  if (!origin) {
    state.textContent = 'The secure analytics service has not been connected yet. No password is requested or stored on this public page.';
    return;
  }
  try {
    var target = new URL('/admin', origin);
    if (target.protocol !== 'https:') throw new Error('HTTPS required');
    link.href = target.href;
    link.hidden = false;
    state.textContent = 'Continue to the secure Cloudflare sign-in page.';
  } catch (_) {
    state.textContent = 'The secure dashboard address is not configured correctly.';
  }
})();
