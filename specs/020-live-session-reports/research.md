# Research: Live Session Reports (Spec 020)

**Date**: 2026-06-13
**Resolved**: All NEEDS CLARIFICATION items addressed below

---

## Decision 1: Existing `sessions` Table Schema vs Spec

**Decision**: Use the existing `sessions` table schema as the source of truth; adapt plan to use real column names.

**Rationale**: The `sessions` table was created in `20260609000000_full_schema_bootstrap.sql` and already has RLS enabled plus three indexes. Renaming columns mid-project would require a destructive migration and force every consumer to update. The spec's field names (`content_type`, `content_id`, `duration_seconds`) are logical names; the implementation maps to the actual column names below:

| Spec field name   | Actual column name  | Notes |
|-------------------|---------------------|-------|
| `content_type`    | `activity_type`     | TEXT, NOT NULL |
| `content_id`      | `content_item_id`   | UUID FK → `content_items.id` (nullable) |
| `duration_seconds`| `elapsed_seconds`   | INTEGER DEFAULT 0 |
| `family_id`       | (missing)           | Must be added via migration — see Decision 2 |

**Existing extra columns** (not in spec, keep as-is):
- `parent_id UUID` — references the parent profile (existing FK)  
- `status TEXT` — 'active'/'paused'/'completed'/'expired' (existing CHECK constraint)
- `created_at TIMESTAMPTZ` — row creation timestamp

**Alternatives considered**:
- Create a new `session_reports` table — rejected (duplicates data; adds complexity)
- Rename columns via migration — rejected (destructive; touches all existing code)

---

## Decision 2: Add `family_id` to `sessions` Table

**Decision**: Add `family_id` UUID NOT NULL REFERENCES families(id) via migration `20260613020001_sessions_family_id_live_reports.sql`.

**Rationale**: `family_id` is required for two purposes:
1. CDC subscription filtering: `filter: family_id=eq.${familyId}` so parent only receives their family's sessions
2. RLS policy update: simpler family-scoped `parent_read_sessions` policy using `family_id` instead of checking `parent_id = auth.uid()`

The existing `parent_id` column remains; `family_id` is added alongside it for CDC-compatibility.

**Migration tasks**:
1. `ALTER TABLE sessions ADD COLUMN family_id UUID REFERENCES families(id);`
2. Update existing RLS policies to also check `family_id`
3. `ALTER TABLE sessions REPLICA IDENTITY FULL;` (for CDC UPDATE payloads)
4. `ALTER PUBLICATION supabase_realtime ADD TABLE sessions;`

---

## Decision 3: Session Write Trigger Points (Child)

**Decision**: Use React Native navigation lifecycle events (`useFocusEffect` / screen unmount) to trigger session writes, tied to `useSessionStore.currentActivity`.

**Rationale**: The existing `useSessionStore` already tracks `currentActivity` and `currentContentId` (added in spec 019). Content screens (`app/(child)/game/[id].tsx`, `app/(child)/creative.tsx`, stories, videos) each gain a `useSessionWriter` hook call:
- `onMount`: call `insertSession({ activity_type, content_item_id, child_id, family_id, parent_id })`
- `onUnmount`: call `closeSession(sessionId, elapsed_seconds)`

**FR-009 enforcement** (one active session at a time): Query for any open session before inserting; close it first if found. Done client-side in `services/api/sessions.ts`.

**Alternatives considered**:
- DB trigger to auto-close old sessions — rejected (complex, hard to test, YAGNI)
- Centralize in `RealtimeProvider` — rejected (tight coupling; content screens already know their activity type)

---

## Decision 4: Parent Dashboard Load Strategy (FR-010)

**Decision**: Two-phase load — fetch today's sessions from DB on mount, then activate CDC subscription for live inserts.

**Rationale**: This ensures sessions created before the parent opened the dashboard (including offline periods) are immediately visible. The CDC subscription then provides ≤10s latency for new sessions (SC-001). Without the initial fetch, any session started before the parent opened the dashboard would be invisible until the next restart.

**Implementation**:
```
useTodaysSessions(childId, familyId):
  1. useEffect → SELECT * FROM sessions WHERE child_id=childId AND DATE(started_at)=today ORDER BY started_at ASC
  2. Set sessions state from result
  3. Subscribe to postgres_changes INSERT on sessions WHERE family_id=familyId
  4. On new INSERT: append to sessions state
  5. Subscribe to postgres_changes UPDATE on sessions WHERE family_id=familyId
  6. On UPDATE: replace matching row in sessions state (captures ended_at / elapsed_seconds)
  7. Cleanup: remove channel on unmount
```

---

## Decision 5: Abandoned Session Recovery (FR-007)

**Decision**: On child app launch, query for any session with `status = 'active'` and `child_id = thisChildId`. If found and `started_at` is from a prior app run (detected via session store `sessionStartTime = null`), close it with `ended_at = started_at` and `elapsed_seconds = 0`.

**Rationale**: The "last known timestamp" is `started_at` when no better data is available. Zero duration is honest. The session is preserved (not deleted) so the parent can see that a session started but ended unexpectedly.

**Implementation location**: `services/api/sessions.ts → recoverAbandonedSessions(childId)`; called in child `_layout.tsx` on mount after auth.

---

## Decision 6: Session Write Queue (FR-003 — Offline Resilience)

**Decision**: If the initial session-start INSERT fails, store the pending session in `AsyncStorage` under key `pending_session_write` and retry on next network connectivity event.

**Rationale**: Mirrors the offline command queue pattern from spec 019. Keeps play experience uninterrupted. A single pending slot is sufficient (only one session active at a time per child).

**Implementation**: `services/api/sessions.ts` — wrap INSERT in try/catch; on failure, persist to AsyncStorage; on reconnect (`RealtimeProvider` CHANNEL_JOINED event), drain the queue.

---

## Decision 7: "Today" Date Boundary (Constitution §Timezone Handling)

**Decision**: "Today" is determined using `profiles.timezone_offset_minutes` for the child. All DB queries for "today's sessions" use the child's local date, not UTC.

**Rationale**: Constitution mandates: "All child-facing date boundaries use `profiles.timezone_offset_minutes`". Without this, a child in UTC+8 would see yesterday's sessions at midnight UTC.

**Query pattern**:
```sql
WHERE child_id = $childId
  AND started_at >= (CURRENT_DATE AT TIME ZONE 'UTC') - (INTERVAL '1 minute' * $tzOffset)
  AND started_at <  (CURRENT_DATE AT TIME ZONE 'UTC') - (INTERVAL '1 minute' * $tzOffset) + INTERVAL '1 day'
```

Client-side: compute the start-of-day boundary in UTC adjusted for `tzOffset`, pass as query param.

---

## Decision 8: RLS Policies for `sessions`

**Decision**: Update `sessions` RLS policies to:
- `child_own_sessions` (INSERT/UPDATE): `child_id = auth.uid()`
- `parent_read_sessions` (SELECT): `family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent')`
- Service role only for recovery/migration operations

**Rationale**: Constitution mandates the `parent_read_<table>`, `child_own_<table>` pattern. Current policies use `parent_id = auth.uid()` which requires the parent to know their `parent_id` — switching to `family_id` is more robust and consistent with the family-first architecture.

---

## Mapping: Spec FRs → Implementation

| FR | Implementation |
|----|----------------|
| FR-001 | `insertSession()` called on content screen mount |
| FR-002 | `closeSession()` called on content screen unmount; clamps to 0 |
| FR-003 | AsyncStorage queue + retry on reconnect |
| FR-004 | Supabase CDC INSERT subscription → parent dashboard state |
| FR-005 | Initial fetch + live list in parent dashboard |
| FR-006 | Client-side sum of `elapsed_seconds` |
| FR-007 | `recoverAbandonedSessions()` on child app launch |
| FR-008 | RLS `parent_read_sessions` policy |
| FR-009 | Close existing active session before inserting new one |
| FR-010 | Two-phase load: fetch then subscribe |
