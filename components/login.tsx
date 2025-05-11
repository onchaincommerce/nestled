'use client';

import { useEffect, useState } from 'react';

// Define a type for the Passage object
interface PassageInstance {
  PassageUser: new () => any;
}

// We don't need to define the passage-auth element type since we'll use ts-ignore

const PassageLogin = () => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    
    // Load the Passage SDK and elements
    if (typeof window !== 'undefined') {
      // First, load the Passage elements (this creates the custom element)
      require('@passageidentity/passage-elements/passage-auth');
      
      // Also load the Passage JS SDK to ensure window.Passage is available
      import('@passageidentity/passage-js').then(() => {
        console.log('Passage SDK loaded successfully');
      }).catch(err => {
        console.error('Error loading Passage SDK:', err);
      });
    }
  }, []);

  const passageAppId = process.env.NEXT_PUBLIC_PASSAGE_APP_ID || 'boyEzeiNczYXppbj5F87neMd';

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
      {isClient && (
        // @ts-ignore - passage-auth is a custom element from Passage
        <passage-auth 
          app-id={passageAppId}
        // @ts-ignore - passage-auth is a custom element
        ></passage-auth>
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