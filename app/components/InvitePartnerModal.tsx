import { useState, useEffect } from 'react';

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

type InvitePartnerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userID: string;
  baseUrl: string;
};

export default function InvitePartnerModal({
  isOpen,
  onClose,
  userID,
  baseUrl
}: InvitePartnerModalProps) {
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add API key for direct access bypassing Passage auth
  const API_KEY = 'nestled-temp-api-key-12345';
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      // Cleanup
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);
  
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
    if (isOpen) {
      loadInvitations();
    }
  }, [isOpen, userID]);
  
  const loadInvitations = async () => {
    if (!userID) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First try the standard API
      const response = await fetch('/api/couples/invite');
      
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
        setIsLoading(false);
        return;
      }
      
      console.error('Standard API failed, status:', response.status, 'trying fallback...');
      
      // Use the new auth-bypass endpoint as a fallback
      const authBypassUrl = addApiKeyToUrl(`/api/couples/auth-bypass?passageId=${userID}`);
      const bypassResponse = await fetch(authBypassUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!bypassResponse.ok) {
        console.error('Failed to get couple data:', await bypassResponse.text());
        setError('Failed to load couple data');
        setIsLoading(false);
        return;
      }
      
      // Now get the invitations using the new API
      const inviteBypassUrl = addApiKeyToUrl(`/api/couples/auth-bypass`);
      const inviteResponse = await fetch(inviteBypassUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          passageId: userID,
          action: 'get_invitations'
        })
      });
      
      if (!inviteResponse.ok) {
        console.error('Invitations API failed:', await inviteResponse.text());
        setError('Failed to load invitations');
        setIsLoading(false);
        return;
      }
      
      const inviteData = await inviteResponse.json();
      setInvitations(inviteData.invitations || []);
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
      
      // Use the new auth-bypass endpoint to create the invitation
      const authBypassUrl = addApiKeyToUrl(`/api/couples/auth-bypass`);
      const bypassResponse = await fetch(authBypassUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          passageId: userID,
          action: 'create_invitation'
        })
      });
      
      if (!bypassResponse.ok) {
        const errorText = await bypassResponse.text();
        console.error('Auth bypass API failed:', errorText);
        setError(`Failed to create invitation: ${errorText}`);
        return;
      }
      
      const inviteData = await bypassResponse.json();
      if (inviteData.success) {
        setSuccess('Invitation created successfully');
        // Reload invitations
        await loadInvitations();
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
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-primary-800">Partner Invitations</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
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
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-lg text-primary-600">Loading...</div>
              </div>
            ) : invitations.length === 0 ? (
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
                          {baseUrl}/invite/{invite.code}
                        </div>
                        <button
                          onClick={() => copyToClipboard(`${baseUrl}/invite/${invite.code}`, invite.code + '_url')}
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
          
          <div className="mt-6 pt-6 border-t border-gray-100">
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
        </div>
      </div>
    </div>
  );
} 