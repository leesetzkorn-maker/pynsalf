(function () {
  'use strict';

  var endpoint = window.PYNSALF_ANALYTICS_ORIGIN;
  if (!endpoint || location.pathname.indexOf('/admin') !== -1) return;

  var visitorId;
  try {
    if (localStorage.getItem('ps_analytics_opt_out') === '1') return;
    visitorId = localStorage.getItem('ps_analytics_visitor');
    if (!visitorId) {
      var bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      visitorId = Array.from(bytes, function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
      localStorage.setItem('ps_analytics_visitor', visitorId);
    }
  } catch (_) {
    // Privacy mode may disable local storage; this visit still gets anonymous page events.
    var fallback = new Uint8Array(24);
    crypto.getRandomValues(fallback);
    visitorId = Array.from(fallback, function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  var allowedLinks = [
    { selector: 'a[href^="https://wa.me/27665703425"]', event: 'whatsapp_click' },
    { selector: 'a[href^="tel:+27665703425"], a[href^="tel:0665703425"]', event: 'phone_click' },
    { selector: 'a[href^="mailto:pynsalf00@gmail.com"]', event: 'email_click' },
    { selector: 'a[href="https://www.facebook.com/share/19V2pz8Tyz/"]', event: 'facebook_click' },
  ];

  function send(eventName) {
    // Recheck the preference for pages that were open when another tab opted out.
    try {
      if (localStorage.getItem('ps_analytics_opt_out') === '1') return;
    } catch (_) {
      // Storage may be unavailable; retain the existing anonymous fallback.
    }
    var payload = JSON.stringify({
      event: eventName,
      visitorId: visitorId,
      path: location.pathname,
    });
    var target = endpoint.replace(/\/+$/, '') + '/api/collect';
    try {
      if (navigator.sendBeacon) {
        var body = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
        if (navigator.sendBeacon(target, body)) return;
      }
      fetch(target, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: payload,
      }).catch(function () {});
    } catch (_) {
      // Analytics is best-effort and must never interrupt navigation or the public site.
    }
  }

  send('page_view');
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest && event.target.closest('a[href]');
    if (!anchor) return;
    for (var i = 0; i < allowedLinks.length; i++) {
      if (anchor.matches(allowedLinks[i].selector)) {
        send(allowedLinks[i].event);
        return;
      }
    }
  });
})();
