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
    
    // Load Passage auth element directly
    if (typeof window !== 'undefined') {
      require('@passageidentity/passage-elements/passage-auth');
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