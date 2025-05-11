-- Function to create an invitation code without relying on RLS
CREATE OR REPLACE FUNCTION create_invitation_code(p_couple_id UUID, p_user_id UUID)
RETURNS table (
  id UUID,
  code TEXT,
  couple_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  redeemed_by UUID,
  redeemed_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_result RECORD;
BEGIN
  -- Generate a unique 6-character invitation code
  v_code := UPPER(encode(gen_random_bytes(3), 'hex'));
  
  -- Set expiration date (7 days from now)
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Check if the user belongs to the couple
  IF NOT EXISTS (
    SELECT 1 FROM couples_users 
    WHERE couple_id = p_couple_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User does not belong to this couple';
  END IF;
  
  -- Insert the invitation
  INSERT INTO couple_invitations (
    code, 
    couple_id, 
    created_by, 
    expires_at
  ) 
  VALUES (
    v_code, 
    p_couple_id, 
    p_user_id, 
    v_expires_at
  )
  RETURNING * INTO v_result;
  
  -- Return the result
  RETURN QUERY SELECT 
    v_result.id,
    v_result.code,
    v_result.couple_id,
    v_result.created_by,
    v_result.created_at,
    v_result.expires_at,
    v_result.redeemed_by,
    v_result.redeemed_at;
END;
$$;

-- Function to get invitations for a couple without relying on RLS
CREATE OR REPLACE FUNCTION get_couple_invitations(p_couple_id UUID)
RETURNS table (
  id UUID,
  code TEXT,
  couple_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  redeemed_by UUID,
  redeemed_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ci.id,
    ci.code,
    ci.couple_id,
    ci.created_by,
    ci.created_at,
    ci.expires_at,
    ci.redeemed_by,
    ci.redeemed_at
  FROM 
    couple_invitations ci
  WHERE 
    ci.couple_id = p_couple_id
    AND ci.expires_at > NOW()
  ORDER BY 
    ci.created_at DESC;
END;
$$;

-- Function to redeem an invitation without relying on RLS
CREATE OR REPLACE FUNCTION redeem_invitation_code(p_code TEXT, p_user_id UUID)
RETURNS table (
  success BOOLEAN,
  couple_id UUID,
  message TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitation RECORD;
  v_is_already_in_couple BOOLEAN;
BEGIN
  -- Check if the user is already in a couple
  SELECT EXISTS (
    SELECT 1 FROM couples_users WHERE user_id = p_user_id
  ) INTO v_is_already_in_couple;
  
  IF v_is_already_in_couple THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'User is already in a couple';
    RETURN;
  END IF;
  
  -- Get the invitation
  SELECT * INTO v_invitation 
  FROM couple_invitations 
  WHERE code = UPPER(p_code) 
    AND expires_at > NOW()
    AND redeemed_at IS NULL;
  
  IF v_invitation IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invitation code';
    RETURN;
  END IF;
  
  -- Prevent joining your own invitation
  IF v_invitation.created_by = p_user_id THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'You cannot join your own invitation';
    RETURN;
  END IF;
  
  -- Add the user to the couple
  INSERT INTO couples_users (couple_id, user_id)
  VALUES (v_invitation.couple_id, p_user_id);
  
  -- Mark the invitation as used
  UPDATE couple_invitations
  SET redeemed_by = p_user_id, redeemed_at = NOW()
  WHERE id = v_invitation.id;
  
  -- Return success
  RETURN QUERY SELECT TRUE, v_invitation.couple_id, 'Successfully joined couple';
END;
$$; 