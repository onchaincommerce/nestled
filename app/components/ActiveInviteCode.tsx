'use client';

import { useState, useEffect } from 'react';

// Types
interface ActiveInviteCodeProps {
  userID: string;
  baseUrl: string;
}

interface InviteCodeData {
  code: string;
  expires_at: string;
  created_at: string;
  id: string;
}

const ActiveInviteCode = ({ userID, baseUrl }: ActiveInviteCodeProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeInviteCode, setActiveInviteCode] = useState<InviteCodeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [copied, setCopied] = useState<string | null>(null);
  
  // Add API key for direct access bypassing Passage auth
  const API_KEY = 'nestled-temp-api-key-12345';
  
  // Load the active invite code when userID changes
  useEffect(() => {
    if (!userID) return;
    
    const loadInviteCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try to get any existing active invite
        const response = await fetch(`/api/couples/direct-invite?passageId=${userID}`, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            // No active invite code or no couple - we'll handle creating one when user clicks the button
            setActiveInviteCode(null);
            setIsLoading(false);
            return;
          }
          setError('Failed to load invite code. Please try again later.');
          console.error('Error response:', await response.text());
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        
        // Check if user is in a couple
        if (!data.in_couple) {
          // User is not in a couple - we don't show an invite code
          // A couple will be created when they generate an invite
          setActiveInviteCode(null);
          setIsLoading(false);
          return;
        }
        
        if (data.invitations && data.invitations.length > 0) {
          // User has an existing active invite code
          setActiveInviteCode(data.invitations[0]);
        } else {
          // User is in a couple but has no active invites
          setActiveInviteCode(null);
        }
      } catch (e) {
        console.error('Error loading invite code:', e);
        setError('Failed to load invite code. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInviteCode();
  }, [userID]);
  
  // Update the time remaining display
  useEffect(() => {
    if (!activeInviteCode) return;
    
    const updateTimeRemaining = () => {
      const now = new Date();
      const expiresAt = new Date(activeInviteCode.expires_at);
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Expired');
        // We won't auto-refresh expired codes
        setActiveInviteCode(null);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };
    
    // Update immediately
    updateTimeRemaining();
    
    // Then update every minute
    const interval = setInterval(updateTimeRemaining, 60000);
    
    return () => clearInterval(interval);
  }, [activeInviteCode]);
  
  // Generate a new invite code - explicit user action only
  const generateNewCode = async () => {
    if (!userID || isGenerating) return;
    
    try {
      setIsGenerating(true);
      setError(null);
      
      const response = await fetch('/api/couples/direct-invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passageId: userID,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to generate invite code:', errorText);
        setError('Failed to generate invite code. Please try again later.');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setActiveInviteCode({
          id: data.id,
          code: data.code,
          expires_at: data.expires_at,
          created_at: new Date().toISOString(),
        });
        
        // Trigger a window event to notify the dashboard that the couple status changed
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('coupleStatusChanged', { 
            detail: { 
              isInCouple: true,
              isFullyConnected: false // Explicitly mark as not fully connected
            } 
          });
          window.dispatchEvent(event);
        }
      } else {
        setError(data.error || 'Failed to generate invite code. Please try again later.');
      }
    } catch (e) {
      console.error('Error generating invite code:', e);
      setError('Failed to generate invite code. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(type);
        setTimeout(() => setCopied(null), 3000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };
  
  // Generate the invite link
  const getInviteLink = () => {
    if (!activeInviteCode) return '';
    return `${baseUrl}/invite/${activeInviteCode.code}`;
  };
  
  return (
    <div className="bg-gradient-to-br from-white/90 to-secondary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-secondary-100/30 p-5 transition-all duration-300 hover:shadow-md">
      <h2 className="text-xl font-semibold text-secondary-800 mb-3">Invite Partner</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50/90 text-red-700 rounded-xl border border-red-100/50">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-800 font-medium underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-pulse flex flex-col items-center justify-center">
            <div className="h-8 w-40 bg-gray-200 rounded mb-3"></div>
            <div className="h-6 w-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : activeInviteCode ? (
        <div>
          <div className="p-4 bg-secondary-50/70 rounded-xl border border-secondary-100/50 mb-4">
            <div className="flex justify-between items-center mb-1">
              <p className="text-secondary-800 font-semibold">Invite Code:</p>
              <div className="text-xs bg-secondary-100/80 text-secondary-700 px-2 py-0.5 rounded-full">
                {timeRemaining || 'Calculating...'}
              </div>
            </div>
            <div className="flex items-center">
              <span className="font-mono font-medium text-lg text-secondary-700 tracking-wider mr-2">
                {activeInviteCode.code}
              </span>
              <button 
                onClick={() => copyToClipboard(activeInviteCode.code, 'code')}
                className="text-xs bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-md px-2 py-1 transition-colors"
              >
                {copied === 'code' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Share this link with your partner:</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 mr-2 truncate text-sm">
                {getInviteLink()}
              </div>
              <button 
                onClick={() => copyToClipboard(getInviteLink(), 'link')}
                className="text-xs bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-md px-2 py-1 transition-colors whitespace-nowrap"
              >
                {copied === 'link' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mb-3">
            <p>This invite code will expire in 7 days or when used.</p>
          </div>
          
          <button
            onClick={generateNewCode}
            disabled={isGenerating}
            className="text-sm text-secondary-700 hover:text-secondary-800 hover:underline flex items-center justify-center w-full disabled:opacity-50 disabled:hover:no-underline"
          >
            {isGenerating ? 'Generating...' : 'Generate New Code'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Generate an invite code to connect with your partner on Nestled.
          </p>
          
          <button
            onClick={generateNewCode}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-secondary-600 to-secondary-700 text-white px-5 py-2.5 rounded-xl hover:from-secondary-700 hover:to-secondary-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Invite Code'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ActiveInviteCode; 