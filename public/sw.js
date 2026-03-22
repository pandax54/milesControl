// Service Worker for MilesControl Web Push Notifications

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
