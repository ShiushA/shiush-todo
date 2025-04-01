// Register and manage service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Force update the service worker on each page load during development
    // Remove this in production
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" })
    }

    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("[PWA] ServiceWorker registered with scope:", registration.scope)

        // Check for updates on each page load
        registration.update()

        // Handle updates
        if (registration.waiting) {
          console.log("[PWA] New version ready to install")
          registration.waiting.postMessage({ type: "SKIP_WAITING" })
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          console.log("[PWA] New service worker installing:", newWorker)

          newWorker.addEventListener("statechange", () => {
            console.log("[PWA] Service worker state:", newWorker.state)
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[PWA] New version installed, activating...")
              newWorker.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })
      })
      .catch((error) => {
        console.error("[PWA] ServiceWorker registration failed:", error)
      })

    // Detect when a new service worker takes over
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[PWA] New service worker activated, reloading for fresh content")
      window.location.reload()
    })
  })

  // Listen for messages from the service worker
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "ONLINE_STATUS_CHANGE") {
      console.log("[PWA] Online status changed:", event.data.payload.isOnline)
      // Update UI based on online status
      updateOfflineIndicator(event.data.payload.isOnline)
    }
  })
}

// Update offline indicator in the UI
function updateOfflineIndicator(isOnline) {
  const offlineIndicator = document.getElementById("offlineIndicator")
  if (offlineIndicator) {
    offlineIndicator.style.display = isOnline ? "none" : "block"
  }
}

// Check if the app is in standalone mode (installed on home screen)
function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone ||
    document.referrer.includes("android-app://")
  )
}

// Add offline detection to the main page
window.addEventListener("DOMContentLoaded", () => {
  // Check initial online status
  updateOfflineIndicator(navigator.onLine)

  // Add event listeners for online/offline events
  window.addEventListener("online", () => {
    console.log("[PWA] Device is online")
    updateOfflineIndicator(true)

    // Trigger sync if service worker is available
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register("sync-tasks").catch((err) => {
          console.error("[PWA] Background sync registration failed:", err)
        })
      })
    }
  })

  window.addEventListener("offline", () => {
    console.log("[PWA] Device is offline")
    updateOfflineIndicator(false)
  })

  // Check if launched from home screen
  if (isInStandaloneMode()) {
    console.log("[PWA] App launched from home screen")
    // You could set a flag or perform specific actions for standalone mode
  }
})

// Add a function to manually check cache status - useful for debugging
window.checkCacheStatus = async () => {
  if (!("caches" in window)) {
    console.log("[PWA] Cache API not supported")
    return
  }

  try {
    const cacheNames = await caches.keys()
    console.log("[PWA] Available caches:", cacheNames)

    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      console.log(`[PWA] Cache "${name}" contains ${keys.length} items:`)
      keys.forEach((request) => console.log(`- ${request.url}`))
    }
  } catch (error) {
    console.error("[PWA] Error checking cache:", error)
  }
}

