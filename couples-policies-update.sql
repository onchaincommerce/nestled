-- First, drop existing policies on couples tables
DROP POLICY IF EXISTS "Users can view their own couples" ON couples;
DROP POLICY IF EXISTS "Users can view their couples_users" ON couples_users;
DROP POLICY IF EXISTS "Users can create couples" ON couples;
DROP POLICY IF EXISTS "Users can create couples_users" ON couples_users;

-- Re-create policies for couples table
CREATE POLICY "Users can view their own couples" ON couples
  FOR SELECT USING (
    id IN (
      SELECT couple_id FROM couples_users WHERE user_id::text = public.user_id()
    )
  );

-- Add insert policy for couples
CREATE POLICY "Users can create couples" ON couples
  FOR INSERT WITH CHECK (true);  -- Allow any authenticated user to create a couple

-- Re-create policies for couples_users table
CREATE POLICY "Users can view their couples_users" ON couples_users
  FOR SELECT USING (
    user_id::text = public.user_id() OR 
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id::text = public.user_id()
    )
  );

-- Add insert policy for couples_users
CREATE POLICY "Users can create couples_users" ON couples_users
  FOR INSERT WITH CHECK (
    user_id::text = public.user_id() OR  -- User can add themselves
    couple_id IN (                        -- Or can add others to their couple
      SELECT couple_id FROM couples_users WHERE user_id::text = public.user_id()
    )
  );

-- Ensure we have a basic RLS policy that allows public insertion for testing
-- This is more permissive but helpful while building
CREATE POLICY "Allow anonymous operations on couples" ON couples
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous operations on couples_users" ON couples_users
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true); 