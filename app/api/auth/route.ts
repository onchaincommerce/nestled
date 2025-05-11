import { NextRequest, NextResponse } from 'next/server';
import { getPassageUser } from '@/utils/passage';
import { getSupabaseWithUser, supabase } from '@/utils/supabase';

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request using Passage
    const passageData = await getPassageUser(req);
    
    if (!passageData.isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user ID from Passage
    const { userID, email } = passageData;
    
    if (!userID) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }
    
    // Check if user exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userID)
      .single();
    
    // If user doesn't exist, create them
    if (!existingUser) {
      await supabase.from('users').insert({
        id: userID,
        email: email,
      });
    }
    
    // Get a Supabase client with the user's JWT
    const authenticatedSupabase = getSupabaseWithUser(userID);
    
    // Get user data now that they are authenticated
    const { data: userData, error: userError } = await authenticatedSupabase
      .from('users')
      .select(`
        id, 
        email, 
        couples_users (
          couple_id,
          couples (
            id,
            name
          )
        )
      `)
      .eq('id', userID)
      .single();
    
    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Error fetching user data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      authenticated: true,
      user: userData,
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 