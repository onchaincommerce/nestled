'use client';

import { useEffect } from 'react';

const PassageLogin = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      require('@passageidentity/passage-elements/passage-auth');
    }
  }, []);

  const passageAppId = process.env.NEXT_PUBLIC_PASSAGE_APP_ID || 'boyEzeiNczYXppbj5F87neMd';

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
      {/* @ts-ignore - passage-auth is a custom element from Passage */}
      <passage-auth app-id={passageAppId}></passage-auth>
    </div>
  );
};

// Add TypeScript interface for Window with Passage
declare global {
  interface Window {
    Passage?: any;
  }
}

export default PassageLogin; 