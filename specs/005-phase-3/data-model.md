# Phase 3: Data Model — Live Reports & Charts

## New Entities

---

### `daily_stats` *(New — Migration 003)*

Pre-computed daily usage summary per child. Written by the `aggregate_daily_stats` Postgres function (scheduled via pg_cron or Supabase Edge Function cron). Immutable once finalized for past days.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `child_id` | UUID FK → `profiles.id` | ON DELETE CASCADE |
| `stat_date` | DATE | The calendar day (UTC); client converts using stored `timezone_offset` |
| `total_seconds` | INTEGER | Total active screen time for the day |
| `stories_seconds` | INTEGER | Seconds spent in Stories content |
| `games_seconds` | INTEGER | Seconds spent in Games content |
| `videos_seconds` | INTEGER | Seconds spent in Videos content |
| `creative_seconds` | INTEGER | Seconds spent in Creative content |
| `session_count` | INTEGER | Number of distinct sessions completed |
| `top_activity` | TEXT | Title of the most-used content item that day |
| `timezone_offset_minutes` | INTEGER | Child device's UTC offset in minutes at snapshot time |
| `is_finalized` | BOOLEAN | `false` = partial (today); `true` = immutable (past days) |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

**Indexes**:
- `(child_id, stat_date)` — UNIQUE, primary query pattern
- `(child_id, stat_date DESC)` — For range queries (last 30 days)

---

## Modified Entities

### `profiles` *(Existing — Extended)*

The child profile (`role = 'child'`) MUST have a `timezone_offset_minutes` column (INTEGER, default 0) storing the device's UTC offset in minutes at last sync. The `aggregate_daily_stats` function reads this to bucket sessions into the child's local calendar day.

```sql
-- If not already present, add to profiles:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone_offset_minutes INTEGER DEFAULT 0;
```

---

### `activity_logs` *(Existing — Extended)*

No new columns needed. The existing `activity_type` and `created_at` fields are sufficient for the rollup function. The rollup reads:
- `activity_type` → maps to content category bucket via fixed mapping:
  | `activity_type` Value | Display Category | Color |
  |---|---|---|
  | `'story'` | StoryTime | `#7C5CFC` |
  | `'game'` | Brain Games | `#FF6B6B` |
  | `'video'` | Videos | `#494551` |
  | `'creative'` | Creative Zone | `#FFB800` |
- `created_at` → bucketed into the child's local day using the timezone offset

---

### `sessions` *(Existing — Read-only for reports)*

The `elapsed_seconds` field on completed/paused sessions is the source of truth for duration. The rollup function aggregates `SUM(elapsed_seconds)` grouped by `activity_type` per day, bucketed by child's local timezone via `profiles.timezone_offset_minutes`.

---

## Database Function

### `aggregate_daily_stats(p_child_id UUID, p_day DATE)`

```sql
-- Reads from sessions joined with profiles for child's timezone_offset_minutes
-- Buckets sessions by child's local calendar day:
--   DATE(started_at AT TIME ZONE 'UTC' AT TIME ZONE (interval '1 minute' * tz_offset))
-- Groups by activity_type, sums elapsed_seconds
-- Upserts a single row into daily_stats with child's timezone_offset_minutes snapshot
-- Sets is_finalized = (p_day < CURRENT_DATE)
```

---

## API Service Layer (New File)

### `services/api/reports.ts`

Exports:
- `useDailyStats(childId: string, range: 'today' | 'week' | 'month'): ApiResponse<DailyStats[]>` — fetches pre-computed rollups from `daily_stats`
- `useLiveTodayStats(childId: string)` — subscribes to Supabase Realtime `postgres_changes` on `sessions` table filtered by `child_id`; merges incremental updates into in-memory "today" partial stat
- `useComparisonStats(childIds: [string, string], range: 'week' | 'month'): ApiResponse<ComparisonData>` — fetches two children's rollups and normalizes for side-by-side display

---

## New TypeScript Types

```typescript
// services/api/types.ts — additions

export interface DailyStats {
  id: string;
  child_id: string;
  stat_date: string;            // ISO date string 'YYYY-MM-DD'
  total_seconds: number;
  stories_seconds: number;
  games_seconds: number;
  videos_seconds: number;
  creative_seconds: number;
  session_count: number;
  top_activity: string | null;
  timezone_offset_minutes: number;
  is_finalized: boolean;
}

export interface ComparisonData {
  childA: { id: string; name: string; stats: DailyStats[] };
  childB: { id: string; name: string; stats: DailyStats[] };
  normalizedMax: number;        // For consistent chart axis scaling
}

export type ReportRange = 'today' | 'week' | 'month';
```

---

## RLS Policies (New Migration 003)

```sql
-- daily_stats RLS
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Parents can read their own children's daily stats
CREATE POLICY "parent_read_daily_stats" ON daily_stats
  FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid()
        AND role = 'child'
    )
  );

-- Only the aggregate function (service role) can write
CREATE POLICY "service_write_daily_stats" ON daily_stats
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Entity Relationships

```
profiles (parent)
  └── profiles (child)
        ├── sessions (elapsed_seconds, activity_type)
        │     └── activity_logs
        └── daily_stats (aggregated per day)
```
