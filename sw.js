// Keeps the register working with no signal at the bar — without ever pinning
// the phone to a stale copy of the app.
//
// The first version of this file was cache-first for everything, so once the
// page was cached the phone kept serving it forever and shipped fixes never
// arrived. The page itself is now network-first (fresh whenever there's a
// signal, cached copy when there isn't), and other assets are
// stale-while-revalidate so they self-heal on the next load instead of waiting
// for someone to remember to bump a version string.
const CACHE_VERSION = "hatbar-v6";
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

// The page itself, however it was requested: a home-screen launch, a reload, or
// an explicit /index.html.
function isPageRequest(request, url) {
  return request.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html");
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

async function networkFirst(request) {
  try {
    return cachePut(request, await fetch(request));
  } catch (e) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw e;
  }
}

// Serve the cached copy at once, but refresh it in the background so the next
// load is current. Nothing here is version-pinned.
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  const fetching = fetch(request).then((r) => cachePut(request, r)).catch(() => null);
  return cached || (await fetching) || fetch(request);
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // Fresh app and fresh menu whenever there's a signal; cached when there isn't.
  if (isPageRequest(event.request, url) || isSquareSyncPath(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event.request));
});
