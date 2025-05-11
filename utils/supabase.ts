import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcGZmZHhocW5hZ3dra21nc2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MjAwNjgsImV4cCI6MjA2MjQ5NjA2OH0.upq4aZXQOQq0zoObIT4e4kp7LjQUpvIbmOrJKyLiLFc';

// Create supabase client with anonymous key (for public access)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create supabase client with JWT for authenticated users
export const getSupabaseWithUser = (userId: string) => {
  if (!userId) return supabase;

  const options: { global?: { headers: { Authorization: string } } } = {};

  if (userId) {
    const payload = {
      userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
    };
    
    // Sign a JWT with the Supabase JWT secret to authenticate the user
    const token = jwt.sign(
      payload, 
      process.env.SUPABASE_JWT_SECRET || ''
    );

    // Add the JWT to the request headers
    options.global = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  // Create a new Supabase client with the authenticated JWT
  return createClient(supabaseUrl, supabaseAnonKey, options);
}; 