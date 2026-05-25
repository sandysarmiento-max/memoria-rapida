const CACHE_NAME = 'vozmemo-v2';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=2',
  './app.js?v=2',
  './manifest.webmanifest?v=2',
  './icon-192-v2.png',
  './icon-512-v2.png',
  './apple-touch-icon-v2.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
