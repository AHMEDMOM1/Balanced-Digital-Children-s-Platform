# Data Model: Seed & Test Data

**Feature**: Seed & Test Data (Phase 5)
**Branch**: `008-seed-test-data`
**Date**: 2026-06-09

---

## Entity: `daily_stats` (write target)

Table defined in `003_reports_tables.sql`. The seed writes to this table; no schema changes are introduced in Phase 5.

| Column | Type | Constraints | Seed value |
|--------|------|-------------|------------|
| `id` | `UUID` | PK, `DEFAULT gen_random_uuid()` | Auto-generated |
| `child_id` | `UUID` | FK → `profiles(id) ON DELETE CASCADE` | Queried from `profiles WHERE role = 'child' LIMIT 5` |
| `stat_date` | `DATE` | `NOT NULL`, UNIQUE with `child_id` | `CURRENT_DATE - i` for i in 0..29 |
| `total_seconds` | `INTEGER` | `DEFAULT 0` | `1200 + random() * 3600` (20–80 min) |
| `stories_seconds` | `INTEGER` | `DEFAULT 0` | `300 + random() * 900` (5–20 min) |
| `games_seconds` | `INTEGER` | `DEFAULT 0` | `200 + random() * 800` (3–16 min) |
| `videos_seconds` | `INTEGER` | `DEFAULT 0` | `100 + random() * 600` (1–11 min) |
| `creative_seconds` | `INTEGER` | `DEFAULT 0` | `200 + random() * 700` (3–14 min) |
| `session_count` | `INTEGER` | `DEFAULT 0` | `2 + random() * 4` (2–6 sessions) |
| `top_activity` | `TEXT` | nullable | Random pick from hardcoded 5 titles |
| `is_finalized` | `BOOLEAN` | `DEFAULT false` | `stat_date < CURRENT_DATE` |
| `timezone_offset_minutes` | `INTEGER` | `DEFAULT 0` | Not set by seed (uses table default 0) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Auto-set |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Auto-set |

**Unique constraint**: `(child_id, stat_date)` — enforces idempotency via `ON CONFLICT DO NOTHING`

---

## Entity: `profiles` (read-only dependency)

The seed reads child profile IDs with:
```sql
SELECT id FROM profiles WHERE role = 'child' LIMIT 5
```
No writes to `profiles`.

---

## Seed Output Volume

- Up to 5 child profiles × 30 days = **150 rows maximum**
- Each row: ~200 bytes → ~30 KB total insertion

---

## Dependency Chain

```
001_initial_data.sql  →  profiles (child rows)
003_reports_tables.sql  →  daily_stats (table + unique constraint)
002_reports_seed.sql  →  daily_stats (inserts up to 150 rows)
```
