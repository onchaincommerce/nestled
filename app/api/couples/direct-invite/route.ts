import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Super simplified approach that bypasses all RLS and complex logic
export async function POST(request: NextRequest) {
  try {
    // API Key for simple validation
    const API_KEY = process.env.INVITE_API_KEY || 'nestled-temp-api-key-12345';
    
    // Basic validation
    const authorization = request.headers.get('Authorization');
    const apiKey = authorization?.split(' ')[1];
    
    if (apiKey !== API_KEY) {
      console.error('Invalid API key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { passageId, code, expiresInDays = 7 } = await request.json();
    
    if (!passageId) {
      return NextResponse.json({ error: 'Missing passageId' }, { status: 400 });
    }
    
    // Initialize Supabase with the service key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' }, 
        { status: 500 }
      );
    }
    
    // Create client with admin privileges
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    
    // 1. First get the user by passage_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('passage_id', passageId)
      .single();
    
    if (userError || !userData) {
      console.error('User not found:', userError);
      return NextResponse.json(
        { error: 'User not found', details: userError }, 
        { status: 404 }
      );
    }
    
    const userId = userData.id;
    
    // 2. Check if user is in a couple already
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', userId)
      .single();
    
    // If user is not in a couple, create one
    let coupleId: string;
    
    if (coupleError || !coupleData) {
      console.log('User not in a couple. Creating a new couple.');
      // Create a couple directly - This is the simplest approach
      const { data: newCouple, error: newCoupleError } = await supabase
        .from('couples')
        .insert({
          name: 'New Couple',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (newCoupleError || !newCouple) {
        console.error('Failed to create couple:', newCoupleError);
        return NextResponse.json(
          { error: 'Failed to create couple', details: newCoupleError }, 
          { status: 500 }
        );
      }
      
      // Now link the user to the couple
      const { error: linkError } = await supabase
        .from('couples_users')
        .insert({
          couple_id: newCouple.id,
          user_id: userId
        });
      
      if (linkError) {
        console.error('Failed to link user to couple:', linkError);
        return NextResponse.json(
          { error: 'Failed to link user to couple', details: linkError }, 
          { status: 500 }
        );
      }
      
      coupleId = newCouple.id;
    } else {
      console.log('User already in a couple. Using existing couple ID.');
      coupleId = coupleData.couple_id;
    }
    
    // 3. Check for existing active invitations from this user
    const now = new Date().toISOString();
    const { data: existingInvites, error: existingInvitesError } = await supabase
      .from('couple_invitations')
      .select('id, code')
      .eq('couple_id', coupleId)
      .eq('created_by', userId)
      .gt('expires_at', now)
      .is('redeemed_at', null);
    
    // If there are existing active invitations, return the most recent one
    if (!existingInvitesError && existingInvites && existingInvites.length > 0) {
      console.log('User already has active invitations. Returning the most recent one.');
      const mostRecentInvite = existingInvites[0];
      
      // Get more details about this invitation
      const { data: inviteDetails } = await supabase
        .from('couple_invitations')
        .select('*')
        .eq('id', mostRecentInvite.id)
        .single();
      
      return NextResponse.json({
        success: true,
        message: 'Using existing active invitation',
        id: mostRecentInvite.id,
        code: mostRecentInvite.code,
        couple_id: coupleId,
        expires_at: inviteDetails?.expires_at,
        created_at: inviteDetails?.created_at
      });
    }
    
    // 4. Create the invitation directly
    const finalCode = code || Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7)); // 7 days by default
    
    // Create invitation directly
    const { data: inviteData, error: inviteError } = await supabase
      .from('couple_invitations')
      .insert({
        code: finalCode,
        couple_id: coupleId,
        created_by: userId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (inviteError) {
      console.error('Failed to create invitation:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invitation', details: inviteError }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      id: inviteData.id,
      code: finalCode,
      couple_id: coupleId,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Unexpected error in direct-invite:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' }, 
      { status: 500 }
    );
  }
}

// Get invitations for a couple directly
export async function GET(request: NextRequest) {
  try {
    // API Key for simple validation
    const API_KEY = process.env.INVITE_API_KEY || 'nestled-temp-api-key-12345';
    
    // Basic validation
    const authorization = request.headers.get('Authorization');
    const apiKey = authorization?.split(' ')[1];
    
    if (apiKey !== API_KEY) {
      console.error('Invalid API key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get passage ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const passageId = searchParams.get('passageId');
    
    if (!passageId) {
      return NextResponse.json(
        { error: 'Missing required parameter: passageId' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase with the service key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' }, 
        { status: 500 }
      );
    }
    
    // Create client with admin privileges
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    
    // Get the user ID from passage_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('passage_id', passageId)
      .single();
    
    if (userError || !userData) {
      console.error('User not found:', userError);
      return NextResponse.json(
        { error: 'User not found', details: userError }, 
        { status: 404 }
      );
    }
    
    // Get the couple ID for this user
    const { data: coupleUserData, error: coupleUserError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', userData.id)
      .single();
    
    if (coupleUserError || !coupleUserData) {
      // IMPORTANT: Don't automatically create a couple
      // Just return a response indicating the user isn't in a couple
      console.log('User not in a couple for GET invites. Not creating a couple automatically.');
      
      // Return empty invitations list 
      return NextResponse.json({
        invitations: [],
        in_couple: false,
        message: "User is not in a couple yet"
      });
    }
    
    // Get all active invitations for this couple
    const now = new Date().toISOString();
    const { data: invitationsData, error: invitationsError } = await supabase
      .from('couple_invitations')
      .select('*')
      .eq('couple_id', coupleUserData.couple_id)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
    
    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json(
        { error: 'Error fetching invitations', details: invitationsError }, 
        { status: 500 }
      );
    }
    
    // Process invitations to add URLs
    const invitationsWithUrls = invitationsData.map((invite: any) => ({
      ...invite,
      inviteUrl: `/invite/${invite.code}`
    }));
    
    // NEW: Check if couple is fully connected (2 or more users)
    const { data: coupleUsers, error: coupleUsersError } = await supabase
      .from('couples_users')
      .select('user_id')
      .eq('couple_id', coupleUserData.couple_id);
    
    let isFull = false;
    if (!coupleUsersError && coupleUsers && coupleUsers.length >= 2) {
      isFull = true;
    }
    
    return NextResponse.json({
      invitations: invitationsWithUrls,
      in_couple: true,
      couple_id: coupleUserData.couple_id,
      is_full: isFull,
      isFullyConnected: isFull
    });
  } catch (error) {
    console.error('Error in direct-invite GET endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' }, 
      { status: 500 }
    );
  }
} 