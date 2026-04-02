const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `milescontrol-app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `milescontrol-runtime-${CACHE_VERSION}`;
const OFFLINE_DOCUMENT = '/offline.html';
const APP_SHELL_ASSETS = [
  OFFLINE_DOCUMENT,
  '/manifest.webmanifest',
  '/icons/apple-touch-icon.png',
  '/icons/badge-72x72.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
];

function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (
      url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.webmanifest' ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg')
    )
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => (
            cacheName.startsWith('milescontrol-') &&
            cacheName !== APP_SHELL_CACHE &&
            cacheName !== RUNTIME_CACHE
          ))
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'MilesControl', body: event.data.text() };
  }

  const title = payload.title ?? 'MilesControl';
  const options = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icons/icon-192x192.png',
    badge: payload.badge ?? '/icons/badge-72x72.png',
    tag: payload.tag ?? 'milescontrol-alert',
    data: payload.data ?? {},
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/notifications';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedOfflineDocument = await caches.match(OFFLINE_DOCUMENT);
        return cachedOfflineDocument ?? Response.error();
      }),
    );
    return;
  }

  if (!isCacheableAsset(requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => cachedResponse ?? Response.error());

      return cachedResponse ?? networkResponse;
    }),
  );
});
