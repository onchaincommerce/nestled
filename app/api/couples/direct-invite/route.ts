import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client with admin privileges
const getAdminSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
};

// API Key for simple auth - should match what you set in the frontend
const API_KEY = process.env.INVITE_API_KEY || 'nestled-temp-api-key-12345';

// Create a direct invitation - bypasses Passage auth for testing
export async function POST(request: NextRequest) {
  try {
    // Check for basic API key auth
    const authorization = request.headers.get('Authorization');
    const apiKey = authorization?.split(' ')[1];
    
    if (apiKey !== API_KEY) {
      console.error(`Invalid API key: got "${apiKey}" expected "${API_KEY}"`);
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Get user ID from request body
    const body = await request.json();
    const { userId, coupleId } = body;
    
    if (!userId || !coupleId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and coupleId are required' },
        { status: 400 }
      );
    }
    
    console.log('Creating invitation for user:', userId, 'couple:', coupleId);
    
    const supabase = getAdminSupabase();
    
    // Find the user's Supabase UUID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('passage_id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('Error finding user:', userError);
      return NextResponse.json(
        { error: 'User not found', details: { userError, userId } },
        { status: 404 }
      );
    }
    
    const dbUserId = userData.id;
    console.log('Found user ID in database:', dbUserId);
    
    // Verify the couple exists
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .select('id')
      .eq('id', coupleId)
      .single();
    
    if (coupleError || !coupleData) {
      console.error('Error finding couple:', coupleError);
      return NextResponse.json(
        { error: 'Couple not found', details: coupleError },
        { status: 404 }
      );
    }
    
    // Check if the user belongs to the couple
    const { data: membershipData, error: membershipError } = await supabase
      .from('couples_users')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('user_id', dbUserId)
      .single();
    
    if (membershipError || !membershipData) {
      console.error('User is not a member of this couple:', membershipError);
      return NextResponse.json(
        { error: 'User is not a member of this couple' },
        { status: 403 }
      );
    }
    
    // Generate a unique invitation code
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days
    
    // Insert the invitation directly with admin privileges
    const { data: invitation, error: inviteError } = await supabase
      .from('couple_invitations')
      .insert({
        code: inviteCode,
        couple_id: coupleId,
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
    
    console.log('Invitation created successfully:', invitation);
    
    return NextResponse.json({
      code: inviteCode,
      coupleId: coupleId,
      expiresAt: expiresAt.toISOString(),
      inviteUrl: `${request.nextUrl.origin}/invite/${inviteCode}`
    });
  } catch (error) {
    console.error('Error in direct-invite endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get invitations for a couple directly
export async function GET(request: NextRequest) {
  try {
    // Check for basic API key auth
    const authorization = request.headers.get('Authorization');
    const apiKey = authorization?.split(' ')[1];
    
    if (apiKey !== API_KEY) {
      console.error(`Invalid API key: got "${apiKey}" expected "${API_KEY}"`);
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Get couple ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const coupleId = searchParams.get('coupleId');
    
    if (!coupleId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: coupleId' },
        { status: 400 }
      );
    }
    
    console.log('Getting invitations for couple:', coupleId);
    
    const supabase = getAdminSupabase();
    
    // Get all active invitations for this couple
    const now = new Date().toISOString();
    const { data: invitations, error: inviteError } = await supabase
      .from('couple_invitations')
      .select('*')
      .eq('couple_id', coupleId)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
      
    if (inviteError) {
      console.error('Error fetching invitations:', inviteError);
      return NextResponse.json(
        { error: 'Error fetching invitations', details: inviteError },
        { status: 500 }
      );
    }
    
    console.log('Found', invitations?.length || 0, 'invitations');
    
    return NextResponse.json({
      invitations: (invitations || []).map((invite: any) => ({
        ...invite,
        inviteUrl: `${request.nextUrl.origin}/invite/${invite.code}`
      }))
    });
  } catch (error) {
    console.error('Error in direct-invite GET endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 