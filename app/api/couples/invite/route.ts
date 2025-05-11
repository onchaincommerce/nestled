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
    // Log request headers for debugging
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Check if the user is authenticated with Passage
    const authResult = await getAuthenticatedUser(request);
    console.log('Auth result:', authResult);
    
    if (!authResult.isAuthorized || !authResult.userID) {
      return NextResponse.json(
        { error: 'Not authorized', details: authResult },
        { status: 401 }
      );
    }
    
    const userID = authResult.userID;
    console.log('Authenticated user ID:', userID);
    
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
        { error: 'User not found in database', details: { userError, userID } },
        { status: 404 }
      );
    }
    
    const dbUserId = userData.id;
    console.log('DB User ID:', dbUserId);
    
    // Check if the user is already in a couple
    const { data: existingCouple, error: existingCoupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (!existingCouple || existingCoupleError) {
      console.error('User not in a couple:', existingCoupleError);
      return NextResponse.json(
        { error: 'You need to create a couple first', details: { existingCoupleError, dbUserId } },
        { status: 400 }
      );
    }
    
    console.log('User\'s couple ID:', existingCouple.couple_id);
    
    // Try direct Supabase operation without RLS first
    // This helps bypass RLS policies for testing
    const { data: directInsertData, error: directInsertError } = await supabase.rpc(
      'create_invitation_code', 
      { 
        p_couple_id: existingCouple.couple_id,
        p_user_id: dbUserId
      }
    );
    
    if (directInsertError) {
      console.error('Direct RPC failed, falling back to regular insert:', directInsertError);
      
      // Generate a unique 6-character invitation code
      // This is deliberately short to be easy to type
      const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days
      
      // Store the invitation code in Supabase with auth bypass
      // Note: This will still be subject to RLS policies
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
          { error: 'Error creating invitation', details: inviteError },
          { status: 500 }
        );
      }
      
      console.log('Invitation created:', invitation);
      
      return NextResponse.json({
        code: inviteCode,
        coupleId: existingCouple.couple_id,
        expiresAt: expiresAt.toISOString(),
        inviteUrl: `${request.nextUrl.origin}/invite/${inviteCode}`
      });
    } else {
      // Direct RPC succeeded
      console.log('Invitation created via RPC:', directInsertData);
      
      return NextResponse.json({
        code: directInsertData.code,
        coupleId: existingCouple.couple_id,
        expiresAt: directInsertData.expires_at,
        inviteUrl: `${request.nextUrl.origin}/invite/${directInsertData.code}`
      });
    }
    
  } catch (error) {
    console.error('Error in invite POST endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error', stack: (error as Error).stack },
      { status: 500 }
    );
  }
}

// Get existing invitations for a user's couple
export async function GET(request: NextRequest) {
  try {
    // Log request headers for debugging
    console.log('GET Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Check if the user is authenticated with Passage
    const authResult = await getAuthenticatedUser(request);
    console.log('GET Auth result:', authResult);
    
    if (!authResult.isAuthorized || !authResult.userID) {
      return NextResponse.json(
        { error: 'Not authorized', details: authResult },
        { status: 401 }
      );
    }
    
    const userID = authResult.userID;
    console.log('GET Authenticated user ID:', userID);
    
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
        { error: 'User not found in database', details: { userError, userID } },
        { status: 404 }
      );
    }
    
    const dbUserId = userData.id;
    console.log('GET DB User ID:', dbUserId);
    
    // Get the user's couple ID
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (coupleError || !coupleData) {
      console.error('Couple not found:', coupleError);
      return NextResponse.json(
        { error: 'User is not in a couple', details: { coupleError, dbUserId } },
        { status: 404 }
      );
    }
    
    console.log('GET User\'s couple ID:', coupleData.couple_id);
    
    // Try to get invitations directly using RPC
    const { data: directInvitationsData, error: directInvitationsError } = await supabase.rpc(
      'get_couple_invitations',
      { p_couple_id: coupleData.couple_id }
    );
    
    if (directInvitationsError) {
      console.error('Direct RPC for invitations failed, falling back to query:', directInvitationsError);
      
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
          { error: 'Error fetching invitations', details: inviteError },
          { status: 500 }
        );
      }
      
      console.log('GET Invitations count:', invitations?.length || 0);
      
      return NextResponse.json({
        invitations: (invitations || []).map(invite => ({
          ...invite,
          inviteUrl: `${request.nextUrl.origin}/invite/${invite.code}`
        }))
      });
    } else {
      // Direct RPC succeeded
      console.log('GET Invitations via RPC count:', directInvitationsData?.length || 0);
      
      return NextResponse.json({
        invitations: (directInvitationsData || []).map((invite: any) => ({
          ...invite,
          inviteUrl: `${request.nextUrl.origin}/invite/${invite.code}`
        }))
      });
    }
    
  } catch (error) {
    console.error('Error in invite GET endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error', stack: (error as Error).stack },
      { status: 500 }
    );
  }
} 