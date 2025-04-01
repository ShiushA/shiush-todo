const CACHE_NAME = "shiush-todo-v3"
const OFFLINE_PAGE = "/offline.html"
const urlsToCache = [
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
  OFFLINE_PAGE,
]

// Install the service worker and cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache")
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting()
      }),
  )
})

// Activate the service worker and clean up old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        // Take control of all clients as soon as it activates
        return self.clients.claim()
      }),
  )
})

// Improved fetch event handler with network-first strategy for API requests
// and cache-first strategy for static assets
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Clone the request to avoid consuming it
  const requestClone = event.request.clone()

  event.respondWith(
    // Try the network first
    fetch(requestClone)
      .then((response) => {
        // If we got a valid response, clone it and put it in the cache
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          // If the request is for a page (HTML), show the offline page
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_PAGE)
          }

          // For other resources, just fail
          return new Response("Not found", {
            status: 404,
            statusText: "Not found",
          })
        })
      }),
  )
})

// Handle offline sync when coming back online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    event.waitUntil(syncTasks())
  }
})

// Function to sync tasks when coming back online
async function syncTasks() {
  // This would typically sync with a server
  // For this local storage app, we'll just log that sync would happen here
  console.log("Would sync tasks with server if this was connected to a backend")

  // Notify any open clients that we're back online
  const clients = await self.clients.matchAll({ type: "window" })
  clients.forEach((client) => {
    client.postMessage({
      type: "ONLINE_STATUS_CHANGE",
      payload: { isOnline: true },
    })
  })
}

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

