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
    
    // If user is not in a couple, create one using raw SQL to bypass any RLS issues
    let coupleId: string;
    
    if (coupleError || !coupleData) {
      // Create a couple using raw SQL
      const { data: newCouple, error: createError } = await supabase
        .rpc('create_couple_for_user', {
          p_user_id: userId
        });
      
      if (createError || !newCouple) {
        console.error('Failed to create couple:', createError);
        return NextResponse.json(
          { error: 'Failed to create couple', details: createError }, 
          { status: 500 }
        );
      }
      
      coupleId = newCouple.id;
    } else {
      coupleId = coupleData.couple_id;
    }
    
    // 3. Create the invitation directly
    const finalCode = code || Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7)); // 7 days by default
    
    // Create invitation with raw SQL to avoid RLS
    const { data: invitation, error: inviteError } = await supabase
      .rpc('create_direct_invitation', {
        p_code: finalCode,
        p_couple_id: coupleId,
        p_created_by: userId,
        p_expires_at: expiresAt.toISOString()
      });
    
    if (inviteError) {
      console.error('Failed to create invitation:', inviteError);
      
      // Fallback to direct insert if RPC fails
      const { data: fallbackInvite, error: fallbackError } = await supabase
        .from('couple_invitations')
        .insert({
          code: finalCode,
          couple_id: coupleId,
          created_by: userId,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();
      
      if (fallbackError) {
        return NextResponse.json(
          { error: 'Failed to create invitation', details: fallbackError }, 
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        id: fallbackInvite.id,
        code: finalCode,
        couple_id: coupleId,
        expires_at: expiresAt.toISOString()
      });
    }
    
    return NextResponse.json({
      success: true,
      id: invitation?.id,
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