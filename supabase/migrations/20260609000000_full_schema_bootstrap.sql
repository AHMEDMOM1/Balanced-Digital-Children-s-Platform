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
    ADD COLUMN IF NOT EXISTS config_json       jsonb;

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
