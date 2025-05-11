'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSupabaseWithUser } from '@/utils/supabase';
// Import types from our central type definition file
import { PassageUserInterface } from '@/utils/passage-types';
import type { FormEvent } from 'react';

type JournalEntry = {
  id: string;
  couple_id: string;
  author_id: string;
  entry_date: string;
  content_encrypted: string;
  prompt: string;
  created_at: string;
  author_email?: string;
};

export default function Journal() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [userID, setUserID] = useState('');
  const [userName, setUserName] = useState('');
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('journal');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [todaysPrompt, setTodaysPrompt] = useState('What made you smile today?');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check authentication and load journal entries
    const checkAuthAndLoadData = async () => {
      try {
        // Use the global Passage object
        if (typeof window !== 'undefined') {
          if (!window.Passage) {
            console.error('Passage is not loaded yet');
            router.push('/');
            return;
          }
          
          // Get the PassageUser class from the global Passage object
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
            // For now, we'll just set the state to reflect there's no couple
            setCoupleId(null);
          } else {
            setCoupleId(couplesData.couple_id);
            
            // Fetch journal entries for this couple
            const { data: entriesData, error: entriesError } = await userSupabase
              .from('journal_entries')
              .select('*')
              .eq('couple_id', couplesData.couple_id)
              .order('entry_date', { ascending: false });

            if (entriesError) {
              console.error('Error fetching entries:', entriesError);
            } else {
              // Fetch author email for each entry
              const entriesWithAuthorEmail = await Promise.all(
                (entriesData || []).map(async (entry) => {
                  const { data: userData, error: userError } = await userSupabase
                    .from('users')
                    .select('email')
                    .eq('id', entry.author_id)
                    .single();
                  
                  return {
                    ...entry,
                    author_email: userError ? undefined : userData.email
                  };
                })
              );
              
              setEntries(entriesWithAuthorEmail);
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

  const handleSubmitEntry = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newEntryContent.trim() || !coupleId || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const userSupabase = getSupabaseWithUser(userID);
      
      const newEntry = {
        couple_id: coupleId,
        author_id: userID,
        entry_date: new Date().toISOString().split('T')[0],
        content_encrypted: newEntryContent, // In a real app, we'd encrypt this content
        prompt: todaysPrompt
      };
      
      const { data, error } = await userSupabase
        .from('journal_entries')
        .insert(newEntry)
        .select();
      
      if (error) {
        console.error('Error creating entry:', error);
      } else {
        // Add the new entry to the state
        const entryWithAuthor = {
          ...data[0],
          author_email: userName
        };
        
        setEntries([entryWithAuthor, ...entries]);
        setNewEntryContent('');
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
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

  // Generate a random prompt for today if needed
  const prompts = [
    "What made you smile today?",
    "What's something your partner did that you appreciated recently?",
    "What would be your perfect day together?",
    "Share a memory that made you laugh together",
    "What's something new you'd like to try with your partner?",
    "What's something you're looking forward to this week?",
    "What's one thing you're grateful for about your relationship?",
    "Share a goal you'd like to achieve together",
    "What's your favorite thing about your relationship right now?"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="font-semibold text-primary-700">
            ← Dashboard
          </Link>
          <div className="text-lg font-semibold text-primary-700">Journal</div>
          <div className="w-10"></div> {/* Empty div for flex balance */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-6 px-4 mb-16">
        {/* Today's Entry Form */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Today's Prompt</h2>
          <div className="bg-primary-50 p-4 rounded-lg mb-4">
            <p className="text-primary-800 font-medium">{todaysPrompt}</p>
          </div>
          
          <form onSubmit={handleSubmitEntry}>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 mb-4 h-32 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
              placeholder="Share your thoughts..."
              value={newEntryContent}
              onChange={(e) => setNewEntryContent(e.target.value)}
              required
            ></textarea>
            <div className="flex justify-end">
              <button 
                type="submit" 
                className="btn-primary py-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Journal Entries */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Previous Entries</h2>
          
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-gray-500 mb-4">No journal entries yet.</p>
                <p className="text-sm text-gray-400">
                  Start by answering today's prompt above!
                </p>
              </div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-primary-800">
                      {new Date(entry.entry_date).toLocaleDateString('en-US', {
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                      {entry.author_email}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg mb-3 text-sm italic text-gray-600">
                    "{entry.prompt}"
                  </div>
                  
                  <p className="text-gray-700 whitespace-pre-wrap">{entry.content_encrypted}</p>
                </div>
              ))
            )}
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