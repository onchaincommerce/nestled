// This script registers the service worker for PWA functionality

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      // First unregister any existing service workers
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        // Force unregister all existing service workers
        const unregisterPromises = registrations.map(registration => {
          console.log('Unregistering service worker:', registration.scope);
          return registration.unregister();
        });
        
        // Wait for all unregistrations to complete
        Promise.all(unregisterPromises).then(() => {
          console.log('All service workers unregistered successfully');
          
          // Now register the new service worker with no caching
          navigator.serviceWorker.register('/sw.js?v=' + Date.now(), {
            updateViaCache: 'none'
          })
            .then(function(registration) {
              console.log('Service Worker registered with scope:', registration.scope);
              
              // Force update
              registration.update();
            })
            .catch(function(error) {
              console.error('Service Worker registration failed:', error);
            });
        });
      });
    });
  }
}

// Function to handle PWA installation event
export function setupPwaInstallPrompt() {
  if (typeof window !== 'undefined') {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Optionally, show your own install button or UI element
      console.log('App can be installed, showing install prompt');
    });

    // You can use this function to trigger the install prompt when a user clicks your install button
    window.promptPwaInstall = () => {
      if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          } else {
            console.log('User dismissed the install prompt');
          }
          // Clear the saved prompt since it can't be used again
          deferredPrompt = null;
        });
      }
    };
  }
} 