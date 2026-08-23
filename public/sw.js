try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
} catch (e) {
  console.debug('OneSignal Service Worker import skipped or unavailable');
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Pass-through fetch handler prevents Service Worker from crashing tab or serving stale dev bundles
self.addEventListener('fetch', (event) => {
  // Default network handling
});
