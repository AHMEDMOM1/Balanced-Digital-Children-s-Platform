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
