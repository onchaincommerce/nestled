import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const getAdminSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
};

// API Key for simple auth - should match what you set in the frontend
const API_KEY = process.env.INVITE_API_KEY || 'nestled-temp-api-key-12345';

// Get all couples for a user directly
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
    
    // Get user ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const passageId = searchParams.get('passageId');
    
    if (!userId && !passageId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: userId or passageId' },
        { status: 400 }
      );
    }
    
    const supabase = getAdminSupabase();
    let dbUserId = userId;
    
    // If passageId is provided, get the Supabase UUID
    if (passageId && !userId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('passage_id', passageId)
        .single();
        
      if (userError || !userData) {
        console.error('Error finding user by passage_id:', userError);
        return NextResponse.json(
          { error: 'User not found', details: { userError, passageId } },
          { status: 404 }
        );
      }
      
      dbUserId = userData.id;
    }
    
    console.log('Getting couples for user:', dbUserId);
    
    // Get all couples for this user
    const { data: couplesData, error: couplesError } = await supabase
      .from('couples_users')
      .select(`
        couple_id,
        couples (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', dbUserId);
      
    if (couplesError) {
      console.error('Error fetching couples:', couplesError);
      return NextResponse.json(
        { error: 'Error fetching couples', details: couplesError },
        { status: 500 }
      );
    }
    
    console.log('Found', couplesData?.length || 0, 'couples');
    
    return NextResponse.json({
      couples: couplesData.map(cu => cu.couples)
    });
  } catch (error) {
    console.error('Error in direct couples GET endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 