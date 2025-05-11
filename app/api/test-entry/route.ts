import { NextResponse } from 'next/server';
import { getSupabaseWithUser } from '@/utils/supabase';

export async function POST(request: Request) {
  try {
    const { userId, content, timestamp } = await request.json();
    
    if (!userId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get Supabase client with user credentials
    const supabase = getSupabaseWithUser(userId);
    
    // First ensure the user exists in our system
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    // If user doesn't exist yet, create them
    if (userCheckError) {
      const { error: createUserError } = await supabase
        .from('users')
        .insert({ id: userId });
      
      if (createUserError) {
        console.error('Error creating user:', createUserError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    }
    
    // Ensure there's a test_entries table
    // In a real app, you might create this in your migration scripts
    const { error: createTableError } = await supabase.rpc('create_test_entries_if_not_exists');
    
    if (createTableError) {
      console.error('Error ensuring test_entries table exists:', createTableError);
      // Try to continue anyway, as the table might already exist
    }
    
    // Insert the test entry
    const { data, error } = await supabase
      .from('test_entries')
      .insert({
        user_id: userId,
        content,
        created_at: timestamp
      })
      .select();
    
    if (error) {
      console.error('Error creating test entry:', error);
      return NextResponse.json(
        { error: 'Failed to create test entry' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Test entry created successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 