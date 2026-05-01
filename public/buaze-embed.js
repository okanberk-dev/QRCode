/**
 * Buaze Embed Widget — script-tag wrapper.
 * Usage:
 *   <script src="https://buaze.com/buaze-embed.js" data-buaze="<slug>" defer></script>
 *
 * Optional attributes:
 *   data-theme="light|dark"
 *   data-size="full|compact"
 *
 * Auto-resize: iframe height parent'a postMessage ile bildirilir; bu
 * script origin-enforced listener kurar (fake message spoof önleme).
 */
(function () {
  var SCRIPT_ORIGIN = 'https://buaze.com';
  var scripts = document.querySelectorAll('script[data-buaze]');
  scripts.forEach(function (s) {
    if (s.dataset.buazeMounted === '1') return;
    s.dataset.buazeMounted = '1';
    var slug = s.getAttribute('data-buaze');
    var theme = s.getAttribute('data-theme') || 'light';
    var size = s.getAttribute('data-size') || 'full';
    if (!slug) return;
    var iframe = document.createElement('iframe');
    iframe.src =
      SCRIPT_ORIGIN +
      '/embed/' +
      encodeURIComponent(slug) +
      '?theme=' +
      encodeURIComponent(theme) +
      '&size=' +
      encodeURIComponent(size);
    iframe.title = 'Buaze yorumlar widget';
    iframe.width = '100%';
    iframe.height = '400';
    iframe.frameBorder = '0';
    iframe.style.border = 'none';
    iframe.style.maxWidth = '600px';
    iframe.style.display = 'block';
    iframe.setAttribute('loading', 'lazy');
    s.parentNode.insertBefore(iframe, s);
  });

  // postMessage listener — sadece Buaze origin'inden gelen mesajları kabul.
  window.addEventListener('message', function (e) {
    if (e.origin !== SCRIPT_ORIGIN) return;
    var data = e.data;
    if (!data || data.type !== 'buaze-embed-height') return;
    var height = parseInt(data.height, 10);
    if (!isFinite(height) || height < 0 || height > 5000) return;
    document.querySelectorAll('iframe[src*="' + SCRIPT_ORIGIN + '/embed/"]').forEach(function (f) {
      f.height = height + 'px';
    });
  });
})();
