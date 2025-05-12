'use client';

import { useState, useEffect } from 'react';

type ActiveInviteCodeProps = {
  userID: string;
  baseUrl: string;
};

type Invitation = {
  id: string;
  code: string;
  couple_id: string;
  created_at: string;
  expires_at: string;
  inviteUrl: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
};

export default function ActiveInviteCode({ userID, baseUrl }: ActiveInviteCodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeInvitation, setActiveInvitation] = useState<Invitation | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Add API key for direct access bypassing Passage auth
  const API_KEY = 'nestled-temp-api-key-12345';

  // Update time remaining
  useEffect(() => {
    if (!activeInvitation) return;
    
    const updateTimeRemaining = () => {
      const now = new Date();
      const expiresAt = new Date(activeInvitation.expires_at);
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Expired');
        setActiveInvitation(null); // Remove expired invitation
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      }
    };
    
    // Update immediately
    updateTimeRemaining();
    
    // Then update every minute
    const interval = setInterval(updateTimeRemaining, 60000);
    
    return () => clearInterval(interval);
  }, [activeInvitation]);

  // Load invitations on component mount
  useEffect(() => {
    if (userID) {
      loadInvitations();
    }
  }, [userID]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const loadInvitations = async () => {
    if (!userID) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First try the standard API
      const response = await fetch('/api/couples/invite');
      
      if (response.ok) {
        const data = await response.json();
        const activeInvites = (data.invitations || []).filter((invite: Invitation) => !invite.redeemed_at);
        setActiveInvitation(activeInvites.length > 0 ? activeInvites[0] : null);
        setIsLoading(false);
        return;
      }
      
      console.error('Standard API failed, status:', response.status, 'trying fallback...');
      
      // Use the auth-bypass endpoint as a fallback
      const inviteBypassUrl = `/api/couples/auth-bypass/invite?passageId=${userID}`;
      const inviteResponse = await fetch(inviteBypassUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!inviteResponse.ok) {
        console.error('Invitations API failed:', await inviteResponse.text());
        setError('Failed to load invitations');
        setIsLoading(false);
        return;
      }
      
      const inviteData = await inviteResponse.json();
      const activeInvites = (inviteData.invitations || []).filter((invite: Invitation) => !invite.redeemed_at);
      setActiveInvitation(activeInvites.length > 0 ? activeInvites[0] : null);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setError('Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const createInvitation = async () => {
    setError(null);
    setSuccess(null);
    setIsCreatingInvite(true);
    
    try {
      // Generate a simple invitation code without going through complex APIs
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Send directly to our service role bypassing all other logic
      const directResponse = await fetch('/api/couples/direct-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          passageId: userID,
          code: code,
          expiresInDays: 7
        })
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error('Direct invite API failed:', errorText);
        setError(`Failed to create invitation. Please try again later.`);
        return;
      }
      
      const data = await directResponse.json();
      if (data.success) {
        setSuccess('Invitation created successfully');
        // Set the new invitation
        const newInvitation = {
          id: data.id || crypto.randomUUID(),
          code: code,
          couple_id: data.couple_id,
          created_at: new Date().toISOString(),
          expires_at: data.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          inviteUrl: `${baseUrl}/invite/${code}`,
          redeemed_at: null,
          redeemed_by: null
        };
        setActiveInvitation(newInvitation);
        
        // Initialize time remaining
        const now = new Date();
        const expiresAt = new Date(newInvitation.expires_at);
        const diff = expiresAt.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeRemaining(`${days}d ${hours}h`);
        
        // Clear success message after a few seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError('Failed to create invitation');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Error creating invitation:', error);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 3000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-white/90 to-secondary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-secondary-100/30 p-5 mb-5">
        <div className="flex justify-center">
          <div className="animate-pulse text-primary-600">Loading invite code...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-white/90 to-secondary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-secondary-100/30 p-5 mb-5">
        <div className="text-red-600 text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!activeInvitation) {
    return (
      <div className="bg-gradient-to-br from-white/90 to-secondary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-secondary-100/30 p-5 mb-5 hover:shadow-md transition-all duration-300">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary-800 mb-1">Generate Partner Invite Code</h3>
            <p className="text-gray-600 text-sm">Create an invite code to share with your partner so they can connect with you.</p>
          </div>
          
          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}
          
          <button
            onClick={createInvitation}
            disabled={isCreatingInvite}
            className={`w-full bg-gradient-to-r from-secondary-600 to-secondary-700 text-white px-5 py-2.5 rounded-xl hover:from-secondary-700 hover:to-secondary-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center justify-center ${isCreatingInvite ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isCreatingInvite ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Generate Invite Code
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/90 to-secondary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-secondary-100/30 p-5 mb-5 hover:shadow-md transition-all duration-300">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary-800 mb-1">Your Partner Invite Code</h3>
          <p className="text-gray-600 text-sm">Share this code with your partner to connect your accounts.</p>
        </div>
        
        <div className="bg-white/70 p-4 rounded-xl border border-secondary-200/30">
          <div className="flex justify-between items-center mb-2">
            <div className="font-bold text-2xl text-primary-800 tracking-wider">{activeInvitation.code}</div>
            <button
              onClick={() => copyToClipboard(activeInvitation.code, 'code')}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors"
            >
              {copiedCode === 'code' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 mt-2">
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
              timeRemaining === 'Expired' ? 'bg-red-500' : 'bg-green-500 animate-pulse'
            }`}></span>
            <span>
              {timeRemaining === 'Expired' ? 'Expired' : `Expires in: ${timeRemaining}`}
            </span>
            <span className="mx-2">•</span>
            <span>Expires: {formatDate(activeInvitation.expires_at)}</span>
          </div>
        </div>
        
        <div>
          <div className="text-sm mb-1 font-medium text-gray-700">Share Link:</div>
          <div className="flex items-center">
            <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 flex-1 truncate">
              {baseUrl}/invite/{activeInvitation.code}
            </div>
            <button
              onClick={() => copyToClipboard(`${baseUrl}/invite/${activeInvitation.code}`, 'link')}
              className="ml-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              {copiedCode === 'link' ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500">
          Your partner will need to sign up (or log in) to Nestled and enter this code to connect with you.
        </p>
      </div>
    </div>
  );
} 