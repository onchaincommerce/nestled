// Service Worker for Nestled PWA

const CACHE_NAME = 'nestled-v1';

// Assets to cache - remove authenticated routes
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png', 
  '/icons/icon-512x512.png'
];

// Define authenticated routes that should never be cached
const AUTHENTICATED_ROUTES = [
  '/dashboard', 
  '/journal', 
  '/scrapbook', 
  '/date-planner'
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

  // Check if the request is for an authenticated route
  const url = new URL(event.request.url);
  const isAuthenticatedRoute = AUTHENTICATED_ROUTES.some(route => 
    url.pathname === route || url.pathname.startsWith(`${route}/`)
  );

  // For authenticated routes or API requests, always go to network and don't cache
  if (isAuthenticatedRoute || url.pathname.includes('/api/')) {
    // Use fetch with { redirect: 'follow' } to handle redirects properly
    return event.respondWith(
      fetch(event.request, { redirect: 'follow' })
        .catch(error => {
          console.error('Fetch error for authenticated route:', error);
          // If network fails, return a specific offline message for authenticated routes
          return new Response('You need to be online to access this page', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
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