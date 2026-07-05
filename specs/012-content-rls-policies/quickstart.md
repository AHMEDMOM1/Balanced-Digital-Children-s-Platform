# Quickstart: Content RLS Admin Write Policies (012)

## Prerequisites

- Spec 009 migration already applied (`20260610000001_content_schema_v1.sql`)
- `.env` contains `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `SUPABASE_ACCESS_TOKEN` for automated migration apply

## Step 1 — Apply the migration

```bash
npm run migrate:rls-admin
```

If `SUPABASE_ACCESS_TOKEN` is missing, the script prints the SQL. Paste it into **Supabase Dashboard → SQL Editor** and run.

**Manual SQL (paste into Dashboard if needed):**
```sql
DROP POLICY IF EXISTS "admin_write_content_items" ON content_items;
CREATE POLICY "admin_write_content_items"
  ON content_items
  FOR ALL
  USING     (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK(auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "admin_write_categories" ON categories;
CREATE POLICY "admin_write_categories"
  ON categories
  FOR ALL
  USING     (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK(auth.jwt() ->> 'role' = 'admin');
```

## Step 2 — Verify policies in catalog

Run in **Supabase Dashboard → SQL Editor**:
```sql
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename IN ('content_items', 'categories')
ORDER BY tablename, policyname;
```

Expected output (6 rows):

| policyname | tablename | cmd |
|---|---|---|
| `admin_write_categories` | categories | ALL |
| `authenticated_read_categories` | categories | SELECT |
| `service_write_categories` | categories | ALL |
| `admin_write_content_items` | content_items | ALL |
| `authenticated_read_content_items` | content_items | SELECT |
| `service_write_content_items` | content_items | ALL |

## Step 3 — Run integration tests

```bash
npm run test:rls-policies
```

Expected: all tests PASS (3 tests: policy catalog + unauthenticated write rejection + read regression).

## Step 4 — Verify admin write (manual, optional)

To verify that an admin user can actually write content:

1. Grant admin role to a test user:
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-admin@example.com';
```

2. Sign out and sign back in with that account to get a fresh JWT.

3. From the app or Dashboard, attempt an INSERT into `content_items` — it should succeed.

4. To revoke admin:
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role'
WHERE email = 'your-admin@example.com';
```

## Rollback

To remove the spec 012 policies only (spec 009 policies are preserved):
```sql
DROP POLICY IF EXISTS "admin_write_content_items" ON content_items;
DROP POLICY IF EXISTS "admin_write_categories" ON categories;
```

## Full regression test

```bash
npm run test
```

## Idempotency check

Running the migration twice is safe — `DROP POLICY IF EXISTS` prevents errors on re-run.
