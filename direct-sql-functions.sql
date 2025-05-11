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

-- Function to create a couple_user relation safely
CREATE OR REPLACE FUNCTION create_couple_user_relation(p_couple_id UUID, p_user_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO couples_users (couple_id, user_id)
  VALUES (p_couple_id, p_user_id);
EXCEPTION
  WHEN unique_violation THEN
    -- Already exists, do nothing
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to create a couple for a user in one step
CREATE OR REPLACE FUNCTION create_couple_for_user(p_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, created_at TIMESTAMPTZ)
SECURITY DEFINER
AS $$
DECLARE
  v_couple_id UUID;
BEGIN
  -- Create the couple
  INSERT INTO couples (name, created_at, updated_at)
  VALUES ('New Couple', now(), now())
  RETURNING id INTO v_couple_id;
  
  -- Link the user to the couple
  INSERT INTO couples_users (couple_id, user_id)
  VALUES (v_couple_id, p_user_id);
  
  -- Return the couple info
  RETURN QUERY
  SELECT c.id, c.name, c.created_at
  FROM couples c
  WHERE c.id = v_couple_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a couple invitation completely bypassing RLS
CREATE OR REPLACE FUNCTION create_direct_invitation(
  p_code TEXT,
  p_couple_id UUID,
  p_created_by UUID,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(id UUID, code TEXT, couple_id UUID, created_at TIMESTAMPTZ)
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_id UUID;
BEGIN
  -- Insert the invitation
  INSERT INTO couple_invitations (code, couple_id, created_by, expires_at)
  VALUES (p_code, p_couple_id, p_created_by, p_expires_at)
  RETURNING id INTO v_invitation_id;
  
  -- Return the invitation details
  RETURN QUERY
  SELECT ci.id, ci.code, ci.couple_id, ci.created_at
  FROM couple_invitations ci
  WHERE ci.id = v_invitation_id;
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
GRANT EXECUTE ON FUNCTION create_couple_user_relation TO service_role;
GRANT EXECUTE ON FUNCTION create_couple_for_user TO service_role;
GRANT EXECUTE ON FUNCTION create_direct_invitation TO service_role;
GRANT EXECUTE ON FUNCTION create_couple_invitation TO service_role;
GRANT EXECUTE ON FUNCTION get_active_invitations TO service_role; 