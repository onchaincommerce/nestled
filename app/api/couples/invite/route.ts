import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/utils/passage';
import crypto from 'crypto';

// Initialize Supabase client
const getSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
};

// Generate a new invitation code for a couple
export async function POST(request: NextRequest) {
  try {
    // Check if the user is authenticated with Passage
    const { isAuthorized, userID } = await getAuthenticatedUser(request);
    
    if (!isAuthorized || !userID) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      );
    }
    
    const supabase = getSupabase();
    
    // Get user's UUID from Supabase (not Passage ID)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, phone')
      .eq('passage_id', userID)
      .single();
      
    if (userError || !userData) {
      console.error('User not found in database:', userError);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    const dbUserId = userData.id;
    
    // Check if the user is already in a couple
    const { data: existingCouple, error: existingCoupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (!existingCouple || existingCoupleError) {
      return NextResponse.json(
        { error: 'You need to create a couple first' },
        { status: 400 }
      );
    }
    
    // Generate a unique 6-character invitation code
    // This is deliberately short to be easy to type
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days
    
    // Store the invitation code in Supabase
    const { data: invitation, error: inviteError } = await supabase
      .from('couple_invitations')
      .insert({
        code: inviteCode,
        couple_id: existingCouple.couple_id,
        created_by: dbUserId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
      
    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return NextResponse.json(
        { error: 'Error creating invitation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      code: inviteCode,
      coupleId: existingCouple.couple_id,
      expiresAt: expiresAt.toISOString(),
      inviteUrl: `${request.nextUrl.origin}/invite/${inviteCode}`
    });
    
  } catch (error) {
    console.error('Error in invite POST endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get existing invitations for a user's couple
export async function GET(request: NextRequest) {
  try {
    // Check if the user is authenticated with Passage
    const { isAuthorized, userID } = await getAuthenticatedUser(request);
    
    if (!isAuthorized || !userID) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      );
    }
    
    const supabase = getSupabase();
    
    // Get user's UUID from Supabase (not Passage ID)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('passage_id', userID)
      .single();
      
    if (userError || !userData) {
      console.error('User not found in database:', userError);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    const dbUserId = userData.id;
    
    // Get the user's couple ID
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (coupleError || !coupleData) {
      console.error('Couple not found:', coupleError);
      return NextResponse.json(
        { error: 'User is not in a couple' },
        { status: 404 }
      );
    }
    
    // Get active invitations for this couple
    const now = new Date().toISOString();
    const { data: invitations, error: inviteError } = await supabase
      .from('couple_invitations')
      .select('*')
      .eq('couple_id', coupleData.couple_id)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
      
    if (inviteError) {
      console.error('Error fetching invitations:', inviteError);
      return NextResponse.json(
        { error: 'Error fetching invitations' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      invitations: invitations.map(invite => ({
        ...invite,
        inviteUrl: `${request.nextUrl.origin}/invite/${invite.code}`
      }))
    });
    
  } catch (error) {
    console.error('Error in invite GET endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 