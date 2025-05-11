import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/utils/passage';

// Initialize Supabase client (anonymous for now)
const getSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
};

// Get all couples for a user
export async function GET(request: NextRequest) {
  try {
    // Check if the user is authenticated with Passage
    const { isAuthorized, userID } = await getAuthenticatedUser(request);
    
    if (!isAuthorized || !userID) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      );
    }
    
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
        { error: 'Error fetching couples' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      couples: couplesData.map(cu => cu.couples)
    });
  } catch (error) {
    console.error('Error in couples GET endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create a new couple or link to an existing one
export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, userID } = await getAuthenticatedUser(request);
    
    if (!isAuthorized || !userID) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action, coupleName, partnerId, partnerEmail, partnerPhone } = body;
    
    const supabase = getSupabase();
    
    // Get user's UUID from Supabase (not Passage ID)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, phone')
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
    
    // Check if the user is already in a couple
    const { data: existingCouple, error: existingCoupleError } = await supabase
      .from('couples_users')
      .select('couple_id')
      .eq('user_id', dbUserId)
      .single();
      
    if (existingCouple && !existingCoupleError) {
      console.log('User already in a couple:', existingCouple);
      return NextResponse.json(
        { error: 'User is already in a couple', coupleId: existingCouple.couple_id },
        { status: 400 }
      );
    }
    
    // Handle different actions
    switch (action) {
      case 'create': {
        // Create a new couple
        const { data: newCouple, error: createError } = await supabase
          .from('couples')
          .insert({ name: coupleName || 'New Couple' })
          .select()
          .single();
          
        if (createError || !newCouple) {
          console.error('Error creating couple:', createError);
          return NextResponse.json(
            { error: 'Error creating couple' },
            { status: 500 }
          );
        }
        
        // Link the user to the couple
        const { error: linkError } = await supabase
          .from('couples_users')
          .insert({
            couple_id: newCouple.id,
            user_id: dbUserId
          });
          
        if (linkError) {
          console.error('Error linking user to couple:', linkError);
          return NextResponse.json(
            { error: 'Error linking user to couple' },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          message: 'Successfully created couple',
          couple: newCouple
        });
      }
      
      case 'link': {
        // Find partner user based on provided info
        let partnerQuery = supabase.from('users').select('id');
        
        if (partnerId) {
          partnerQuery = partnerQuery.eq('id', partnerId);
        } else if (partnerEmail) {
          partnerQuery = partnerQuery.eq('email', partnerEmail);
        } else if (partnerPhone) {
          partnerQuery = partnerQuery.eq('phone', partnerPhone);
        } else {
          return NextResponse.json(
            { error: 'Must provide partnerId, partnerEmail, or partnerPhone' },
            { status: 400 }
          );
        }
        
        const { data: partnerData, error: partnerError } = await partnerQuery.single();
        
        if (partnerError || !partnerData) {
          console.error('Partner not found:', partnerError);
          return NextResponse.json(
            { error: 'Partner not found' },
            { status: 404 }
          );
        }
        
        // Check if partner is already in a couple
        const { data: partnerCouple, error: partnerCoupleError } = await supabase
          .from('couples_users')
          .select('couple_id')
          .eq('user_id', partnerData.id)
          .single();
          
        if (partnerCoupleError && partnerCoupleError.code !== 'PGRST116') { // Not found error is expected
          console.error('Error checking partner couple:', partnerCoupleError);
          return NextResponse.json(
            { error: 'Error checking partner couple' },
            { status: 500 }
          );
        }
        
        if (partnerCouple) {
          // If partner is already in a couple, add the current user to it
          const { error: joinError } = await supabase
            .from('couples_users')
            .insert({
              couple_id: partnerCouple.couple_id,
              user_id: dbUserId
            });
            
          if (joinError) {
            console.error('Error joining existing couple:', joinError);
            return NextResponse.json(
              { error: 'Error joining existing couple' },
              { status: 500 }
            );
          }
          
          return NextResponse.json({
            message: 'Successfully joined existing couple',
            coupleId: partnerCouple.couple_id
          });
        } else {
          // Neither user is in a couple, create a new one
          const { data: newCouple, error: createError } = await supabase
            .from('couples')
            .insert({ name: coupleName || 'New Couple' })
            .select()
            .single();
            
          if (createError || !newCouple) {
            console.error('Error creating couple:', createError);
            return NextResponse.json(
              { error: 'Error creating couple' },
              { status: 500 }
            );
          }
          
          // Link both users to the couple
          const { error: linkError } = await supabase
            .from('couples_users')
            .insert([
              {
                couple_id: newCouple.id,
                user_id: dbUserId
              },
              {
                couple_id: newCouple.id,
                user_id: partnerData.id
              }
            ]);
            
          if (linkError) {
            console.error('Error linking users to couple:', linkError);
            return NextResponse.json(
              { error: 'Error linking users to couple' },
              { status: 500 }
            );
          }
          
          return NextResponse.json({
            message: 'Successfully created and linked couple',
            couple: newCouple
          });
        }
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "create" or "link"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in couples POST endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 