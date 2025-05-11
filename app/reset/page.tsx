'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cleanupServiceWorkers, clearSiteData } from '@/app/pwa-register';

export default function ResetPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Function to reset app state
  const handleReset = async () => {
    setLoading(true);
    setStatus('Cleaning up service workers...');
    
    try {
      // Step 1: Clean up service workers
      await cleanupServiceWorkers();
      
      setStatus('Clearing site data...');
      // Step 2: Clear site data
      await clearSiteData();
      
      setStatus('Reset complete. Redirecting to home page...');
      
      // Step 3: Short delay then redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Reset error:', error);
      setStatus('Error during reset. Try refreshing the page.');
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-primary-700 mb-6 text-center">Reset Nestled App</h1>
        
        <p className="text-gray-600 mb-6 text-center">
          If you're experiencing issues with the app, use this page to reset it.
          This will clear cached data and sign you out.
        </p>
        
        {status && (
          <div className="mb-6 p-3 bg-blue-50 text-blue-700 rounded-lg text-center">
            {status}
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors w-full disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset App'}
          </button>
          
          <Link href="/" className="text-primary-600 hover:text-primary-800 text-center text-sm mt-2">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 