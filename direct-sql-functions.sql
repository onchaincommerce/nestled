-- Create functions that bypass RLS for service role access

-- Function to get user by passage_id
CREATE OR REPLACE FUNCTION get_user_by_passage_id(p_passage_id TEXT)
RETURNS TABLE(id UUID, email TEXT, passage_id TEXT)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.passage_id 
  FROM users u 
  WHERE u.passage_id = p_passage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get couples for a user, bypass RLS completely
CREATE OR REPLACE FUNCTION get_couples_for_user(p_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, created_at TIMESTAMPTZ)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.created_at
  FROM couples c
  JOIN couples_users cu ON c.id = cu.couple_id
  WHERE cu.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a couple invitation, bypass RLS
CREATE OR REPLACE FUNCTION create_couple_invitation(
  p_couple_id UUID,
  p_created_by UUID,
  p_code TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(id UUID, code TEXT, couple_id UUID, created_by UUID, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
SECURITY DEFINER
AS $$
DECLARE
  v_invite_id UUID;
BEGIN
  INSERT INTO couple_invitations (code, couple_id, created_by, expires_at)
  VALUES (p_code, p_couple_id, p_created_by, p_expires_at)
  RETURNING id INTO v_invite_id;
  
  RETURN QUERY
  SELECT ci.id, ci.code, ci.couple_id, ci.created_by, ci.expires_at, ci.created_at
  FROM couple_invitations ci
  WHERE ci.id = v_invite_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all active invitations for a couple
CREATE OR REPLACE FUNCTION get_active_invitations(p_couple_id UUID)
RETURNS TABLE(id UUID, code TEXT, couple_id UUID, created_by UUID, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ci.id, ci.code, ci.couple_id, ci.created_by, ci.expires_at, ci.created_at
  FROM couple_invitations ci
  WHERE ci.couple_id = p_couple_id
  AND ci.expires_at > now()
  ORDER BY ci.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permissions to the service role
GRANT EXECUTE ON FUNCTION get_user_by_passage_id TO service_role;
GRANT EXECUTE ON FUNCTION get_couples_for_user TO service_role;
GRANT EXECUTE ON FUNCTION create_couple_invitation TO service_role;
GRANT EXECUTE ON FUNCTION get_active_invitations TO service_role; 