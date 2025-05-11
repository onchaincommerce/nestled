import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/passage';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Get authenticated Supabase client with Passage user ID
const getSupabaseWithUser = (userId: string) => {
  // Create and sign JWT for Supabase
  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
  };
  
  const token = jwt.sign(
    payload, 
    process.env.SUPABASE_JWT_SECRET || ''
  );
  
  // Create Supabase client with JWT in authorization header
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
  
  return supabase;
};

export async function POST(req: NextRequest) {
  try {
    console.log('Auth endpoint called with: ', req.url);
    
    // Authenticate the user with Passage
    const passageAuth = await getAuthenticatedUser(req);
    
    if (!passageAuth.isAuthorized || !passageAuth.userID) {
      console.error('User not authorized');
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      );
    }
    
    const userID = passageAuth.userID;
    console.log('User authorized with Passage ID:', userID);
    
    // Get Supabase client with the user's ID
    const supabase = getSupabaseWithUser(userID);
    
    // Check if user already exists in database
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', userID)
      .single();
    
    console.log('User check result:', { existingUser, userCheckError });
    
    // If user doesn't exist, create them
    if (!existingUser) {
      // Generate a username from userID since we don't have email access here
      const username = `user_${userID.substring(0, 8)}`;
      
      console.log('Creating new user with ID:', userID, 'and username:', username);
      
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: userID,
          username: username
        })
        .select();
      
      if (createUserError) {
        console.error('Error creating user:', createUserError);
        return NextResponse.json(
          { error: 'Failed to create user', details: createUserError },
          { status: 500 }
        );
      }
      
      console.log('User created successfully:', newUser);
      
      return NextResponse.json({
        message: 'User created successfully',
        user: newUser[0]
      });
    }
    
    console.log('User already exists:', existingUser);
    
    return NextResponse.json({
      message: 'User already exists',
      user: existingUser
    });
  } catch (error) {
    console.error('Error in auth endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
} 