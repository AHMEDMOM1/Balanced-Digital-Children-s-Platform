-- 001_core_tables.sql
-- Phase 1: Core table creation for Balanced Digital Children's Platform
-- Creates profiles, content_items, category_preferences, sessions, and activity_logs

-- ── Profiles (unified for both parent and child) ──
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

CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ── Content Items (unified table for stories, games, videos, creative) ──
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

CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(type);
CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_items_age_range ON content_items(min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_content_items_active ON content_items(is_active);

-- ── Category Preferences (which categories a child can access) ──
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

-- ── Sessions (child activity sessions) ──
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

-- ── Activity Logs (detailed usage tracking) ──
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

-- ── Family Codes (for child onboarding) ──
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

-- ── Parent Settings ──
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

COMMENT ON TABLE profiles IS 'Unified user profiles for parents and children';
COMMENT ON TABLE content_items IS 'All content types (stories, games, videos, creative activities)';
COMMENT ON TABLE category_preferences IS 'Per-child category access permissions set by parent';
COMMENT ON TABLE sessions IS 'Child activity tracking sessions';
COMMENT ON TABLE activity_logs IS 'Granular usage activity log';
COMMENT ON TABLE family_codes IS 'One-time family codes for child device onboarding';
COMMENT ON TABLE parent_settings IS 'Per-child parent control settings';
