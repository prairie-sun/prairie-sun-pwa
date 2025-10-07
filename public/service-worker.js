// ------------------------
// Service Worker
// ------------------------

// Bump cache version
const CACHE_NAME = 'psb-static-v3';
const ASSETS_TO_CACHE = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json'
];

// Install event — cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME && caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // --------------------------
  // Network-first for critical app files
  // --------------------------
  if (
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/app.js') ||
    url.pathname.endsWith('/style.css') ||
    url.pathname.endsWith('/taplist.json')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache for offline fallback
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // --------------------------
  // Cache-first for icons & manifest
  // --------------------------
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
      return resp;
    })).catch(() => new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    }))
  );
});
