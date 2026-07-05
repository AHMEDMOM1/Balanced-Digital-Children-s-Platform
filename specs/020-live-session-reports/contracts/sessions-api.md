# Contract: Sessions API (`services/api/sessions.ts`)

**Spec**: 020 — Live Session Reports
**Date**: 2026-06-13
**File**: `services/api/sessions.ts`

---

## Types

```typescript
// Activity types — matches useSessionStore.ActivityType (from spec 019)
export type ActivityType = 'story' | 'game' | 'video' | 'creative';

// DB row shape (using actual column names)
export interface SessionRow {
  id: string;              // UUID
  child_id: string;        // UUID
  family_id: string;       // UUID
  parent_id: string | null;// UUID
  activity_type: ActivityType;
  content_item_id: string | null; // UUID FK
  started_at: string;      // ISO timestamp
  ended_at: string | null; // ISO timestamp — null = active
  elapsed_seconds: number; // ≥ 0
  status: 'active' | 'paused' | 'completed' | 'expired';
  created_at: string;      // ISO timestamp
}

// Input for opening a new session
export interface OpenSessionInput {
  child_id: string;
  family_id: string;
  parent_id?: string;
  activity_type: ActivityType;
  content_item_id?: string;
}

// Result from API calls
export interface SessionApiResult<T = void> {
  data: T | null;
  error: string | null;
}

// Daily summary (computed client-side)
export interface DailySummary {
  totalSeconds: number;
  byType: Record<ActivityType, number>;
}
```

---

## Hook: `useSessionWriter` (child device)

```typescript
export function useSessionWriter(
  childId: string,
  familyId: string,
  activityType: ActivityType,
  contentItemId?: string
): {
  sessionId: string | null;
  openSession: () => Promise<SessionApiResult<string>>; // returns sessionId
  closeSession: (elapsedSeconds: number) => Promise<SessionApiResult>;
}
```

**Behaviour**:
- `openSession()`: 
  1. Close any existing active session for this child (FR-009)
  2. INSERT new row with `status='active'`, `ended_at=NULL`
  3. On failure: queue to `AsyncStorage['pending_session_write']` for retry (FR-003)
  4. Return `{ data: newSessionId, error: null }` on success
  5. Emit `console.debug('[sessions] session opened', { activityType, contentItemId })`

- `closeSession(elapsedSeconds)`:
  1. Clamp `elapsedSeconds` to `Math.max(0, elapsedSeconds)` (FR-002)
  2. UPDATE row: `ended_at=now()`, `elapsed_seconds=clamped`, `status='completed'`
  3. Emit `console.debug('[sessions] session closed', { elapsedSeconds: clamped })`

---

## Hook: `useTodaysSessions` (parent device)

```typescript
export function useTodaysSessions(
  childId: string,
  familyId: string,
  tzOffsetMinutes: number
): {
  sessions: SessionRow[];
  isLoading: boolean;
  error: string | null;
  summary: DailySummary;
}
```

**Behaviour**:
1. On mount: SELECT sessions for `childId` where `started_at` falls in today (timezone-adjusted by `tzOffsetMinutes`) — order by `started_at ASC` (FR-005, FR-010)
2. Compute `summary` from fetched sessions (FR-006)
3. Subscribe to CDC `postgres_changes` INSERT on `sessions` WHERE `family_id=eq.${familyId}` — append new rows
4. Subscribe to CDC `postgres_changes` UPDATE on `sessions` WHERE `family_id=eq.${familyId}` — replace matching row (captures `ended_at` set by child)
5. Emit `console.debug('[sessions] today fetch', { count })` and `console.debug('[sessions] live insert', { activityType })`
6. On unmount: remove channel

---

## Function: `recoverAbandonedSessions` (called once on child launch)

```typescript
export async function recoverAbandonedSessions(
  childId: string
): Promise<SessionApiResult<number>>
// Returns count of recovered sessions
```

**Behaviour**:
1. SELECT sessions WHERE `child_id=childId AND status='active'`
2. For each found: UPDATE `ended_at=started_at`, `elapsed_seconds=0`, `status='expired'`
3. Emit `console.warn('[sessions] recovered abandoned session', { sessionId })` per session
4. Return `{ data: recoveredCount, error: null }`

---

## Function: `drainPendingSessionQueue` (called on reconnect)

```typescript
export async function drainPendingSessionQueue(): Promise<void>
```

**Behaviour**:
1. Read `AsyncStorage['pending_session_write']`
2. If entry exists: attempt INSERT
3. On success: delete from AsyncStorage
4. On failure: leave in AsyncStorage for next reconnect attempt

---

## Observability (Constitution §V)

All functions must emit structured logs:
- `console.debug('[sessions] <action>', { ...context })` — normal operations
- `console.warn('[sessions] <warning>', { ...context })` — recovered abandoned, queue drain
- `console.error('[sessions] <error>', { error })` — unexpected failures
