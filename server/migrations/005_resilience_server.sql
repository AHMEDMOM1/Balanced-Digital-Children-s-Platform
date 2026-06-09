-- 005_resilience_server.sql
-- Phase 4: Resilience server-side requirements
-- Run in Supabase SQL Editor (Studio → SQL Editor → New query)

-- Enable pgcrypto for SHA-256 PIN hashing (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Resilience Events ──────────────────────────────────────────────────────
-- Mobile EventLogger flushes batches here every 5 min or 50 events.
CREATE TABLE IF NOT EXISTS resilience_events (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type   TEXT         NOT NULL,
    timestamp    TIMESTAMPTZ  NOT NULL,
    success      BOOLEAN      DEFAULT true,
    screen       TEXT,
    details      JSONB,
    created_at   TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resilience_events_type_ts
    ON resilience_events(event_type, timestamp DESC);

ALTER TABLE resilience_events ENABLE ROW LEVEL SECURITY;

-- Service role (used by Supabase client with service key) can write;
-- no user-facing reads needed for this telemetry table.
CREATE POLICY "service_manage_resilience_events" ON resilience_events
    FOR ALL
    USING (auth.role() = 'service_role');

-- ── Security Question Answer Hash ─────────────────────────────────────────
-- Enables verifySecurityQuestion() in pinRecoveryManager.ts.
-- Parents set their security answer during onboarding (future feature).
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS security_question_answer_hash TEXT;

-- ── Reset Parent PIN RPC ───────────────────────────────────────────────────
-- Called by pinRecoveryManager.resetPin() after email + security question verified.
-- Hashes the new PIN server-side with SHA-256 (matches app's hashPinSha256 function).
CREATE OR REPLACE FUNCTION reset_parent_pin(
    p_email  TEXT,
    p_new_pin TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pin_hash TEXT;
BEGIN
    -- SHA-256 hex: matches encode(digest(pin, 'sha256'), 'hex') = app's hashPinSha256
    v_pin_hash := encode(digest(p_new_pin, 'sha256'), 'hex');

    UPDATE profiles
    SET    unlock_pin_hash = v_pin_hash,
           updated_at      = now()
    WHERE  email = p_email
      AND  role  = 'parent';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent profile not found for email: %', p_email;
    END IF;
END;
$$;

-- ── Nightly Stats Aggregation (pg_cron) ───────────────────────────────────
-- Prerequisites:
--   1. Enable pg_cron in Supabase Dashboard → Database → Extensions
--   2. Run the SELECT cron.schedule(...) block below ONCE in the SQL editor.
--      (Do NOT include in repeated migration runs — cron.schedule is not idempotent)
--
-- SELECT cron.schedule(
--     'nightly-stats-aggregation',
--     '5 21 * * *',
--     $job$
--     DO $inner$
--     DECLARE r RECORD;
--     BEGIN
--         FOR r IN
--             SELECT id FROM profiles
--             WHERE role = 'child' AND is_active = true
--         LOOP
--             PERFORM aggregate_daily_stats(r.id, CURRENT_DATE);
--         END LOOP;
--     END;
--     $inner$;
--     $job$
-- );
--
-- Verify with: SELECT * FROM cron.job;
-- Runs at 21:05 UTC every night (= 00:05 AST next day).
