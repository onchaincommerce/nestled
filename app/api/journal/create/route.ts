import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/app/utils/supabase';

// API key for direct access
const API_KEY = 'nestled-temp-api-key-12345';

export async function POST(request: Request) {
  // Check API key
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { passageId, content, prompt } = await request.json();

    if (!passageId || !content || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Store the database user ID for response
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
        currentUserDbId
      }, { status: 400 });
    }

    // Check if user is in a couple
    if (!coupleUserData || !coupleUserData.couple_id) {
      return NextResponse.json({ 
        error: 'User is not in a couple',
        currentUserDbId
      }, { status: 400 });
    }

    // Create the journal entry
    const { data: entryData, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        couple_id: coupleUserData.couple_id,
        author_id: userData.id,
        content_encrypted: content, // In a real app, this would be encrypted
        prompt: prompt,
        reactions: {}
      })
      .select()
      .single();

    if (entryError) {
      console.error('Error creating journal entry:', entryError);
      return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      entry: entryData,
      currentUserDbId // Include the database user ID in the successful response
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 