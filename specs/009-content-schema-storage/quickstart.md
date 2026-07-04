# Quickstart: Content Schema & Storage Setup

**Feature**: `009-content-schema-storage`
**Date**: 2026-06-10

---

## Prerequisites

- Supabase project URL and anon key in `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- Service role key for seed scripts (`SUPABASE_SERVICE_ROLE_KEY`)

---

## Step 1 — Apply the Schema Migration

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Copy the contents of `specs/009-content-schema-storage/contracts/content-schema.sql`
3. Paste into the SQL Editor and click **Run**
4. Verify with these queries in the SQL Editor:

```sql
-- Should return 5 rows
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'content_items'
  AND column_name IN ('duration_seconds','content_text','assets_url','game_type','config_json');

-- Should return 3 rows: id, name, icon_url, created_at
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'categories';

-- Both tables should show rowsecurity = true
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('content_items', 'categories');
```

---

## Step 2 — Create Storage Buckets

In the Supabase Dashboard → **Storage** → **New Bucket**, create each bucket:

| Bucket Name | Public |
|-------------|--------|
| `thumbnails` | ✅ Yes |
| `story-images` | ✅ Yes |
| `activity-assets` | ✅ Yes |
| `game-assets` | ✅ Yes |

To verify, upload a small PNG to each bucket. The public URL should look like:
`https://<project-ref>.supabase.co/storage/v1/object/public/<bucket-name>/<filename>`

---

## Step 3 — Verify TypeScript Types

Run the TypeScript check to confirm new interfaces don't introduce errors:

```powershell
npx tsc --noEmit
```

Expected: zero errors.

---

## Step 4 — Run Integration Tests

```powershell
npx jest tests/integration/contentSchema.test.ts --no-coverage
```

Tests verify:
- INSERT + SELECT round-trip for all 4 content types with new columns
- `categories` table CRUD
- Age-group filter returns correct rows
- Category filter returns correct rows

---

## Step 5 — Quick Manual Smoke Test

Insert a test video row and read it back:

```sql
-- In Supabase SQL Editor (using service role context):
INSERT INTO content_items (title, type, category, min_age, max_age, url, thumbnail_url, duration_seconds)
VALUES ('Count to 10', 'video', 'math', 2, 4, 'https://youtube.com/watch?v=test', NULL, 180)
RETURNING id, title, type, duration_seconds;

-- Insert a test category:
INSERT INTO categories (name, icon_url)
VALUES ('Math', NULL)
RETURNING id, name;

-- Verify age-group filter (should return the row above):
SELECT title, type, duration_seconds FROM content_items
WHERE type = 'video' AND min_age <= 3 AND max_age >= 3;
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `column "duration_seconds" does not exist` | Migration not applied — re-run Step 1 |
| `permission denied for table content_items` | Ensure you're authenticated; check RLS policies exist |
| `new row violates row-level security` | Seed scripts need `SUPABASE_SERVICE_ROLE_KEY`, not anon key |
| TypeScript error on `VideoItem` | Run `npx tsc --noEmit` and check `services/api/types.ts` import |
| Storage bucket upload fails | Verify bucket exists and is marked public in dashboard |

---

## Next Steps

- Run `/speckit-tasks` to generate the task breakdown for implementation
- Phase 3 of ContentPlan.md: seed initial content rows (see `specs/008-seed-test-data/`)
- Phase 4: add game config JSON examples
- Phase 5: add admin INSERT/UPDATE/DELETE RLS policies
