// Service worker so the tally keeps working with no signal at the hat bar.
// Bump CACHE_VERSION whenever any precached file changes.
const CACHE_VERSION = "hatbar-v4";
const PRECACHE = [
  "./",
  "./index.html",
  "./logo.svg",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cachePut(request, response) {
  if (response && response.ok && new URL(request.url).origin === location.origin) {
    const copy = response.clone();
    caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isSquareSync = url.pathname.endsWith("/square-catalog.json") || url.pathname.includes("/square-photos/");

  if (isSquareSync) {
    // Network-first so a fresh sync shows up immediately; cached copy offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => cachePut(event.request, response))
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  // Everything else: cache-first for instant offline loads.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => cachePut(event.request, response));
    })
  );
});
