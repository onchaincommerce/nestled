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

// API key for direct access (emergency bypass)
const API_KEY = 'nestled-temp-api-key-12345';

// Verify and redeem an invitation code
export async function POST(request: NextRequest) {
  try {
    // Log request headers for debugging
    console.log('Redeem Invite - Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get the request body
    const body = await request.json();
    const { code, passageId } = body;
    
    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }
    
    console.log('Redeem Invite - Code to redeem:', code);
    
    let userID: string;
    
    // Check for direct API key authentication first
    const authHeader = request.headers.get('authorization');
    const isDirectApiCall = authHeader && authHeader === `Bearer ${API_KEY}`;
    
    if (isDirectApiCall && passageId) {
      // For direct API calls with API key, use the passageId from the request
      userID = passageId;
      console.log('Redeem Invite - Using direct API authentication with passageId:', userID);
    } else {
      // Otherwise, use standard Passage authentication
      const authResult = await getAuthenticatedUser(request);
      console.log('Redeem Invite - Auth result:', authResult);
      
      if (!authResult.isAuthorized || !authResult.userID) {
        // Check if a passageId was provided in the body as a fallback
        if (passageId) {
          userID = passageId;
          console.log('Redeem Invite - Falling back to passageId from request body:', userID);
        } else {
          return NextResponse.json(
            { error: 'Not authorized', details: authResult },
            { status: 401 }
          );
        }
      } else {
        userID = authResult.userID;
      }
    }
    
    console.log('Redeem Invite - Final user ID to use:', userID);
    
    const supabase = getSupabase();
    
    // Get user's UUID from Supabase (not Passage ID)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('passage_id', userID)
      .single();
      
    if (userError || !userData) {
      console.error('Redeem Invite - User not found in database:', userError);
      return NextResponse.json(
        { error: 'User not found in database', details: { userError, userID } },
        { status: 404 }
      );
    }
    
    const dbUserId = userData.id;
    console.log('Redeem Invite - DB User ID:', dbUserId);
    
    // Try using the RPC function to redeem the invitation
    // This bypasses RLS policies for more reliable operation
    const { data: redeemResult, error: redeemError } = await supabase.rpc(
      'redeem_invitation_code',
      {
        p_code: code,
        p_user_id: dbUserId
      }
    );
    
    console.log('Redeem Invite - RPC result:', redeemResult, 'Error:', redeemError);
    
    if (redeemError) {
      console.error('Redeem Invite - RPC error, falling back to direct method:', redeemError);
      
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
        console.error('Redeem Invite - Invalid or expired invitation code:', inviteError);
        return NextResponse.json(
          { error: 'Invalid or expired invitation code', details: inviteError },
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
        console.error('Redeem Invite - Error joining couple:', joinError);
        return NextResponse.json(
          { error: 'Error joining couple', details: joinError },
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
        console.error('Redeem Invite - Error fetching couple details:', coupleError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Successfully joined couple',
        coupleId: invitation.couple_id,
        couple: coupleData || null
      });
    } else if (redeemResult && redeemResult.length > 0) {
      // Check if redemption was successful
      const result = redeemResult[0];
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }
      
      // Get couple details if redemption was successful
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .eq('id', result.couple_id)
        .single();
        
      if (coupleError) {
        console.error('Redeem Invite - Error fetching couple details after successful redemption:', coupleError);
      }
      
      return NextResponse.json({
        success: true,
        message: result.message,
        coupleId: result.couple_id,
        couple: coupleData || null
      });
    } else {
      return NextResponse.json(
        { error: 'Unknown error during invitation redemption' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in redeem invite endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error', stack: (error as Error).stack },
      { status: 500 }
    );
  }
} 