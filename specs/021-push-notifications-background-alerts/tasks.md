# Tasks: Push Notifications — Background Alerts

**Input**: Design documents from `specs/021-push-notifications-background-alerts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/notifications-api.md, quickstart.md

**Tests**: TDD required (constitution §I). Test tasks write and RED before their paired implementation tasks.

**Organization**: Tasks grouped by user story. US1 (screen time alert) → US2 (blocked content alert) → US3 (session end summary).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are project-relative from repo root

## Path Conventions

- Client code: `app/`, `services/`, `components/`
- Tests: `tests/integration/`, `tests/unit/`
- DB: `supabase/migrations/`, `supabase/functions/`

---

## Phase 1: Setup

**Purpose**: Install package dependency and add TypeScript types before writing any tests or implementation.

- [ ] T001 Install expo-notifications via `npx expo install expo-notifications` and add `"test:notifications": "jest --testPathPattern=tests/(integration|unit)/notifications --runInBand --forceExit"` to scripts in package.json
- [ ] T002 Add TypeScript types to services/api/types.ts: `NotificationEventType`, `NotificationEventStatus`, `NotificationTriggerRow`, `NotificationEventRow`, `NotificationTriggerInput`, `NotificationApiResult` (see contracts/notifications-api.md for exact shapes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB migration must exist before integration tests can reference the tables.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Create supabase/migrations/20260613021001_push_notifications.sql — CREATE TABLE notification_triggers + indexes + RLS (child INSERT own row, parent SELECT family, service role all); CREATE TABLE notification_events + indexes + RLS (parent SELECT family, service role INSERT); ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_session_end_enabled BOOLEAN NOT NULL DEFAULT TRUE (see data-model.md for exact SQL)

**Checkpoint**: Migration file exists. `npm run test:notifications` will now find table references (though integration scenarios skip without live credentials).

---

## Phase 3: User Story 1 — Screen Time Limit Alert (Priority: P1) 🎯 MVP

**Goal**: When the child reaches their daily screen time limit, the parent receives a push notification within 60 seconds — even with the parent app closed.

**Independent Test**: `npm run test:notifications` — Scenario K (computeNotificationText unit), Scenario A (token upsert), Scenario G (suppressed_no_token), Scenario I (RLS: anon cannot read notification_events) all pass without the Edge Function running.

### Tests for User Story 1 (TDD — write RED first) ⚠️

> **Write these tests FIRST and confirm they FAIL before implementing T006–T012**

- [ ] T004 [P] [US1] Write Scenario K unit test in tests/unit/notifications/computeNotificationText.test.ts — import `computeNotificationText` (not yet exported from services/api/notifications.ts), call with `('time_limit_reached', 'Alex', { elapsed_seconds: 1800 })`, assert body contains 'Alex' and '30 minutes' — CONFIRM RED
- [ ] T005 [P] [US1] Write integration Scenarios A, G, I in tests/integration/notifications.test.ts — Scenario A: serviceClient upsert to device_registrations and assert token stored; Scenario G: serviceClient insert suppressed_no_token notification_event and assert status; Scenario I: anonClient SELECT notification_events and assert empty (RLS) — skip block with `describe.skip` if no credentials — CONFIRM RED

### Implementation for User Story 1

- [ ] T006 [US1] Implement `computeNotificationText` pure function and `useNotificationSetup` hook in services/api/notifications.ts — `computeNotificationText(eventType, childName, metadata)` returns `{ title, body }` per templates in contracts/notifications-api.md; `useNotificationSetup` requests OS permission via expo-notifications, retrieves ExponentPushToken, upserts to device_registrations on (profile_id, family_id) conflict, calls `Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false }) })` (T004 must be RED)
- [ ] T007 [US1] Implement `writeNotificationTrigger` function in services/api/notifications.ts — INSERT row to notification_triggers with NotificationTriggerInput fields, return `{ data: { triggerId }, error: null }` on success or `{ data: null, error }` on failure; log `console.warn('[notifications] failed to write trigger', error)` on error (T005 must be RED)
- [ ] T008 [US1] Wire `useNotificationSetup` into app/(parent)/_layout.tsx — add `useEffect` watching `parentData?.id` that calls `useNotificationSetup({ id: parentData.id, familyId: parentData.familyId })` after successful login
- [ ] T009 [US1] Wire `writeNotificationTrigger` for `time_limit_reached` in app/(child)/_layout.tsx — when the child's daily timer fires the limit-reached event, call `writeNotificationTrigger({ family_id, child_id, parent_id, event_type: 'time_limit_reached', metadata: { elapsed_seconds } })`
- [ ] T010 [US1] Create supabase/functions/dispatch-notification/index.ts — Edge Function skeleton: parse Supabase DB webhook POST payload, extract `record` fields (parent_id, child_id, family_id, event_type, metadata), fetch parent device token from device_registrations WHERE profile_id = parent_id, if no token INSERT notification_events with status='suppressed_no_token', UPDATE notification_triggers SET processed_at=now(), return 200
- [ ] T011 [US1] Add time_limit_reached happy path to supabase/functions/dispatch-notification/index.ts — **skip de-dup check for time_limit_reached** (FR-007 exemption: each limit-reached event always generates its own notification); fetch child name from profiles, build notification text, POST to `https://exp.host/--/api/v2/push/send`, INSERT notification_events with status='dispatched' or 'failed', UPDATE processed_at
- [ ] T012 [US1] Configure Supabase DB Webhook in Supabase dashboard (manual step): event=INSERT, table=notification_triggers, HTTP POST to dispatch-notification Edge Function URL, Authorization header = Bearer service role key — document webhook URL and setup steps as a comment in supabase/functions/dispatch-notification/index.ts
- [ ] T027 [US1] Add permission-denied in-app prompt to app/(parent)/_layout.tsx — when `useNotificationSetup` returns `permissionStatus === 'denied'`, render a dismissable `<Banner>` (or equivalent) component prompting the parent to enable notifications in device Settings; hide once permission is granted on subsequent app opens (covers FR-010, SC-005)

**Checkpoint**: `npm run test:notifications` — Scenario K passes (unit). Scenarios A, G, I pass with credentials. Scenario B passes once webhook is configured on live DB.

---

## Phase 4: User Story 2 — Blocked Content Attempt Alert (Priority: P2)

**Goal**: When the child tries to navigate to a blocked content category, the parent receives a push notification within 60 seconds with per-category 5-minute flood protection.

**Independent Test**: `npm run test:notifications` — Scenario C (blocked_content_attempted trigger insert) and Scenario F (de-dup window query) pass.

### Tests for User Story 2 (TDD — write RED first) ⚠️

- [ ] T013 [P] [US2] Add Scenarios C and F to tests/integration/notifications.test.ts — Scenario C: serviceClient insert blocked_content_attempted trigger with metadata={ category: 'videos' }, assert row stored with correct category; Scenario F: insert dispatched notification_event 1 minute ago, SELECT notification_events with 5-min window and category_key='videos', assert count=1 — CONFIRM RED before T014–T015

### Implementation for User Story 2

- [ ] T014 [US2] Wire `writeNotificationTrigger` for `blocked_content_attempted` in app/(child)/_layout.tsx — when navigation to a blocked category is intercepted, call `writeNotificationTrigger({ family_id, child_id, parent_id, event_type: 'blocked_content_attempted', metadata: { category: blockedCategoryName } })`
- [ ] T015 [US2] Add blocked_content_attempted dispatch path in supabase/functions/dispatch-notification/index.ts — extract `category_key` from `metadata.category`; de-dup check includes `category_key` in WHERE clause; build "blocked content attempted" notification text using child name and category; dispatch via Expo Push API; INSERT notification_events with category_key populated

**Checkpoint**: Scenarios C and F pass. Blocked content alerts fire once per category per 5-minute window.

---

## Phase 5: User Story 3 — Session End Summary (Priority: P3)

**Goal**: When a child session ends (lasting ≥1 minute), the parent receives a summary notification. Parent can opt out. Notification history is visible in the parent dashboard.

**Independent Test**: `npm run test:notifications` — Scenarios D (session_ended trigger ≥60s), E (suppressed_duration event), H (opt-out preference toggle), J (RLS: child can INSERT own triggers) all pass.

### Tests for User Story 3 (TDD — write RED first) ⚠️

- [ ] T016 [P] [US3] Add Scenarios D, E, H, J to tests/integration/notifications.test.ts — D: insert session_ended trigger with elapsed_seconds=620, assert row exists; E: insert suppressed_duration notification_event, assert status; H: UPDATE profiles SET notification_session_end_enabled=false, assert, restore to true; J: sign in as child user (auth.uid()=TEST_CHILD_ID), insert own trigger, assert no RLS error — CONFIRM RED before T017–T022

### Implementation for User Story 3

- [ ] T017 [US3] Implement `updateNotificationPreference` function in services/api/notifications.ts — UPDATE profiles SET notification_session_end_enabled=sessionEndEnabled WHERE id=parentId, log `console.debug('[notifications] preference updated', { sessionEndEnabled })`, return `{ data: null, error: null }` or error
- [ ] T018 [US3] Wire `writeNotificationTrigger` in services/api/sessions.ts `closeSession()` — after successfully updating session end_time, if `elapsed_seconds >= 60` call `writeNotificationTrigger({ family_id, child_id, parent_id, event_type: 'session_ended', metadata: { elapsed_seconds } })` as fire-and-forget (do not await, do not fail closeSession on trigger error)
- [ ] T019 [US3] Add session_ended dispatch path in supabase/functions/dispatch-notification/index.ts — if elapsed_seconds < 60 → INSERT notification_events with status='suppressed_duration' and return; fetch profiles.notification_session_end_enabled for parent_id → if false INSERT notification_events with status='suppressed_pref' and return; otherwise de-dup check, build session-end notification text, dispatch, INSERT dispatched/failed event (note: 'suppressed_pref' is already in the migration CHECK constraint per T003 — no additional migration change needed)
- [ ] T020 [US3] Implement `useNotificationEvents` hook in services/api/notifications.ts — SELECT from notification_events WHERE family_id=familyId ORDER BY created_at DESC LIMIT 50, return `{ events: NotificationEventRow[], isLoading: boolean, error: string | null }`
- [ ] T021 [US3] Add notification history section to app/(parent)/index.tsx — call `useNotificationEvents(parentId, familyId)`, render last 10 events showing event_type label, status badge (dispatched=green, failed=red, suppressed*=grey), and relative timestamp
- [ ] T022 [US3] Add session-end notification preference toggle to app/(parent)/control.tsx — render a Switch component bound to a local state initialized from parent profile's `notification_session_end_enabled`, call `updateNotificationPreference(parentId, enabled)` on toggle change

**Checkpoint**: All 11 quickstart.md scenarios pass (K without credentials; A–J with live DB and webhook configured).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: TypeScript hygiene, test isolation, and full suite validation.

- [ ] T023 Add `jest.mock('../../services/api/notifications', () => ({ useNotificationSetup: jest.fn(), writeNotificationTrigger: jest.fn(), useNotificationEvents: jest.fn(() => ({ events: [], isLoading: false, error: null })), updateNotificationPreference: jest.fn() }))` to any unit test files for components that transitively import services/api/notifications.ts (prevents Supabase client eager creation in unit tests — follow pattern from tests/unit/game/gameScreen.test.tsx)
- [ ] T024 [P] Run `npx tsc --noEmit` and `npm run lint` from repo root and fix all TypeScript + ESLint errors introduced by this feature (types in services/api/types.ts, Edge Function Deno types, app layout types)
- [ ] T025 [P] Run `npm run test:notifications` and confirm: Scenario K passes (no credentials needed); Scenarios A, G, I, J pass with credentials; Scenarios B–H are skipped (not failed) when credentials absent
- [ ] T026 Run `npm test` (full suite) and confirm no regressions in pre-existing tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: T003 can start as soon as T001–T002 are done (types referenced in migration comments)
- **User Story Phases (3–5)**: All depend on Phase 2 completion
  - US1 (Phase 3): T004, T005 RED → then T006–T012
  - US2 (Phase 4): T013 RED → then T014–T015 (T007, T010 from US1 must be complete)
  - US3 (Phase 5): T016 RED → then T017–T022 (T007, T010, T011 from US1 must be complete)
- **Polish (Phase 6)**: Depends on all US phases complete

### User Story Dependencies

- **US1 (P1)**: Provides `writeNotificationTrigger`, `computeNotificationText`, and Edge Function skeleton — required by US2 and US3
- **US2 (P2)**: Extends Edge Function from US1 with blocked content path; `writeNotificationTrigger` already available
- **US3 (P3)**: Extends Edge Function from US1 with session-end path; adds `updateNotificationPreference` and `useNotificationEvents`

### Within Each User Story

- TDD: test tasks RED before implementation tasks
- services/api/notifications.ts functions (T006, T007) before screen wiring (T008, T009)
- Edge Function skeleton (T010) before dispatch path (T011)
- T012 (DB Webhook) is a manual step and can overlap with T008–T011

### Parallel Opportunities

- T004 and T005 can run in parallel (different test files)
- T008, T009, T010 can run in parallel after T006 and T007 (different files)
- T013 can run in parallel with US1 implementation verification
- T016 can run in parallel with US2 validation
- T024, T025 can run in parallel in polish phase

---

## Parallel Example: User Story 1

```bash
# TDD RED phase — run in parallel:
Task T004: tests/unit/notifications/computeNotificationText.test.ts
Task T005: tests/integration/notifications.test.ts (Scenarios A, G, I)

# After T006 + T007 complete — wire in parallel:
Task T008: app/(parent)/_layout.tsx (useNotificationSetup)
Task T009: app/(child)/_layout.tsx (writeNotificationTrigger time_limit)
Task T010: supabase/functions/dispatch-notification/index.ts (skeleton)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003)
3. Phase 3: User Story 1 (T004–T012)
4. **STOP and VALIDATE**: `npm run test:notifications` — Scenario K passes, A/G/I pass with credentials
5. Deploy/demo: parent receives push alert when child hits screen time limit

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → deploy (screen time alert — MVP)
3. US2 → test → deploy (blocked content alert)
4. US3 → test → deploy (session end summary + history)

---

## Notes

- [P] tasks = different files, no blocking dependencies — safe to run in parallel
- [Story] label maps each task to a specific user story for traceability
- T012 (DB Webhook) is a **manual Supabase dashboard step** — no source file is written; note the config in Edge Function comments
- Integration tests skip automatically when `EXPO_PUBLIC_SUPABASE_URL` is absent (quickstart.md §Prerequisites)
- `--forceExit` in `test:notifications` prevents Supabase auth timer from crashing Jest post-teardown
- Edge Function runs in Deno runtime: `fetch` is global, no import needed; use `Deno.env.get('SUPABASE_URL')` for env vars
- After applying the DB migration manually, run `NOTIFY pgrst, 'reload schema';` to refresh PostgREST schema cache
- `suppressed_pref` status is the 6th canonical status value — it IS included in the T003 migration CHECK constraint and in the `NotificationEventStatus` TypeScript type
