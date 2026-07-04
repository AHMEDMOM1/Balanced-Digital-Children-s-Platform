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
