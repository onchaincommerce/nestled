'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// This is a client component so we'll handle authentication on the client side
// for the actual implementation, we'd use getServerSideProps to check authentication
export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if this is client-side
    if (typeof window !== 'undefined') {
      // Here we would check for authentication
      const checkAuth = async () => {
        try {
          // In a real implementation, we would fetch user data here
          setUserName('Partner');
          setIsLoading(false);
        } catch (error) {
          console.error('Auth error:', error);
          router.push('/');
        }
      };
      
      checkAuth();
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-2xl text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">Nestled</span>
          </div>
          <nav className="flex space-x-6">
            <Link href="/dashboard" className="text-primary-800 font-medium hover:text-primary-600">
              Dashboard
            </Link>
            <Link href="/journal" className="text-gray-600 hover:text-primary-600">
              Journal
            </Link>
            <Link href="/date-planner" className="text-gray-600 hover:text-primary-600">
              Date Planner
            </Link>
            <Link href="/scrapbook" className="text-gray-600 hover:text-primary-600">
              Scrapbook
            </Link>
          </nav>
          <div>
            <button 
              className="px-4 py-2 rounded-lg bg-secondary-100 text-secondary-700 hover:bg-secondary-200 transition"
              onClick={() => {
                // In a real app, we would handle logout here
                router.push('/');
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome, {userName}!</h1>
          <p className="text-gray-600 mt-2">Here's what's happening in your relationship.</p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Journal Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-primary-800">Today's Journal</h2>
              <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded-full">Daily</span>
            </div>
            <p className="text-gray-600 mb-4">What would be your perfect day?</p>
            <div className="flex justify-between">
              <div className="text-sm text-gray-500">
                <span className="font-medium">Status:</span> Waiting for responses
              </div>
              <Link href="/journal" className="text-primary-600 hover:text-primary-800 font-medium text-sm">
                Answer →
              </Link>
            </div>
          </div>

          {/* Date Planner Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-primary-800">Upcoming Date</h2>
              <span className="text-sm bg-secondary-100 text-secondary-700 px-2 py-1 rounded-full">Next Week</span>
            </div>
            <p className="text-gray-600 mb-4">No dates planned yet. Create your first date!</p>
            <div className="flex justify-end">
              <Link href="/date-planner" className="text-primary-600 hover:text-primary-800 font-medium text-sm">
                Plan a date →
              </Link>
            </div>
          </div>

          {/* Scrapbook Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-primary-800">Recent Memories</h2>
              <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded-full">Scrapbook</span>
            </div>
            <p className="text-gray-600 mb-4">Start adding photos and memories to your scrapbook.</p>
            <div className="flex justify-end">
              <Link href="/scrapbook" className="text-primary-600 hover:text-primary-800 font-medium text-sm">
                Add memory →
              </Link>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Activity Feed</h2>
          <div className="space-y-4">
            <p className="text-gray-500 text-center py-8">
              Your activity feed will show up here once you start using Nestled.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 