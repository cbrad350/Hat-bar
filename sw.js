// Service worker so the tally keeps working with no signal at the hat bar.
// Bump CACHE_VERSION whenever any precached file changes.
const CACHE_VERSION = "hatbar-v5";
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

function isSquareSyncPath(pathname) {
  return pathname.endsWith("/square-catalog.json") || pathname.includes("/square-photos/");
}

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Before deleting retired caches, carry the synced Square data (catalog +
    // product photos) forward — an app update must never wipe the offline menu.
    const keys = await caches.keys();
    const current = await caches.open(CACHE_VERSION);
    for (const key of keys) {
      if (key === CACHE_VERSION) continue;
      const old = await caches.open(key);
      for (const request of await old.keys()) {
        if (isSquareSyncPath(new URL(request.url).pathname) && !(await current.match(request))) {
          const response = await old.match(request);
          if (response) await current.put(request, response);
        }
      }
      await caches.delete(key);
    }
    await self.clients.claim();
  })());
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

  if (isSquareSyncPath(url.pathname)) {
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
