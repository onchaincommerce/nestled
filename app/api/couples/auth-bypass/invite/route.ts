import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client with admin/service role privileges
const getServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl) {
    throw new Error('supabaseUrl is required.');
  }
  
  if (!supabaseKey) {
    throw new Error('supabaseKey is required.');
  }
  
  console.log('Initializing Supabase with service role for invites');
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        // This explicitly disables RLS for service role
        'X-Supabase-Auth-Token': ''
      },
    },
  });
};

// API Key for simple auth
const API_KEY = process.env.INVITE_API_KEY || 'nestled-temp-api-key-12345';

// Validate the API key from request headers
function validateApiKey(request: NextRequest): boolean {
  const authorization = request.headers.get('Authorization');
  const apiKey = authorization?.split(' ')[1];
  
  if (apiKey !== API_KEY) {
    console.error('Invalid API key provided');
    return false;
  }
  
  return true;
}

// Helper to get user from passage_id
async function getUserByPassageId(passageId: string) {
  const supabase = getServiceSupabase();
  
  try {
    // First try RPC method that bypasses RLS
    const { data, error } = await supabase.rpc('get_user_by_passage_id', {
      p_passage_id: passageId
    });
    
    if (error) {
      console.error('Error in RPC get_user_by_passage_id:', error);
      
      // Fallback to direct query
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('passage_id', passageId)
        .single();
        
      if (userError) {
        console.error('Error finding user:', userError);
        return null;
      }
      
      return userData.id;
    }
    
    if (!data || data.length === 0) {
      console.error('No user found with passage ID:', passageId);
      return null;
    }
    
    return data[0].id;
  } catch (error) {
    console.error('Exception in getUserByPassageId:', error);
    return null;
  }
}

// Get active invitations for a user's couple
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Get passage ID from query params or body
    const searchParams = request.nextUrl.searchParams;
    const passageId = searchParams.get('passageId');
    
    if (!passageId) {
      return NextResponse.json(
        { error: 'Missing required parameter: passageId' },
        { status: 400 }
      );
    }
    
    // Get user's DB ID
    const dbUserId = await getUserByPassageId(passageId);
    
    if (!dbUserId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const supabase = getServiceSupabase();
    
    // Find couple ID for this user
    const { data: coupleUserData, error: coupleUserError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (coupleUserError) {
      console.error('Error finding couple:', coupleUserError);
      return NextResponse.json(
        { error: 'User is not part of any couple', details: coupleUserError },
        { status: 404 }
      );
    }
    
    const coupleId = coupleUserData.couple_id;
    
    // Get active invitations using the RPC function
    const { data: invitationsData, error: invitationsError } = await supabase.rpc(
      'get_active_invitations', 
      { p_couple_id: coupleId }
    );
    
    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      
      // Fallback to direct query
      const { data: directInvitations, error: directError } = await supabase
        .from('couple_invitations')
        .select('*')
        .eq('couple_id', coupleId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
        
      if (directError) {
        return NextResponse.json(
          { error: 'Error fetching invitations', details: directError },
          { status: 500 }
        );
      }
      
      // Process invitations to add URLs
      const invitationsWithUrls = directInvitations.map(invite => ({
        ...invite,
        inviteUrl: `/invite/${invite.code}`
      }));
      
      return NextResponse.json({
        invitations: invitationsWithUrls
      });
    }
    
    // Process invitations to add URLs
    const invitationsWithUrls = invitationsData.map((invite: any) => ({
      ...invite,
      inviteUrl: `/invite/${invite.code}`
    }));
    
    return NextResponse.json({
      invitations: invitationsWithUrls
    });
  } catch (error) {
    console.error('Error in invite GET endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create a new invitation code
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { passageId } = body;
    
    if (!passageId) {
      return NextResponse.json(
        { error: 'Missing required parameter: passageId' },
        { status: 400 }
      );
    }
    
    // Get user's DB ID
    const dbUserId = await getUserByPassageId(passageId);
    
    if (!dbUserId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const supabase = getServiceSupabase();
    
    // Find couple ID for this user
    const { data: coupleUserData, error: coupleUserError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (coupleUserError) {
      console.error('Error finding couple:', coupleUserError);
      return NextResponse.json(
        { error: 'User is not part of any couple', details: coupleUserError },
        { status: 404 }
      );
    }
    
    const coupleId = coupleUserData.couple_id;
    
    // Generate a new invitation code (6 characters)
    const code = crypto.randomBytes(3).toString('hex');
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create invitation using the RPC function
    const { data: inviteData, error: inviteError } = await supabase.rpc(
      'create_couple_invitation',
      {
        p_couple_id: coupleId,
        p_created_by: dbUserId,
        p_code: code,
        p_expires_at: expiresAt.toISOString()
      }
    );
    
    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      
      // Fallback to direct insert
      const { data: directInvite, error: directError } = await supabase
        .from('couple_invitations')
        .insert({
          code,
          couple_id: coupleId,
          created_by: dbUserId,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();
        
      if (directError) {
        return NextResponse.json(
          { error: 'Error creating invitation', details: directError },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        invitation: {
          ...directInvite,
          inviteUrl: `/invite/${directInvite.code}`
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      invitation: {
        ...inviteData,
        inviteUrl: `/invite/${inviteData.code}`
      }
    });
  } catch (error) {
    console.error('Error in invite POST endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 