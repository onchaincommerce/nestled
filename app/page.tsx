'use client';

import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import PassageLogin from '@/components/login';

// Create a client component that uses useSearchParams
function HomeContent() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams?.get('code') || '';

  useEffect(() => {
    setIsClient(true);
    
    // Check if user is already logged in
    const checkAuth = async () => {
      if (typeof window !== 'undefined' && window.Passage) {
        try {
          // @ts-ignore - We know this exists because we checked window.Passage
          const PassageUser = window.Passage.PassageUser;
          const user = new PassageUser();
          const isAuthorized = await user.isAuthenticated();
          
          if (isAuthorized) {
            // User is already authenticated, redirect to dashboard
            // If there's an invite code, include it in the redirection
            if (inviteCode) {
              localStorage.setItem('pendingInviteCode', inviteCode);
            }
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Auth check error:', error);
          // Fall back to showing the login page
        }
      }
    };
    
    // Try several times with increasing delay
    let attempts = 0;
    const maxAttempts = 5;
    
    const attemptCheckAuth = () => {
      if (attempts < maxAttempts) {
        attempts++;
        checkAuth();
        
        if (attempts < maxAttempts) {
          // Schedule next attempt with increasing delay
          const delay = 500 * attempts;
          setTimeout(attemptCheckAuth, delay);
        }
      }
    };
    
    // Start attempting to check authentication
    attemptCheckAuth();
    
  }, [router, inviteCode]);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary-100 rounded-full opacity-30 blur-3xl -z-10 animate-float"></div>
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-secondary-100 rounded-full opacity-30 blur-3xl -z-10" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-accent-100 rounded-full opacity-30 blur-3xl -z-10" style={{ animationDelay: '2s' }}></div>
      
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-24 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
        <div className="container max-w-4xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 relative">
                <Image 
                  src="/icons/nestled_logo.png" 
                  alt="Nestled Logo"
                  width={128}
                  height={128}
                  className="object-contain animate-float"
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-500">Nestled</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
              A private, delightful space for couples to journal together, plan dates, and build a scrapbook of memories.
            </p>
          </div>
          
          <div className="max-w-md mx-auto mb-10">
            <PassageLogin inviteCodeFromUrl={inviteCode} />
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-gradient-to-br from-white/90 to-primary-50/80 p-6 rounded-2xl shadow-sm border border-primary-100/40 flex flex-col items-center text-center hover:shadow-md transition-all duration-300 hover:scale-105 hover:rotate-1">
              <div className="w-16 h-16 bg-primary-100/80 rounded-full flex items-center justify-center mb-4 animate-float">
                <span className="text-primary-700 text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Daily Journal</h3>
              <p className="text-gray-600">
                Quick prompts to stay connected even on busy days
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-white/90 to-secondary-50/80 p-6 rounded-2xl shadow-sm border border-secondary-100/40 flex flex-col items-center text-center hover:shadow-md transition-all duration-300 hover:scale-105" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 bg-secondary-100/80 rounded-full flex items-center justify-center mb-4 animate-float">
                <span className="text-secondary-700 text-2xl">🗓️</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Date Planner</h3>
              <p className="text-gray-600">
                Plan and organize special moments together
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-white/90 to-accent-50/80 p-6 rounded-2xl shadow-sm border border-accent-100/40 flex flex-col items-center text-center hover:shadow-md transition-all duration-300 hover:scale-105 hover:rotate-[-1deg]" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-accent-100/80 rounded-full flex items-center justify-center mb-4 animate-float">
                <span className="text-accent-700 text-2xl">📸</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Memories</h3>
              <p className="text-gray-600">
                Create a beautiful archive to revisit anytime
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Main component with Suspense boundary
export default function Home() {
  // Loading fallback to display while the page is loading
  const loadingFallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-2xl text-primary-600 font-bold">Loading...</div>
    </div>
  );
  
  return (
    <Suspense fallback={loadingFallback}>
      <HomeContent />
    </Suspense>
  );
}
