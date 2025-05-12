'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CoupleData = {
  id: string;
  name: string;
  created_at: string;
};

export default function CoupleLink() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userID, setUserID] = useState('');
  const [userName, setUserName] = useState('');
  const [existingCouple, setExistingCouple] = useState<CoupleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [coupleName, setCoupleName] = useState('');
  const [activeTab, setActiveTab] = useState('link'); // 'link' or 'create'
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
          const passageUser = new PassageUser();
          
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
            setUserName(userInfo.email || userInfo.phone || 'Partner');
            setUserID(userInfo.id || '');
            
            // Check if user is already in a couple
            const coupleResponse = await fetch('/api/couples');
            
            if (coupleResponse.ok) {
              const data = await coupleResponse.json();
              if (data.couples && data.couples.length > 0) {
                setExistingCouple(data.couples[0]);
              }
            }
          } catch (error) {
            console.error('Error checking couple status:', error);
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
  
  const handleCreateCouple = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/couples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          coupleName: coupleName || 'Our Relationship'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to create couple');
      } else {
        setSuccess('Successfully created couple!');
        setExistingCouple(data.couple);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Error creating couple:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLinkPartner = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    if (!partnerEmail && !partnerPhone) {
      setError('Please provide either your partner\'s email or phone number');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch('/api/couples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'link',
          partnerEmail: partnerEmail || undefined,
          partnerPhone: partnerPhone || undefined,
          coupleName: coupleName || 'Our Relationship'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to link with partner');
      } else {
        setSuccess('Successfully linked with partner!');
        
        // Refresh couple data
        const coupleResponse = await fetch('/api/couples');
        if (coupleResponse.ok) {
          const coupleData = await coupleResponse.json();
          if (coupleData.couples && coupleData.couples.length > 0) {
            setExistingCouple(coupleData.couples[0]);
          }
        }
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Error linking with partner:', error);
    } finally {
      setIsSubmitting(false);
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
          <Link href="/dashboard" className="font-semibold text-primary-700">
            ← Dashboard
          </Link>
          <div className="text-lg font-semibold text-primary-700">Connect with Your Partner</div>
          <div className="w-10"></div> {/* Empty div for flex balance */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-8 px-4 max-w-md">
        {existingCouple ? (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-primary-800 mb-4">You're Already in a Couple</h2>
            <p className="text-gray-600 mb-4">
              You're already connected in a couple named: <span className="font-medium text-primary-700">{existingCouple.name}</span>
            </p>
            <Link href="/dashboard" className="btn-primary inline-block text-center w-full py-2.5">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h1 className="text-2xl font-bold text-primary-800 mb-6">Connect with Your Partner</h1>
              
              <div className="border-b border-gray-200 mb-6">
                <div className="flex -mb-px">
                  <button
                    className={`px-4 py-2 font-medium ${activeTab === 'link' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('link')}
                  >
                    Link with Partner
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${activeTab === 'create' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('create')}
                  >
                    Create Solo
                  </button>
                </div>
              </div>
              
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
              
              {activeTab === 'link' ? (
                <form onSubmit={handleLinkPartner}>
                  <div className="mb-4">
                    <label htmlFor="coupleName" className="block text-sm font-medium text-gray-700 mb-1">
                      Couple Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="coupleName"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      placeholder="Our Relationship"
                      value={coupleName}
                      onChange={(e) => setCoupleName(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="partnerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Partner's Email
                    </label>
                    <input
                      type="email"
                      id="partnerEmail"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      placeholder="partner@example.com"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="partnerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                      Partner's Phone Number
                    </label>
                    <input
                      type="tel"
                      id="partnerPhone"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      placeholder="+1 (555) 123-4567"
                      value={partnerPhone}
                      onChange={(e) => setPartnerPhone(e.target.value)}
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Please provide either email or phone number.
                    </p>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Connecting...' : 'Connect with Partner'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCreateCouple}>
                  <div className="mb-6">
                    <label htmlFor="soloCoupleName" className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship Name
                    </label>
                    <input
                      type="text"
                      id="soloCoupleName"
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      placeholder="My Relationship"
                      value={coupleName}
                      onChange={(e) => setCoupleName(e.target.value)}
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      You can invite your partner later.
                    </p>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-300 font-medium shadow-sm hover:shadow flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Relationship'}
                  </button>
                </form>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-primary-800 mb-3">Why Connect?</h2>
              <p className="text-gray-600 mb-3">
                Connecting with your partner allows you to share:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1 mb-3">
                <li>Daily journal entries</li>
                <li>Shared photo memories</li>
                <li>Date plans and ideas</li>
                <li>Relationship milestones</li>
              </ul>
              <p className="text-gray-600">
                Your data is private and only visible to the two of you.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 