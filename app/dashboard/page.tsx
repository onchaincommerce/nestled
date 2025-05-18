'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PassageUserInterface } from '@/utils/passage-types';
import { handleSafeSignOut } from '@/app/pwa-register';
import InvitePartnerModal from '@/app/components/InvitePartnerModal';
import ConnectPartnerCard from '@/app/components/ConnectPartnerCard';
import ActiveInviteCode from '@/app/components/ActiveInviteCode';

// This is a client component so we'll handle authentication on the client side
export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Partner');
  const [isLoading, setIsLoading] = useState(true);
  const [userID, setUserID] = useState('');
  const [dbUserID, setDbUserID] = useState(''); // Database user ID - different from Passage ID
  const [activeTab, setActiveTab] = useState('dashboard');
  const [passageUser, setPassageUser] = useState<PassageUserInterface | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [entryCreated, setEntryCreated] = useState(false);
  const [authAttempted, setAuthAttempted] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [processingInviteCode, setProcessingInviteCode] = useState(false);
  const [inviteRedeemResult, setInviteRedeemResult] = useState<{success: boolean, message: string} | null>(null);
  const [isInCouple, setIsInCouple] = useState<boolean | null>(null);
  const [isFullyConnected, setIsFullyConnected] = useState<boolean>(false);
  
  // New states for Journal functionality
  const [newEntryContent, setNewEntryContent] = useState('');
  const [todaysPrompt, setTodaysPrompt] = useState('What is something you love about your partner?');
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  
  // Journal prompt categories with emojis
  const promptCategories = [
    { 
      emoji: '❤️',
      name: 'Appreciation',
      prompts: [
        'What is something you love about your partner?',
        'What is something you\'re grateful for about your partner?',
        'What quality of your partner do you admire the most?'
      ]
    },
    { 
      emoji: '🔮',
      name: 'Future',
      prompts: [
        'What is one thing you\'d like to do together in the next month?',
        'What\'s a dream you have for your relationship in the future?',
        'Where do you see yourselves in five years?'
      ]
    },
    { 
      emoji: '💭',
      name: 'Reflection',
      prompts: [
        'Share a memory that made you smile recently',
        'What\'s one thing about your relationship that makes you proud?',
        'What\'s been your favorite moment together?'
      ]
    },
    { 
      emoji: '🌱',
      name: 'Growth',
      prompts: [
        'What is something you both could improve upon?',
        'What challenge have you overcome together?',
        'How has your relationship grown recently?'
      ]
    },
    { 
      emoji: '🙏',
      name: 'Support',
      prompts: [
        'How has your partner supported you recently?',
        'What can I do to better support you this week?',
        'When did you feel most supported by your partner?'
      ]
    }
  ];
  
  // For storing the selected prompt category
  const [selectedCategory, setSelectedCategory] = useState(0);
  
  // Get random prompt from selected category
  const getRandomPrompt = (categoryIndex = selectedCategory) => {
    const category = promptCategories[categoryIndex];
    return category.prompts[Math.floor(Math.random() * category.prompts.length)];
  };
  
  // New states for Dashboard functionality
  const [hasSeenConnectionBanner, setHasSeenConnectionBanner] = useState<boolean>(false);

  // Function to check if user is in a couple
  const checkCoupleStatus = async (userId: string) => {
    try {
      // Add API key for direct access bypassing Passage auth
      const API_KEY = 'nestled-temp-api-key-12345';
      
      // Use the direct API with API key for more reliable behavior
      const response = await fetch(`/api/couples/direct-invite?passageId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsInCouple(data.in_couple); // Use the actual couple status
        
        // IMPORTANT FIX: Only set isFullyConnected to true if the couple actually has two members
        // Check if the couple has a second member before setting isFullyConnected to true
        const isActuallyFullyConnected = data.is_full || data.isFullyConnected || false;
        console.log('Couple status data:', data, 'Setting isFullyConnected to:', isActuallyFullyConnected);
        setIsFullyConnected(isActuallyFullyConnected);
        
        return data.in_couple;
      } else {
        console.error('Failed to check couple status');
        // Only default to false if we got a 404 (user not found)
        if (response.status === 404) {
          setIsInCouple(false);
          setIsFullyConnected(false);
          return false;
        }
        // For other error codes, don't change the state yet
        return null;
      }
    } catch (error) {
      console.error('Error checking couple status:', error);
      return null;
    }
  };

  // Check if there's a pending invite code to process
  const checkPendingInviteCode = async (userId: string) => {
    const pendingInviteCode = localStorage.getItem('pendingInviteCode');
    
    if (pendingInviteCode && userId) {
      setProcessingInviteCode(true);
      console.log('Found pending invite code:', pendingInviteCode);
      
      try {
        // Call the API to redeem the invitation
        const response = await fetch('/api/couples/redeem-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            code: pendingInviteCode,
            passageId: userId 
          }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          console.log('Successfully redeemed invitation:', data);
          setInviteRedeemResult({
            success: true,
            message: 'Successfully connected with your partner!'
          });
          
          // Update couple status
          setIsInCouple(true);
          setIsFullyConnected(true);
          
          // Remove localStorage setting as we now use the database
        } else {
          console.error('Failed to redeem invitation:', data);
          setInviteRedeemResult({
            success: false,
            message: data.error || 'Failed to redeem invitation code'
          });
        }
      } catch (error) {
        console.error('Error redeeming invitation:', error);
        setInviteRedeemResult({
          success: false,
          message: 'An error occurred while processing your invitation'
        });
      } finally {
        // Clear the pending invite code
        localStorage.removeItem('pendingInviteCode');
        setProcessingInviteCode(false);
        
        // Hide the result message after 5 seconds
        setTimeout(() => {
          setInviteRedeemResult(null);
        }, 5000);
      }
    }
  };

  // Handle successful invite code redemption
  const handleInviteSuccess = (message: string) => {
    setInviteRedeemResult({
      success: true,
      message: message
    });
    
    // Update couple status
    setIsInCouple(true);
    
    // Hide the success message after 5 seconds
    setTimeout(() => {
      setInviteRedeemResult(null);
    }, 5000);
    
    // Refresh couple status from the database
    if (userID) {
      checkCoupleStatus(userID);
    }
  };

  // Handle invite code error
  const handleInviteError = (message: string) => {
    setInviteRedeemResult({
      success: false,
      message: message
    });
    
    // Hide the error message after 5 seconds
    setTimeout(() => {
      setInviteRedeemResult(null);
    }, 5000);
  };

  useEffect(() => {
    // Set the base URL for sharing invite links
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
      
      // Listen for couple status changes from ActiveInviteCode component
      const handleCoupleStatusChange = (event: CustomEvent) => {
        if (event.detail) {
          // Update couple status if provided
          if (typeof event.detail.isInCouple === 'boolean') {
            setIsInCouple(event.detail.isInCouple);
          }
          
          // Update fully connected status if provided
          if (typeof event.detail.isFullyConnected === 'boolean') {
            setIsFullyConnected(event.detail.isFullyConnected);
          }
          
          // Refresh couple status from API after a short delay
          // This ensures we get the latest status after any changes
          setTimeout(() => {
            if (userID) {
              checkCoupleStatus(userID);
            }
          }, 1000);
        }
      };
      
      // Add event listener
      window.addEventListener('coupleStatusChanged', handleCoupleStatusChange as EventListener);
      
      // Clean up
      return () => {
        window.removeEventListener('coupleStatusChanged', handleCoupleStatusChange as EventListener);
      };
    }
  }, []);

  useEffect(() => {
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
                
                // Check for pending invite code after authentication is confirmed
                await checkPendingInviteCode(userInfo.id || userId || '');
                
                // Check couple status from the server 
                await checkCoupleStatus(userInfo.id || userId || '');
                
                // Register user in Supabase database using direct API call
                // This is more reliable than relying on the auth token
                try {
                  // Check if we've already registered this user by storing a flag in the DB
                  // or by checking the user's creation date
                  console.log('Registering user in Supabase if needed');
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
                  
                  if (directResponse.ok) {
                    const responseData = await directResponse.json();
                    console.log('Direct user creation response:', responseData);
                    
                    // Set database user ID if available in the response
                    if (responseData.user && responseData.user.id) {
                      setDbUserID(responseData.user.id);
                      console.log('Set database user ID:', responseData.user.id);
                    }
                  } else {
                    console.error('Failed direct user creation:', await directResponse.text());
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

  // Set journal as the default tab when users are in a fully connected couple
  useEffect(() => {
    if (isInCouple === true && isFullyConnected && !isLoading) {
      // If they're connected, focus on journal experience
      setActiveTab('journal');
      
      // Load journal entries
      if (journalEntries.length === 0) {
        loadJournalEntries();
      }
      
      // Set a random prompt if needed
      if (!todaysPrompt) {
        setTodaysPrompt(getRandomPrompt());
      }
    } else if (isInCouple === true && !isFullyConnected && !isLoading) {
      // If they're in a couple but not fully connected, make sure they stay in dashboard
      // to see the waiting screen and invite code
      setActiveTab('dashboard');
    }
  }, [isInCouple, isFullyConnected, isLoading]);

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

  // Before return statement, remove this debugging code
  useEffect(() => {
    // Only log couple status if it changes
    if (isInCouple !== null || isFullyConnected) {
      console.log('Couple status updated:', { isInCouple, isFullyConnected });
      
      // If user is newly connected (both in couple and fully connected), check localStorage
      if (isInCouple === true && isFullyConnected) {
        const hasSeenBanner = localStorage.getItem('hasSeenConnectionBanner');
        if (!hasSeenBanner) {
          setHasSeenConnectionBanner(false);
        } else {
          setHasSeenConnectionBanner(true);
        }
      }
    }
  }, [isInCouple, isFullyConnected]);

  // Function to handle tab switching - simplified to focus on journaling
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Load journal entries if needed
    if (tab === 'journal' && journalEntries.length === 0) {
      loadJournalEntries();
      // Set a random prompt when switching to journal tab
      setTodaysPrompt(getRandomPrompt());
    }
  };
  
  // Functions to load data for each tab
  const loadJournalEntries = async () => {
    if (!userID || !isInCouple) return;
    
    try {
      // Add API key for direct access bypassing Passage auth
      const API_KEY = 'nestled-temp-api-key-12345';
      
      const response = await fetch(`/api/journal/entries?passageId=${userID}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // If we don't have dbUserID yet, try to get it from the response data
        if (!dbUserID && data.currentUserDbId) {
          setDbUserID(data.currentUserDbId);
          console.log('Set database user ID from entries response:', data.currentUserDbId);
        }
        
        setJournalEntries(data.entries || []);
        console.log('Loaded journal entries:', data.entries);
      } else {
        console.error('Failed to load journal entries', await response.text());
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  };

  // Function to handle journal entry submission
  const handleSubmitJournal = async (e: FormEvent) => {
    e.preventDefault();
    if (!userID || !isInCouple || newEntryContent.trim().length === 0) return;
    
    setIsSubmittingJournal(true);
    
    try {
      // Add API key for direct access bypassing Passage auth
      const API_KEY = 'nestled-temp-api-key-12345';
      
      const response = await fetch('/api/journal/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          passageId: userID,
          content: newEntryContent,
          prompt: todaysPrompt
        }),
      });
      
      if (response.ok) {
        // Clear the form
        setNewEntryContent('');
        
        // Refresh journal entries
        await loadJournalEntries();
        
        // Show success message or toast notification
        console.log('Journal entry created successfully');
      } else {
        console.error('Failed to create journal entry', await response.text());
        // Show error message
      }
    } catch (error) {
      console.error('Error creating journal entry:', error);
      // Show error message
    } finally {
      setIsSubmittingJournal(false);
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
      <div className="absolute top-0 right-0 w-3/4 h-1/2 bg-primary-100/50 rounded-full opacity-30 blur-3xl -z-10 animate-float"></div>
      <div className="absolute bottom-0 left-0 w-3/4 h-1/2 bg-indigo-100/50 rounded-full opacity-30 blur-3xl -z-10" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/3 left-1/4 w-1/2 h-1/2 bg-rose-100/40 rounded-full opacity-30 blur-3xl -z-10" style={{ animationDelay: '2s' }}></div>
      
      {/* Dashboard Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10 shadow-soft">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/icons/nestled_logo.png" 
              alt="Nestled Logo"
              className="w-9 h-9 mr-2"
            />
            <span className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600">Nestled</span>
          </div>
          <div>
            <button 
              className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 text-sm px-3 py-1.5 rounded-xl hover:from-slate-200 hover:to-slate-300 transition-all duration-300 font-medium flex items-center shadow-sm hover:shadow"
              onClick={handleSignOut}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-4 px-3 max-w-md">
        {/* Welcome message shown only on dashboard */}
        {activeTab === 'dashboard' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 via-indigo-700 to-primary-700 font-display mb-1">Welcome, {userName}!</h1>
              <p className="text-slate-600 text-sm">Connect and journal with your partner to strengthen your relationship.</p>
            </div>

            {/* Invite redemption notification */}
            {processingInviteCode && (
              <div className="mb-4 p-3 bg-blue-50/90 text-blue-700 rounded-2xl border border-blue-100/50 flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing your invitation code...
              </div>
            )}

            {inviteRedeemResult && (
              <div className={`mb-4 p-3 ${inviteRedeemResult.success ? 'bg-green-50/90 text-green-700 border-green-100/50' : 'bg-red-50/90 text-red-700 border-red-100/50'} rounded-2xl border`}>
                {inviteRedeemResult.message}
              </div>
            )}

            {/* Error messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50/90 text-red-700 rounded-2xl border border-red-100/50">
                {error}
              </div>
            )}
            
            {/* CONNECTION STATUS SECTION */}
            {/* For users not in a couple, show both components side by side */}
            {isInCouple === false && (
              <div className="space-y-4 mb-5">
                <ConnectPartnerCard 
                  userID={userID} 
                  onSuccess={handleInviteSuccess}
                  onError={handleInviteError}
                />
                <ActiveInviteCode
                  userID={userID}
                  baseUrl={baseUrl}
                />
              </div>
            )}
            
            {/* For users in a couple but waiting for partner to join */}
            {isInCouple === true && !isFullyConnected && (
              <div className="space-y-4 mb-5">
                <div className="bg-gradient-to-br from-white/90 to-yellow-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-yellow-100/30 p-5 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-center mb-3">
                    <div className="bg-yellow-100 p-2 rounded-full mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-yellow-800">Waiting for Partner</h2>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Share your invite code with your partner. Once they join, you'll be able to start journaling together!
                  </p>
                </div>
                <ActiveInviteCode
                  userID={userID}
                  baseUrl={baseUrl}
                />
              </div>
            )}
            
            {/* For users in a fully connected couple, show success message only if they haven't seen it */}
            {isInCouple === true && isFullyConnected && !hasSeenConnectionBanner && (
              <div className="bg-gradient-to-br from-white/90 to-green-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-green-100/30 p-5 mb-5 hover:shadow-md transition-all duration-300">
                <div className="flex items-center mb-3">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-green-800">Connected with Partner</h2>
                </div>
                <p className="text-gray-600 mb-4">
                  You're successfully connected with your partner. You can now start journaling together!
                </p>
                <div className="flex justify-between">
                  <button 
                    onClick={() => {
                      // Mark banner as seen
                      localStorage.setItem('hasSeenConnectionBanner', 'true');
                      setHasSeenConnectionBanner(true);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Don't show again
                  </button>
                  <button 
                    onClick={() => handleTabChange('journal')}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center"
                  >
                    Start Journaling
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Journal Card */}
            {isInCouple === true && isFullyConnected && (
              <div className="bg-gradient-to-br from-white/90 to-slate-50/80 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-card-hover border border-slate-100/50 p-5 group transition-all duration-300 mb-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-primary-100 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-primary-800 font-display">Today's Journal</h2>
                  </div>
                  <span className="text-xs bg-primary-100/90 text-primary-700 px-2 py-1 rounded-full font-medium">Daily</span>
                </div>
                <div className="bg-white/50 border border-slate-100 p-4 rounded-xl mb-4 shadow-sm">
                  <p className="text-slate-700 text-sm leading-relaxed">{todaysPrompt}</p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-xs text-slate-500">
                    <div className="w-2 h-2 bg-amber-400 rounded-full mr-2 animate-pulse"></div>
                    <span className="font-medium">Status:</span> 
                    <span className="ml-1">Waiting for responses</span>
                  </div>
                  <button 
                    onClick={() => handleTabChange('journal')}
                    className="bg-primary-50 hover:bg-primary-100 text-primary-700 hover:text-primary-800 font-medium text-sm px-4 py-1.5 rounded-lg flex items-center group-hover:bg-primary-100 transition-all"
                  >
                    Answer <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Recent Entries Preview */}
            {isInCouple === true && isFullyConnected && journalEntries.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-primary-800 font-display">Recent Entries</h2>
                  <button 
                    onClick={() => handleTabChange('journal')}
                    className="text-primary-600 text-sm font-medium hover:text-primary-800"
                  >
                    View All
                  </button>
                </div>
                
                {journalEntries.slice(0, 2).map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className={`relative overflow-hidden group p-4 shadow-card hover:shadow-card-hover transition-all duration-300 bg-white/95 backdrop-blur-sm rounded-xl border mb-3 ${
                      entry.author_id === dbUserID ? 
                      'border-l-4 border-primary-400 border-t border-r border-b border-slate-100' : 
                      'border-l-4 border-secondary-400 border-t border-r border-b border-slate-100'
                    } animate-slide-up`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => handleTabChange('journal')}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <span className={`text-xs px-2 py-1 rounded-full mr-2 font-medium ${
                          entry.author_id === dbUserID ? 
                          'bg-primary-100 text-primary-700' : 
                          'bg-secondary-100 text-secondary-700'
                        }`}>
                          {entry.author_id === dbUserID ? 'Me' : 'My Partner'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-2">{entry.content_encrypted || entry.content}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Journal Tab Content */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 via-indigo-700 to-primary-700 font-display">Journal</h1>
              <button 
                onClick={() => {
                  // Change to a new random prompt
                  const newPrompt = getRandomPrompt();
                  setTodaysPrompt(newPrompt);
                  // Clear the entry field for the new prompt
                  setNewEntryContent('');
                }}
                className="text-xs bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full hover:bg-primary-200 transition-colors"
              >
                New Prompt
              </button>
            </div>
            
            {(!isInCouple || isInCouple === null) ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="bg-yellow-50 inline-block p-4 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Connect with Your Partner First</h2>
                <p className="text-gray-600 mb-6">
                  You need to connect with your partner before you can start journaling together.
                  Return to the dashboard to generate an invite code or enter one from your partner.
                </p>
                <button 
                  onClick={() => handleTabChange('dashboard')} 
                  className="inline-block bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-300 font-medium shadow-sm hover:shadow"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <>
                {/* Today's Entry Form */}
                <div className="card mb-8 p-5 shadow-card bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-100 animate-bounce-in">
                  <h2 className="text-lg font-semibold font-display text-primary-800 mb-3">Today's Prompt</h2>
                  <div className="bg-gradient-to-r from-primary-50 to-indigo-50 p-4 rounded-xl mb-4 border border-primary-100/50">
                    <p className="text-primary-800 font-medium">{todaysPrompt}</p>
                  </div>
                  
                  <form onSubmit={handleSubmitJournal} className="space-y-3">
                    <div className="relative">
                      <textarea
                        className="w-full border border-slate-200 rounded-xl p-4 mb-2 h-32 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none shadow-sm transition-all duration-200 resize-none"
                        placeholder="Share your thoughts..."
                        value={newEntryContent}
                        onChange={(e) => setNewEntryContent(e.target.value)}
                        required
                      ></textarea>
                      <div className="absolute bottom-4 right-3 text-xs text-slate-400">
                        {newEntryContent.length > 0 ? newEntryContent.length : '0'} characters
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="flex-1"></div> {/* Spacer */}
                      <button 
                        type="submit" 
                        className={`bg-gradient-to-r from-primary-500 to-indigo-500 text-white px-6 py-2.5 rounded-xl transition-all duration-300 font-medium shadow-sm hover:shadow-glow flex items-center ${newEntryContent.trim().length === 0 ? 'opacity-70 cursor-not-allowed' : 'hover:translate-y-[-1px]'}`}
                        disabled={isSubmittingJournal || newEntryContent.trim().length === 0}
                      >
                        {isSubmittingJournal ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            Save Entry
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
                
                {/* Simplified Prompt Selection */}
                <div className="bg-white/95 rounded-xl shadow-card p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">Choose a prompt category:</h3>
                  <div className="flex overflow-x-auto pb-2 space-x-2 -mx-1 px-1">
                    {promptCategories.map((category, index) => (
                      <button 
                        key={index}
                        onClick={() => {
                          setSelectedCategory(index);
                          // Get a random prompt from this category
                          const newPrompt = getRandomPrompt(index);
                          setTodaysPrompt(newPrompt);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl ${
                          selectedCategory === index 
                            ? 'bg-primary-100 text-primary-800 border-2 border-primary-300' 
                            : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                        } transition-all min-w-[70px]`}
                      >
                        <span className="text-xl mb-1">{category.emoji}</span>
                        <span className="text-xs font-medium whitespace-nowrap">{category.name}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-3 flex justify-center">
                    <button 
                      onClick={() => {
                        // Get a new random prompt from the selected category
                        const newPrompt = getRandomPrompt();
                        setTodaysPrompt(newPrompt);
                      }}
                      className="inline-flex items-center justify-center text-primary-700 text-sm py-2 px-4 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Different Prompt
                    </button>
                  </div>
                </div>
                
                {/* Journal Entries */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-primary-800 mb-4 font-display">Previous Entries</h2>
                  
                  <div className="space-y-5">
                    {journalEntries.length === 0 ? (
                      <div className="card text-center py-8 shadow-soft bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-100 animate-fade-in">
                        <div className="bg-slate-50 p-4 rounded-full inline-block mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 mb-4 font-medium">No journal entries yet.</p>
                        <p className="text-sm text-gray-400">
                          Start by answering today's prompt above!
                        </p>
                      </div>
                    ) : (
                      journalEntries.map((entry, index) => (
                        <div 
                          key={entry.id} 
                          className={`relative overflow-hidden group p-5 shadow-card hover:shadow-card-hover transition-all duration-300 bg-white/95 backdrop-blur-sm rounded-2xl border ${
                            entry.author_id === dbUserID ? 
                            'border-l-4 border-primary-400 border-t border-r border-b border-slate-100' : 
                            'border-l-4 border-secondary-400 border-t border-r border-b border-slate-100'
                          } animate-slide-up`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                              <span className={`text-xs px-2 py-1 rounded-full mr-2 font-medium ${
                                entry.author_id === dbUserID ? 
                                'bg-primary-100 text-primary-700' : 
                                'bg-secondary-100 text-secondary-700'
                              }`}>
                                {entry.author_id === dbUserID ? 'Me' : 'My Partner'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(entry.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                          <div className={`p-3 rounded-lg mb-3 ${entry.author_id === dbUserID ? 'bg-primary-50' : 'bg-secondary-50'}`}>
                            <p className={`text-sm font-medium ${entry.author_id === dbUserID ? 'text-primary-800' : 'text-secondary-800'}`}>{entry.prompt}</p>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{entry.content_encrypted || entry.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Mobile Navigation - Simplified to only show Journal */}
      <nav className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-100/60 py-2 px-2 flex justify-center items-center shadow-soft">
        <button 
          onClick={() => handleTabChange('journal')} 
          className="flex items-center p-3 rounded-xl bg-primary-50 text-primary-700 transition-colors duration-300 font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Journal with your partner
        </button>
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