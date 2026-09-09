/* Minimal offline cache for the StreetPulse mockup.
   Caches the app shell (HTML/CSS/JS/icon) on install, then serves from
   cache first so the demo still opens with no signal — the same
   "offline-first" idea the real app is built around. Leaflet's own CDN
   tiles/scripts are NOT cached here, so the map tiles need a connection;
   everything else (screens, data, vitals simulation) works offline. */

const CACHE_NAME = 'streetpulse-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.png',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/map.css',
  './css/scanner.css',
  './js/data.js',
  './js/map.js',
  './js/ui.js',
  './js/scanner.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin app-shell requests; let CDN/map-tile
  // requests pass straight through to the network.
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
