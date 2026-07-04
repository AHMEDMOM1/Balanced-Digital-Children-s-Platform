-- Migration: PIN Authentication Schema (Spec 018)
-- Created: 2026-06-12
-- Idempotent: DROP IF EXISTS / CREATE OR REPLACE used throughout

-- ── realtime_commands: extend command_type CHECK ─────────────────────────────

ALTER TABLE realtime_commands
  DROP CONSTRAINT IF EXISTS realtime_commands_command_type_check;

ALTER TABLE realtime_commands
  ADD CONSTRAINT realtime_commands_command_type_check
  CHECK (command_type IN (
    'pause', 'resume', 'time_update', 'category_block', 'force_end', 'reset_child_pin'
  ));

-- ── dispatch_child_pin_reset ─────────────────────────────────────────────────
-- Callable by authenticated parent. Supersedes prior unacknowledged resets for
-- the same child so only the latest reset is ever pending (FR-011).

CREATE OR REPLACE FUNCTION dispatch_child_pin_reset(
  p_family_id  UUID,
  p_child_id   UUID,
  p_sender_id  UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_command_id UUID;
BEGIN
  -- Mark any prior unacknowledged resets for this child as superseded
  UPDATE realtime_commands
  SET    acknowledged_at = now(),
         payload         = payload || '{"superseded": true}'::jsonb
  WHERE  child_id        = p_child_id
    AND  command_type    = 'reset_child_pin'
    AND  acknowledged_at IS NULL;

  -- Insert new reset command
  INSERT INTO realtime_commands (family_id, sender_id, child_id, command_type, payload)
  VALUES (p_family_id, p_sender_id, p_child_id, 'reset_child_pin', '{}'::jsonb)
  RETURNING id INTO v_command_id;

  RETURN json_build_object('command_id', v_command_id::text);
END;
$$;

-- ── get_pending_pin_reset ─────────────────────────────────────────────────────
-- Callable with anon key (no auth session required — child headless device).

CREATE OR REPLACE FUNCTION get_pending_pin_reset(
  p_child_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row realtime_commands%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM   realtime_commands
  WHERE  child_id     = p_child_id
    AND  command_type = 'reset_child_pin'
    AND  acknowledged_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN json_build_object('pending', false);
  END IF;

  RETURN json_build_object('pending', true, 'command_id', v_row.id::text);
END;
$$;

-- ── acknowledge_pin_reset ─────────────────────────────────────────────────────
-- Callable with anon key. Validates child_id match to prevent spoofing.

CREATE OR REPLACE FUNCTION acknowledge_pin_reset(
  p_command_id UUID,
  p_child_id   UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated INT;
BEGIN
  UPDATE realtime_commands
  SET    acknowledged_at = now()
  WHERE  id        = p_command_id
    AND  child_id  = p_child_id
    AND  acknowledged_at IS NULL;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN json_build_object('success', false, 'error', 'command_not_found_or_already_acknowledged');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- ── update_parent_pin_hash ────────────────────────────────────────────────────
-- Callable by authenticated user after OTP verification. Updates both pin_hash
-- and unlock_pin_hash for backward compat with existing reset_parent_pin logic.

CREATE OR REPLACE FUNCTION update_parent_pin_hash(
  p_email    TEXT,
  p_new_hash TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET    pin_hash        = p_new_hash,
         unlock_pin_hash = p_new_hash
  WHERE  id = (
    SELECT id FROM auth.users WHERE email = p_email LIMIT 1
  )
  AND role = 'parent';
END;
$$;

-- ── GRANT anon access to child-callable RPCs ──────────────────────────────────

GRANT EXECUTE ON FUNCTION get_pending_pin_reset(UUID)        TO anon;
GRANT EXECUTE ON FUNCTION acknowledge_pin_reset(UUID, UUID)  TO anon;
