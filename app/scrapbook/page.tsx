'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getSupabaseWithUser } from '@/utils/supabase';
import { PassageUserInterface } from '@/utils/passage-types';
import type { FormEvent, ChangeEvent } from 'react';

type ScrapbookItem = {
  id: string;
  couple_id: string;
  author_id: string;
  media_url: string;
  caption: string | null;
  tags: string[] | null;
  created_at: string;
  author_email?: string;
};

export default function Scrapbook() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ScrapbookItem[]>([]);
  const [userID, setUserID] = useState('');
  const [userName, setUserName] = useState('');
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('scrapbook');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  
  // New memory form data
  const [newCaption, setNewCaption] = useState('');
  const [newTags, setNewTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check authentication and load scrapbook items
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
            setCoupleId(null);
          } else {
            setCoupleId(couplesData.couple_id);
            
            // Fetch scrapbook items for this couple
            const { data: itemsData, error: itemsError } = await userSupabase
              .from('scrapbook_items')
              .select('*')
              .eq('couple_id', couplesData.couple_id)
              .order('created_at', { ascending: false });

            if (itemsError) {
              console.error('Error fetching scrapbook items:', itemsError);
            } else {
              // Fetch author email for each item
              const itemsWithAuthorEmail = await Promise.all(
                (itemsData || []).map(async (item) => {
                  const { data: userData, error: userError } = await userSupabase
                    .from('users')
                    .select('email')
                    .eq('id', item.author_id)
                    .single();
                  
                  return {
                    ...item,
                    author_email: userError ? undefined : userData.email
                  };
                })
              );
              
              setItems(itemsWithAuthorEmail);
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitMemory = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile || !coupleId || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const userSupabase = getSupabaseWithUser(userID);
      
      // Create a unique filename for the upload
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userID}-${Date.now()}.${fileExt}`;
      const filePath = `scrapbook/${coupleId}/${fileName}`;
      
      // Upload the file to Supabase Storage
      const { data: uploadData, error: uploadError } = await userSupabase.storage
        .from('media')
        .upload(filePath, selectedFile);
      
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return;
      }
      
      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase
        .storage
        .from('media')
        .getPublicUrl(filePath);
      
      // Parse tags from the input (comma-separated)
      const parsedTags = newTags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Create a new scrapbook item
      const newItem = {
        couple_id: coupleId,
        author_id: userID,
        media_url: publicUrl,
        caption: newCaption,
        tags: parsedTags.length > 0 ? parsedTags : null
      };
      
      const { data, error } = await userSupabase
        .from('scrapbook_items')
        .insert(newItem)
        .select();
      
      if (error) {
        console.error('Error creating scrapbook item:', error);
      } else {
        // Add the new item to the state
        const itemWithAuthor = {
          ...data[0],
          author_email: userName
        };
        
        setItems([itemWithAuthor, ...items]);
        
        // Reset the form
        setNewCaption('');
        setNewTags('');
        setSelectedFile(null);
        setPreviewUrl(null);
        setShowNewItemForm(false);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Error submitting memory:', error);
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
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="font-semibold text-primary-700">
            ← Dashboard
          </Link>
          <div className="text-lg font-semibold text-primary-700">Scrapbook</div>
          <div className="w-10"></div> {/* Empty div for flex balance */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-6 px-4 mb-16">
        {/* Action Button */}
        <div className="mb-6 flex justify-end">
          <button 
            onClick={() => setShowNewItemForm(!showNewItemForm)}
            className="btn-primary py-2 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            {showNewItemForm ? 'Cancel' : 'Add Memory'}
          </button>
        </div>
        
        {/* New Memory Form */}
        {showNewItemForm && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-primary-800 mb-4">Add New Memory</h2>
            
            <form onSubmit={handleSubmitMemory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo or Video
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  onChange={handleFileChange}
                  required
                />
                
                {previewUrl && (
                  <div className="mt-2">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200" 
                    />
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">
                  Caption (Optional)
                </label>
                <textarea
                  id="caption"
                  className="w-full border border-gray-300 rounded-md p-2 h-24 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                  placeholder="Add a caption to your memory..."
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                  placeholder="anniversary, beach, summer"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end">
                <button 
                  type="submit" 
                  className="btn-primary py-2"
                  disabled={isSubmitting || !selectedFile}
                >
                  {isSubmitting ? 'Saving...' : 'Save Memory'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Scrapbook Grid */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-primary-800 mb-4">Your Memories</h2>
          
          {items.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500 mb-4">No memories added yet.</p>
              <p className="text-sm text-gray-400">
                Add your first memory using the button above!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.id} className="card overflow-hidden">
                  <div className="aspect-w-16 aspect-h-12 mb-3">
                    <img 
                      src={item.media_url} 
                      alt={item.caption || 'Memory'} 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-gray-500">
                      {formatDateDisplay(item.created_at)}
                    </div>
                    <div className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                      {item.author_email}
                    </div>
                  </div>
                  
                  {item.caption && (
                    <p className="text-gray-700 text-sm mb-2">{item.caption}</p>
                  )}
                  
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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