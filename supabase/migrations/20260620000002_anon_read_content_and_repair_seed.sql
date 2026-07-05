-- Fixes two confirmed issues blocking real content from reaching the
-- headless child device:
--
-- 1. 20260612000000_content_lifecycle.sql's read policy requires
--    auth.role() = 'authenticated'. The QR-paired child device has no
--    Supabase auth session, ever (see 20260620000000_child_rpc_layer.sql's
--    header comment) — it always uses the anon key, so auth.role() is
--    'anon', never 'authenticated'. There is no existing policy that lets
--    anon read anything, regardless of status. Confirmed by direct query:
--    service-role sees 10 rows, anon-key sees 0.
--
-- 2. All 10 rows seeded by scripts/seed-content.ts ended up status='flagged'
--    because every single one uses an age range like (2,5) or (6,10) —
--    contentValidationRules.ts's validAgeRange rule only accepts the exact
--    pairs (2,4), (5,7), (8,10). Repairing the existing rows here; the seed
--    script itself is fixed separately so this doesn't recur.

-- ── 1. Let the headless child (anon key) read published content ────────────

DROP POLICY IF EXISTS "anon_read_published_content_items" ON content_items;
CREATE POLICY "anon_read_published_content_items"
  ON content_items
  FOR SELECT
  TO anon
  USING (status = 'published');

-- ── 2. Repair the existing flagged seed rows ────────────────────────────────

UPDATE content_items
SET max_age = 4
WHERE min_age = 2 AND max_age = 5;

UPDATE content_items
SET min_age = 8
WHERE min_age = 6 AND max_age = 10;

UPDATE content_items
SET status = 'published'
WHERE status = 'flagged'
  AND min_age IN (2, 5, 8)
  AND max_age IN (4, 7, 10);

NOTIFY pgrst, 'reload schema';
