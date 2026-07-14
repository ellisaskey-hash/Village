/// <reference lib="webworker" />
// Custom injectManifest service worker (spec 09; pulled forward from M8 for gate 3 real-device
// push — DECISION-MADE, PROGRESS.md). Precache under the 2 MiB cap, CacheFirst for fonts/media,
// update-on-prompt (skipWaiting only on message), and web-push display + deep-link on click.
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

// Fonts + media: CacheFirst so they persist offline after first view.
registerRoute(
  ({ request }) => request.destination === 'font' || request.destination === 'image',
  new CacheFirst({
    cacheName: 'local-media',
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

// registerType 'prompt' — the app asks before reloading, then messages us to activate.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string })?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Web-push: show the notification.
self.addEventListener('push', (event) => {
  let payload: { title?: string; body?: string; deepLink?: string } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: event.data?.text() ?? 'Local' };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Local', {
      body: payload.body ?? '',
      data: { url: payload.deepLink ?? '/' },
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'local-alert',
    }),
  );
});

// Notification click → focus an open tab (navigating it) or open the deep link.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        const win = client as WindowClient;
        if ('focus' in win) {
          await win.navigate(url).catch(() => undefined);
          return win.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
