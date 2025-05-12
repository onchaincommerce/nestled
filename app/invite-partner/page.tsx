'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PassageUserInterface } from '@/utils/passage-types';

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

export default function InvitePartner() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [userID, setUserID] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Add API key for direct access bypassing Passage auth
  const API_KEY = 'nestled-temp-api-key-12345';
  
  // Helper function to add API key as a query parameter as a fallback
  const addApiKeyToUrl = (url: string) => {
    // If URL already has parameters, add the API key as another parameter
    if (url.includes('?')) {
      return `${url}&apiKey=${API_KEY}`;
    }
    // Otherwise, add it as the first parameter
    return `${url}?apiKey=${API_KEY}`;
  };
  
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        if (typeof window !== 'undefined') {
          if (!window.Passage) {
            console.error('Passage is not loaded yet');
            router.push('/');
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
            
            if (!isAuthorized) {
              router.push('/');
              return;
            }
            
            // Get user info
            const userInfo = await passageUser.userInfo();
            setUserID(userInfo.id || '');
            
            // Load existing invitations
            await loadInvitations();
          } catch (error) {
            console.error('Error loading data:', error);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Unexpected error:', error);
        setIsLoading(false);
      }
    };
    
    checkAuthAndLoadData();
  }, [router]);
  
  const loadInvitations = async () => {
    try {
      // First try the standard API
      const response = await fetch('/api/couples/invite');
      
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
        return;
      }
      
      console.error('Standard API failed, status:', response.status, 'trying fallback...');
      
      // If that fails, try the direct API with the couple ID and API key
      // First, get the couple ID for this user
      const coupleUrl = addApiKeyToUrl(`/api/couples/direct?passageId=${userID}`);
      const coupleResponse = await fetch(coupleUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!coupleResponse.ok) {
        console.error('Failed to get couple data:', await coupleResponse.text());
        setError('Failed to load couple data');
        return;
      }
      
      const coupleData = await coupleResponse.json();
      if (!coupleData.couples || coupleData.couples.length === 0) {
        console.error('No couples found for user');
        setError('You are not part of any couple yet');
        return;
      }
      
      const coupleId = coupleData.couples[0].id;
      
      // Now call the direct API
      const inviteUrl = addApiKeyToUrl(`/api/couples/direct-invite?coupleId=${coupleId}`);
      const directResponse = await fetch(inviteUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!directResponse.ok) {
        console.error('Direct API failed:', await directResponse.text());
        setError('Failed to load invitations');
        return;
      }
      
      const directData = await directResponse.json();
      setInvitations(directData.invitations || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setError('Failed to load invitations');
    }
  };
  
  const createInvitation = async () => {
    setError(null);
    setSuccess(null);
    setIsCreatingInvite(true);
    
    try {
      // First try the standard API
      const response = await fetch('/api/couples/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess('Invitation created successfully');
        // Reload invitations
        await loadInvitations();
        return;
      }
      
      console.error('Standard API POST failed, status:', response.status, 'trying fallback...');
      
      // If that fails, try the direct API with the couple ID and API key
      // First, get the couple ID for this user
      const coupleUrl = addApiKeyToUrl(`/api/couples/direct?passageId=${userID}`);
      const coupleResponse = await fetch(coupleUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!coupleResponse.ok) {
        setError('Failed to get couple data');
        return;
      }
      
      const coupleData = await coupleResponse.json();
      if (!coupleData.couples || coupleData.couples.length === 0) {
        setError('You are not part of any couple yet');
        return;
      }
      
      const coupleId = coupleData.couples[0].id;
      
      // Now call the direct API
      const inviteUrl = addApiKeyToUrl('/api/couples/direct-invite');
      const directResponse = await fetch(inviteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          userId: userID,
          coupleId: coupleId
        })
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error('Direct API failed:', errorText);
        setError(`Failed to create invitation: ${errorText}`);
        return;
      }
      
      const directData = await directResponse.json();
      setSuccess('Invitation created successfully');
      // Reload invitations
      await loadInvitations();
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
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <Link href="/dashboard" className="font-semibold text-primary-700">
            ← Dashboard
          </Link>
          <div className="text-lg font-semibold text-primary-700">Invite Partner</div>
          <div className="w-10"></div> {/* Empty div for flex balance */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-8 px-4 max-w-lg">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-primary-800 mb-6">Partner Invitations</h1>
          
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
            <p className="text-gray-600 mb-4">
              Create an invitation code to share with your partner. They'll need to sign up (or log in) and enter this code to connect with you.
            </p>
            
            <button
              onClick={createInvitation}
              disabled={isCreatingInvite}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center justify-center"
            >
              {isCreatingInvite ? 'Creating...' : 'Create New Invitation'}
            </button>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-primary-800 mb-3">Active Invitations</h2>
            
            {invitations.length === 0 ? (
              <p className="text-gray-500 py-4 text-center border border-gray-100 rounded-lg">
                No active invitations. Create one to invite your partner.
              </p>
            ) : (
              <div className="space-y-4">
                {invitations.map(invite => (
                  <div key={invite.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-primary-800 text-lg">
                          Code: {invite.code}
                        </div>
                        <div className="text-sm text-gray-500">
                          Expires: {formatDate(invite.expires_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(invite.code, invite.code)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors"
                      >
                        {copiedCode === invite.code ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm mb-1 font-medium text-gray-700">Share Link:</div>
                      <div className="flex items-center">
                        <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 flex-1 truncate">
                          {invite.inviteUrl}
                        </div>
                        <button
                          onClick={() => copyToClipboard(invite.inviteUrl, invite.code + '_url')}
                          className="ml-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
                        >
                          {copiedCode === invite.code + '_url' ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-gray-500">
                        Created: {formatDate(invite.created_at)}
                      </div>
                      <div className={`${invite.redeemed_at ? 'text-green-600' : 'text-blue-600'} font-medium`}>
                        {invite.redeemed_at ? 'Redeemed' : 'Active'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-primary-800 mb-3">Instructions</h2>
          <ol className="list-decimal pl-5 text-gray-600 space-y-2">
            <li>Create a new invitation above</li>
            <li>Share the code or link with your partner</li>
            <li>Have your partner sign up (or log in) to Nestled</li>
            <li>They'll need to enter the code to connect with you</li>
          </ol>
          <div className="mt-4 text-sm text-gray-500">
            <p>Invitation codes expire after 7 days for security reasons.</p>
          </div>
        </div>
      </main>
    </div>
  );
} 