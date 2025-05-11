-- Create couple_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS couple_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_couple_invitations_code ON couple_invitations(code);
CREATE INDEX IF NOT EXISTS idx_couple_invitations_couple_id ON couple_invitations(couple_id);

-- Add RLS policies (but with service role bypass)
ALTER TABLE couple_invitations ENABLE ROW LEVEL SECURITY;

-- Allow service role to do anything
CREATE POLICY IF NOT EXISTS "Service role can do anything with couple_invitations" ON couple_invitations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view invitations for their couples
CREATE POLICY IF NOT EXISTS "Users can view invitations for their couples" ON couple_invitations
  FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

-- Users can create invitations for their couples  
CREATE POLICY IF NOT EXISTS "Users can create invitations for their couples" ON couple_invitations
  FOR INSERT
  WITH CHECK (
    created_by = auth.user_id() AND
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  ); 