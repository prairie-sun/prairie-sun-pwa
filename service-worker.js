// Bump cache version so browsers don’t use old files
const CACHE_NAME = 'psb-static-v2';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',          // add your CSS
  '/manifest.json',
  '/taplist.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => {
        if (k !== CACHE_NAME) return caches.delete(k);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for the taplist JSON
  if (url.pathname.endsWith('/taplist.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      return caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, resp.clone());
        return resp;
      });
    })).catch(() => {
      return new Response('Offline', {
        status: 503,
        headers: { 'Content-Type':'text/plain' }
      });
    })
  );
});
