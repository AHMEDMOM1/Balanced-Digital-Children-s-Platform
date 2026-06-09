# Quickstart: Seed & Test Data

**Feature**: Seed & Test Data (Phase 5)
**Branch**: `008-seed-test-data`

---

## Prerequisites

1. Supabase project created and linked locally:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

2. Migrations applied in order:
   ```bash
   # Apply core tables
   supabase db execute -f server/migrations/001_core_tables.sql
   supabase db execute -f server/migrations/002_rls_policies.sql
   # Apply reports table (required before reports seed)
   supabase db execute -f server/migrations/003_reports_tables.sql
   # Apply initial content and child profiles (required before reports seed)
   supabase db execute -f server/seeds/001_initial_data.sql
   ```

---

## Apply the Reports Seed

```bash
npm run seed:reports
```

This runs `server/seeds/002_reports_seed.sql` against your linked Supabase project. It generates up to 150 rows of `daily_stats` (5 seed children × 30 days). Safe to run multiple times — existing rows are preserved.

---

## Verify the Seed

```bash
npm run seed:verify
```

Outputs a summary:
```
Seed verification:
  Children found: 3
  Daily stats rows: 90 (expected ≥ 30 per child)
  All 4 categories non-zero: ✓
  Today row is_finalized = false: ✓
  Past rows is_finalized = true: ✓
Result: PASS
```

---

## Manual Verification (Supabase Studio)

```sql
-- Row count per child
SELECT child_id, COUNT(*) AS days_seeded
FROM daily_stats
GROUP BY child_id
ORDER BY days_seeded DESC;

-- Spot-check category values (all should be > 0)
SELECT
  MIN(stories_seconds) AS min_stories,
  MIN(games_seconds)   AS min_games,
  MIN(videos_seconds)  AS min_videos,
  MIN(creative_seconds) AS min_creative
FROM daily_stats;

-- Check finalization flag
SELECT is_finalized, COUNT(*) FROM daily_stats GROUP BY is_finalized;
```

---

## Teardown (staging environments only)

To remove all seeded rows without affecting real data:
```sql
-- Remove daily_stats rows for seed children only
-- (seed children are identified by being in 001_initial_data.sql)
-- Safest: delete only rows older than any real sessions
DELETE FROM daily_stats
WHERE child_id IN (
  SELECT id FROM profiles WHERE role = 'child'
    AND created_at < '2026-01-01'  -- adjust to your seed creation date
);
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `seed:reports` exits with "relation daily_stats does not exist" | Migration 003 not applied | Run `supabase db execute -f server/migrations/003_reports_tables.sql` first |
| Seed inserts 0 rows | No child profiles exist | Run `supabase db execute -f server/seeds/001_initial_data.sql` first |
| `seed:verify` reports all zeros | Supabase credentials not set | Check `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` |
| Running seed twice produces extra rows | `ON CONFLICT` not working | Check that `003_reports_tables.sql` UNIQUE constraint was applied |
