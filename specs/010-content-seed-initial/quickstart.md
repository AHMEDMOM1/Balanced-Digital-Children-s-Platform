# Quickstart: Initial Content Seed

**Feature**: 010-content-seed-initial
**Date**: 2026-06-10

---

## Prerequisites

- `.env` file present with `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Migration from feature 009 already applied (`npm run db:migrate` confirms ✅)
- Node.js + ts-node available (`npx ts-node --version`)

---

## TDD Flow

### Step 1 — Run the verification test (expect FAIL)

```bash
npm run test:content-seed
```

Expected: Tests skip (no credentials) OR fail with `expected 0 to be >= 3` — confirms no seed data exists yet.

### Step 2 — Run the seed script

```bash
npm run seed:content
```

Expected output:
```
Seeding categories...
  ✅ Inserted: math
  ✅ Inserted: animals
  ✅ Inserted: nature

Seeding content items...
  ✅ Inserted video: Count to 10 with Animals
  ✅ Inserted video: Animal Sounds Adventure
  ✅ Inserted video: Shapes All Around Us
  ✅ Inserted story: The Friendly Lion
  ✅ Inserted story: Max Learns to Share
  ✅ Inserted story: A Day on the Farm
  ✅ Inserted creative: Draw a Rainbow
  ✅ Inserted creative: Colour the Animals
  ✅ Inserted game: Count the Apples
  ✅ Inserted game: Match the Animals

Summary:
  categories  — 3 inserted, 0 skipped, 0 failed
  video       — 3 inserted, 0 skipped, 0 failed
  story       — 3 inserted, 0 skipped, 0 failed
  creative    — 2 inserted, 0 skipped, 0 failed
  game        — 2 inserted, 0 skipped, 0 failed
```

### Step 3 — Re-run test (expect PASS)

```bash
npm run test:content-seed
```

Expected: All tests pass — 15 items confirmed in DB with correct fields.

### Step 4 — Verify idempotency

```bash
npm run seed:content
```

Expected: All rows show `skipped`, 0 inserted, 0 errors, exit code 0.

---

## Manual Verification (Supabase Dashboard)

```sql
-- Count by type
SELECT type, COUNT(*) FROM content_items GROUP BY type;

-- Check categories
SELECT name, icon_url FROM categories ORDER BY name;

-- Check a game config
SELECT title, game_type, config_json FROM content_items WHERE type = 'game';

-- Age range split
SELECT title, type, min_age, max_age FROM content_items ORDER BY min_age;
```

---

## Rollback

To remove all seeded content:

```sql
DELETE FROM content_items
WHERE title IN (
  'Count to 10 with Animals', 'Animal Sounds Adventure', 'Shapes All Around Us',
  'The Friendly Lion', 'Max Learns to Share', 'A Day on the Farm',
  'Draw a Rainbow', 'Colour the Animals', 'Count the Apples', 'Match the Animals'
);

DELETE FROM categories WHERE name IN ('math', 'animals', 'nature');
```
