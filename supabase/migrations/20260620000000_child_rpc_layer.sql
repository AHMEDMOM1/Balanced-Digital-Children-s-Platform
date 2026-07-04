-- Migration: SECURITY DEFINER RPC layer for the headless child device.
--
-- The QR-paired child device has no Supabase auth session, ever (see
-- consume_pairing_token's dropped FK to auth.users in
-- 20260612000001_consume_pairing_token.sql). auth.uid() is therefore always
-- NULL for every request the child makes via the anon key, so no RLS policy
-- keyed on auth.uid() can ever pass for it. Every read/write the child
-- legitimately needs to persist goes through one of these anon-callable
-- functions instead, matching the existing consume_pairing_token pattern.

-- ── parent_settings ──────────────────────────────────────────────────────────
-- Defined in 20260609000000_full_schema_bootstrap.sql, but — same as the
-- `sessions` table before it (see 20260619000002_sessions_full_repair.sql) —
-- that migration was only partially applied to this project; this table was
-- never actually created. Self-contained here so this migration doesn't
-- depend on the bootstrap migration having fully run.

CREATE TABLE IF NOT EXISTS parent_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    daily_time_limit_minutes INTEGER DEFAULT 60,
    sessions_per_day INTEGER DEFAULT 3,
    stories_enabled BOOLEAN DEFAULT true,
    games_enabled BOOLEAN DEFAULT true,
    videos_enabled BOOLEAN DEFAULT true,
    creative_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(parent_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_settings_parent ON parent_settings(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_settings_child ON parent_settings(child_id);

ALTER TABLE parent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_settings_select ON parent_settings;
CREATE POLICY parent_settings_select ON parent_settings FOR SELECT
    USING (parent_id = auth.uid() OR child_id IN (
        SELECT id FROM profiles WHERE family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
    ));

DROP POLICY IF EXISTS parent_settings_insert ON parent_settings;
CREATE POLICY parent_settings_insert ON parent_settings FOR INSERT WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS parent_settings_update ON parent_settings;
CREATE POLICY parent_settings_update ON parent_settings FOR UPDATE USING (parent_id = auth.uid());

-- ── Sessions ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.child_open_session(
  p_child_id        UUID,
  p_family_id       UUID,
  p_activity_type   TEXT,
  p_content_item_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Expire any session this child left active (FR-009 — matches the
  -- pre-existing client-side behaviour in useSessionWriter.openSession)
  UPDATE sessions
  SET ended_at = now(), elapsed_seconds = 0, status = 'expired'
  WHERE child_id = p_child_id AND status = 'active';

  INSERT INTO sessions (child_id, family_id, activity_type, content_item_id, started_at, status)
  VALUES (p_child_id, p_family_id, p_activity_type, p_content_item_id, now(), 'active')
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.child_close_session(
  p_session_id      UUID,
  p_elapsed_seconds INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sessions
  SET ended_at = now(), elapsed_seconds = GREATEST(0, p_elapsed_seconds), status = 'completed'
  WHERE id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.child_recover_abandoned_sessions(
  p_child_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recovered INTEGER;
BEGIN
  WITH recovered AS (
    UPDATE sessions
    SET ended_at = started_at, elapsed_seconds = 0, status = 'expired'
    WHERE child_id = p_child_id AND status = 'active'
    RETURNING id
  )
  SELECT count(*) INTO v_recovered FROM recovered;

  RETURN v_recovered;
END;
$$;

-- ── Realtime command fetch/ack ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.child_fetch_unacked_commands(
  p_child_id  UUID,
  p_family_id UUID
) RETURNS SETOF realtime_commands
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM realtime_commands
  WHERE family_id = p_family_id
    AND acknowledged_at IS NULL
    AND (child_id IS NULL OR child_id = p_child_id)
  ORDER BY created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.child_ack_command(
  p_command_id UUID
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE realtime_commands SET acknowledged_at = now() WHERE id = p_command_id;
$$;

-- ── Child profile + per-child settings (self-read) ───────────────────────────

CREATE OR REPLACE FUNCTION public.get_child_profile(
  p_child_id UUID
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM profiles WHERE id = p_child_id AND role = 'child';
  IF v_row.id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;
  RETURN json_build_object(
    'found', true,
    'id', v_row.id,
    'full_name', v_row.full_name,
    'age_group', v_row.age_group,
    'avatar_color', v_row.avatar_color
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_child_settings(
  p_child_id UUID
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row parent_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM parent_settings WHERE child_id = p_child_id LIMIT 1;
  IF v_row.id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;
  RETURN json_build_object(
    'found', true,
    'daily_time_limit_minutes', v_row.daily_time_limit_minutes,
    'sessions_per_day', v_row.sessions_per_day,
    'stories_enabled', v_row.stories_enabled,
    'games_enabled', v_row.games_enabled,
    'videos_enabled', v_row.videos_enabled,
    'creative_enabled', v_row.creative_enabled
  );
END;
$$;

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.child_open_session(UUID, UUID, TEXT, UUID)        TO anon;
GRANT EXECUTE ON FUNCTION public.child_close_session(UUID, INTEGER)                TO anon;
GRANT EXECUTE ON FUNCTION public.child_recover_abandoned_sessions(UUID)            TO anon;
GRANT EXECUTE ON FUNCTION public.child_fetch_unacked_commands(UUID, UUID)          TO anon;
GRANT EXECUTE ON FUNCTION public.child_ack_command(UUID)                           TO anon;
GRANT EXECUTE ON FUNCTION public.get_child_profile(UUID)                          TO anon;
GRANT EXECUTE ON FUNCTION public.get_child_settings(UUID)                         TO anon;

NOTIFY pgrst, 'reload schema';
