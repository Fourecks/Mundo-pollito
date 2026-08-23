const CACHE_NAME = 'pollito-productivo-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&display=swap',
  'https://www.youtube.com/iframe_api',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
  'https://accounts.google.com/gsi/client',
  'https://apis.google.com/js/api.js',
  'https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito-icon-192.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        const criticalAssets = urlsToCache.slice(0, 2);
        const nonCriticalAssets = urlsToCache.slice(2);
        
        cache.addAll(nonCriticalAssets).catch(err => console.log("Failed to cache non-critical assets:", err));
        return cache.addAll(criticalAssets);
      })
  );
});

self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    // For Supabase API calls and Google APIs, go to network
    if (event.request.url.includes('supabase.co') || event.request.url.includes('googleapis.com')) {
         event.respondWith(
            fetch(event.request).catch(() => {})
        );
        return;
    }

    // Network-first for HTML page navigation to ensure users always get the fresh app
    if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                return fetch(event.request).then((response) => {
                    if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'opaque')) {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
    );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        self.clients.claim(),
        ...cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      ]);
    })
  );
});
