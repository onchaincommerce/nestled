'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PassageUserInterface } from '@/utils/passage-types';
import { handleSafeSignOut } from '@/app/pwa-register';
import InvitePartnerModal from '@/app/components/InvitePartnerModal';

// This is a client component so we'll handle authentication on the client side
export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Partner');
  const [isLoading, setIsLoading] = useState(true);
  const [userID, setUserID] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [passageUser, setPassageUser] = useState<PassageUserInterface | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [entryCreated, setEntryCreated] = useState(false);
  const [authAttempted, setAuthAttempted] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Set the base URL for sharing invite links
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
    
    // Simple authentication with a timeout to prevent infinite loading
    const authTimeout = setTimeout(() => {
      // If auth takes too long, just show the dashboard anyway
      if (isLoading) {
        console.log('Auth timeout - showing dashboard anyway');
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout maximum
    
    // Check if this is client-side
    if (typeof window !== 'undefined') {
      const checkAuth = async () => {
        try {
          // If we've already attempted authentication, don't try again
          if (authAttempted) return;
          setAuthAttempted(true);
          
          // Simple Passage check
          if (!window.Passage) {
            console.error('Passage is not loaded - proceeding anyway');
            setIsLoading(false);
            return;
          }
          
          try {
            const PassageUser = window.Passage.PassageUser;
            const user = new PassageUser();
            setPassageUser(user);
            
            // Try to get user info without requiring isAuthenticated
            // This is more reliable in some cases
            let userInfo;
            let userId;
            let userAuthorized = false;
            
            // Try different ways to get auth status
            try {
              if (typeof user.isAuthenticated === 'function') {
                userAuthorized = await user.isAuthenticated();
                console.log('Used isAuthenticated method, result:', userAuthorized);
              } else {
                console.log('isAuthenticated method not found, trying alternative methods');
                
                // Alternative: Try to get user info directly
                if (typeof user.userInfo === 'function') {
                  userInfo = await user.userInfo();
                  if (userInfo && userInfo.id) {
                    console.log('Got user info directly:', userInfo);
                    userAuthorized = true;
                    userId = userInfo.id;
                  }
                } else {
                  console.error('userInfo method not found either');
                  
                  // Final attempt: Try to get token directly
                  if (typeof user.getAuthToken === 'function') {
                    const token = await user.getAuthToken();
                    if (token) {
                      console.log('Got auth token, user is logged in');
                      userAuthorized = true;
                      
                      // Make a direct call to our API to get user info
                      const response = await fetch('/api/direct-create-user', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          userAgent: navigator.userAgent
                        })
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        if (data.user && data.user.id) {
                          userId = data.user.id;
                        }
                      }
                    }
                  } else {
                    console.error('getAuthToken method not found, cannot authenticate');
                  }
                }
              }
              
              if (!userAuthorized) {
                console.log('User is not authenticated, redirecting...');
                router.push('/');
                return;
              }
              
              // User is authenticated, get basic info
              if (!userInfo && typeof user.userInfo === 'function') {
                userInfo = await user.userInfo();
              }
              
              if (userInfo) {
                setUserName(userInfo.email || userInfo.phone || 'Partner');
                setUserID(userInfo.id || userId || '');
                
                // Register user in Supabase database using direct API call
                // This is more reliable than relying on the auth token
                try {
                  // Check localStorage to see if we've already tried to create this user
                  const userRegistered = localStorage.getItem(`user_registered_${userInfo.id}`);
                  
                  if (!userRegistered) {
                    console.log('First login for user, registering in Supabase');
                    const directResponse = await fetch('/api/direct-create-user', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        userId: userInfo.id || userId,
                        email: userInfo.email,
                        phone: userInfo.phone
                      })
                    });
                    
                    if (!directResponse.ok) {
                      console.error('Failed direct user creation:', await directResponse.text());
                    } else {
                      const responseData = await directResponse.json();
                      console.log('Direct user creation response:', responseData);
                      
                      // Mark this user as registered so we don't try again
                      localStorage.setItem(`user_registered_${userInfo.id}`, 'true');
                    }
                  } else {
                    console.log('User already registered in Supabase');
                  }
                } catch (error) {
                  console.error('Error in direct user creation:', error);
                }
              }
            } catch (authMethodError) {
              console.error('Error checking auth status:', authMethodError);
              setIsLoading(false);
            }
          } catch (error) {
            console.error('Auth error, but continuing:', error);
          } finally {
            // Always stop loading, even if there are errors
            setIsLoading(false);
            clearTimeout(authTimeout);
          }
        } catch (error) {
          console.error('Unexpected error:', error);
          setIsLoading(false);
          clearTimeout(authTimeout);
        }
      };
      
      // Try to authenticate once
      checkAuth();
      
      return () => clearTimeout(authTimeout);
    }
  }, [router, isLoading, authAttempted]);

  const handleSignOut = async () => {
    try {
      // Set loading state to prevent UI issues during signout
      setIsLoading(true);
      
      // Prevent multiple sign-out attempts
      const signOutBtn = document.querySelector('button[onClick="handleSignOut"]');
      if (signOutBtn) {
        signOutBtn.setAttribute('disabled', 'true');
      }
      
      // First clear any auth state in our app
      setUserID('');
      setUserName('Partner');
      setAuthAttempted(false);
      
      if (passageUser && typeof passageUser.signOut === 'function') {
        // Wrap in try/catch to prevent crash if signOut fails
        try {
          await passageUser.signOut();
        } catch (e) {
          console.error('Error during Passage signOut:', e);
        }
      }
      
      // Use the safe sign-out utility that cleans up service workers and redirects
      handleSafeSignOut('/');
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out. Please try again.');
      setIsLoading(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="animate-pulse text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-3/4 h-1/2 bg-primary-100 rounded-full opacity-30 blur-3xl -z-10 animate-float"></div>
      <div className="absolute bottom-0 left-0 w-3/4 h-1/2 bg-secondary-100 rounded-full opacity-30 blur-3xl -z-10" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/3 left-1/4 w-1/2 h-1/2 bg-accent-100 rounded-full opacity-30 blur-3xl -z-10" style={{ animationDelay: '2s' }}></div>
      
      {/* Dashboard Header */}
      <header className="bg-white/70 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-primary-100/30">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/icons/nestled_logo.png" 
              alt="Nestled Logo"
              className="w-8 h-8 mr-2"
            />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">Nestled</span>
          </div>
          <div>
            <button 
              className="bg-gradient-to-r from-secondary-100 to-secondary-200 text-secondary-700 text-sm px-3 py-1.5 rounded-xl hover:from-secondary-200 hover:to-secondary-300 transition-all duration-300 font-medium"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-6 px-3">
        <div className="mb-4">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-secondary-700">Welcome, {userName}!</h1>
          <p className="text-gray-600 text-sm">Here&apos;s what&apos;s happening in your relationship.</p>
        </div>

        {/* User ID & Test Entry */}
        {error && (
          <div className="mb-4 p-3 bg-red-50/90 text-red-700 rounded-2xl border border-red-100/50">
            {error}
          </div>
        )}
        
        {/* Invite Partner Banner */}
        <div className="bg-gradient-to-br from-white/90 to-secondary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-secondary-100/30 p-5 mb-5 hover:shadow-md transition-all duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-primary-800 mb-1">Share the Love</h3>
              <p className="text-gray-600 text-sm">Invite your partner to join Nestled and connect with you.</p>
            </div>
            <button 
              onClick={() => setShowInviteModal(true)} 
              className="bg-gradient-to-r from-secondary-600 to-secondary-700 text-white px-5 py-2.5 rounded-2xl hover:from-secondary-700 hover:to-secondary-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              Invite Partner
            </button>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white/90 to-primary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-primary-100/30 p-5 mb-5 hover:shadow-md transition-all duration-300">
          <div className="p-3 bg-primary-50/80 rounded-xl mb-3 border border-primary-200/30">
            <p className="text-primary-800 text-sm">
              <strong>User ID:</strong> {userID || 'Not authenticated'}
            </p>
          </div>
          
          {entryCreated ? (
            <div className="p-3 bg-green-50/90 text-green-700 rounded-xl border border-green-100/50">
              Test entry successfully created in the database!
            </div>
          ) : (
            <button
              onClick={createTestEntry}
              disabled={isCreatingEntry || !userID}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-2xl hover:from-primary-700 hover:to-primary-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center justify-center"
            >
              {isCreatingEntry ? 
                <span className="flex items-center">Creating... <span className="ml-2 animate-spin">⏳</span></span> : 
                'Create Test Entry'
              }
            </button>
          )}
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          {/* Journal Card */}
          <div className="bg-gradient-to-br from-white/90 to-primary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-primary-100/30 p-5 group hover:scale-[1.02] transition-all duration-300 hover:shadow-md">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-primary-800">Today's Journal</h2>
              <span className="text-xs bg-primary-100/90 text-primary-700 px-2 py-0.5 rounded-full">Daily</span>
            </div>
            <p className="text-gray-600 mb-3 text-sm">What would be your perfect day?</p>
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                <span className="font-medium">Status:</span> Waiting for responses
              </div>
              <Link href="/journal" className="text-primary-600 hover:text-primary-800 font-medium text-sm group-hover:underline flex items-center">
                Answer <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          {/* Date Planner Card */}
          <div className="bg-gradient-to-br from-white/90 to-secondary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-secondary-100/30 p-5 group hover:scale-[1.02] transition-all duration-300 hover:shadow-md">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-primary-800">Upcoming Date</h2>
              <span className="text-xs bg-secondary-100/90 text-secondary-700 px-2 py-0.5 rounded-full">Next Week</span>
            </div>
            <p className="text-gray-600 mb-3 text-sm">No dates planned yet. Create your first date!</p>
            <div className="flex justify-end">
              <Link href="/date-planner" className="text-primary-600 hover:text-primary-800 font-medium text-sm group-hover:underline flex items-center">
                Plan a date <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          {/* Scrapbook Card */}
          <div className="bg-gradient-to-br from-white/90 to-accent-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-accent-100/30 p-5 group hover:scale-[1.02] transition-all duration-300 hover:shadow-md">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-primary-800">Recent Memories</h2>
              <span className="text-xs bg-accent-100/90 text-accent-700 px-2 py-0.5 rounded-full">Scrapbook</span>
            </div>
            <p className="text-gray-600 mb-3 text-sm">Start adding photos and memories to your scrapbook.</p>
            <div className="flex justify-end">
              <Link href="/scrapbook" className="text-primary-600 hover:text-primary-800 font-medium text-sm group-hover:underline flex items-center">
                Add memory <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-gradient-to-br from-white/90 to-primary-50/60 backdrop-blur-sm rounded-2xl shadow-sm border border-primary-100/30 p-5 mb-5 hover:shadow-md transition-all duration-300">
          <h2 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-secondary-700 mb-3">Activity Feed</h2>
          <div className="space-y-4">
            <p className="text-gray-500 text-center py-3 text-sm">
              Your activity feed will show up here once you start using Nestled.
            </p>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-200/60 px-4 py-2 flex justify-around items-center">
        <Link href="/dashboard" className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-primary-600' : 'text-gray-500'} transition-colors duration-300`} onClick={() => setActiveTab('dashboard')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link href="/journal" className={`flex flex-col items-center ${activeTab === 'journal' ? 'text-primary-600' : 'text-gray-500'} transition-colors duration-300`} onClick={() => setActiveTab('journal')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-xs mt-1">Journal</span>
        </Link>
        <Link href="/date-planner" className={`flex flex-col items-center ${activeTab === 'date-planner' ? 'text-primary-600' : 'text-gray-500'} transition-colors duration-300`} onClick={() => setActiveTab('date-planner')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs mt-1">Dates</span>
        </Link>
        <Link href="/scrapbook" className={`flex flex-col items-center ${activeTab === 'scrapbook' ? 'text-primary-600' : 'text-gray-500'} transition-colors duration-300`} onClick={() => setActiveTab('scrapbook')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs mt-1">Memories</span>
        </Link>
      </nav>
      
      {/* Partner Invitation Modal */}
      <InvitePartnerModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        userID={userID}
        baseUrl={baseUrl}
      />
    </div>
  );
} 