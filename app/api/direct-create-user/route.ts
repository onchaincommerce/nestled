import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required userId field' },
        { status: 400 }
      );
    }
    
    console.log('Attempting to directly create user with ID:', userId);
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (existingUser) {
      console.log('User already exists:', existingUser);
      return NextResponse.json({ 
        message: 'User already exists',
        user: existingUser
      });
    }
    
    // Create the user
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        username: email ? email.split('@')[0] : `user_${userId.substring(0, 8)}`
      })
      .select();
    
    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: 'Failed to create user', details: error },
        { status: 500 }
      );
    }
    
    console.log('User created successfully:', data);
    
    return NextResponse.json({
      message: 'User created successfully',
      user: data[0]
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 