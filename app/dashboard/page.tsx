'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PassageUserInterface } from '@/utils/passage-types';

// This is a client component so we'll handle authentication on the client side
export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userID, setUserID] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [passageUser, setPassageUser] = useState<PassageUserInterface | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [entryCreated, setEntryCreated] = useState(false);

  useEffect(() => {
    // Check if this is client-side
    if (typeof window !== 'undefined') {
      // Load Passage and check auth
      const loadPassage = async () => {
        try {
          // Check if the Passage global object is available
          if (!window.Passage) {
            console.error('Passage is not loaded yet');
            router.push('/');
            return;
          }
          
          // Get the PassageUser class from the global Passage object
          const PassageUser = window.Passage?.PassageUser;
          const user = new PassageUser() as PassageUserInterface;
          setPassageUser(user);
          
          const isAuthorized = await user.isAuthenticated();
          
          if (!isAuthorized) {
            router.push('/');
            return;
          }
          
          // User is authenticated, get their info
          const userInfo = await user.userInfo();
          setUserName(userInfo.email || 'Partner');
          setUserID(userInfo.id || '');
          setIsLoading(false);
        } catch (error) {
          console.error('Auth error:', error);
          router.push('/');
        }
      };
      
      // Add a small delay to ensure Passage has time to initialize
      const timer = setTimeout(() => {
        loadPassage();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [router]);

  const handleSignOut = async () => {
    try {
      if (passageUser) {
        await passageUser.signOut();
        router.push('/');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out. Please try again.');
    }
  };

  const createTestEntry = async () => {
    if (!userID || isCreatingEntry) return;
    
    setIsCreatingEntry(true);
    
    try {
      // Create a simple entry in the database to verify everything works
      const response = await fetch('/api/test-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userID,
          content: 'Test entry from PWA',
          timestamp: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        setEntryCreated(true);
      } else {
        setError('Failed to create test entry. Database connection issue.');
      }
    } catch (error) {
      console.error('Error creating test entry:', error);
      setError('Network error while creating test entry.');
    } finally {
      setIsCreatingEntry(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-2xl text-primary-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Dashboard Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-xl font-bold text-primary-700">Nestled</span>
          </div>
          <div>
            <button 
              className="btn-secondary text-sm px-3 py-1"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {userName}!</h1>
          <p className="text-gray-600 text-sm mt-1">Here&apos;s what&apos;s happening in your relationship.</p>
        </div>

        {/* User ID & Test Entry */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="card mb-6">
          <div className="p-4 bg-primary-50 rounded-lg mb-4">
            <p className="text-primary-800 text-sm">
              <strong>User ID:</strong> {userID}
            </p>
          </div>
          
          {entryCreated ? (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg">
              Test entry successfully created in the database!
            </div>
          ) : (
            <button
              onClick={createTestEntry}
              disabled={isCreatingEntry}
              className="btn-primary"
            >
              {isCreatingEntry ? 'Creating...' : 'Create Test Entry'}
            </button>
          )}
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Journal Card */}
          <div className="card">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold text-primary-800">Today's Journal</h2>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Daily</span>
            </div>
            <p className="text-gray-600 mb-4 text-sm">What would be your perfect day?</p>
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                <span className="font-medium">Status:</span> Waiting for responses
              </div>
              <Link href="/journal" className="text-primary-600 hover:text-primary-800 font-medium text-sm">
                Answer →
              </Link>
            </div>
          </div>

          {/* Date Planner Card */}
          <div className="card">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold text-primary-800">Upcoming Date</h2>
              <span className="text-xs bg-secondary-100 text-secondary-700 px-2 py-0.5 rounded-full">Next Week</span>
            </div>
            <p className="text-gray-600 mb-4 text-sm">No dates planned yet. Create your first date!</p>
            <div className="flex justify-end">
              <Link href="/date-planner" className="text-primary-600 hover:text-primary-800 font-medium text-sm">
                Plan a date →
              </Link>
            </div>
          </div>

          {/* Scrapbook Card */}
          <div className="card">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-semibold text-primary-800">Recent Memories</h2>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Scrapbook</span>
            </div>
            <p className="text-gray-600 mb-4 text-sm">Start adding photos and memories to your scrapbook.</p>
            <div className="flex justify-end">
              <Link href="/scrapbook" className="text-primary-600 hover:text-primary-800 font-medium text-sm">
                Add memory →
              </Link>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-primary-800 mb-4">Activity Feed</h2>
          <div className="space-y-4">
            <p className="text-gray-500 text-center py-4 text-sm">
              Your activity feed will show up here once you start using Nestled.
            </p>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around items-center">
        <Link href="/dashboard" className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('dashboard')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link href="/journal" className={`flex flex-col items-center ${activeTab === 'journal' ? 'text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('journal')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-xs mt-1">Journal</span>
        </Link>
        <Link href="/date-planner" className={`flex flex-col items-center ${activeTab === 'date-planner' ? 'text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('date-planner')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs mt-1">Dates</span>
        </Link>
        <Link href="/scrapbook" className={`flex flex-col items-center ${activeTab === 'scrapbook' ? 'text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('scrapbook')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs mt-1">Memories</span>
        </Link>
      </nav>
    </div>
  );
} 