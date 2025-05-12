'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type PassageLoginProps = {
  inviteCodeFromUrl?: string;
};

const PassageLogin = ({ inviteCodeFromUrl }: PassageLoginProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // We'll still capture the code from URL but won't show the input field
  const [inviteCode, setInviteCode] = useState(inviteCodeFromUrl || searchParams?.get('code') || '');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      require('@passageidentity/passage-elements/passage-auth');
      
      // Setup event listener for successful auth
      const handlePassageSuccess = () => {
        // If we have an invite code, store it in localStorage to use after authentication
        if (inviteCode) {
          localStorage.setItem('pendingInviteCode', inviteCode);
          // The user will be redirected to dashboard after login and we'll handle the code there
        }
      };
      
      // Add event listener to Passage auth element when it's rendered
      setTimeout(() => {
        const passageAuthElement = document.querySelector('passage-auth');
        if (passageAuthElement) {
          passageAuthElement.addEventListener('success', handlePassageSuccess);
        }
      }, 1000);
      
      return () => {
        // Cleanup
        const passageAuthElement = document.querySelector('passage-auth');
        if (passageAuthElement) {
          passageAuthElement.removeEventListener('success', handlePassageSuccess);
        }
      };
    }
  }, [inviteCode]);

  const passageAppId = process.env.NEXT_PUBLIC_PASSAGE_APP_ID || 'boyEzeiNczYXppbj5F87neMd';

  return (
    <div className="relative w-full max-w-md mx-auto rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden">
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-secondary-100 to-accent-100 animate-float opacity-90"></div>
      
      {/* Content */}
      <div className="relative p-8 backdrop-blur-sm bg-white/60">
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