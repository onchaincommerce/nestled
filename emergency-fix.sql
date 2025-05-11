-- EMERGENCY FIX: Temporarily disable RLS and create necessary records
-- This script should be run with admin privileges in Supabase SQL Editor

-- 1. Temporarily disable RLS on key tables
ALTER TABLE couples DISABLE ROW LEVEL SECURITY;
ALTER TABLE couples_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Get existing user ID from passage_id (assuming it exists)
-- Replace 'YOUR_PASSAGE_ID' with the actual Passage ID from the error logs
DO $$
DECLARE
  v_user_id UUID;
  v_couple_id UUID;
BEGIN
  -- Find existing user
  SELECT id INTO v_user_id FROM users WHERE passage_id = 'YOUR_PASSAGE_ID' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found, no action taken';
    RETURN;
  END IF;
  
  -- Create a new couple if needed
  INSERT INTO couples (name, created_at, updated_at)
  VALUES ('New Couple', now(), now())
  RETURNING id INTO v_couple_id;
  
  -- Link user to couple
  INSERT INTO couples_users (couple_id, user_id)
  VALUES (v_couple_id, v_user_id);
  
  RAISE NOTICE 'Created couple % and linked to user %', v_couple_id, v_user_id;
END
$$;

-- 3. Re-enable RLS on tables
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Create simplified RLS policies that won't cause recursion
-- First drop any existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own couples" ON couples;
DROP POLICY IF EXISTS "Users can view their couples_users" ON couples_users;
DROP POLICY IF EXISTS "Users can create couples_users" ON couples_users;

-- Create simple direct policies
CREATE POLICY "Service role can do anything with couples" ON couples
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their couples" ON couples
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM couples_users WHERE couples_users.couple_id = id AND couples_users.user_id = auth.user_id()
  ));

CREATE POLICY "Service role can do anything with couples_users" ON couples_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their couples_users" ON couples_users
  FOR SELECT
  USING (user_id = auth.user_id());

CREATE POLICY "Users can insert couples_users if they're in the couple" ON couples_users
  FOR INSERT
  WITH CHECK (user_id = auth.user_id()); 