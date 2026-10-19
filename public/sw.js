/**
 * Flaw Agent - Web Push Service Worker
 * Handles incoming push messages, background notifications, and user click navigation.
 */

const SW_VERSION = 'flaw-sw-v1.0.0';

self.addEventListener('install', (event) => {
  console.log('[Flaw SW] Service Worker installed, version:', SW_VERSION);
  // Force active state immediately without waiting for existing tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Flaw SW] Service Worker activated, taking control.');
  event.waitUntil(self.clients.claim());
});

/**
 * Handle push events pushed from the Web Push protocol (VAPID).
 */
self.addEventListener('push', (event) => {
  console.log('[Flaw SW] Push event received.');

  let payload = {
    title: 'Flaw Agent Notification',
    body: 'You have a new update from Flaw Agent.',
    icon: '/brand-logo.svg',
    badge: '/brand-logo.svg',
    url: '/flaw/submit',
    type: 'system_update',
    tag: 'flaw-push-' + Date.now(),
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open Flaw' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
        data: {
          url: (parsed.data && parsed.data.url) || parsed.url || '/flaw/submit',
          type: (parsed.data && parsed.data.type) || parsed.type || 'system_update',
          timestamp: (parsed.data && parsed.data.timestamp) || Date.now(),
          ...(parsed.data || {})
        }
      };
    } catch (e) {
      // Fallback if data is raw text
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  const notificationTitle = payload.title || 'Flaw Agent';
  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/brand-logo.svg',
    badge: payload.badge || '/brand-logo.svg',
    tag: payload.tag || 'flaw-' + payload.type,
    renotify: true,
    requireInteraction: payload.requireInteraction ?? false,
    data: payload.data || {
      url: payload.url || '/flaw/submit',
      type: payload.type || 'system_update',
      timestamp: Date.now()
    },
    actions: payload.actions || [
      { action: 'open', title: 'Open Flaw' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

/**
 * Handle user click on the notification banner or its action buttons.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Flaw SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/flaw/submit';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing Flaw window/tab is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            const clientUrl = new URL(client.url);
            const currentOrigin = self.location.origin;

            if (clientUrl.origin === currentOrigin) {
              client.focus();
              if ('navigate' in client && targetUrl) {
                return client.navigate(targetUrl);
              }
              return client;
            }
          } catch (err) {
            console.warn('[Flaw SW] Error checking window client:', err);
          }
        }
      }

      // 2. Otherwise open a new browser window/tab to the requested destination
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Notification closed without click (analytics / clean up if needed)
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[Flaw SW] Notification closed by user without action.');
});
