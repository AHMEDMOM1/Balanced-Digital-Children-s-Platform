-- Migration: Two-Device Schema (Phase 0)
-- Spec: 016-parent-qr-pairing
-- Created: 2026-06-11
-- Idempotent: all statements use IF NOT EXISTS / DROP IF EXISTS

-- ── pairing_tokens ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pairing_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL,
  token       UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  manual_code TEXT        NOT NULL DEFAULT LPAD(floor(random() * 1000000)::text, 6, '0'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  used_at     TIMESTAMPTZ,
  child_id    UUID        REFERENCES profiles(id)
);

-- ── device_registrations ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS device_registrations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id    UUID        NOT NULL,
  device_role  TEXT        NOT NULL CHECK (device_role IN ('parent', 'child')),
  device_token TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── profiles additions ───────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_length INT DEFAULT 6;

-- ── indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pairing_tokens_family_id
  ON pairing_tokens (family_id);

CREATE INDEX IF NOT EXISTS idx_pairing_tokens_token
  ON pairing_tokens (token);

CREATE INDEX IF NOT EXISTS idx_pairing_tokens_manual_code
  ON pairing_tokens (manual_code);

CREATE INDEX IF NOT EXISTS idx_device_registrations_family_id
  ON device_registrations (family_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE pairing_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;

-- pairing_tokens: parent read
DROP POLICY IF EXISTS parent_read_pairing_tokens ON pairing_tokens;
CREATE POLICY parent_read_pairing_tokens ON pairing_tokens
  FOR SELECT TO authenticated
  USING (
    family_id = (
      SELECT family_id FROM profiles
      WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- pairing_tokens: parent write
DROP POLICY IF EXISTS parent_write_pairing_tokens ON pairing_tokens;
CREATE POLICY parent_write_pairing_tokens ON pairing_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    family_id = (
      SELECT family_id FROM profiles
      WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- device_registrations: service role only (Phase 2 populates this)
DROP POLICY IF EXISTS service_write_device_registrations ON device_registrations;
CREATE POLICY service_write_device_registrations ON device_registrations
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
