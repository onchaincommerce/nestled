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
  
  console.log('Initializing Supabase with service role for direct creation');
  
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

// Create a new couple and add the user to it
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
    const { passageId, userId, email, phone } = body;
    
    if (!passageId && !userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: passageId or userId' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceSupabase();
    
    // First ensure user exists in our database
    let dbUserId = userId;
    if (passageId && !userId) {
      // Check if user already exists with this passage ID
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id')
        .eq('passage_id', passageId)
        .single();
      
      if (!existingUserError && existingUser) {
        dbUserId = existingUser.id;
      } else {
        // Create user if they don't exist
        const { data: newUser, error: newUserError } = await supabase
          .from('users')
          .insert({
            id: crypto.randomUUID(),
            email: email || null,
            phone: phone || null,
            passage_id: passageId
          })
          .select()
          .single();
          
        if (newUserError) {
          return NextResponse.json(
            { error: 'Failed to create user', details: newUserError },
            { status: 500 }
          );
        }
        
        dbUserId = newUser.id;
      }
    }
    
    if (!dbUserId) {
      return NextResponse.json(
        { error: 'Could not determine user ID' },
        { status: 400 }
      );
    }
    
    // Check if user is already in a couple
    const { data: existingCouple, error: coupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (!coupleError && existingCouple) {
      // User already in a couple
      return NextResponse.json({
        success: true,
        couple_id: existingCouple.couple_id,
        user_id: dbUserId,
        message: 'User already in a couple'
      });
    }
    
    // Create a new couple
    const { data: newCouple, error: newCoupleError } = await supabase
      .from('couples')
      .insert({
        name: 'New Couple'
      })
      .select()
      .single();
      
    if (newCoupleError) {
      return NextResponse.json(
        { error: 'Failed to create couple', details: newCoupleError },
        { status: 500 }
      );
    }
    
    // Now add user to the couple directly using SQL to bypass RLS completely
    const { data: coupleUser, error: coupleUserError } = await supabase
      .rpc('create_couple_user_relation', {
        p_couple_id: newCouple.id,
        p_user_id: dbUserId
      });
      
    if (coupleUserError) {
      console.error('Error creating couple_user with RPC:', coupleUserError);
      
      // Try direct insert as fallback
      const { error: directError } = await supabase.from('couples_users').insert({
        couple_id: newCouple.id,
        user_id: dbUserId
      });
      
      if (directError) {
        return NextResponse.json(
          { error: 'Failed to add user to couple', details: directError },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      couple_id: newCouple.id,
      user_id: dbUserId,
      message: 'Created new couple and added user'
    });
  } catch (error) {
    console.error('Error in direct-create endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 