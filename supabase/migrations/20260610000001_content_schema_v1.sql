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
