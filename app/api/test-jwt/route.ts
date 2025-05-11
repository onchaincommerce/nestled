import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    // Get Supabase URL and anon key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing Supabase credentials' 
      }, { status: 500 });
    }
    
    // 1. Create a test user ID
    const testUserId = 'test_user_' + Date.now();
    
    // 2. Create JWT with the same structure as our getSupabaseWithUser function
    const payload = {
      userId: testUserId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    
    // 3. Sign the JWT with our secret
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing JWT secret' 
      }, { status: 500 });
    }
    
    const token = jwt.sign(payload, jwtSecret);
    
    // 4. Create a Supabase client with this JWT in the authorization header
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    
    // 5. Try to insert a record directly
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: `test_${testUserId}@example.com`
      })
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to insert test user', 
        error: error 
      });
    }
    
    // Then try to create a test entry to verify RLS
    const { data: entryData, error: entryError } = await supabase
      .from('test_entries')
      .insert({
        user_id: testUserId,
        content: 'Test entry from JWT test endpoint'
      })
      .select();
      
    return NextResponse.json({
      success: true,
      message: 'JWT test completed',
      userId: testUserId,
      userData: data,
      entryData: entryData,
      entryError: entryError
    });
  } catch (error) {
    console.error('Error in test-jwt endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Unknown error' 
    }, { status: 500 });
  }
} 