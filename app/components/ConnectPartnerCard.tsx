'use client';

import { useState } from 'react';

type ConnectPartnerCardProps = {
  userID: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export default function ConnectPartnerCard({ userID, onSuccess, onError }: ConnectPartnerCardProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConnectPartner = async () => {
    if (!inviteCode.trim()) {
      onError('Please enter an invite code');
      return;
    }

    setIsProcessing(true);

    try {
      // Call the API to redeem the invitation
      const response = await fetch('/api/couples/redeem-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: inviteCode,
          passageId: userID 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Successfully redeemed invitation:', data);
        setInviteCode(''); // Clear the input field
        onSuccess('Successfully connected with your partner!');
      } else {
        console.error('Failed to redeem invitation:', data);
        onError(data.error || 'Failed to redeem invitation code');
      }
    } catch (error) {
      console.error('Error redeeming invitation:', error);
      onError('An error occurred while processing your invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white/90 to-primary-50/80 backdrop-blur-sm rounded-2xl shadow-sm border border-primary-100/30 p-5 mb-5 hover:shadow-md transition-all duration-300">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary-800 mb-1">Connect with Your Partner</h3>
          <p className="text-gray-600 text-sm">Enter an invite code from your partner to connect your accounts.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center uppercase tracking-wider text-lg font-medium"
          />
          <button 
            onClick={handleConnectPartner}
            disabled={isProcessing || !inviteCode.trim()}
            className={`bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center justify-center whitespace-nowrap ${
              isProcessing || !inviteCode.trim() ? 'opacity-70 cursor-not-allowed' : 'hover:from-primary-700 hover:to-primary-800'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-500">
          Don't have an invite code? Ask your partner to invite you from their dashboard.
        </p>
      </div>
    </div>
  );
} 