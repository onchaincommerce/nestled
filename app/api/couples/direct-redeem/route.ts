import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Rate limiting - max 10 requests per minute
  const RATE_LIMIT = 10;
  const RATE_LIMIT_WINDOW = 60; // seconds
  
  // Validate API key
  const API_KEY = 'nestled-temp-api-key-12345';
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Parse request body
    const body = await request.json();
    const { code, passageId } = body;
    
    if (!code || !passageId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    // 1. Find the invitation by code
    const { data: invitationData, error: invitationError } = await supabase
      .from('couple_invitations')
      .select('id, couple_id, created_at, expires_at, redeemed_at, redeemed_by')
      .eq('code', code)
      .single();
    
    if (invitationError || !invitationData) {
      console.error('Error finding invitation:', invitationError);
      return NextResponse.json({ error: 'Invalid invitation code' }, { status: 404 });
    }
    
    // 2. Check if invitation has already been redeemed
    if (invitationData.redeemed_at || invitationData.redeemed_by) {
      return NextResponse.json({ error: 'This invitation has already been redeemed' }, { status: 400 });
    }
    
    // 3. Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitationData.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
    }
    
    // 4. Check if the user is already in the couple or any other couple
    const { data: existingCouple, error: existingCoupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', passageId);
    
    if (existingCoupleError) {
      console.error('Error checking existing couple:', existingCoupleError);
      return NextResponse.json({ error: 'Failed to check user couple status' }, { status: 500 });
    }
    
    // If user is already in this couple
    if (existingCouple?.some(cu => cu.couple_id === invitationData.couple_id)) {
      return NextResponse.json({ error: 'You are already in this couple' }, { status: 400 });
    }
    
    // 5. Check if user exists, create if not
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', passageId)
      .single();
    
    if (userError) {
      // User doesn't exist, create a placeholder user record
      const { error: createUserError } = await supabase
        .from('users')
        .insert([{ id: passageId }]);
      
      if (createUserError) {
        console.error('Error creating user:', createUserError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    }
    
    // 6. Add user to the couple
    const { error: addUserError } = await supabase
      .from('couples_users')
      .insert([{ couple_id: invitationData.couple_id, user_id: passageId }]);
    
    if (addUserError) {
      console.error('Error adding user to couple:', addUserError);
      return NextResponse.json({ error: 'Failed to add user to couple' }, { status: 500 });
    }
    
    // 7. Mark invitation as redeemed
    const { error: updateInviteError } = await supabase
      .from('couple_invitations')
      .update({
        redeemed_at: now.toISOString(),
        redeemed_by: passageId
      })
      .eq('id', invitationData.id);
    
    if (updateInviteError) {
      console.error('Error updating invitation:', updateInviteError);
      // Non-fatal error - the user has been added to the couple already
      console.warn('Failed to mark invitation as redeemed, but user was added to couple');
    }
    
    // Success!
    return NextResponse.json({
      success: true,
      message: 'You have successfully joined the couple',
      couple_id: invitationData.couple_id
    });
    
  } catch (error) {
    console.error('Unexpected error in direct redeem API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 