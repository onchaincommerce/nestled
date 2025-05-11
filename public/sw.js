// Service Worker for Nestled PWA

const CACHE_NAME = 'nestled-v1';

// Assets to cache
const urlsToCache = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png', 
  '/icons/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, then network
self.addEventListener('fetch', event => {
  // Skip for non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith('http')) {
    return;
  }

  // For API requests, always go to network first
  if (event.request.url.includes('/api/')) {
    return fetch(event.request)
      .catch(error => {
        console.error('Fetch error:', error);
        return caches.match(event.request);
      });
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return from cache if found
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        // Go to network
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Fallback for pages
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
          });
      })
  );
}); 