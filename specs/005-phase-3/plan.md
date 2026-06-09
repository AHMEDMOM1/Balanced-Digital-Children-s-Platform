# Phase 3: Implementation Plan — Live Reports & Charts

**Feature Branch**: `005-phase-3`
**Spec**: [spec.md](./spec.md)
**Data Model**: [data-model.md](./data-model.md)
**Research**: [research.md](./research.md)

---

## Technical Context

| Item | Decision |
|---|---|
| Chart Library | Custom `LinearGradient` bar chart (victory-native evaluated and removed — Skia renderer too heavy for low-end device targets; custom bars are lighter and sufficient) |
| Backend Aggregation | Postgres function `aggregate_daily_stats()` scheduled via pg_cron / Edge Function cron |
| Realtime Updates | Supabase `postgres_changes` subscription on `sessions` table |
| Export | `react-native-view-shot` → PNG → `expo-sharing` share sheet |
| Cache Layer | expo-sqlite `CacheManager`; 24h TTL for finalized historical data, no cache for live today (Realtime subscription handles freshness) |
| New DB Migration | `003_reports_tables.sql` — adds `daily_stats` table + RLS + aggregate function |
| API Service | `services/api/reports.ts` — `useDailyStats`, `useLiveTodayStats`, `useComparisonStats` |
| Screen to Refactor | `app/(parent)/reports.tsx` — replace all static values with live hooks |

---

## Constitution Check

> The project constitution is a template (not yet customized). Standard best practices apply:
> - Follow the existing RLS pattern from Phase 1 (`002_rls_policies.sql`)
> - Follow the existing API hook pattern from Phase 1 (`services/api/*.ts`)
> - New types go into `services/api/types.ts`
> - No direct Supabase calls in screen components

---

## Phase 1: Database Layer

### New Migration: `server/migrations/003_reports_tables.sql`

```sql
-- daily_stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  total_seconds INTEGER DEFAULT 0,
  stories_seconds INTEGER DEFAULT 0,
  games_seconds INTEGER DEFAULT 0,
  videos_seconds INTEGER DEFAULT 0,
  creative_seconds INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  top_activity TEXT,
  timezone_offset_minutes INTEGER DEFAULT 0,
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, stat_date)
);

CREATE INDEX idx_daily_stats_child_date ON daily_stats(child_id, stat_date DESC);

-- RLS
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_read_daily_stats" ON daily_stats
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM profiles WHERE parent_id = auth.uid() AND role = 'child'
    )
  );
CREATE POLICY "service_write_daily_stats" ON daily_stats
  FOR ALL USING (auth.role() = 'service_role');

-- Aggregate function
CREATE OR REPLACE FUNCTION aggregate_daily_stats(p_child_id UUID, p_day DATE)
RETURNS void AS $$
DECLARE
  v_total_seconds INTEGER := 0;
  v_stories_seconds INTEGER := 0;
  v_games_seconds INTEGER := 0;
  v_videos_seconds INTEGER := 0;
  v_creative_seconds INTEGER := 0;
  v_session_count INTEGER := 0;
  v_top_activity TEXT;
BEGIN
  SELECT
    COALESCE(SUM(elapsed_seconds), 0),
    COALESCE(SUM(CASE WHEN activity_type = 'story' THEN elapsed_seconds ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN activity_type = 'game' THEN elapsed_seconds ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN activity_type = 'video' THEN elapsed_seconds ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN activity_type = 'creative' THEN elapsed_seconds ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_seconds, v_stories_seconds, v_games_seconds, v_videos_seconds, v_creative_seconds, v_session_count
  FROM sessions s
  CROSS JOIN LATERAL (
    SELECT COALESCE(p.timezone_offset_minutes, 0) AS tz_offset
    FROM profiles p
    WHERE p.id = p_child_id
  ) tz
  WHERE s.child_id = p_child_id
    AND DATE(s.started_at AT TIME ZONE 'UTC' AT TIME ZONE (interval '1 minute' * tz.tz_offset)) = p_day
    AND s.status IN ('completed', 'paused');

  -- top activity from content_items join (bucketed by child's local timezone)
  SELECT ci.title INTO v_top_activity
  FROM sessions s
  JOIN content_items ci ON s.content_item_id = ci.id
  CROSS JOIN LATERAL (
    SELECT COALESCE(p.timezone_offset_minutes, 0) AS tz_offset
    FROM profiles p
    WHERE p.id = p_child_id
  ) tz
  WHERE s.child_id = p_child_id
    AND DATE(s.started_at AT TIME ZONE 'UTC' AT TIME ZONE (interval '1 minute' * tz.tz_offset)) = p_day
    AND s.status IN ('completed', 'paused')
  GROUP BY ci.title ORDER BY SUM(s.elapsed_seconds) DESC LIMIT 1;

  INSERT INTO daily_stats (child_id, stat_date, total_seconds, stories_seconds, games_seconds,
    videos_seconds, creative_seconds, session_count, top_activity, is_finalized)
  VALUES (p_child_id, p_day, v_total_seconds, v_stories_seconds, v_games_seconds,
    v_videos_seconds, v_creative_seconds, v_session_count, v_top_activity, p_day < CURRENT_DATE)
  ON CONFLICT (child_id, stat_date) DO UPDATE SET
    total_seconds = EXCLUDED.total_seconds,
    stories_seconds = EXCLUDED.stories_seconds,
    games_seconds = EXCLUDED.games_seconds,
    videos_seconds = EXCLUDED.videos_seconds,
    creative_seconds = EXCLUDED.creative_seconds,
    session_count = EXCLUDED.session_count,
    top_activity = EXCLUDED.top_activity,
    is_finalized = EXCLUDED.is_finalized,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 2: API Service Layer

### New File: `services/api/reports.ts`

- `useDailyStats(childId, range)` — fetches `daily_stats` for selected date range, falls back to cached data on error
- `useLiveTodayStats(childId)` — opens `postgres_changes` Realtime subscription on `sessions` table; recomputes today partial on each INSERT/UPDATE
- `useComparisonStats(childIds, range)` — fetches both children in parallel, returns normalized `ComparisonData`

### Modified File: `services/api/types.ts`

Add `DailyStats`, `ComparisonData`, `ReportRange` types.

---

## Phase 3: UI Screen Refactoring

### Modified File: `app/(parent)/reports.tsx`

**Remove**: All hardcoded static values (`"14h 30m"`, `"2h 05m"`, `[60, 90, 40, ...]`)

**Add**:
- `TimeRangePicker` component — toggles `today | week | month`
- `ChildSelector` component — dropdown to pick which child to view
- `ScreenTimeSummaryCards` — Total Time + Daily Avg driven by `useDailyStats`
- `BarChartSection` — `victory-native` CartesianChart reading real per-day seconds
- `CategoryBreakdownSection` — progress bars driven by `stories_seconds` / `games_seconds` etc.
- Loading skeleton while data fetches
- Empty state when no data for selected range
- Live "Today" badge indicator showing Realtime is active
- Export button → `react-native-view-shot` → `expo-sharing`

---

## Phase 4: Export Feature

### Dependency: `react-native-view-shot` + `expo-sharing`

`exportReportAsImage(viewRef)`:
1. Calls `captureRef(viewRef, { format: 'png', quality: 1 })` → returns URI
2. Calls `Sharing.shareAsync(uri)` → opens OS share sheet

---

## Phase 5: Seed & Test Data

### New Seed: `server/seeds/002_reports_seed.sql`

Generates `daily_stats` rows for the last 30 days for all seed children — allows the parent reports screen to show realistic data immediately after applying migrations.

---

## Phase 6: pg_cron / Edge Function Scheduling

### Nightly Rollup Job

Configure Supabase pg_cron (Pro) or Edge Function cron (Free) to run `aggregate_daily_stats` for each child nightly at 00:05 Arabia Standard Time (21:05 UTC).

```sql
-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly rollup for previous day
SELECT cron.schedule(
  'aggregate-daily-stats',
  '5 21 * * *',  -- 00:05 AST = 21:05 UTC
  $$
  DO $$
  DECLARE v_child RECORD;
  BEGIN
    FOR v_child IN SELECT id FROM profiles WHERE role = 'child' LOOP
      PERFORM aggregate_daily_stats(v_child.id, CURRENT_DATE - 1);
    END LOOP;
  END $$;
  $$
);
```

**Fallback**: If pg_cron unavailable, deploy `supabase/functions/aggregate-daily-stats/index.ts` with a cron trigger (Supabase Edge Function cron).

---

## Phase 7: Success Criteria Verification

### Automated Checks (CI)

| SC | Test | Threshold |
|---|---|---|
| SC-001 | Dashboard load (mount → interactive) with 30-day data | p95 < 1500ms |
| SC-002 | Realtime latency (session INSERT → UI update) | p95 < 500ms |
| SC-003 | Export PNG validity (dimensions, header, share sheet) | 100% pass |
| SC-004 | Normalization (Child A: 7200s, Child B: 900s → B bar = 12.5% of A) | Exact match |

Implementation: `scripts/perf-test-reports.ts`, `scripts/realtime-latency-test.ts`, `scripts/export-test.ts`, `scripts/comparison-normalization-test.ts`.

## Verification Plan

1. Apply `003_reports_tables.sql` migration → verify `daily_stats` table and function exist
2. Run seed → verify 30 rows appear in `daily_stats` per seed child
3. Open reports screen → verify bar chart and breakdown show real data (not static values)
4. Switch time range → verify chart updates
5. Tap Export → verify PNG appears in share sheet
6. With 2+ seed children → verify comparison view renders

---

## File Summary

| File | Action |
|---|---|
| `server/migrations/003_reports_tables.sql` | NEW — daily_stats + RLS + aggregate function (timezone-aware) |
| `server/seeds/002_reports_seed.sql` | NEW — 30 days of stats per seed child |
| `services/api/reports.ts` | NEW — useDailyStats, useLiveTodayStats, useComparisonStats |
| `services/api/types.ts` | MODIFY — add DailyStats, ComparisonData, ReportRange |
| `app/(parent)/reports.tsx` | MODIFY — replace static data with live hooks + Victory charts |
| `components/reports/ComparisonView.tsx` | NEW — side-by-side comparison with category breakdown |
| `services/export/captureReport.ts` | NEW — PNG capture + share sheet |
| `scripts/perf-test-reports.ts` | NEW — SC-001 load test |
| `scripts/realtime-latency-test.ts` | NEW — SC-002 latency test |
| `scripts/export-test.ts` | NEW — SC-003 export test |
| `scripts/comparison-normalization-test.ts` | NEW — SC-004 normalization test |
| `supabase/functions/aggregate-daily-stats/index.ts` | NEW — Edge Function fallback for pg_cron |
| `scripts/perf-test-reports.ts` | NEW — SC-001 load test |
| `scripts/realtime-latency-test.ts` | NEW — SC-002 latency test |
| `scripts/export-test.ts` | NEW — SC-003 export test |
| `scripts/comparison-normalization-test.ts` | NEW — SC-004 normalization test |
| `scripts/cache-ttl-test.ts` | NEW — NFR-002 cache TTL validation |
| `server/migrations/004_data_retention.sql` | NEW — NFR-001 data retention + purge cron |
