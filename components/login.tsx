'use client';

import { useEffect } from 'react';
import Image from 'next/image';

const PassageLogin = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      require('@passageidentity/passage-elements/passage-auth');
    }
  }, []);

  const passageAppId = process.env.NEXT_PUBLIC_PASSAGE_APP_ID || 'boyEzeiNczYXppbj5F87neMd';

  return (
    <div className="relative w-full max-w-md mx-auto rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden">
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-secondary-100 to-accent-100 animate-float opacity-90"></div>
      
      {/* Content with logo */}
      <div className="relative p-8 backdrop-blur-sm bg-white/60">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 relative">
            <Image 
              src="/icons/nestled_logo.png" 
              alt="Nestled Logo"
              width={96}
              height={96}
              className="object-contain animate-float"
            />
          </div>
        </div>
        
        {/* @ts-ignore - passage-auth is a custom element from Passage */}
        <passage-auth app-id={passageAppId}></passage-auth>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-primary-700 font-medium">Start your relationship journal today!</p>
        </div>
      </div>
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