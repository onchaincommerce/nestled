import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/utils/passage';

export async function POST(request: Request) {
  try {
    // Try to authenticate via Passage first
    const { isAuthorized, userID } = await getAuthenticatedUser(request);
    let userId = userID;
    
    // If Passage auth fails, try to get userId from request body
    if (!userId) {
      const { userId: bodyUserId, email, phone } = await request.json();
      userId = bodyUserId;
      
      if (!userId) {
        return NextResponse.json(
          { error: 'Missing required userId field' },
          { status: 400 }
        );
      }
    }
    
    console.log('Attempting to directly create user with ID:', userId);
    
    // Initialize Supabase client with anonymous credentials
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', userId)
      .single();
    
    if (existingUser) {
      console.log('User already exists:', existingUser);
      return NextResponse.json({ 
        message: 'User already exists',
        user: existingUser
      });
    }
    
    // Generate a valid UUID if the provided ID isn't already a UUID
    // Note that Passage IDs may not be valid UUIDs, which could cause insertion errors
    let idToUse = userId;
    try {
      // Simple validation: UUIDs should be 36 characters with dashes
      if (userId.length !== 36 || !userId.includes('-')) {
        console.log('Provided ID is not a valid UUID, using generated one instead');
        idToUse = crypto.randomUUID();
      }
    } catch (e) {
      console.log('Error validating UUID, using generated one instead');
      idToUse = crypto.randomUUID();
    }
    
    // Create the user
    console.log('Creating user with ID:', idToUse);
    
    // Form the user data object
    const userData = {
      id: idToUse,
      username: `user_${idToUse.substring(0, 8)}`
    };
    
    // Insert with error handling
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select();
    
    if (createError) {
      console.error('Error creating user:', createError);
      
      // If it's a duplicate key error, try to fetch the user again
      if (createError.code === '23505') {
        const { data: dupeUser } = await supabase
          .from('users')
          .select('id, email, username')
          .eq('id', idToUse)
          .single();
          
        if (dupeUser) {
          return NextResponse.json({
            message: 'User already exists (after failed insertion)',
            user: dupeUser
          });
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create user', 
          details: createError,
          attempted_data: userData
        },
        { status: 500 }
      );
    }
    
    console.log('User created successfully:', newUser);
    
    return NextResponse.json({
      message: 'User created successfully',
      user: newUser[0],
      original_passage_id: userId
    });
  } catch (error) {
    console.error('Error in direct-create-user endpoint:', error);
    return NextResponse.json(
      { 
        error: (error as Error).message || 'Unknown error',
        stack: (error as Error).stack
      },
      { status: 500 }
    );
  }
} 