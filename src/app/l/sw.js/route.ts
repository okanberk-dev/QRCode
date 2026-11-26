// Service worker of the loyalty pages (CLAUDE.md §61), scope /l/. Only
// shows card notifications and opens the card on a tap: no caching, no
// fetch handling, so pages always come from the network as before.
export const dynamic = 'force-static';

const SCRIPT = `
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  var title = typeof data.title === 'string' && data.title ? data.title : 'Buaze';
  var url = typeof data.url === 'string' && data.url.charAt(0) === '/' && data.url.charAt(1) !== '/' ? data.url : '/l/';
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === 'string' ? data.body : '',
    icon: typeof data.icon === 'string' && data.icon.charAt(0) === '/' ? data.icon : undefined,
    tag: typeof data.tag === 'string' ? data.tag : undefined,
    data: { url: url }
  }));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var path = (event.notification.data && event.notification.data.url) || '/l/';
  var target = new URL(path, self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(target.origin + target.pathname) === 0 && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(target.href);
  }));
});
`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Service-Worker-Allowed': '/l/',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
