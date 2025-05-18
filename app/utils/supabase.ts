// Import Supabase client
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the URL and anon key
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Helper function to get a Supabase client with the user's UUID
export const getSupabaseWithUser = (passageId: string) => {
  // If we have a numeric passage ID, make sure to format it correctly
  const userId = passageId || '';

  // First, try to create client with service role (if running server-side)
  if (process.env.SUPABASE_SERVICE_KEY) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            // Include the user ID for server-side operations
            'x-passage-user-id': userId
          }
        }
      }
    );
  }

  // For client-side, use the anon key (limited permissions, uses RLS)
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          // Include the user ID for RLS policies
          'x-passage-user-id': userId
        }
      }
    }
  );
}; 