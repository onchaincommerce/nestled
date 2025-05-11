'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PassageUserInterface } from '@/utils/passage-types';

export default function Welcome() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userID, setUserID] = useState('');
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
            setError('Authentication system not loaded. Please reload the page.');
            setIsLoading(false);
            return;
          }
          
          // Get the PassageUser class from the global Passage object
          // @ts-expect-error - We know this exists because we checked window.Passage
          const PassageUser = window.Passage.PassageUser;
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
          setError('Authentication error. Please try again.');
          setIsLoading(false);
        }
      };
      
      // Add a small delay to ensure Passage has time to initialize
      const timer = setTimeout(() => {
        loadPassage();
      }, 1000);
      
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
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-primary-700">Nestled</div>
          <button 
            className="btn-secondary text-sm px-3 py-1"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="card text-center py-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-primary-700">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Welcome, {userName}!</h1>
              <p className="text-gray-600 mt-2">You&apos;ve successfully signed in using passkeys.</p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            
            {entryCreated ? (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">
                Test entry successfully created in the database!
              </div>
            ) : (
              <button
                onClick={createTestEntry}
                disabled={isCreatingEntry}
                className="btn-primary mb-4"
              >
                {isCreatingEntry ? 'Creating...' : 'Create Test Entry'}
              </button>
            )}
            
            <div className="p-4 bg-primary-50 rounded-lg mb-4">
              <p className="text-primary-800 text-sm">
                <strong>User ID:</strong> {userID}
              </p>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              This app is running as a PWA (Progressive Web App) and using passkeys for authentication.
            </p>
          </div>
          
          <div className="mt-6 flex justify-center">
            <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 font-medium">
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
} 