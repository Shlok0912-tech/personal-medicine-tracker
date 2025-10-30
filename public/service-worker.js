const CACHE_NAME = "medicine-health-tracker-v3";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/FullLogo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Cache-first with network fallback and runtime caching for same-origin GET requests
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // App-shell: serve cached index.html for navigations when offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Redirect icon-192.png and icon-512.png to FullLogo.png to avoid 404/invalid image
  if (isSameOrigin && (url.pathname === "/icon-192.png" || url.pathname === "/icon-512.png")) {
    const logoRequest = new Request("/FullLogo.png", { headers: request.headers, mode: request.mode, credentials: request.credentials, cache: request.cache, redirect: request.redirect });
    event.respondWith(
      caches.match(logoRequest).then((cachedLogo) => {
        if (cachedLogo) return cachedLogo;
        return fetch(logoRequest).then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(logoRequest, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          if (
            isSameOrigin &&
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
    })
  );
});


