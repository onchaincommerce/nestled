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
  
  console.log('Initializing Supabase with service role');
  
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

// API Key for simple auth - should match what you set in the frontend
const API_KEY = process.env.INVITE_API_KEY || 'nestled-temp-api-key-12345';

// Validate the API key from request headers
function validateApiKey(request: NextRequest): boolean {
  const authorization = request.headers.get('Authorization');
  const apiKey = authorization?.split(' ')[1];
  
  if (apiKey !== API_KEY) {
    console.error(`Invalid API key: got "${apiKey}" expected "${API_KEY}"`);
    return false;
  }
  
  return true;
}

// Get user ID from Passage ID
async function getUserIdFromPassageId(passageId: string) {
  const supabase = getServiceSupabase();
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('passage_id', passageId)
    .single();
    
  if (userError || !userData) {
    console.error('Error finding user by passage_id:', userError);
    return null;
  }
  
  return userData.id;
}

// Get a user's couple
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Get user ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const passageId = searchParams.get('passageId');
    
    if (!passageId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: passageId' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceSupabase();
    
    // First get the user's database ID using a direct SQL query to avoid RLS
    const { data: userResult, error: userError } = await supabase.rpc('get_user_by_passage_id', {
      p_passage_id: passageId
    });
    
    if (userError) {
      console.error('Error finding user:', userError);
      
      // Fallback to standard query if RPC fails
      const { data: userData, error: standardUserError } = await supabase
        .from('users')
        .select('id')
        .eq('passage_id', passageId)
        .single();
        
      if (standardUserError || !userData) {
        return NextResponse.json(
          { error: 'User not found', details: standardUserError || 'No data returned' },
          { status: 404 }
        );
      }
      
      const dbUserId = userData.id;
      
      // Get couples via direct query
      const { data: couplesData, error: couplesError } = await supabase
        .from('couples_users')
        .select('couple_id, couples:couple_id(id, name, created_at)')
        .eq('user_id', dbUserId);
        
      if (couplesError) {
        console.error('Error fetching couples:', couplesError);
        return NextResponse.json(
          { error: 'Error fetching couples', details: couplesError },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        couples: couplesData.map(cu => cu.couples)
      });
    }
    
    if (!userResult || !userResult.id) {
      return NextResponse.json(
        { error: 'User not found via RPC' },
        { status: 404 }
      );
    }
    
    const dbUserId = userResult.id;
    
    // Get couples via RPC
    const { data: couplesResult, error: couplesError } = await supabase.rpc('get_couples_for_user', {
      p_user_id: dbUserId
    });
    
    if (couplesError) {
      console.error('Error fetching couples via RPC:', couplesError);
      
      // Fallback to direct SQL
      const { data: couplesData, error: directError } = await supabase
        .from('couples_users')
        .select('couple_id, couples:couple_id(id, name, created_at)')
        .eq('user_id', dbUserId);
        
      if (directError) {
        return NextResponse.json(
          { error: 'Error fetching couples', details: directError },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        couples: couplesData.map(cu => cu.couples)
      });
    }
    
    return NextResponse.json({
      couples: couplesResult
    });
  } catch (error) {
    console.error('Error in auth-bypass GET endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create invitation bypassing RLS
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Get user ID and action from request body
    const body = await request.json();
    const { passageId, action } = body;
    
    if (!passageId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: passageId and action are required' },
        { status: 400 }
      );
    }
    
    const dbUserId = await getUserIdFromPassageId(passageId);
    if (!dbUserId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const supabase = getServiceSupabase();
    
    // Get the user's couple
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (coupleError || !coupleData) {
      console.error('Error finding couple:', coupleError);
      return NextResponse.json(
        { error: 'User is not part of any couple', details: coupleError },
        { status: 404 }
      );
    }
    
    const coupleId = coupleData.couple_id;
    
    switch (action) {
      case 'create_invitation': {
        // Generate a unique invitation code
        const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days
        
        // Insert the invitation directly with service role privileges
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
        
        return NextResponse.json({
          success: true,
          code: inviteCode,
          coupleId: coupleId,
          expiresAt: expiresAt.toISOString(),
          inviteUrl: `${request.nextUrl.origin}/invite/${inviteCode}`
        });
      }
        
      case 'get_invitations': {
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
        
        return NextResponse.json({
          success: true,
          invitations: (invitations || []).map((invite: any) => ({
            ...invite,
            inviteUrl: `${request.nextUrl.origin}/invite/${invite.code}`
          }))
        });
      }
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "create_invitation" or "get_invitations"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in auth-bypass POST endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 