/**
 * NEYA Service Worker — lightweight static-asset caching only.
 *
 * SAFETY RULES:
 * - Only caches same-origin GET requests for static assets (CSS, JS, fonts, images in /public).
 * - NEVER caches: API responses, auth routes, dashboard, checkout, dynamic pages, or anything with a query string.
 * - Stale-while-revalidate strategy: serve from cache, update in background.
 * - No private user data is ever stored in the cache.
 */

const CACHE_NAME = "neya-static-v1";
const STATIC_ASSET_PATTERNS = [
  /\/_next\/static\//, // Next.js build assets (hashed, immutable)
  /\/icon-\d+\.png$/, // PWA icons
  /\/apple-touch-icon\.png$/,
  /\/favicon/,
  /\/placeholder\.svg$/,
  /\/neyalogo\.png$/,
];

function isStaticAsset(url) {
  if (url.method !== "GET") return false;
  const pathname = new URL(url.url).pathname;
  // Never cache anything that isn't a static asset
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isNeverCached(url) {
  const pathname = new URL(url.url).pathname;
  // Hard blocklist — never cache these regardless of any matching pattern
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/business")) return true;
  if (pathname.startsWith("/admin") || pathname.startsWith("/venue")) return true;
  if (pathname.startsWith("/checkout") || pathname.startsWith("/onboarding")) return true;
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/forgot-password") || pathname.startsWith("/update-password")) return true;
  if (pathname.includes("?")) return true; // query-stringed URLs
  return false;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests for same-origin static assets
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCached(request)) return;
  if (!isStaticAsset(request)) return;

  // Stale-while-revalidate: serve cached, fetch fresh in background
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok || response.type === "opaque") {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Network failed — return cached if available, else let it fail
          return cached;
        });
      return cached || fetchPromise;
    })(),
  );
});
