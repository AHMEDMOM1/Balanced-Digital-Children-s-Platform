-- Migration: consume_pairing_token RPCs for child device pairing
-- Spec: 017-child-qr-scan | Date: 2026-06-12

-- Allow headless child profiles: drop the FK that ties profiles.id to auth.users.id.
-- Parent profiles continue to be created via Supabase auth (they still have auth users).
-- Child profiles are created by consume_pairing_token with a free UUID (no auth user needed).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
-- Two SECURITY DEFINER functions callable via anon key.
-- Each atomically validates a token, creates a minimal child profile,
-- and marks the token consumed — no Supabase auth session required.

-- ── Function 1: QR code path (token UUID + family_id) ──────────────────────

CREATE OR REPLACE FUNCTION public.consume_pairing_token(
  p_token UUID,
  p_family_id UUID
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_row pairing_tokens%ROWTYPE;
  v_parent_id UUID;
  v_child_id  UUID;
BEGIN
  -- Atomic row lock: token must exist, belong to the right family, be unused, and not expired
  SELECT * INTO v_token_row
  FROM pairing_tokens
  WHERE token = p_token
    AND family_id = p_family_id
    AND used_at IS NULL
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_token');
  END IF;

  -- Find the parent profile for this family
  SELECT id INTO v_parent_id
  FROM profiles
  WHERE family_id = p_family_id AND role = 'parent'
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'parent_not_found');
  END IF;

  -- Create minimal child profile (no auth.users entry required — profiles.id has no FK to auth.users)
  v_child_id := gen_random_uuid();
  INSERT INTO profiles (id, role, parent_id, family_id, full_name, is_active)
  VALUES (v_child_id, 'child', v_parent_id, p_family_id, '', true);

  -- Mark token consumed — triggers Realtime CDC to parent dashboard
  UPDATE pairing_tokens
  SET used_at = NOW(), child_id = v_child_id
  WHERE id = v_token_row.id;

  RETURN json_build_object(
    'success', true,
    'child_id', v_child_id::text,
    'family_id', p_family_id::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_pairing_token(UUID, UUID) TO anon;

-- ── Function 2: Manual code path (6-digit code only, no family_id required) ─

CREATE OR REPLACE FUNCTION public.consume_pairing_token_by_code(
  p_manual_code TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_row pairing_tokens%ROWTYPE;
  v_parent_id UUID;
  v_child_id  UUID;
BEGIN
  -- Look up by manual_code globally within the active window (family_id derived from matched row)
  SELECT * INTO v_token_row
  FROM pairing_tokens
  WHERE manual_code = p_manual_code
    AND used_at IS NULL
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_token');
  END IF;

  -- Find the parent profile using the token's family_id
  SELECT id INTO v_parent_id
  FROM profiles
  WHERE family_id = v_token_row.family_id AND role = 'parent'
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'parent_not_found');
  END IF;

  v_child_id := gen_random_uuid();
  INSERT INTO profiles (id, role, parent_id, family_id, full_name, is_active)
  VALUES (v_child_id, 'child', v_parent_id, v_token_row.family_id, '', true);

  UPDATE pairing_tokens
  SET used_at = NOW(), child_id = v_child_id
  WHERE id = v_token_row.id;

  RETURN json_build_object(
    'success', true,
    'child_id', v_child_id::text,
    'family_id', v_token_row.family_id::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_pairing_token_by_code(TEXT) TO anon;

-- Enable Realtime CDC for pairing_tokens so parent dashboard receives live paired events
ALTER PUBLICATION supabase_realtime ADD TABLE pairing_tokens;
