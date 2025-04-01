// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("ServiceWorker registration successful with scope: ", registration.scope)

        // Check if there's a waiting service worker and notify the user
        if (registration.waiting) {
          updateReady(registration.waiting)
        }

        // If a new service worker is installing, track its progress
        if (registration.installing) {
          trackInstalling(registration.installing)
        }

        // Listen for new service workers
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          trackInstalling(newWorker)
        })
      })
      .catch((error) => {
        console.log("ServiceWorker registration failed: ", error)
      })

    // Detect controller change and refresh the page
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload()
    })
  })
}

// Track the installing service worker
function trackInstalling(worker) {
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed") {
      if (navigator.serviceWorker.controller) {
        // There's a new service worker available
        updateReady(worker)
      }
    }
  })
}

// Notify the user about the new service worker
function updateReady(worker) {
  // You could show a notification here if you want
  console.log("New version available! Ready to update.")

  // Immediately activate the new service worker
  worker.postMessage({ type: "SKIP_WAITING" })
}

// Check if the app is being launched from the home screen
window.addEventListener("DOMContentLoaded", () => {
  const isInStandaloneMode =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone ||
    document.referrer.includes("android-app://")

  if (isInStandaloneMode) {
    console.log("App launched from home screen")
    // You could set a flag or perform specific actions for standalone mode
  }
})

