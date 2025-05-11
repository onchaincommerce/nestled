'use client';

import { useEffect, useState } from 'react';

// Define a type for the Passage object
interface PassageInstance {
  PassageUser: new () => any;
}

const PassageLogin = () => {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPassageReady, setIsPassageReady] = useState(false);
  
  useEffect(() => {
    // Only run on client-side
    setIsClient(true);
    
    // Simple script loading approach for Passage elements
    if (typeof window !== 'undefined') {
      const loadPassageElements = () => {
        try {
          // Create script element for Passage Auth
          const script = document.createElement('script');
          script.src = 'https://cdn.passage.id/passage-web.js';
          script.async = true;
          
          // When script loads, create the passage-auth element
          script.onload = () => {
            // Wait for passage to be fully initialized before rendering
            setTimeout(() => {
              // Make sure the window.Passage object is available
              if (window.Passage) {
                setIsPassageReady(true);
                setIsLoading(false);
                console.log('Passage initialized successfully');
              } else {
                console.error('Passage object not found after loading');
                setError('Passage authentication could not be initialized');
                setIsLoading(false);
              }
            }, 500); // Give passage enough time to initialize
          };
          
          // Handle errors
          script.onerror = (e) => {
            console.error('Failed to load Passage script:', e);
            setError('Failed to load Passage authentication');
            setIsLoading(false);
          };
          
          // Add the script to the document
          document.head.appendChild(script);
        } catch (err) {
          console.error('Error setting up Passage:', err);
          setError('Authentication system could not be loaded');
          setIsLoading(false);
        }
      };
      
      loadPassageElements();
    }
  }, []);

  const passageAppId = process.env.NEXT_PUBLIC_PASSAGE_APP_ID || 'boyEzeiNczYXppbj5F87neMd';

  // Function to trigger passkeys manually if needed
  const triggerPasskeyAuth = () => {
    try {
      if (window.Passage) {
        // Force refresh of Passage auth UI
        const element = document.querySelector('passage-auth');
        if (element) {
          // Clear and re-render the element
          const container = element.parentElement;
          if (container) {
            container.innerHTML = '';
            // Re-create the element
            const newElement = document.createElement('passage-auth');
            newElement.setAttribute('app-id', passageAppId);
            container.appendChild(newElement);
          }
        }
      }
    } catch (err) {
      console.error('Error triggering passkey auth:', err);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-primary-600 animate-pulse"></div>
          <div className="w-4 h-4 rounded-full bg-primary-600 animate-pulse delay-75"></div>
          <div className="w-4 h-4 rounded-full bg-primary-600 animate-pulse delay-150"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
      {isClient && isPassageReady && (
        <div className="passage-auth-container">
          {/* @ts-expect-error - Custom element */}
          <passage-auth app-id={passageAppId}></passage-auth>
          
          {/* Optional: Add a manual trigger button for passkeys if auto-detection fails */}
          <div className="mt-4 text-center">
            <button 
              onClick={triggerPasskeyAuth}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Use Face ID / Touch ID
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Add TypeScript interface for Window with Passage
declare global {
  interface Window {
    Passage?: PassageInstance;
  }
}

export default PassageLogin; 