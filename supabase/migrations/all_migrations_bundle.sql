-- 20260609000000_full_schema_bootstrap.sql
-- ============================================================
-- Full Schema Bootstrap
-- Balanced Digital Children's Platform
-- Combines migrations 001–007 + content schema v1
-- All statements are idempotent (IF NOT EXISTS / CREATE OR REPLACE)
-- Paste the entire file into Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 001: Core tables
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
    parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    family_id UUID NOT NULL DEFAULT gen_random_uuid(),
    email TEXT,
    full_name TEXT NOT NULL,
    age_group TEXT CHECK (age_group IN ('2-4', '5-7', '8-10')),
    unlock_pin_hash TEXT,
    is_active BOOLEAN DEFAULT true,
    avatar_color TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- If profiles already existed without these columns, add them now
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT gen_random_uuid();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unlock_pin_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('story', 'game', 'video', 'creative')),
    category TEXT NOT NULL,
    description TEXT,
    min_age INTEGER DEFAULT 0,
    max_age INTEGER DEFAULT 99,
    url TEXT,
    thumbnail_url TEXT,
    content_data JSONB,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- If content_items already existed without these columns, add them now
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS min_age INTEGER DEFAULT 0;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS max_age INTEGER DEFAULT 99;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS content_data JSONB;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(type);
CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_items_age_range ON content_items(min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_content_items_active ON content_items(is_active);

CREATE TABLE IF NOT EXISTS category_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    is_allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(parent_id, child_id, category)
);

CREATE INDEX IF NOT EXISTS idx_category_prefs_child ON category_preferences(child_id);
CREATE INDEX IF NOT EXISTS idx_category_prefs_parent ON category_preferences(parent_id);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES profiles(id),
    activity_type TEXT NOT NULL,
    content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    elapsed_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_child_id ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_child ON activity_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

CREATE TABLE IF NOT EXISTS family_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_codes_code ON family_codes(code);
CREATE INDEX IF NOT EXISTS idx_family_codes_family ON family_codes(family_id);

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

-- ──────────────────────────────────────────────────────────
-- 002: RLS policies
-- ──────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_parent_select ON profiles;
CREATE POLICY profiles_parent_select ON profiles FOR SELECT
    USING (auth.uid() = id OR family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS profiles_parent_insert ON profiles;
CREATE POLICY profiles_parent_insert ON profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS profiles_parent_update ON profiles;
CREATE POLICY profiles_parent_update ON profiles FOR UPDATE
    USING (auth.uid() = id OR family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS profiles_parent_delete ON profiles;
CREATE POLICY profiles_parent_delete ON profiles FOR DELETE USING (auth.uid() = id);

DROP POLICY IF EXISTS content_items_select ON content_items;
CREATE POLICY content_items_select ON content_items FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS content_items_insert ON content_items;
CREATE POLICY content_items_insert ON content_items FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS content_items_update ON content_items;
CREATE POLICY content_items_update ON content_items FOR UPDATE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS content_items_delete ON content_items;
CREATE POLICY content_items_delete ON content_items FOR DELETE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS category_prefs_parent_select ON category_preferences;
CREATE POLICY category_prefs_parent_select ON category_preferences FOR SELECT
    USING (parent_id IN (SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent') OR child_id = auth.uid());

DROP POLICY IF EXISTS category_prefs_parent_insert ON category_preferences;
CREATE POLICY category_prefs_parent_insert ON category_preferences FOR INSERT
    WITH CHECK (parent_id IN (SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent'));

DROP POLICY IF EXISTS category_prefs_parent_update ON category_preferences;
CREATE POLICY category_prefs_parent_update ON category_preferences FOR UPDATE
    USING (parent_id IN (SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent'));

DROP POLICY IF EXISTS category_prefs_parent_delete ON category_preferences;
CREATE POLICY category_prefs_parent_delete ON category_preferences FOR DELETE
    USING (parent_id IN (SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent'));

DROP POLICY IF EXISTS sessions_child_select ON sessions;
CREATE POLICY sessions_child_select ON sessions FOR SELECT
    USING (child_id = auth.uid() OR parent_id = auth.uid());

DROP POLICY IF EXISTS sessions_child_insert ON sessions;
CREATE POLICY sessions_child_insert ON sessions FOR INSERT
    WITH CHECK (child_id = auth.uid() OR parent_id = auth.uid());

DROP POLICY IF EXISTS sessions_child_update ON sessions;
CREATE POLICY sessions_child_update ON sessions FOR UPDATE
    USING (child_id = auth.uid() OR parent_id = auth.uid());

DROP POLICY IF EXISTS activity_logs_select ON activity_logs;
CREATE POLICY activity_logs_select ON activity_logs FOR SELECT
    USING (child_id = auth.uid() OR child_id IN (
        SELECT id FROM profiles WHERE family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
    ));

DROP POLICY IF EXISTS activity_logs_insert ON activity_logs;
CREATE POLICY activity_logs_insert ON activity_logs FOR INSERT WITH CHECK (child_id = auth.uid());

DROP POLICY IF EXISTS family_codes_select ON family_codes;
CREATE POLICY family_codes_select ON family_codes FOR SELECT
    USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS family_codes_insert ON family_codes;
CREATE POLICY family_codes_insert ON family_codes FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS family_codes_update ON family_codes;
CREATE POLICY family_codes_update ON family_codes FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS parent_settings_select ON parent_settings;
CREATE POLICY parent_settings_select ON parent_settings FOR SELECT
    USING (parent_id = auth.uid() OR child_id IN (
        SELECT id FROM profiles WHERE family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
    ));

DROP POLICY IF EXISTS parent_settings_insert ON parent_settings;
CREATE POLICY parent_settings_insert ON parent_settings FOR INSERT WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS parent_settings_update ON parent_settings;
CREATE POLICY parent_settings_update ON parent_settings FOR UPDATE USING (parent_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_user_family_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT family_id FROM profiles WHERE id = auth.uid();
$$;

-- ──────────────────────────────────────────────────────────
-- 003: Reports tables (daily_stats)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_seconds INTEGER DEFAULT 0,
    stories_seconds INTEGER DEFAULT 0,
    games_seconds INTEGER DEFAULT 0,
    videos_seconds INTEGER DEFAULT 0,
    creative_seconds INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    top_activity TEXT,
    timezone_offset_minutes INTEGER DEFAULT 0,
    is_finalized BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(child_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_child_date ON daily_stats(child_id, stat_date DESC);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_read_daily_stats" ON daily_stats;
CREATE POLICY "parent_read_daily_stats" ON daily_stats FOR SELECT
    USING (child_id IN (SELECT id FROM profiles WHERE parent_id = auth.uid() AND role = 'child'));

DROP POLICY IF EXISTS "service_write_daily_stats" ON daily_stats;
CREATE POLICY "service_write_daily_stats" ON daily_stats FOR ALL
    USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS cron_job_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    started_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    child_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION aggregate_daily_stats(p_child_id UUID, p_day DATE)
RETURNS void AS $$
DECLARE
    v_total_seconds     INTEGER := 0;
    v_stories_seconds   INTEGER := 0;
    v_games_seconds     INTEGER := 0;
    v_videos_seconds    INTEGER := 0;
    v_creative_seconds  INTEGER := 0;
    v_session_count     INTEGER := 0;
    v_top_activity      TEXT;
    v_log_id            UUID;
BEGIN
    INSERT INTO cron_job_log (job_name, status, started_at, child_id)
    VALUES ('aggregate_daily_stats', 'running', now(), p_child_id)
    RETURNING id INTO v_log_id;

    BEGIN
        SELECT
            COALESCE(SUM(elapsed_seconds), 0),
            COALESCE(SUM(CASE WHEN activity_type = 'story'    THEN elapsed_seconds ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN activity_type = 'game'     THEN elapsed_seconds ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN activity_type = 'video'    THEN elapsed_seconds ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN activity_type = 'creative' THEN elapsed_seconds ELSE 0 END), 0),
            COUNT(*)
        INTO v_total_seconds, v_stories_seconds, v_games_seconds,
             v_videos_seconds, v_creative_seconds, v_session_count
        FROM sessions s
        CROSS JOIN LATERAL (
            SELECT COALESCE(p.timezone_offset_minutes, 0) AS tz_offset
            FROM profiles p WHERE p.id = p_child_id
        ) tz
        WHERE s.child_id = p_child_id
          AND DATE(s.started_at AT TIME ZONE 'UTC' AT TIME ZONE (interval '1 minute' * tz.tz_offset)) = p_day
          AND s.status IN ('completed', 'paused');
    EXCEPTION WHEN OTHERS THEN
        UPDATE cron_job_log SET status = 'failed', finished_at = now(), error_message = SQLERRM WHERE id = v_log_id;
        RAISE;
    END;

    BEGIN
        SELECT ci.title INTO v_top_activity
        FROM sessions s
        JOIN content_items ci ON s.content_item_id = ci.id
        CROSS JOIN LATERAL (
            SELECT COALESCE(p.timezone_offset_minutes, 0) AS tz_offset
            FROM profiles p WHERE p.id = p_child_id
        ) tz
        WHERE s.child_id = p_child_id
          AND DATE(s.started_at AT TIME ZONE 'UTC' AT TIME ZONE (interval '1 minute' * tz.tz_offset)) = p_day
          AND s.status IN ('completed', 'paused')
        GROUP BY ci.title ORDER BY SUM(s.elapsed_seconds) DESC LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_top_activity := NULL;
    END;

    BEGIN
        INSERT INTO daily_stats (
            child_id, stat_date, total_seconds, stories_seconds, games_seconds,
            videos_seconds, creative_seconds, session_count, top_activity, is_finalized
        ) VALUES (
            p_child_id, p_day, v_total_seconds, v_stories_seconds, v_games_seconds,
            v_videos_seconds, v_creative_seconds, v_session_count, v_top_activity,
            (p_day < CURRENT_DATE)
        )
        ON CONFLICT (child_id, stat_date) DO UPDATE SET
            total_seconds    = EXCLUDED.total_seconds,
            stories_seconds  = EXCLUDED.stories_seconds,
            games_seconds    = EXCLUDED.games_seconds,
            videos_seconds   = EXCLUDED.videos_seconds,
            creative_seconds = EXCLUDED.creative_seconds,
            session_count    = EXCLUDED.session_count,
            top_activity     = EXCLUDED.top_activity,
            is_finalized     = EXCLUDED.is_finalized,
            updated_at       = now();
    EXCEPTION WHEN OTHERS THEN
        UPDATE cron_job_log SET status = 'failed', finished_at = now(), error_message = SQLERRM WHERE id = v_log_id;
        RAISE;
    END;

    UPDATE cron_job_log SET status = 'success', finished_at = now() WHERE id = v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────
-- 005: Resilience (pgcrypto + security question column + reset_parent_pin RPC)
-- ──────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

DROP POLICY IF EXISTS "service_manage_resilience_events" ON resilience_events;
CREATE POLICY "service_manage_resilience_events" ON resilience_events FOR ALL
    USING (auth.role() = 'service_role');

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS security_question_answer_hash TEXT;

CREATE OR REPLACE FUNCTION reset_parent_pin(p_email TEXT, p_new_pin TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE profiles
    SET unlock_pin_hash = encode(digest(p_new_pin, 'sha256'), 'hex'), updated_at = now()
    WHERE email = p_email AND role = 'parent';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent profile not found for email: %', p_email;
    END IF;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- 006: Realtime commands
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS realtime_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    child_id UUID,
    command_type TEXT NOT NULL CHECK (command_type IN ('pause', 'resume', 'time_update', 'category_block', 'force_end')),
    payload JSONB DEFAULT '{}',
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE realtime_commands ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_realtime_commands_child_unacked
    ON realtime_commands(family_id, child_id, acknowledged_at)
    WHERE acknowledged_at IS NULL;

DROP POLICY IF EXISTS "Parents can create commands" ON realtime_commands;
CREATE POLICY "Parents can create commands" ON realtime_commands FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Children can read their commands" ON realtime_commands;
CREATE POLICY "Children can read their commands" ON realtime_commands FOR SELECT
    USING (child_id = auth.uid() OR (child_id IS NULL AND family_id IN (
        SELECT parent_id FROM profiles WHERE id = auth.uid()
    )));

DROP POLICY IF EXISTS "Parents can read own commands" ON realtime_commands;
CREATE POLICY "Parents can read own commands" ON realtime_commands FOR SELECT USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Children can acknowledge commands" ON realtime_commands;
CREATE POLICY "Children can acknowledge commands" ON realtime_commands FOR UPDATE
    USING (child_id = auth.uid() OR (child_id IS NULL AND family_id IN (
        SELECT parent_id FROM profiles WHERE id = auth.uid()
    )))
    WITH CHECK (child_id = auth.uid() OR (child_id IS NULL AND family_id IN (
        SELECT parent_id FROM profiles WHERE id = auth.uid()
    )));

-- ──────────────────────────────────────────────────────────
-- 009: Content Schema v1
-- Augments content_items with 5 type-specific nullable columns.
-- Creates categories lookup table. Adds RLS policies.
-- ──────────────────────────────────────────────────────────

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS duration_seconds  integer,
  ADD COLUMN IF NOT EXISTS content_text      text,
  ADD COLUMN IF NOT EXISTS assets_url        text,
  ADD COLUMN IF NOT EXISTS game_type         text,
  ADD COLUMN IF NOT EXISTS config_json       jsonb,
  ADD COLUMN IF NOT EXISTS sort_order        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_images      text[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS categories (
    id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name        text        NOT NULL UNIQUE,
    icon_url    text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_content_items" ON content_items;
DROP POLICY IF EXISTS "service_role_all_content_items"   ON content_items;
DROP POLICY IF EXISTS "service_write_content_items"      ON content_items;
CREATE POLICY "authenticated_read_content_items" ON content_items FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "service_write_content_items" ON content_items FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "authenticated_read_categories" ON categories;
DROP POLICY IF EXISTS "service_role_all_categories"   ON categories;
DROP POLICY IF EXISTS "service_write_categories"      ON categories;
CREATE POLICY "authenticated_read_categories" ON categories FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "service_write_categories" ON categories FOR ALL
    USING (auth.role() = 'service_role');


-- 20260610000000_content_schema_only.sql
-- ============================================================
-- Content Schema v1 — Minimal Migration
-- Only creates/augments the tables needed for feature 009.
-- Safe to run on any existing Supabase project.
-- ============================================================

-- Step 1: Create content_items if it doesn't exist yet
CREATE TABLE IF NOT EXISTS content_items (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title         text        NOT NULL,
    type          text        NOT NULL,
    category      text,
    min_age       integer     DEFAULT 0,
    max_age       integer     DEFAULT 99,
    url           text,
    thumbnail_url text,
    is_active     boolean     DEFAULT true,
    created_at    timestamptz DEFAULT now()
);

-- Step 2: Add the 5 new type-specific columns (idempotent)
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS content_text     text;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS assets_url       text;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS game_type        text;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS config_json      jsonb;

-- Step 3: Create categories lookup table
CREATE TABLE IF NOT EXISTS categories (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL UNIQUE,
    icon_url   text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 4: Enable RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS policies for content_items
DROP POLICY IF EXISTS "authenticated_read_content_items" ON content_items;
DROP POLICY IF EXISTS "service_role_all_content_items"   ON content_items;
DROP POLICY IF EXISTS "service_write_content_items"      ON content_items;
DROP POLICY IF EXISTS content_items_select               ON content_items;
DROP POLICY IF EXISTS content_items_insert               ON content_items;
DROP POLICY IF EXISTS content_items_update               ON content_items;
DROP POLICY IF EXISTS content_items_delete               ON content_items;

CREATE POLICY "authenticated_read_content_items"
    ON content_items FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "service_write_content_items"
    ON content_items FOR ALL
    USING (auth.role() = 'service_role');

-- Step 6: RLS policies for categories
DROP POLICY IF EXISTS "authenticated_read_categories" ON categories;
DROP POLICY IF EXISTS "service_role_all_categories"   ON categories;
DROP POLICY IF EXISTS "service_write_categories"      ON categories;

CREATE POLICY "authenticated_read_categories"
    ON categories FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "service_write_categories"
    ON categories FOR ALL
    USING (auth.role() = 'service_role');


-- 20260610000001_content_schema_v1.sql
-- ============================================================
-- Migration: Content Schema v1
-- Feature: 009-content-schema-storage
-- Date: 2026-06-10
-- ============================================================
-- Augments the existing content_items table with nullable
-- type-specific columns. Creates a new categories lookup table.
-- Enables RLS on both tables with authenticated-read policies.
-- ============================================================

-- -----------------------------------------------------------
-- STEP 1: Add new columns to content_items
-- All columns are nullable so existing rows are unaffected.
-- -----------------------------------------------------------

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS duration_seconds  integer,
  ADD COLUMN IF NOT EXISTS content_text      text,
  ADD COLUMN IF NOT EXISTS assets_url        text,
  ADD COLUMN IF NOT EXISTS game_type         text,
  ADD COLUMN IF NOT EXISTS config_json       jsonb;

-- -----------------------------------------------------------
-- STEP 2: Create categories lookup table
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL UNIQUE,
  icon_url    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- STEP 3: RLS — content_items
-- (Table was already created; enable RLS if not yet enabled)
-- -----------------------------------------------------------

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "authenticated_read_content_items" ON content_items;
DROP POLICY IF EXISTS "service_role_all_content_items"   ON content_items;
DROP POLICY IF EXISTS "service_write_content_items"      ON content_items;

-- All authenticated users can read content (content is public to all app users)
CREATE POLICY "authenticated_read_content_items"
  ON content_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role bypass for seed scripts and Edge Functions
-- Named service_write_* per constitution §Data naming convention
CREATE POLICY "service_write_content_items"
  ON content_items
  FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------
-- STEP 4: RLS — categories
-- -----------------------------------------------------------

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_categories" ON categories;
DROP POLICY IF EXISTS "service_role_all_categories"  ON categories;
DROP POLICY IF EXISTS "service_write_categories"     ON categories;

CREATE POLICY "authenticated_read_categories"
  ON categories
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Named service_write_* per constitution §Data naming convention
CREATE POLICY "service_write_categories"
  ON categories
  FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------
-- VERIFICATION QUERIES (run manually to confirm)
-- -----------------------------------------------------------

-- Check new columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'content_items'
--   AND column_name IN ('duration_seconds','content_text','assets_url','game_type','config_json');

-- Check categories table:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'categories';

-- Check RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename IN ('content_items', 'categories');

-- Check policies (expect: authenticated_read_*, service_write_* per constitution §Data):
-- SELECT policyname, tablename, cmd FROM pg_policies
-- WHERE tablename IN ('content_items', 'categories');


-- 20260611000000_admin_write_policies.sql
-- Spec 012: Content RLS — Admin Write Policies
-- Additive migration — spec 009 policies (authenticated_read_*, service_write_*) are preserved untouched.
-- Admin role is detected via auth.jwt() ->> 'role' = 'admin' (sourced from app_metadata, server-set only).

-- content_items: admin FOR ALL (covers SELECT + INSERT + UPDATE + DELETE for admin-role JWT)
DROP POLICY IF EXISTS "admin_write_content_items" ON content_items;
CREATE POLICY "admin_write_content_items"
  ON content_items
  FOR ALL
  USING     (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK(auth.jwt() ->> 'role' = 'admin');

-- categories: admin FOR ALL (same pattern)
DROP POLICY IF EXISTS "admin_write_categories" ON categories;
CREATE POLICY "admin_write_categories"
  ON categories
  FOR ALL
  USING     (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK(auth.jwt() ->> 'role' = 'admin');

-- Helper function for integration tests: returns policy names for a given table.
-- Called via client.rpc('rls_policy_names', { target_table: 'content_items' }).
-- SECURITY DEFINER so it can read pg_catalog.pg_policies regardless of caller role.
CREATE OR REPLACE FUNCTION public.rls_policy_names(target_table text)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT coalesce(
    array_agg(policyname::text ORDER BY policyname),
    ARRAY[]::text[]
  )
  FROM pg_catalog.pg_policies
  WHERE tablename = target_table
$$;


-- 20260611000001_two_device_schema.sql
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


-- 20260612000000_content_lifecycle.sql
-- Spec 015: Content Validation & Quality — Content Lifecycle Migration
-- Adds status column to content_items, creates validation audit tables, updates RLS.
-- Idempotent: safe to re-run.

-- ── Step 1: Add status column (existing rows grandfathered as 'published') ──────
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- ── Step 2: Add CHECK constraint for valid status values ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'content_items_status_check'
      AND table_name = 'content_items'
  ) THEN
    ALTER TABLE content_items
      ADD CONSTRAINT content_items_status_check
      CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'flagged'));
  END IF;
END $$;

-- ── Step 3: Change INSERT default so new items start as draft ────────────────────
ALTER TABLE content_items ALTER COLUMN status SET DEFAULT 'draft';

-- ── Step 4: Index for queue queries ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);

-- ── Step 5: Update RLS on content_items ─────────────────────────────────────────
-- Drop the old broad read policy (all authenticated = all rows)
DROP POLICY IF EXISTS "authenticated_read_content_items" ON content_items;

-- Non-admin authenticated users (parents, children) see only published items
DROP POLICY IF EXISTS "authenticated_read_published_content_items" ON content_items;
CREATE POLICY "authenticated_read_published_content_items"
  ON content_items
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'admin'
    AND status = 'published'
  );

-- Admins see all statuses
DROP POLICY IF EXISTS "admin_read_all_content_items" ON content_items;
CREATE POLICY "admin_read_all_content_items"
  ON content_items
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- ── Step 6: Create content_validation_results table ─────────────────────────────
CREATE TABLE IF NOT EXISTS content_validation_results (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    UUID        NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  run_number    INT         NOT NULL DEFAULT 1,
  triggered_by  TEXT        NOT NULL CHECK (triggered_by IN ('submission', 'revalidation')),
  passed        BOOLEAN     NOT NULL,
  rule_outcomes JSONB       NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cvr_content_id   ON content_validation_results(content_id);
CREATE INDEX IF NOT EXISTS idx_cvr_created_at   ON content_validation_results(content_id, created_at DESC);

ALTER TABLE content_validation_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_content_validation_results" ON content_validation_results;
CREATE POLICY "admin_read_content_validation_results"
  ON content_validation_results FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "service_write_content_validation_results" ON content_validation_results;
CREATE POLICY "service_write_content_validation_results"
  ON content_validation_results FOR ALL
  USING (auth.role() = 'service_role');

-- ── Step 7: Create content_review_records table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS content_review_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id  UUID        NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  admin_id    UUID        NOT NULL,
  decision    TEXT        NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crr_content_id ON content_review_records(content_id);

ALTER TABLE content_review_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_content_review_records" ON content_review_records;
CREATE POLICY "admin_read_content_review_records"
  ON content_review_records FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "admin_write_content_review_records" ON content_review_records;
CREATE POLICY "admin_write_content_review_records"
  ON content_review_records FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "service_write_content_review_records" ON content_review_records;
CREATE POLICY "service_write_content_review_records"
  ON content_review_records FOR ALL
  USING (auth.role() = 'service_role');


-- 20260612000001_consume_pairing_token.sql
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


-- 20260612000002_pin_auth_schema.sql
-- Migration: PIN Authentication Schema (Spec 018)
-- Created: 2026-06-12
-- Idempotent: DROP IF EXISTS / CREATE OR REPLACE used throughout

-- ── realtime_commands ────────────────────────────────────────────────────────
-- Create if missing (bootstrap may not have been fully applied).

CREATE TABLE IF NOT EXISTS realtime_commands (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id       UUID        NOT NULL,
    sender_id       UUID        NOT NULL,
    child_id        UUID,
    command_type    TEXT        NOT NULL,
    payload         JSONB       DEFAULT '{}',
    acknowledged_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drop the auth.users FK on sender_id if it exists — integration tests use
-- fake UUIDs that don't have auth.users rows, and the SECURITY DEFINER function
-- already enforces caller identity at the application layer.
ALTER TABLE realtime_commands DROP CONSTRAINT IF EXISTS realtime_commands_sender_id_fkey;

ALTER TABLE realtime_commands ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_realtime_commands_child_unacked
    ON realtime_commands(family_id, child_id, acknowledged_at)
    WHERE acknowledged_at IS NULL;

DROP POLICY IF EXISTS "Parents can create commands" ON realtime_commands;
CREATE POLICY "Parents can create commands" ON realtime_commands
    FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Children can read their commands" ON realtime_commands;
CREATE POLICY "Children can read their commands" ON realtime_commands
    FOR SELECT USING (
        child_id = auth.uid() OR (child_id IS NULL AND family_id IN (
            SELECT parent_id FROM profiles WHERE id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Parents can read own commands" ON realtime_commands;
CREATE POLICY "Parents can read own commands" ON realtime_commands
    FOR SELECT USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Children can acknowledge commands" ON realtime_commands;
CREATE POLICY "Children can acknowledge commands" ON realtime_commands
    FOR UPDATE
    USING (
        child_id = auth.uid() OR (child_id IS NULL AND family_id IN (
            SELECT parent_id FROM profiles WHERE id = auth.uid()
        ))
    )
    WITH CHECK (
        child_id = auth.uid() OR (child_id IS NULL AND family_id IN (
            SELECT parent_id FROM profiles WHERE id = auth.uid()
        ))
    );

-- ── realtime_commands: command_type CHECK ────────────────────────────────────

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


-- 20260613019001_realtime_settings_sync.sql
-- spec 019: Enable Supabase Realtime CDC for settings sync
-- Required for subscribeSettingsChanges() in services/realtime/familyChannel.ts
-- Allows child device to receive profile and category_preferences changes via postgres_changes

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE category_preferences;

-- Set REPLICA IDENTITY FULL so CDC payloads include old row values (needed for DELETE/UPDATE)
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE category_preferences REPLICA IDENTITY FULL;


-- 20260613020001_sessions_family_id_live_reports.sql
-- spec 020: Add family_id to sessions for CDC filtering and RLS
-- Enables parent to subscribe to live session inserts via postgres_changes
-- filtered by family_id

-- 1. Add family_id column
-- No FK here: family_id is a plain UUID matching a parent profile's id by
-- convention throughout this schema (see pairing_tokens, device_registrations)
-- — there is no separate `families` table.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS family_id UUID;

-- 2. Backfill existing rows: set family_id from parent profile
UPDATE sessions s
SET family_id = p.family_id
FROM profiles p
WHERE p.id = s.parent_id AND s.family_id IS NULL;

-- 3. Add index for CDC filter performance
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions(family_id);

-- 4. Update RLS policies to use family_id
DROP POLICY IF EXISTS sessions_child_select ON sessions;
DROP POLICY IF EXISTS sessions_child_insert ON sessions;
DROP POLICY IF EXISTS sessions_child_update ON sessions;

-- Child: read own sessions
CREATE POLICY child_own_sessions_select ON sessions FOR SELECT
    USING (child_id = auth.uid());

-- Child: insert own sessions
CREATE POLICY child_own_sessions_insert ON sessions FOR INSERT
    WITH CHECK (child_id = auth.uid());

-- Child: update own sessions (close them)
CREATE POLICY child_own_sessions_update ON sessions FOR UPDATE
    USING (child_id = auth.uid());

-- Parent: read sessions for their family
CREATE POLICY parent_read_sessions ON sessions FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles
            WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- 5. Enable full replica identity for CDC UPDATE payloads
ALTER TABLE sessions REPLICA IDENTITY FULL;

-- 6. Add sessions to Realtime publication for CDC
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;


-- 20260618000001_alphanumeric_pairing_code.sql
-- Migration: Update manual_code to alphanumeric + symbols (6 characters)
-- Changes the default from numeric-only "000000" to a mix of letters, digits, symbols

-- Create the code generation function
CREATE OR REPLACE FUNCTION generate_pairing_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update the default for new rows
ALTER TABLE pairing_tokens
  ALTER COLUMN manual_code SET DEFAULT generate_pairing_code();


-- 20260619000002_sessions_full_repair.sql
-- Repair migration: creates `sessions` if it never existed on this project,
-- then (re)applies everything 20260613020001 and 20260619000001 needed.
-- Fully idempotent — safe to run multiple times on a partially-applied DB.

-- 1. Create sessions if missing (matches 20260609000000_full_schema_bootstrap.sql)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES profiles(id),
    activity_type TEXT NOT NULL,
    content_item_id UUID,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    elapsed_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_child_id ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 2. family_id column for CDC filtering (no FK — plain UUID by convention, see pairing_tokens)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS family_id UUID;

UPDATE sessions s
SET family_id = p.family_id
FROM profiles p
WHERE p.id = s.parent_id AND s.family_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions(family_id);

-- 3. RLS policies (drop any earlier version first, then recreate)
DROP POLICY IF EXISTS sessions_child_select ON sessions;
DROP POLICY IF EXISTS sessions_child_insert ON sessions;
DROP POLICY IF EXISTS sessions_child_update ON sessions;
DROP POLICY IF EXISTS child_own_sessions_select ON sessions;
DROP POLICY IF EXISTS child_own_sessions_insert ON sessions;
DROP POLICY IF EXISTS child_own_sessions_update ON sessions;
DROP POLICY IF EXISTS parent_read_sessions ON sessions;

CREATE POLICY child_own_sessions_select ON sessions FOR SELECT
    USING (child_id = auth.uid());

CREATE POLICY child_own_sessions_insert ON sessions FOR INSERT
    WITH CHECK (child_id = auth.uid());

CREATE POLICY child_own_sessions_update ON sessions FOR UPDATE
    USING (child_id = auth.uid());

CREATE POLICY parent_read_sessions ON sessions FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles
            WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- 4. CDC support
ALTER TABLE sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
    END IF;
END $$;

-- 5. REST access + schema cache reload
GRANT SELECT, INSERT, UPDATE ON public.sessions TO anon, authenticated;

NOTIFY pgrst, 'reload schema';


-- 20260619000003_fix_parent_family_id.sql
-- Data repair: profiles.family_id defaults to gen_random_uuid() (see
-- 20260609000000_full_schema_bootstrap.sql line 17/31), which is unrelated to
-- the parent's own id. Every parent_*_pairing_tokens RLS policy, plus
-- parent_read_sessions and friends, assume family_id = the parent's own id
-- (this is the convention used everywhere in app code — see
-- services/auth.ts buildAuthStateFromSession: parentData.familyId = profile.id).
-- Since nothing ever set family_id to match, every parent's pairing_tokens
-- INSERT (and session/report reads) were silently failing RLS checks.
--
-- Fix existing rows. Children inherit their parent's id as family_id too,
-- to match the value the app already sends when opening sessions
-- (childData.familyId = profile.parent_id).

UPDATE profiles
SET family_id = id
WHERE role = 'parent' AND family_id IS DISTINCT FROM id;

UPDATE profiles c
SET family_id = c.parent_id
FROM profiles p
WHERE c.role = 'child'
  AND c.parent_id = p.id
  AND c.family_id IS DISTINCT FROM c.parent_id;

NOTIFY pgrst, 'reload schema';


-- 20260620000000_child_rpc_layer.sql
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


-- 20260620000001_update_child_profile_rpc.sql
-- Migration: bypass the family_id-matching RLS path for child profile
-- writes entirely. The "Unnamed child" save kept failing
-- ("Cannot coerce the result to a single JSON object" — i.e. the UPDATE
-- matched zero rows) despite the parent's own family_id self-heal already
-- being in place, which means something about the family_id comparison
-- still doesn't line up for some pairings (stale client state, ordering,
-- or otherwise) and is not worth chasing further. This RPC validates
-- ownership directly via the child's parent_id column instead — set
-- correctly and unambiguously by consume_pairing_token at pairing time —
-- which sidesteps the family_id question altogether.

CREATE OR REPLACE FUNCTION public.update_child_profile(
  p_child_id     UUID,
  p_full_name    TEXT,
  p_age_group    TEXT,
  p_avatar_color TEXT DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT parent_id INTO v_parent_id FROM profiles WHERE id = p_child_id AND role = 'child';

  IF v_parent_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'child_not_found');
  END IF;

  IF v_parent_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'not_authorized');
  END IF;

  UPDATE profiles
  SET full_name = p_full_name, age_group = p_age_group, avatar_color = p_avatar_color
  WHERE id = p_child_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_child_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- 20260704000001_content_awareness_columns.sql
-- ============================================================
-- Migration: Content Awareness — Extend content_items
-- Feature: Content Awareness & Curated Content Library
-- Date: 2026-07-04
-- ============================================================
-- Adds source_type, source_url, and sub_category to the existing
-- content_items table. All columns are nullable/defaulted so
-- existing rows are unaffected. Idempotent (IF NOT EXISTS).
-- ============================================================

-- ── Step 1: Add source_type column ──────────────────────────────────────────
-- Distinguishes owned content (hosted on our CDN/storage) from
-- curated YouTube embeds. Defaults to 'owned' for existing rows.
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'owned';

-- Add CHECK constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'content_items_source_type_check'
      AND table_name = 'content_items'
  ) THEN
    ALTER TABLE content_items
      ADD CONSTRAINT content_items_source_type_check
      CHECK (source_type IN ('owned', 'youtube'));
  END IF;
END $$;

-- ── Step 2: Add source_url column ───────────────────────────────────────────
-- For 'youtube' source_type: stores the YouTube video ID (e.g., 'dQw4w9WgXcQ')
-- For 'owned' source_type: stores the CDN/storage URL
-- This supplements the existing 'url' column which is used for in-app routing.
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- ── Step 3: Add sub_category column ─────────────────────────────────────────
-- Fine-grained classification within a category (e.g., 'science', 'math',
-- 'language', 'nature'). Free text — not constrained to allow flexibility.
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- ── Step 4: Index for source_type queries ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_content_items_source_type
  ON content_items(source_type);

-- ── Step 5: Composite index for library browsing queries ────────────────────
CREATE INDEX IF NOT EXISTS idx_content_items_category_source
  ON content_items(category, source_type, is_active);

-- ============================================================
-- VERIFICATION (run manually):
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'content_items'
--   AND column_name IN ('source_type', 'source_url', 'sub_category');
-- ============================================================


-- 20260704000002_child_content_preferences.sql
-- ============================================================
-- Migration: Content Awareness — child_content_preferences
-- Feature: Content Awareness & Curated Content Library
-- Date: 2026-07-04
-- ============================================================
-- Per-item enable/disable control for parents.
-- Works as a second layer on top of category_preferences:
--   visibility = category_preferences.is_allowed AND child_content_preferences.enabled
-- ============================================================

-- ── Step 1: Create child_content_preferences table ──────────────────────────
CREATE TABLE IF NOT EXISTS child_content_preferences (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id  UUID        NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  added_by    TEXT        NOT NULL DEFAULT 'system'
    CHECK (added_by IN ('system', 'parent')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_id, content_id)
);

-- ── Step 2: Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ccp_child_id
  ON child_content_preferences(child_id);

CREATE INDEX IF NOT EXISTS idx_ccp_content_id
  ON child_content_preferences(content_id);

CREATE INDEX IF NOT EXISTS idx_ccp_child_enabled
  ON child_content_preferences(child_id, enabled)
  WHERE enabled = true;

-- ── Step 3: RLS ─────────────────────────────────────────────────────────────
ALTER TABLE child_content_preferences ENABLE ROW LEVEL SECURITY;

-- Parents can read preferences for their children
DROP POLICY IF EXISTS "parent_read_child_content_prefs" ON child_content_preferences;
CREATE POLICY "parent_read_child_content_prefs"
  ON child_content_preferences FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid() AND role = 'child'
    )
  );

-- Parents can insert preferences for their children
DROP POLICY IF EXISTS "parent_insert_child_content_prefs" ON child_content_preferences;
CREATE POLICY "parent_insert_child_content_prefs"
  ON child_content_preferences FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid() AND role = 'child'
    )
  );

-- Parents can update preferences for their children
DROP POLICY IF EXISTS "parent_update_child_content_prefs" ON child_content_preferences;
CREATE POLICY "parent_update_child_content_prefs"
  ON child_content_preferences FOR UPDATE
  USING (
    child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid() AND role = 'child'
    )
  );

-- Parents can delete preferences for their children
DROP POLICY IF EXISTS "parent_delete_child_content_prefs" ON child_content_preferences;
CREATE POLICY "parent_delete_child_content_prefs"
  ON child_content_preferences FOR DELETE
  USING (
    child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid() AND role = 'child'
    )
  );

-- Children can read their own preferences (needed for content filtering)
DROP POLICY IF EXISTS "child_read_own_content_prefs" ON child_content_preferences;
CREATE POLICY "child_read_own_content_prefs"
  ON child_content_preferences FOR SELECT
  USING (child_id = auth.uid());

-- Service role full access (for seed scripts, Edge Functions)
DROP POLICY IF EXISTS "service_write_child_content_prefs" ON child_content_preferences;
CREATE POLICY "service_write_child_content_prefs"
  ON child_content_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- ── Step 4: Auto-seed function ──────────────────────────────────────────────
-- When a new child is paired, auto-create preferences for all published content
-- with enabled = true (all content visible by default, parent can disable).
CREATE OR REPLACE FUNCTION seed_child_content_preferences(p_child_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO child_content_preferences (child_id, content_id, enabled, added_by)
  SELECT p_child_id, ci.id, true, 'system'
  FROM content_items ci
  WHERE ci.status = 'published'
    AND ci.is_active = true
  ON CONFLICT (child_id, content_id) DO NOTHING;
END;
$$;

-- ============================================================
-- VERIFICATION (run manually):
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename = 'child_content_preferences';
--
-- SELECT policyname, tablename, cmd FROM pg_policies
-- WHERE tablename = 'child_content_preferences';
-- ============================================================



-- Fix: Allow anon read for headless child device
DROP POLICY IF EXISTS "authenticated_read_content_items" ON content_items;
DROP POLICY IF EXISTS "anon_read_content_items" ON content_items;
CREATE POLICY "anon_read_content_items" ON content_items FOR SELECT USING (is_active = true);
