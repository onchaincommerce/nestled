'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PassageLogin from '@/components/login';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        // Make sure Passage is loaded before checking auth
        if (typeof window !== 'undefined') {
          // Wait for Passage to be available
          if (!window.Passage) {
            console.log('Passage not loaded yet, waiting...');
            return; // Will retry on next interval
          }
          
          console.log('Passage found, checking authentication');
          const PassageUser = window.Passage.PassageUser;
          const user = new PassageUser();
          
          try {
            const isAuthorized = await user.isAuthenticated();
            console.log('Authentication check result:', isAuthorized);
            
            if (isAuthorized) {
              // User is already authenticated, redirect to dashboard
              router.push('/dashboard');
            } else {
              // User is not authenticated, stop checking
              setIsCheckingAuth(false);
            }
          } catch (authError) {
            console.error('Authentication check failed:', authError);
            setIsCheckingAuth(false);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsCheckingAuth(false);
      }
    };
    
    // Try to check auth every second until either authenticated 
    // or we confirm not authenticated
    const intervalId = setInterval(() => {
      if (isCheckingAuth) {
        checkAuth();
      }
    }, 1000);
    
    // Clean up the interval on unmount
    return () => clearInterval(intervalId);
  }, [router, isCheckingAuth]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-24">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-primary-900 mb-6">
              <span className="text-primary-700">Nestled</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
              A private, delightful space for couples to journal together, plan dates, and build a scrapbook of memories.
            </p>
          </div>
          
          <div className="max-w-md mx-auto mb-10">
            <PassageLogin />
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary-700 text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Daily Journal</h3>
              <p className="text-gray-600 text-sm">
                Quick prompts to stay connected even on busy days
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary-700 text-2xl">🗓️</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Date Planner</h3>
              <p className="text-gray-600 text-sm">
                Plan and organize special moments together
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary-700 text-2xl">📸</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-800 mb-2">Memories</h3>
              <p className="text-gray-600 text-sm">
                Create a beautiful archive to revisit anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PWA Install Prompt */}
      <div className="bg-primary-50 py-4 text-center">
        <p className="text-primary-700 text-sm">
          <span className="font-medium">Pro tip:</span> Install this app on your home screen for the best experience!
        </p>
      </div>

      {/* Privacy note */}
      <div className="bg-secondary-50 py-6 text-center">
        <p className="text-secondary-700 text-sm flex items-center justify-center">
          <span className="mr-2">🔒</span> Private by default. Your data stays between you.
        </p>
      </div>
      
      {/* Footer */}
      <footer className="bg-white py-6 border-t border-gray-200">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Nestled
          </div>
          <div className="flex space-x-4">
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-primary-600">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:text-primary-600">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
