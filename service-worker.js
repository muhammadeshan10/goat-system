/* GOAT System — offline app-shell cache.

   IMPORTANT FIX: the previous version of this file used pure cache-first
   for everything, with a cache name that never changed. That meant once
   installed, this service worker would serve the exact snapshot from
   install day, forever — every future update to the app's HTML file
   would silently never reach an already-installed device, no matter how
   many times the underlying file changed on the server. If you installed
   this PWA before now, this is very likely why fixes appeared to "not
   work at all" — you were looking at day-one code the whole time.

   SECOND FIX: this file and manifest.json previously referenced a file
   named "goat.html", which never actually existed in the delivered
   files — the real filename is index.html. That mismatch meant
   cache.addAll() during install would fail outright trying to fetch a
   404, which can prevent the service worker from ever successfully
   installing. Fixed by using the correct filename throughout.

   Fix: the HTML file itself is now network-first (always try to fetch
   the latest version; fall back to cache only when there's no
   connection). Static assets (icons, manifest) stay cache-first since
   they change rarely and this keeps load fast. CACHE_NAME is bumped
   again so any partially-broken cache from the filename bug gets torn
   down on next activation regardless. */
var CACHE_NAME = 'goat-system-v3';
var SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
var HTML_FILES = ['./index.html', './'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_FILES);
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  var url = event.request.url;
  var isHTML = HTML_FILES.some(function(f) { return url.indexOf(f.replace('./','')) !== -1; }) || event.request.mode === 'navigate';

  if (isHTML) {
    // Network-first: always get the latest version when online. Only
    // fall back to whatever's cached if there's genuinely no connection —
    // that's the actual "works offline" case, not "conveniently skip
    // checking for updates."
    event.respondWith(
      fetch(event.request).then(function(fresh) {
        var copy = fresh.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
        return fresh;
      }).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
  } else {
    // Static assets: cache-first is correct here, they rarely change.
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request);
      })
    );
  }
});
