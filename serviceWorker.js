const CACHE_NAME = 'readforme-v1';

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim clients to control the page immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event - required for PWA installability.
// We use a simple pass-through here, but you could add caching strategies.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Simple offline fallback
      return new Response("You are offline. Please connect to the internet to use ReadForMe.");
    })
  );
});