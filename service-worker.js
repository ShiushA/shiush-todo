const CACHE_NAME = "shiush-todo-v4"
const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/pwa.js",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.svg",
  "/icon/favicon-96x96.png",
  "/icon/web-app-manifest-192x192.png",
  "/icon/web-app-manifest-512x512.png",
  "/icon/apple-touch-icon.png",
  "/screenshots/Mobiless.png",
  "/screenshots/Pcss.png",
]

// Install event - cache all app shell assets
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install")
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[ServiceWorker] Caching app shell")
        return cache.addAll(APP_SHELL)
      })
      .then(() => {
        console.log("[ServiceWorker] Skip waiting")
        return self.skipWaiting()
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate")
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[ServiceWorker] Removing old cache", key)
              return caches.delete(key)
            }
          }),
        )
      })
      .then(() => {
        console.log("[ServiceWorker] Claiming clients")
        return self.clients.claim()
      }),
  )
})

// Fetch event - serve from cache first, then network
self.addEventListener("fetch", (event) => {
  console.log("[ServiceWorker] Fetch", event.request.url)

  // For navigation requests (HTML pages)
  if (
    event.request.mode === "navigate" ||
    (event.request.method === "GET" && event.request.headers.get("accept").includes("text/html"))
  ) {
    console.log("[ServiceWorker] HTML request", event.request.url)

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest version
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          // If offline, try to return cached HTML
          return caches.match(event.request).then((response) => {
            return response || caches.match("/index.html")
          })
        }),
    )
  } else {
    // For non-HTML requests (assets, API calls)
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return the response
        if (response) {
          return response
        }

        // Clone the request
        const fetchRequest = event.request.clone()

        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== "basic") {
              return response
            }

            // Clone the response
            const responseToCache = response.clone()

            // Cache the new resource
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })

            return response
          })
          .catch((error) => {
            console.error("[ServiceWorker] Fetch failed:", error)
            // You could return a custom offline asset here if needed
            // For example: return caches.match('/offline-image.png');
            throw error
          })
      }),
    )
  }
})

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// Background sync for when coming back online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    event.waitUntil(
      // This would sync with a server in a real app
      self.clients
        .matchAll()
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "ONLINE_STATUS_CHANGE",
              payload: { isOnline: true },
            })
          })
        }),
    )
  }
})

