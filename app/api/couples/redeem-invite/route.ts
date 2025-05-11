import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/utils/passage';

// Initialize Supabase client
const getSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
};

// Verify and redeem an invitation code
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
    
    // Get the invitation code from the request
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
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
    
    // Check if the user is already in a couple
    const { data: existingCouple, error: existingCoupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (existingCouple && !existingCoupleError) {
      return NextResponse.json(
        { error: 'User is already in a couple', coupleId: existingCouple.couple_id },
        { status: 400 }
      );
    }
    
    // Verify the invitation code
    const now = new Date().toISOString();
    const { data: invitation, error: inviteError } = await supabase
      .from('couple_invitations')
      .select('couple_id, created_by')
      .eq('code', code.toUpperCase())
      .gt('expires_at', now)
      .single();
      
    if (inviteError || !invitation) {
      console.error('Invalid or expired invitation code:', inviteError);
      return NextResponse.json(
        { error: 'Invalid or expired invitation code' },
        { status: 400 }
      );
    }
    
    // Don't allow joining your own invitation
    if (invitation.created_by === dbUserId) {
      return NextResponse.json(
        { error: 'You cannot join your own invitation' },
        { status: 400 }
      );
    }
    
    // Add the user to the couple
    const { error: joinError } = await supabase
      .from('couples_users')
      .insert({
        couple_id: invitation.couple_id,
        user_id: dbUserId
      });
      
    if (joinError) {
      console.error('Error joining couple:', joinError);
      return NextResponse.json(
        { error: 'Error joining couple' },
        { status: 500 }
      );
    }
    
    // Mark the invitation as used
    await supabase
      .from('couple_invitations')
      .update({ redeemed_by: dbUserId, redeemed_at: now })
      .eq('code', code.toUpperCase());
    
    // Get couple details
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .select('*')
      .eq('id', invitation.couple_id)
      .single();
      
    if (coupleError) {
      console.error('Error fetching couple details:', coupleError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully joined couple',
      coupleId: invitation.couple_id,
      couple: coupleData || null
    });
    
  } catch (error) {
    console.error('Error in redeem invite endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 