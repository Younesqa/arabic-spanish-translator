/* ============================================================
   Service Worker — caches the app shell so the interface
   (not the live translations) works offline / installs cleanly
   on iOS via "Add to Home Screen".
   ============================================================ */

const CACHE_NAME = "ar-es-translator-v1";

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// Install: pre-cache the app shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches from previous versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: serve app-shell files from cache first, falling back to network.
// Translation API requests always go straight to the network, since that
// content must be live.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  const isApiRequest =
    url.hostname.includes("libretranslate") ||
    url.hostname.includes("argosopentech");

  if (isApiRequest) {
    return; // Let the browser handle it normally (no caching).
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => caches.match("./index.html"))
      );
    })
  );
});
