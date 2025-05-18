import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/app/utils/supabase';

// API key for direct access
const API_KEY = 'nestled-temp-api-key-12345';

export async function GET(request: Request) {
  // Check API key
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the passageId from query parameters
    const url = new URL(request.url);
    const passageId = url.searchParams.get('passageId');

    if (!passageId) {
      return NextResponse.json({ error: 'Missing passage ID' }, { status: 400 });
    }

    // First, get the user from the database by passage_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('passage_id', passageId)
      .single();

    if (userError || !userData) {
      console.error('Error finding user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Store the database user ID - this is the ID we'll use for comparison on the frontend
    const currentUserDbId = userData.id;

    // Find the couple_id for this user from the couples_users junction table
    const { data: coupleUserData, error: coupleUserError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', userData.id)
      .single();

    if (coupleUserError) {
      console.error('Error finding couple user relation:', coupleUserError);
      return NextResponse.json({ 
        error: 'User is not in a couple', 
        entries: [],
        currentUserDbId // Include the database user ID even if no entries exist
      }, { status: 200 });
    }

    // Check if user is in a couple
    if (!coupleUserData || !coupleUserData.couple_id) {
      return NextResponse.json({ 
        error: 'User is not in a couple', 
        entries: [],
        currentUserDbId // Include the database user ID even if no entries exist
      }, { status: 200 });
    }

    // Get all journal entries for this couple
    const { data: entriesData, error: entriesError } = await supabase
      .from('journal_entries')
      .select('*, users!journal_entries_author_id_fkey(id, email, phone)')
      .eq('couple_id', coupleUserData.couple_id)
      .order('created_at', { ascending: false });

    if (entriesError) {
      console.error('Error fetching journal entries:', entriesError);
      return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
    }

    // Process entries to add author information
    const processedEntries = entriesData.map(entry => {
      const author = entry.users || {};
      return {
        ...entry,
        author_name: author.email || author.phone || 'Unknown user',
        users: undefined // Remove the nested users object
      };
    });

    return NextResponse.json({ 
      success: true, 
      entries: processedEntries || [],
      currentUserDbId // Include the database user ID in the successful response
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 