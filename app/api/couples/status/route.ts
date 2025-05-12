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

// Check if a user is in a couple
export async function GET(request: NextRequest) {
  try {
    // Check if the user is authenticated with Passage
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult.isAuthorized || !authResult.userID) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      );
    }
    
    const userID = authResult.userID;
    const supabase = getSupabase();
    
    // Get user's UUID from Supabase (not Passage ID)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('passage_id', userID)
      .single();
      
    if (userError || !userData) {
      console.error('User not found in database:', userError);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    const dbUserId = userData.id;
    
    // Check if the user is in a couple
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId);
      
    if (coupleError) {
      console.error('Error checking couple status:', coupleError);
      return NextResponse.json(
        { error: 'Error checking couple status' },
        { status: 500 }
      );
    }
    
    // User is in a couple if there's at least one record
    const isInCouple = coupleData && coupleData.length > 0;
    
    // If the user is in a couple, check if the couple has two members
    let isFullyConnected = false;
    if (isInCouple) {
      const coupleId = coupleData[0].couple_id;
      
      // Count how many users are in this couple
      const { data: coupleMembers, error: memberCountError } = await supabase
        .from('couples_users')
        .select('user_id')
        .eq('couple_id', coupleId);
        
      if (!memberCountError && coupleMembers) {
        // A fully connected couple has two or more members
        isFullyConnected = coupleMembers.length >= 2;
      }
    }
    
    return NextResponse.json({
      isInCouple,
      isFullyConnected,
      coupleId: isInCouple ? coupleData[0].couple_id : null
    });
    
  } catch (error) {
    console.error('Error in couple status endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 