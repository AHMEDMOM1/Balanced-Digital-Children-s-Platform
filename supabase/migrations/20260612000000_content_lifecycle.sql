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
