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
