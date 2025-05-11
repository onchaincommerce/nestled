'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSupabaseWithUser } from '@/utils/supabase';
import { PassageUserInterface, PassageUserModule } from '@/utils/passage-types';
import type { FormEvent } from 'react';

type DateEvent = {
  id: string;
  couple_id: string;
  title: string;
  notes: string | null;
  start_at: string;
  end_at: string | null;
  created_at: string;
  created_by: string;
};

export default function DatePlanner() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [dates, setDates] = useState<DateEvent[]>([]);
  const [userID, setUserID] = useState('');
  const [userName, setUserName] = useState('');
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('date-planner');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New date form data
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [showNewDateForm, setShowNewDateForm] = useState(false);

  useEffect(() => {
    // Check authentication and load date events
    const checkAuthAndLoadData = async () => {
      try {
        // Dynamically import the Passage user module
        if (typeof window !== 'undefined') {
          if (!window.Passage) {
            // Redirect to login if Passage is not loaded yet
            router.push('/');
            return;
          }
          
          // @ts-ignore - We know this exists because we checked window.Passage
          const PassageUser = window.Passage.PassageUser;
          const passageUser = new PassageUser() as PassageUserInterface;

          const isAuthorized = await passageUser.isAuthenticated();
          
          if (!isAuthorized) {
            router.push('/');
            return;
          }
          
          // User is authenticated, get their info
          const userInfo = await passageUser.userInfo();
          setUserName(userInfo.email || 'Partner');
          setUserID(userInfo.id || '');

          // Get the couple ID for this user
          const userSupabase = getSupabaseWithUser(userInfo.id);
          const { data: couplesData, error: couplesError } = await userSupabase
            .from('couples_users')
            .select('couple_id')
            .eq('user_id', userInfo.id)
            .single();

          if (couplesError) {
            console.error('Error fetching couple:', couplesError);
            // If no couple exists, we might want to create one or show an onboarding screen
            setCoupleId(null);
          } else {
            setCoupleId(couplesData.couple_id);
            
            // Fetch date events for this couple
            const now = new Date().toISOString();
            const { data: datesData, error: datesError } = await userSupabase
              .from('date_events')
              .select('*')
              .eq('couple_id', couplesData.couple_id)
              .gte('start_at', now)  // Only get upcoming dates
              .order('start_at', { ascending: true });

            if (datesError) {
              console.error('Error fetching dates:', datesError);
            } else {
              setDates(datesData || []);
            }
          }
        } else {
          router.push('/');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/');
      }
    };
    
    // Add a small delay to ensure Passage has time to initialize
    const timer = setTimeout(() => {
      checkAuthAndLoadData();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [router]);

  const handleSubmitDate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStartDate || !newStartTime || !coupleId || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const userSupabase = getSupabaseWithUser(userID);
      
      // Create a date object from the form inputs
      const startDateTime = new Date(`${newStartDate}T${newStartTime}`).toISOString();
      
      const newDate = {
        couple_id: coupleId,
        title: newTitle,
        notes: newNotes,
        start_at: startDateTime,
        created_by: userID
      };
      
      const { data, error } = await userSupabase
        .from('date_events')
        .insert(newDate)
        .select();
      
      if (error) {
        console.error('Error creating date:', error);
      } else {
        // Add the new date to the state
        setDates([...dates, data[0]]);
        
        // Reset the form
        setNewTitle('');
        setNewNotes('');
        setNewStartDate('');
        setNewStartTime('');
        setShowNewDateForm(false);
      }
    } catch (error) {
      console.error('Error submitting date:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-2xl text-primary-600">Loading...</div>
      </div>
    );
  }

  // Format the date for display
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="font-semibold text-primary-700">
            ← Dashboard
          </Link>
          <div className="text-lg font-semibold text-primary-700">Date Planner</div>
          <div className="w-10"></div> {/* Empty div for flex balance */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-6 px-4 mb-16">
        {/* Action Button */}
        <div className="mb-6 flex justify-end">
          <button 
            onClick={() => setShowNewDateForm(!showNewDateForm)}
            className="btn-primary py-2 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            {showNewDateForm ? 'Cancel' : 'Plan a Date'}
          </button>
        </div>
        
        {/* New Date Form */}
        {showNewDateForm && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-primary-800 mb-4">New Date</h2>
            
            <form onSubmit={handleSubmitDate}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Title
                </label>
                <input
                  type="text"
                  id="title"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                  placeholder="Dinner at Giovanni's"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  className="w-full border border-gray-300 rounded-md p-2 h-24 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                  placeholder="Any special plans or details..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  className="btn-primary py-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Date'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Upcoming Dates */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Upcoming Dates</h2>
          
          <div className="space-y-4">
            {dates.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-gray-500 mb-4">No dates planned yet.</p>
                <p className="text-sm text-gray-400">
                  Create your first date plan using the button above!
                </p>
              </div>
            ) : (
              dates.map(date => {
                const { date: displayDate, time: displayTime } = formatDateDisplay(date.start_at);
                
                return (
                  <div key={date.id} className="card">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-primary-800 text-lg">{date.title}</h3>
                      <div className="bg-secondary-100 text-secondary-700 px-2 py-1 rounded-lg text-sm font-medium">
                        {displayDate}
                      </div>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">{displayTime}</span>
                    </div>
                    
                    {date.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">{date.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Date Ideas */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Date Ideas</h2>
          
          <div className="card">
            <p className="text-gray-500 text-center py-4">
              Coming soon: Save ideas for future dates!
            </p>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 bg-white border-t border-gray-200 w-full px-4 py-3 flex justify-around items-center">
        <Link href="/dashboard" className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('dashboard')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link href="/journal" className={`flex flex-col items-center ${activeTab === 'journal' ? 'text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('journal')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-xs mt-1">Journal</span>
        </Link>
        <Link href="/date-planner" className={`flex flex-col items-center ${activeTab === 'date-planner' ? 'text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('date-planner')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs mt-1">Dates</span>
        </Link>
        <Link href="/scrapbook" className={`flex flex-col items-center ${activeTab === 'scrapbook' ? 'text-primary-600' : 'text-gray-500'}`} onClick={() => setActiveTab('scrapbook')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs mt-1">Memories</span>
        </Link>
      </nav>
    </div>
  );
} 