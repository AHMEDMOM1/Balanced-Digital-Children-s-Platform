# Data Model: Live Session Reports (Spec 020)

**Date**: 2026-06-13

---

## Entity: Session (`sessions` table)

The `sessions` table already exists in the database. This spec adds `family_id` and updates RLS policies. All other columns are used as-is.

### Schema (after migration)

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id        UUID REFERENCES profiles(id),            -- existing, kept
    family_id        UUID REFERENCES families(id),            -- NEW — added by migration 020
    activity_type    TEXT NOT NULL,                           -- spec: 'content_type'
    content_item_id  UUID REFERENCES content_items(id) ON DELETE SET NULL,  -- spec: 'content_id'
    started_at       TIMESTAMPTZ DEFAULT now(),
    ended_at         TIMESTAMPTZ,                             -- null = active session
    elapsed_seconds  INTEGER DEFAULT 0,                       -- spec: 'duration_seconds', clamped ≥0
    status           TEXT DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'completed', 'expired')),
    created_at       TIMESTAMPTZ DEFAULT now()
);
```

### Column Mapping (spec → DB)

| Spec field name   | DB column name    | Type    | Notes |
|-------------------|-------------------|---------|-------|
| `content_type`    | `activity_type`   | TEXT    | 'story' / 'game' / 'video' / 'creative' |
| `content_id`      | `content_item_id` | UUID FK | References `content_items.id` |
| `duration_seconds`| `elapsed_seconds` | INTEGER | Clamped to ≥0 on close |
| `family_id`       | `family_id`       | UUID FK | New column — added in migration 020 |

### State Transitions

```
INSERT (status='active', ended_at=NULL)
    │
    ├─► Normal close: UPDATE ended_at=now(), elapsed_seconds=computed, status='completed'
    ├─► Force close:  UPDATE ended_at=now(), elapsed_seconds=computed, status='expired'
    └─► Abandoned:    UPDATE ended_at=started_at, elapsed_seconds=0, status='expired'
```

### Constraints

- Only one `status = 'active'` session per `child_id` at a time (enforced client-side in `services/api/sessions.ts`)
- `elapsed_seconds` ≥ 0 (clamped on write — never negative)
- `family_id` NOT NULL in new writes (migration sets existing rows to parent's family_id via backfill)

---

## Entity: DailyStats (derived — client-side only)

Not persisted as a separate table. Computed in `useTodaysSessions` by summing `elapsed_seconds` grouped by `activity_type` for sessions where `started_at` falls within today's date boundary (timezone-adjusted).

```typescript
interface DailySummary {
  totalSeconds: number;
  byType: {
    story: number;
    game: number;
    video: number;
    creative: number;
  };
}
```

---

## Indexes (existing + new)

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_child_id   ON sessions(child_id);     -- existing
CREATE INDEX IF NOT EXISTS idx_sessions_status      ON sessions(status);        -- existing
CREATE INDEX IF NOT EXISTS idx_sessions_started_at  ON sessions(started_at);   -- existing
CREATE INDEX IF NOT EXISTS idx_sessions_family_id   ON sessions(family_id);    -- NEW — migration 020
```

---

## Migration: `20260613020001_sessions_family_id_live_reports.sql`

```sql
-- spec 020: Add family_id to sessions for CDC filtering and RLS
-- Enables parent to subscribe to live session inserts via postgres_changes
-- filtered by family_id

-- 1. Add family_id column
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

-- 2. Backfill existing rows: set family_id from parent profile
UPDATE sessions s
SET family_id = p.family_id
FROM profiles p
WHERE p.id = s.parent_id AND s.family_id IS NULL;

-- 3. Add index for CDC filter performance
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions(family_id);

-- 4. Update RLS policies to use family_id
DROP POLICY IF EXISTS sessions_child_select ON sessions;
DROP POLICY IF EXISTS sessions_child_insert ON sessions;
DROP POLICY IF EXISTS sessions_child_update ON sessions;

-- Child: read own sessions
CREATE POLICY child_own_sessions_select ON sessions FOR SELECT
    USING (child_id = auth.uid());

-- Child: insert own sessions
CREATE POLICY child_own_sessions_insert ON sessions FOR INSERT
    WITH CHECK (child_id = auth.uid());

-- Child: update own sessions (close them)
CREATE POLICY child_own_sessions_update ON sessions FOR UPDATE
    USING (child_id = auth.uid());

-- Parent: read sessions for their family
CREATE POLICY parent_read_sessions ON sessions FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles
            WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- 5. Enable full replica identity for CDC UPDATE payloads
ALTER TABLE sessions REPLICA IDENTITY FULL;

-- 6. Add sessions to Realtime publication for CDC
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
```

---

## RLS Summary

| Policy name | Operation | Who | Condition |
|-------------|-----------|-----|-----------|
| `child_own_sessions_select` | SELECT | Child | `child_id = auth.uid()` |
| `child_own_sessions_insert` | INSERT | Child | `child_id = auth.uid()` |
| `child_own_sessions_update` | UPDATE | Child | `child_id = auth.uid()` |
| `parent_read_sessions` | SELECT | Parent | `family_id` in parent's family |
