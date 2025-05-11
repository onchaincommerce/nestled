import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/utils/passage';

export async function POST(request: Request) {
  try {
    // Try to authenticate via Passage first
    const { isAuthorized, userID } = await getAuthenticatedUser(request);
    let userId = userID;
    let email = null;
    let phone = null;
    
    // If Passage auth fails or to supplement with additional data, try request body
    const body = await request.json().catch(() => ({}));
    if (!userId) {
      userId = body.userId;
    }
    
    // Get email and phone if available
    email = body.email || null;
    phone = body.phone || null;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required userId field' },
        { status: 400 }
      );
    }
    
    console.log('Attempting to directly create user with ID:', userId);
    
    // Initialize Supabase client with anonymous credentials
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // Check if user already exists - by Passage ID first
    const { data: existingUserByPassageId, error: passageIdError } = await supabase
      .from('users')
      .select('id, email, username, passage_id, phone')
      .eq('passage_id', userId)
      .single();
      
    if (existingUserByPassageId) {
      console.log('User already exists by Passage ID:', existingUserByPassageId);
      return NextResponse.json({ 
        message: 'User already exists',
        user: existingUserByPassageId
      });
    }
    
    // Then try by UUID if it's a UUID format
    if (userId.length === 36 && userId.includes('-')) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, username, passage_id, phone')
        .eq('id', userId)
        .single();
        
      if (existingUser) {
        console.log('User already exists by UUID:', existingUser);
        return NextResponse.json({ 
          message: 'User already exists',
          user: existingUser
        });
      }
    }
    
    // Try an alternate approach: use direct SQL if we have service_role access
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        console.log('Attempting to use service_role key to bypass RLS');
        
        // Create a service_role client that bypasses RLS
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          serviceRoleKey
        );
        
        // Generate an appropriate UUID
        // Passage ID is not a UUID, so generate a UUID for the primary key
        const uuid = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        
        // Execute a direct SQL insert that bypasses RLS
        const { data: sqlData, error: sqlError } = await adminSupabase
          .rpc('insert_user_bypass_rls', { 
            user_id: uuid,
            user_username: `user_${uuid.substring(0, 8)}`,
            passage_user_id: userId,
            user_email: email,
            user_phone: phone,
            created_at_time: timestamp,
            updated_at_time: timestamp
          });
          
        if (!sqlError) {
          console.log('User created with SQL RPC function:', sqlData);
          
          // Fetch the newly created user
          const { data: newUser } = await adminSupabase
            .from('users')
            .select('id, email, username, passage_id, phone')
            .eq('id', uuid)
            .single();
            
          return NextResponse.json({
            message: 'User created successfully via SQL RPC',
            user: newUser
          });
        } else {
          console.error('Error with SQL RPC function:', sqlError);
        }
      }
    } catch (adminError) {
      console.error('Error with service_role approach:', adminError);
    }
    
    // Generate a valid UUID for the database primary key
    const idToUse = crypto.randomUUID();
    
    // Form the user data object with passage_id and phone
    const userData = {
      id: idToUse,
      username: `user_${idToUse.substring(0, 8)}`,
      passage_id: userId,  // Store original Passage ID
      email: email,
      phone: phone
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
          .select('id, email, username, passage_id, phone')
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