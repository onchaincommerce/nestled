'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { PassageUserInterface } from '@/utils/passage-types';

export default function InviteRedeem() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [userID, setUserID] = useState('');
  const [userName, setUserName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const passageAuthRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Get the invitation code from the URL
    if (params.code) {
      setCode(params.code as string);
    }
    
    const checkAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          if (!window.Passage) {
            console.error('Passage is not loaded yet');
            // We don't redirect here because we want to keep the invitation code in the URL
            setIsLoading(false);
            return;
          }
          
          // @ts-ignore - We know this exists because we checked window.Passage
          const PassageUser = window.Passage.PassageUser;
          const passageUser = new PassageUser() as PassageUserInterface;
          
          try {
            // Check authentication
            let isAuthorized = false;
            try {
              if (typeof passageUser.isAuthenticated === 'function') {
                isAuthorized = await passageUser.isAuthenticated();
              } else if (typeof passageUser.userInfo === 'function') {
                const userInfo = await passageUser.userInfo();
                isAuthorized = !!userInfo?.id;
              }
            } catch (authErr) {
              console.error('Auth error:', authErr);
            }
            
            if (isAuthorized) {
              // User is authenticated, get their info
              const userInfo = await passageUser.userInfo();
              setUserName(userInfo.email || userInfo.phone || 'User');
              setUserID(userInfo.id || '');
            }
          } catch (error) {
            console.error('Error checking auth:', error);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Unexpected error:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [params.code, router]);
  
  // Initialize Passage Auth element after component mounts
  useEffect(() => {
    if (passageAuthRef.current && typeof window !== 'undefined' && !userID) {
      // Clear previous contents and add the element
      passageAuthRef.current.innerHTML = '';
      
      const appId = process.env.NEXT_PUBLIC_PASSAGE_APP_ID || '';
      const passageAuth = document.createElement('passage-auth');
      passageAuth.setAttribute('app-id', appId);
      
      // Add success event listener
      passageAuth.addEventListener('success', handleAuthComplete);
      
      passageAuthRef.current.appendChild(passageAuth);
    }
  }, [userID, passageAuthRef]);
  
  const redeemInvitation = async () => {
    if (!userID) {
      // User needs to log in first
      setError('Please log in or sign up before redeeming this invitation');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsRedeeming(true);
    
    try {
      const response = await fetch('/api/couples/redeem-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to redeem invitation');
      } else {
        setSuccess('You have successfully joined the couple!');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Error redeeming invitation:', error);
    } finally {
      setIsRedeeming(false);
    }
  };
  
  const handleAuthComplete = async () => {
    try {
      // @ts-ignore - We know this exists because we checked window.Passage
      const PassageUser = window.Passage.PassageUser;
      const passageUser = new PassageUser() as PassageUserInterface;
      
      // Check authentication again after login/signup
      const isAuthorized = await passageUser.isAuthenticated();
      
      if (isAuthorized) {
        // User is authenticated, get their info
        const userInfo = await passageUser.userInfo();
        setUserName(userInfo.email || userInfo.phone || 'User');
        setUserID(userInfo.id || '');
      }
    } catch (error) {
      console.error('Error after auth completion:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="animate-pulse text-2xl font-bold text-primary-600">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-semibold text-primary-700">
            ← Home
          </Link>
          <div className="text-lg font-semibold text-primary-700">Join Your Partner</div>
          <div className="w-10"></div> {/* Empty div for flex balance */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-8 px-4 max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-primary-800 mb-2">Couple Invitation</h1>
          <p className="text-gray-600 mb-4">
            You've been invited to join a couple on Nestled!
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}
          
          <div className="mb-6">
            <div className="font-medium text-gray-700 mb-1">Invitation Code:</div>
            <div className="bg-gray-50 p-3 rounded-lg text-lg font-mono text-center font-medium text-primary-700">
              {code}
            </div>
          </div>
          
          {userID ? (
            <div>
              <p className="text-gray-600 mb-4">
                You're signed in as <span className="font-medium">{userName}</span>. Click below to accept this invitation and connect with your partner.
              </p>
              
              <button
                onClick={redeemInvitation}
                disabled={isRedeeming}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center justify-center"
              >
                {isRedeeming ? 'Joining...' : 'Accept Invitation'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Please sign in or create an account to join your partner.
              </p>
              
              <div className="rounded-xl overflow-hidden border border-gray-100">
                <div ref={passageAuthRef} id="passage-auth-container"></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-primary-800 mb-3">What is Nestled?</h2>
          <p className="text-gray-600 mb-3">
            Nestled is a relationship app designed for couples to connect, share moments, and strengthen their bond.
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>Share daily journal prompts</li>
            <li>Create a digital scrapbook of memories</li>
            <li>Plan and organize dates</li>
            <li>Celebrate your relationship milestones</li>
          </ul>
        </div>
      </main>
    </div>
  );
} 