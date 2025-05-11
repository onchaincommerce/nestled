// Emergency fix service worker
// This service worker does nothing but unregister itself to fix site issues

console.log('Emergency service worker activated - this will unregister all service workers');

self.addEventListener('install', event => {
  console.log('Emergency service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Emergency service worker activated');
  
  // Unregister itself and all other service workers
  event.waitUntil(
    self.registration.unregister()
      .then(() => {
        console.log('Service worker unregistered successfully');
      })
      .catch(error => {
        console.error('Error unregistering service worker:', error);
      })
  );
});

// Don't intercept any fetch events
self.addEventListener('fetch', event => {
  // Do nothing, let the browser handle all requests normally
}); 