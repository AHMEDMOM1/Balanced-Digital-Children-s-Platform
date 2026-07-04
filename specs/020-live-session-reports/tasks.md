# Tasks: Live Session Reports (Child → Parent Data)

**Input**: Design documents from `specs/020-live-session-reports/`

**Branch**: `019-realtime-channel-launch`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete sibling tasks)
- **[Story]**: Maps to user story from spec.md

## Path Conventions

React Native Expo project at repository root:
- Services: `services/api/`
- Stores: `store/`
- Components: `components/`
- Screens: `app/(parent)/`, `app/(child)/`
- Migrations: `supabase/migrations/`
- Tests: `tests/integration/`

---

## Phase 1: Setup

**Purpose**: Add npm script before any implementation begins.

- [x] T001 Add `"test:live-sessions": "jest --testPathPattern=tests/integration/liveSessionReports --runInBand"` to the `scripts` block in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB migration and TypeScript types that all three user stories depend on. Must be complete before any story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create migration file `supabase/migrations/20260613020001_sessions_family_id_live_reports.sql` with the exact SQL from `specs/020-live-session-reports/data-model.md` §Migration section: ADD COLUMN family_id, backfill from parent profiles, ADD INDEX, DROP and recreate RLS policies (child_own_sessions_select/insert/update, parent_read_sessions), ALTER TABLE sessions REPLICA IDENTITY FULL, ALTER PUBLICATION supabase_realtime ADD TABLE sessions
- [x] T003 [P] Define and export TypeScript types `ActivityType`, `SessionRow`, `OpenSessionInput`, `SessionApiResult<T>`, `DailySummary` in `services/api/sessions.ts` using the exact shapes from `specs/020-live-session-reports/contracts/sessions-api.md` §Types — create the file with type-only exports (no implementation yet)
- [x] T004 [P] TDD cycle for `computeDailySummary` — (1) write Scenario H unit test first in `tests/integration/liveSessionReports.test.ts` (RED gate): call `computeDailySummary` with `[{activity_type:'story',elapsed_seconds:600},{activity_type:'story',elapsed_seconds:300},{activity_type:'game',elapsed_seconds:900}]`; assert `totalSeconds=1800`, `byType.story=900`, `byType.game=900`, `byType.video=0`, `byType.creative=0`; confirm test FAILS before implementation; (2) then implement and export `computeDailySummary(sessions: Pick<SessionRow, 'activity_type' | 'elapsed_seconds'>[]): DailySummary` in `services/api/sessions.ts`; sum `elapsed_seconds` per `activity_type`; initialise all four keys to 0; confirm Scenario H now passes (GREEN)

**Checkpoint**: Migration SQL ready to apply; TypeScript types and `computeDailySummary` exported — all user stories can now build on correct types.

---

## Phase 3: User Story 1 — Child Session Tracking Written to DB (Priority: P1) 🎯 MVP

**Goal**: Child content screens write session rows to DB when content starts and ends; abandoned sessions (app crash) are recovered and closed on relaunch; failed writes are queued and retried on reconnect.

**Independent Test**: Scenarios A, B, E pass in `tests/integration/liveSessionReports.test.ts`.

### Tests for User Story 1 (TDD — write first, RED gate before T006)

- [x] T005 [US1] Write Scenarios A, B, B2, E in `tests/integration/liveSessionReports.test.ts`:
  - Use `maybeDescribe` guard (skip without credentials), stable UUIDs `TEST_FAMILY_ID='f4444444-0000-0000-0000-000000000020'`, `TEST_PARENT_ID='a4444444-0000-0000-0000-000000000020'`, `TEST_CHILD_ID='c4444444-0000-0000-0000-000000000020'`; seed profiles in `beforeAll`, clean up sessions + profiles in `afterAll`
  - **Scenario A**: Service client inserts session row with `activity_type='game'`, `family_id=TEST_FAMILY_ID`, `status='active'`, `ended_at=null`; assert row exists with correct fields
  - **Scenario B**: Insert active session, then update with `ended_at`, `elapsed_seconds=120`, `status='completed'`; assert both fields set and `elapsed_seconds >= 0`
  - **Scenario B2** (SC-003 accuracy): record `const t0 = Date.now()` before insert; `await new Promise(r => setTimeout(r, 1000))`; close session with `elapsed = Math.round((Date.now() - t0) / 1000)`; assert `Math.abs(closed.elapsed_seconds - elapsed) <= 5` — verifies stored duration is accurate to within 5 seconds of actual elapsed time
  - **Scenario E**: Insert session with `status='active'` and `started_at` in the past; update to `ended_at=started_at`, `elapsed_seconds=0`, `status='expired'`; assert `elapsed_seconds=0` (abandoned recovery)

### Implementation for User Story 1

- [x] T006 [US1] Implement `recoverAbandonedSessions(childId: string): Promise<SessionApiResult<number>>` in `services/api/sessions.ts`: SELECT sessions WHERE `child_id=childId AND status='active'`; UPDATE each to `ended_at=started_at, elapsed_seconds=0, status='expired'`; emit `console.warn('[sessions] recovered abandoned session', { sessionId })` per row; return `{ data: count, error: null }`
- [x] T007 [US1] Implement `drainPendingSessionQueue(): Promise<void>` in `services/api/sessions.ts`: read `AsyncStorage.getItem('pending_session_write')`; if present, parse JSON and attempt `supabase.from('sessions').insert(row)`; on success call `AsyncStorage.removeItem('pending_session_write')`; emit `console.warn('[sessions] drained pending session', { activityType })` on success; on failure leave in AsyncStorage for next call
- [x] T008 [US1] Implement `useSessionWriter(childId, familyId, activityType, contentItemId?)` hook in `services/api/sessions.ts` per the contract in `specs/020-live-session-reports/contracts/sessions-api.md`: `openSession()` — close any existing active session first (SELECT + UPDATE status='expired'), then INSERT new row; on INSERT failure write to `AsyncStorage['pending_session_write']`; `closeSession(elapsed)` — clamp `Math.max(0, elapsed)`, UPDATE `ended_at=now(), elapsed_seconds=clamped, status='completed'`; emit `console.debug` on both operations
- [x] T009 [P] [US1] Wire `useSessionWriter` into `app/(child)/game/[id].tsx`: destructure `id` from route params; call `useSessionWriter(childId, familyId, 'game', id)`; call `openSession()` in `useEffect(() => { openSession(); return () => closeSession(elapsedSeconds); }, [])` using elapsed from `useSessionStore`; read `childId` and `familyId` from `useAuthStore`
- [x] T010 [P] [US1] Wire `useSessionWriter` into `app/(child)/story/[id].tsx`: same pattern as T009 with `activity_type='story'` and `content_item_id=id`
- [x] T011 [P] [US1] Wire `useSessionWriter` into `app/(child)/video/[id].tsx`: same pattern as T009 with `activity_type='video'` and `content_item_id=id`
- [x] T012 [P] [US1] Wire `useSessionWriter` into `app/(child)/creative.tsx`: same pattern as T009 with `activity_type='creative'` and no `content_item_id` (pass undefined)
- [x] T013 [US1] In `app/(child)/_layout.tsx`: after child PIN verification succeeds (after auth state confirms `role='child'`), call `recoverAbandonedSessions(childId)` once; in `components/RealtimeProvider.tsx`: in the SUBSCRIBED status handler after reconnect (where `handleReconnect()` is called), also call `drainPendingSessionQueue()`; import both from `services/api/sessions`

**Checkpoint**: Scenarios A, B, E pass — US1 is fully verified. Sessions are written and recovered correctly.

---

## Phase 4: User Story 2 — Parent Dashboard Receives Live Session Updates (Priority: P2)

**Goal**: Parent dashboard loads all of today's child sessions on mount (FR-010), then subscribes to live CDC inserts and updates for real-time visibility within 10 seconds (SC-001).

**Independent Test**: Scenarios C, D, G pass in `tests/integration/liveSessionReports.test.ts`.

### Tests for User Story 2 (TDD — RED gate before T015)

- [x] T014 [US2] Add Scenarios C, D, G to `tests/integration/liveSessionReports.test.ts`:
  - **Scenario C**: Service client subscribes via `postgres_changes` INSERT on sessions WHERE `family_id=eq.TEST_FAMILY_ID`; anon client (child) inserts a session row; assert INSERT payload received within 5000ms; wrap in try/catch catching `'CDC_NOT_ENABLED'` — emit `console.warn` and skip if migration not applied (same pattern as spec 019 Scenario C)
  - **Scenario D**: Subscribe to postgres_changes UPDATE on sessions; insert then UPDATE `ended_at` and `elapsed_seconds`; assert UPDATE payload arrives with `ended_at` set within 5000ms; same CDC_NOT_ENABLED skip pattern
  - **Scenario G** (positive RLS): use `anonClient` signed in as a parent user (create via `serviceClient.auth.admin.createUser`, sign in via `anonClient.auth.signInWithPassword`); insert session rows for `TEST_FAMILY_ID` via serviceClient; query as authenticated parent anon client → assert rows returned with correct `family_id`
  - **Scenario G2** (negative RLS): insert session rows for `OTHER_FAMILY_ID='f9999999-0000-0000-0000-000000000020'` via serviceClient; query as the same authenticated parent anon client → assert 0 rows returned (RLS blocks cross-family reads); clean up OTHER_FAMILY_ID rows in afterAll

### Implementation for User Story 2

- [x] T015 [US2] Implement `useTodaysSessions(childId, familyId, tzOffsetMinutes)` hook in `services/api/sessions.ts` per `specs/020-live-session-reports/contracts/sessions-api.md` §Hook: useTodaysSessions: Phase 1 on mount — compute today's UTC start/end boundaries using `tzOffsetMinutes` (function `todayBoundaryUTC`), SELECT sessions WHERE `child_id=childId AND started_at >= start AND started_at < end` ORDER BY started_at ASC, set `sessions` state; compute `summary` via `computeDailySummary`; Phase 2 — subscribe to postgres_changes INSERT on sessions WHERE `family_id=eq.${familyId}` → append row; subscribe to postgres_changes UPDATE → replace row in state; cleanup removes channel; return `{ sessions, isLoading, error, summary }`
- [x] T016 [US2] Update `app/(parent)/index.tsx`: import `useTodaysSessions` from `services/api/sessions`; read `tzOffsetMinutes` from `children[0]?.timezone_offset_minutes ?? 0` via `useAuthStore`; call `useTodaysSessions(firstChild?.id, parentData?.familyId, tzOffsetMinutes)` when `firstChild` exists; replace the hardcoded `<ActivityItem>` mock entries in the "Recent Activity" section with `sessions.map(s => <ActivityItem ... />)` showing real `activity_type`, `started_at` time, and `elapsed_seconds / 60` minutes; show `isLoading` spinner while loading; show empty state "No activity yet today" when `sessions.length === 0`

**Checkpoint**: Scenarios C, D, G pass — live session updates reach the parent dashboard within 10 seconds.

---

## Phase 5: User Story 3 — Daily Summary Visible to Parent (Priority: P3)

**Goal**: Parent dashboard shows total screen time for the day and a per-type breakdown (stories, games, videos, creative) derived from the session list already loaded in US2.

**Independent Test**: Scenarios F, H pass in `tests/integration/liveSessionReports.test.ts`.

### Tests for User Story 3 (TDD — RED gate before T018)

- [x] T017 [US3] Add Scenario F to `tests/integration/liveSessionReports.test.ts`:
  - **Scenario F** (integration): insert one session with `started_at` set to yesterday UTC and one with today UTC; query with `tzOffsetMinutes=0`; assert only today's session is returned; confirm yesterday's session is excluded
  - (Scenario H already written and passing from T004 — no duplicate needed)

### Implementation for User Story 3

- [x] T018 [US3] Update `app/(parent)/index.tsx`: below the "Recent Activity" section, add a daily summary card that reads `summary` from `useTodaysSessions` (already available from T016); display `Math.floor(summary.totalSeconds / 60)` as total minutes; display per-type rows for each `ActivityType` where `summary.byType[type] > 0` showing icon + label + minutes; show an empty-state message "No activity yet today" only when `summary.totalSeconds === 0` (replacing the generic empty-state placeholder if any)

**Checkpoint**: Scenarios F, H pass — daily summary renders correctly with per-type breakdown.

---

## Phase 6: Polish & Validation

**Purpose**: Quality gates across all stories.

- [x] T019 Run `npm run test:live-sessions` and confirm all 8 scenarios (A–H) pass (Scenarios C and D may skip with warning if migration not applied); fix any remaining failures
- [x] T020 [P] Run `npx tsc --noEmit` and fix any TypeScript errors introduced in T002–T018
- [x] T021 [P] Run `npm run test` and confirm full test suite (unit + integration) still passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — T003 and T004 are parallel within Phase 2; T002 (migration) is independent
- **US1 (Phase 3)**: Depends on Foundational — T005 first (RED gate), then T006–T012 in parallel where marked, then T013
- **US2 (Phase 4)**: Depends on Foundational + US1 (shares `services/api/sessions.ts`) — T014 first (RED gate), then T015, then T016
- **US3 (Phase 5)**: Depends on US2 (reads `summary` from `useTodaysSessions`) — T017 first (RED gate), then T018
- **Polish (Phase 6)**: Depends on all story phases complete

### User Story Dependencies

- **US1**: Foundational complete — no dependency on US2 or US3
- **US2**: Foundational + US1 complete (`useTodaysSessions` builds on same sessions.ts file)
- **US3**: US2 complete (`summary` from `useTodaysSessions`; only parent dashboard changes)

### Within Each User Story

- Write tests FIRST (RED), then implement until tests pass (GREEN)
- T006, T007, T008 must complete before T009–T013 (hook not yet implemented)
- Content screen tasks T009–T012 are parallel (different files)
- T015 before T016 (hook before screen)
- T017 before T018 (tests before implementation)

---

## Parallel Opportunities

```bash
# Phase 2 — all three can start at once:
T002: supabase/migrations/...sql     ← migration file
T003: services/api/sessions.ts       ← types only
T004: services/api/sessions.ts       ← computeDailySummary (merge with T003 if editing same file)

# Phase 3 (US1) — content screens parallel after T008:
T009: app/(child)/game/[id].tsx      ← game screen
T010: app/(child)/story/[id].tsx     ← story screen
T011: app/(child)/video/[id].tsx     ← video screen
T012: app/(child)/creative.tsx       ← creative screen

# Phase 6 — parallel after T019:
T020: npx tsc --noEmit
T021: npm run test
```

---

## Implementation Strategy

### MVP First (US1 — session writes confirmed)

1. T001 Setup (npm script)
2. T002–T004 Foundational (migration + types)
3. T005 US1 tests — RED gate
4. T006–T013 US1 implementation
5. T019 validate US1 scenarios pass
6. **STOP and VALIDATE** — sessions are being written to DB ✓

### Incremental Delivery

1. Setup + Foundational → types and migration ready
2. US1 → sessions written on child device; DB has real data
3. US2 → parent dashboard shows live sessions
4. US3 → daily summary card added
5. Each increment is independently testable

---

## Notes

- [P] = different files, no incomplete dependencies — safe to run in parallel
- [US1/US2/US3] = maps directly to spec.md user story priorities
- TDD gate: write test before implementing; confirm RED before writing code; confirm GREEN after
- `services/api/sessions.ts` is touched by US1 (T003, T004, T006, T007, T008, T015) and US3 (T004) — execute these sequentially within each story phase
- `app/(parent)/index.tsx` is touched by both US2 (T016) and US3 (T018) — execute these sequentially
- Stable test UUIDs use family prefix `f4444...020`, parent `a4444...020`, child `c4444...020` to avoid collisions with spec 018 and 019 test data
- Scenarios C and D (CDC) will skip with console.warn if migration `20260613020001` has not been applied — this is intentional (same pattern as spec 019 Scenario C)
