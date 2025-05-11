-- Fix for infinite recursion in Row Level Security (RLS) policies for couples and couples_users tables

-- First, drop the problematic policies that are causing recursion
DROP POLICY IF EXISTS "Users can view their own couples" ON couples;
DROP POLICY IF EXISTS "Users can view their couples_users" ON couples_users;
DROP POLICY IF EXISTS "Users can create couples_users" ON couples_users;

-- Create service role bypass policies for admin access
CREATE POLICY "Service role can do anything with couples" ON couples
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do anything with couples_users" ON couples_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
  
-- Create policies for couples table
-- This avoids the recursion by using EXISTS instead of IN for the subquery
CREATE POLICY "Users can view their own couples fixed" ON couples
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM couples_users WHERE couple_id = couples.id AND user_id::text = public.user_id()
    )
  );

-- Create policies for couples_users table
-- Avoid calling back to couples table which would cause infinite recursion
CREATE POLICY "Users can view their couples_users fixed" ON couples_users
  FOR SELECT USING (
    user_id::text = public.user_id() OR
    EXISTS (
      SELECT 1 FROM couples_users cu WHERE 
        cu.couple_id = couples_users.couple_id AND 
        cu.user_id::text = public.user_id()
    )
  );

-- Add insert policy for couples_users
CREATE POLICY "Users can create couples_users fixed" ON couples_users
  FOR INSERT WITH CHECK (
    user_id::text = public.user_id() OR
    EXISTS (
      SELECT 1 FROM couples_users cu WHERE 
        cu.couple_id = couples_users.couple_id AND 
        cu.user_id::text = public.user_id()
    )
  );

-- Create policies for couple_invitations table if needed
DROP POLICY IF EXISTS "Users can view invitations for their couples" ON couple_invitations;

CREATE POLICY "Users can view invitations for their couples fixed" ON couple_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM couples_users 
      WHERE couple_id = couple_invitations.couple_id AND user_id::text = public.user_id()
    )
  );

-- Add anonymous access policies for testing purposes
CREATE POLICY "Allow anonymous operations on couple_invitations" ON couple_invitations
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true); 