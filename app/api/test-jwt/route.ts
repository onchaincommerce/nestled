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
    
    // 1. Create a proper UUID test user ID instead of a string
    // This is important as the 'id' field in users is UUID type
    const testUserId = crypto.randomUUID();
    
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
    
    console.log('JWT Secret hash (for comparison):', require('crypto').createHash('sha256').update(jwtSecret).digest('hex').substring(0, 10));
    
    const token = jwt.sign(payload, jwtSecret);
    
    // 4. Create a Supabase client with this JWT in the authorization header
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    
    // First, try with anonymous client without JWT
    console.log('Attempting with anon client first (no JWT)');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: anonData, error: anonError } = await anonClient
      .from('users')
      .insert({
        id: testUserId,
        email: `test_${testUserId.substring(0, 8)}@example.com`,
        username: `test_${testUserId.substring(0, 8)}`
      })
      .select();
      
    if (anonError) {
      console.log('Anonymous insert failed:', anonError);
    } else {
      console.log('Anonymous insert succeeded!', anonData);
      return NextResponse.json({
        success: true,
        message: 'User created with anonymous client successfully',
        userId: testUserId,
        userData: anonData
      });
    }
    
    // 5. Try to insert a record directly with JWT
    console.log('Anonymous insert failed, trying with JWT auth');
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: `test_${testUserId.substring(0, 8)}@example.com`,
        username: `test_${testUserId.substring(0, 8)}`
      })
      .select();
    
    if (error) {
      console.error('Supabase JWT auth error:', error);
      // Check if the error is a duplicate key error
      if (error.code === '23505') {
        return NextResponse.json({ 
          success: false, 
          message: 'User already exists - duplicate key error', 
          error: error 
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to insert test user with JWT auth', 
        error: error,
        jwt_payload: payload,
        supabase_url: supabaseUrl
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'JWT test completed successfully',
      userId: testUserId,
      userData: data
    });
  } catch (error) {
    console.error('Error in test-jwt endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Unknown error',
      stack: (error as Error).stack
    }, { status: 500 });
  }
} 