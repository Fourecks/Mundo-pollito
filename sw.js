const CACHE_NAME = 'pollito-productivo-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Non-critical assets, if they fail, the SW will still install.
        const criticalAssets = urlsToCache.slice(0, 3); // '/', '/index.html', etc.
        const nonCriticalAssets = urlsToCache.slice(3);
        
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

    // For Supabase API calls and Google Drive content, always go to the network first.
    if (event.request.url.includes('supabase.co') || event.request.url.includes('googleapis.com')) {
         event.respondWith(
            fetch(event.request).catch(() => {
                // On failure (offline), you could return a generic fallback from cache if you had one.
                // For now, we just let the request fail.
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response; // Return from cache
                }

                // Not in cache, fetch from network
                return fetch(event.request).then((response) => {
                    // Check for valid response
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
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
