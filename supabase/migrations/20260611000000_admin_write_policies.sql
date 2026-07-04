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
