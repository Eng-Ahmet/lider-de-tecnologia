/* ====== CALLEFIX AI / TU VOZ HA LLEGADO - SERVICE WORKER ====== */

const cacheName = "callefix-pwa-v1";
const appShellFiles = [
  "/",
  "/index.html",
  "/manifest.json",
  "/manifest.webmanifest",
  "/.well-known/assetlinks.json",
  "/favicon.ico",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/assets/icons/icon-72x72.png",
  "/assets/icons/icon-96x96.png",
  "/assets/icons/icon-128x128.png",
  "/assets/icons/icon-144x144.png",
  "/assets/icons/icon-192x192.png",
  "/assets/icons/icon-192x192-maskable.png",
  "/assets/icons/icon-384x384.png",
  "/assets/icons/icon-512x512.png",
  "/assets/icons/icon-512x512-maskable.png",
  "/assets/icons/apple-touch-icon.png"
];

// 1. Install Event: Cache App Shell Files safely
self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install CalleFix AI Shell");
  e.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await Promise.allSettled(
        appShellFiles.map(async (file) => {
          try {
            await cache.add(file);
          } catch (err) {
            console.warn(`[Service Worker] Could not cache shell asset: ${file}`);
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

// 2. Activate Event: Clear Outdated Caches
self.addEventListener("activate", (e) => {
  console.log("[Service Worker] Activate CalleFix AI");
  e.waitUntil(
    (async () => {
      const keyList = await caches.keys();
      await Promise.all(
        keyList.map((key) => {
          if (key === cacheName) {
            return undefined;
          }
          return caches.delete(key);
        })
      );
      await self.clients.claim();
    })()
  );
});

// 3. Fetch Event: Network First for Navigations, Cache First for Static Assets
self.addEventListener("fetch", (e) => {
  const requestUrl = new URL(e.request.url);

  // Bypass backend API calls
  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  // Network First strategy for HTML / Navigations to ensure live real-time updates
  if (
    e.request.mode === "navigate" ||
    requestUrl.pathname.endsWith(".html") ||
    requestUrl.pathname.endsWith(".js") ||
    requestUrl.pathname.endsWith(".css")
  ) {
    e.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(e.request);
          if (networkResponse && networkResponse.status === 200 && e.request.method === "GET") {
            const cache = await caches.open(cacheName);
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          const cachedResponse = await caches.match(e.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          if (e.request.mode === "navigate" || e.request.headers.get("accept")?.includes("text/html")) {
            const fallbackIndex = (await caches.match("/index.html")) || (await caches.match("/"));
            if (fallbackIndex) {
              return fallbackIndex;
            }
          }
          throw err;
        }
      })()
    );
    return;
  }

  // Cache First for static images / fonts / icons
  e.respondWith(
    (async () => {
      const r = await caches.match(e.request);
      if (r) {
        return r;
      }
      try {
        const response = await fetch(e.request);
        if (response && response.status === 200 && e.request.method === "GET") {
          const cache = await caches.open(cacheName);
          cache.put(e.request, response.clone());
        }
        return response;
      } catch (err) {
        throw err;
      }
    })()
  );
});

// 4. Push Notifications Handler for Incident Status Updates
self.addEventListener("push", (event) => {
  let data = { 
    title: "CalleFix AI Málaga", 
    body: "📢 Actualización sobre su incidencia de vía pública reportada." 
  };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/assets/icons/icon-192x192.png",
    badge: "/assets/icons/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/reports" }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.includes("localhost") || client.url.includes("callefix")) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
