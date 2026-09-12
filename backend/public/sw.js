// Fender Disaster Response PWA Service Worker
const CACHE_NAME = "fender-pwa-v1.1";

const PRECACHE_ASSETS = [
  "/",
  "/logo.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Offline fallback HTML response
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Fender Response · Offline Mode</title>
  <style>
    :root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090d16; color: #f1f5f9; }
    body { margin: 0; padding: 24px; display: flex; flex-direction: column; min-height: 100vh; box-sizing: border-box; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 20px; margin-bottom: 16px; }
    .pill { display: inline-flex; align-items: center; background: #ea580c; color: white; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px; }
    h1 { font-size: 24px; margin: 8px 0; color: #ffffff; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 4px 0 16px 0; }
    .btn { display: flex; align-items: center; justify-content: center; background: #e11d48; color: white; padding: 14px; border-radius: 14px; font-weight: bold; font-size: 15px; text-decoration: none; margin-bottom: 10px; text-align: center; }
    .btn-sec { background: #0284c7; }
    .btn-outline { background: #0f172a; border: 1px solid #475569; }
    .tips { background: #0f172a; border-radius: 14px; padding: 16px; border: 1px solid #334155; }
    .tips li { font-size: 13px; color: #cbd5e1; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="pill">Offline Emergency Mode</span>
    <h1>Fender Response</h1>
    <p>Network connection lost. Your emergency hotlines and cached offline instructions remain active.</p>
    
    <a href="tel:117" class="btn">🚨 Call Disaster Management (117)</a>
    <a href="tel:1990" class="btn btn-sec">🚑 Free Ambulance (1990)</a>
    <a href="tel:119" class="btn btn-outline">👮 Police Emergency (119)</a>
  </div>

  <div class="card">
    <h3 style="margin-top:0; font-size: 16px; color:#f8fafc;">Offline Emergency Guidelines</h3>
    <ul class="tips" style="padding-left: 20px;">
      <li><strong>Electrical Safety:</strong> Turn off main circuit breaker immediately if floodwaters approach outlets.</li>
      <li><strong>Safe Water:</strong> Boil all drinking water for at least 3 minutes; avoid flood run-off.</li>
      <li><strong>High Ground:</strong> Move infants, elderly, and medical supplies to highest floor.</li>
      <li><strong>Saved Reports:</strong> Any reports you submit in the app will be queued and auto-synced once connection restores.</li>
    </ul>
    <button onclick="window.location.reload()" style="width:100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">
      🔄 Retry Connection
    </button>
  </div>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Precache failed for some assets:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or chrome-extension URLs
  if (event.request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Handle API requests: Network first, never return stale HTML
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: "Network unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2");

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Navigation / HTML requests: Network first with cached & offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const homeCached = await caches.match("/");
          if (homeCached) {
            return homeCached;
          }
          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        })
    );
  }
});
