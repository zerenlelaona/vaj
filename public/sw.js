// Offline support.
//
// Scope is the app's base path (e.g. /vaj/), so derive it from the
// registration rather than hard-coding it.
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const CACHE = "vaj-v1";

const CORE = [
  `${BASE}/`,
  `${BASE}/discover/`,
  `${BASE}/sponsors/`,
  `${BASE}/tracker/`,
  `${BASE}/stories/`,
  `${BASE}/prep/`,
  `${BASE}/sponsors.json`,
  `${BASE}/companies-resolved.json`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Individual failures shouldn't abort the whole install.
      .then((cache) => Promise.allSettled(CORE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Pages: network first so a new deploy is picked up immediately,
  // falling back to cache when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit ?? caches.match(`${BASE}/`))
            .then((hit) => hit ?? Response.error())
        )
    );
    return;
  }

  // Assets and data: cache first (chunk filenames are content-hashed),
  // refreshing in the background.
  event.respondWith(
    caches.match(request).then((hit) => {
      const fetched = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit ?? Response.error());
      return hit ?? fetched;
    })
  );
});
