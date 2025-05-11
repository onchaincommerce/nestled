-- Create couple_invitations table
CREATE TABLE IF NOT EXISTS couple_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS to couple_invitations table
ALTER TABLE couple_invitations ENABLE ROW LEVEL SECURITY;

-- Create public function to get the user ID if not already created
CREATE OR REPLACE FUNCTION public.user_id() RETURNS TEXT AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'userId', '')::text;
$$ LANGUAGE sql STABLE;

-- RLS Policies for couple_invitations

-- Creators can view their own invitations
CREATE POLICY "Users can view invitations they created" ON couple_invitations
  FOR SELECT USING (
    created_by::text = public.user_id()
  );

-- Users can view invitations for couples they belong to
CREATE POLICY "Users can view invitations for their couples" ON couple_invitations
  FOR SELECT USING (
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id::text = public.user_id()
    )
  );

-- Create policy for redeeming invitations
CREATE POLICY "Users can redeem invitations" ON couple_invitations
  FOR UPDATE USING (true)
  WITH CHECK (true);
  
-- Add the passage_id and phone columns to the users table if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'passage_id'
  ) THEN
    ALTER TABLE users ADD COLUMN passage_id TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone TEXT UNIQUE;
  END IF;
END $$; 