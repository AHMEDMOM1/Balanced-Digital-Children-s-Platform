# Tasks: Realtime Channel Launch (Phase 4)

**Input**: Design documents from `specs/019-realtime-channel-launch/`

**Branch**: `019-realtime-channel-launch`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete sibling tasks)
- **[Story]**: Maps to user story from spec.md

## Path Conventions

React Native Expo project at repository root:
- Services: `services/realtime/`, `services/api/`
- Stores: `store/`
- Components: `components/`
- Screens: `app/(parent)/`, `app/(child)/`
- Tests: `tests/integration/`

---

## Phase 1: Setup

**Purpose**: Add npm script before any implementation begins.

- [x] T001 Add `"test:realtime-channel": "jest --testPathPattern=tests/integration/realtimeChannel --runInBand"` to the `scripts` block in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type extensions that all three user stories depend on. Must be complete before any story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Extend `CommandType` union to include `'settings_sync'`, extend `HeartbeatEvent` with optional fields `current_activity?: 'story' | 'game' | 'video' | 'creative'` and `current_content_id?: string`, and add new `SettingsSyncPayload` interface in `services/realtime/types.ts`

**Checkpoint**: Type definitions updated — all user stories can now build on correct types.

---

## Phase 3: User Story 1 — Live Parent-Child Connection at Launch (Priority: P1) 🎯 MVP

**Goal**: Confirm both devices connect to the family channel after PIN entry and commands are delivered within 2 seconds.

**Independent Test**: Scenarios A, E, G pass in `tests/integration/realtimeChannel.test.ts`.

> **Note**: The channel subscription, command processing, reconnect logic, and unacked command replay are already implemented in `components/RealtimeProvider.tsx`. This story's work is test scaffolding + verification. If any scenario fails, investigate and fix the underlying gap.

### Tests for User Story 1 (TDD — write and verify RED/GREEN)

- [x] T003 [US1] Write Scenarios A, E, G in `tests/integration/realtimeChannel.test.ts`:
  - **Scenario A**: Anon subscriber receives a `pause` command broadcast by service client within 2000ms
  - **Scenario E**: Anon client fetches unacknowledged commands inserted while offline; `acknowledged_at` is set after processing
  - **Scenario G**: After `CHANNEL_ERROR` status, reconnect timer fires and a new subscription attempt is made (mock or integration)

  Use the service-role + anon-key pattern from `tests/integration/pinAuth.test.ts`. Stable UUIDs: `TEST_FAMILY_ID = 'f3333333-0000-0000-0000-000000000019'`, `TEST_CHILD_ID = 'c3333333-0000-0000-0000-000000000019'`. Seed both profiles in `beforeAll`; clean up in `afterAll`.

**Checkpoint**: Scenarios A, E, G pass — US1 is fully verified.

---

## Phase 4: User Story 2 — Child Heartbeat Visible to Parent (Priority: P2)

**Goal**: Parent dashboard shows child's current activity type and elapsed session time updated every 30 seconds from heartbeat.

**Independent Test**: Scenarios B and F pass; parent dashboard renders child status from `latestHeartbeat`.

### Tests for User Story 2 (TDD — RED gate before implementation)

- [x] T004 [US2] Add Scenarios B and F to `tests/integration/realtimeChannel.test.ts` (these will be RED until T005–T009 are done):
  - **Scenario B**: Service client subscribes as parent; anon client broadcasts a heartbeat with `current_activity: 'game'` and `elapsed_seconds: 120`; assert parent's handler receives the full heartbeat including those fields within 2000ms
  - **Scenario F**: Unit assertion — given `lastHeartbeatAt = Date.now() - 91000`, the offline detector sets `isChildOnline = false`

### Implementation for User Story 2

- [x] T005 [P] [US2] Add `latestHeartbeat: HeartbeatEvent | null` field and `setLatestHeartbeat: (hb: HeartbeatEvent) => void` action to `store/useRealtimeStore.ts`; initial value `null`; implementation sets `latestHeartbeat: hb`, `lastHeartbeatAt: Date.now()`, `isChildOnline: true`
- [x] T006 [P] [US2] Add `currentActivity: 'story' | 'game' | 'video' | 'creative' | null`, `currentContentId: string | null`, and `setCurrentActivity(activity, contentId?)` to `store/useSessionStore.ts`; initial values `null`
- [x] T007 [US2] Update `onHeartbeat` handler in `components/RealtimeProvider.tsx` to call `setLatestHeartbeat(hb)` (replacing the bare `recordHeartbeat()` call) and add `console.debug('[RealtimeProvider] heartbeat', { activity: hb.current_activity, elapsed: hb.elapsed_seconds })`; import `setLatestHeartbeat` from `useRealtimeStore` destructure
- [x] T008 [US2] Update the heartbeat `setInterval` callback in `components/RealtimeProvider.tsx` to include `current_activity: sessionState.currentActivity ?? undefined` and `current_content_id: sessionState.currentContentId ?? undefined` in the `broadcastHeartbeat` payload (reads from `useSessionStore.getState()`)
- [x] T009 [US2] Update `app/(parent)/index.tsx` to read `{ isChildOnline, latestHeartbeat }` from `useRealtimeStore` and render a child status row: when `isChildOnline`, show activity type and elapsed minutes from `latestHeartbeat`; when offline, show "Child offline"

**Checkpoint**: Scenarios B and F pass; parent dashboard shows live child activity.

---

## Phase 5: User Story 3 — Settings Sync Applied on Child Device (Priority: P3)

**Goal**: When a parent changes settings (screen time limit, category blocks), the child device receives and enforces them within 10 seconds if online, or on next reconnect if offline.

**Independent Test**: Scenarios C, D, H pass.

### Tests for User Story 3 (TDD — RED gate before implementation)

- [x] T010 [US3] Add Scenarios C, D, H to `tests/integration/realtimeChannel.test.ts` (RED until T011–T013):
  - **Scenario C**: Service client updates `profiles` row with new `daily_limit_minutes`; anon client (with CDC subscription via `subscribeSettingsChanges`) receives `onProfileUpdate` within 5000ms
  - **Scenario D**: Service client broadcasts `category_block` command with `{ category: 'stories', is_allowed: false }`; verify `commandProcessor` (via mock) sets `storiesEnabled = false`
  - **Scenario H**: Service client broadcasts `settings_sync` with `{ games_enabled: false }`; anon subscriber's `onCommand` fires and `commandProcessor` sets `gamesEnabled = false`

### Implementation for User Story 3

- [x] T011 [P] [US3] Add `settings_sync` case to the switch in `services/realtime/commandProcessor.ts`: cast `command.payload` as `SettingsSyncPayload` and call `useSettingsStore.setState(...)` for each defined field; import `SettingsSyncPayload` from `./types`
- [x] T012 [P] [US3] Add `subscribeSettingsChanges(childId, familyId, handlers: SettingsChangeHandlers): () => void` to `services/realtime/familyChannel.ts`; opens channel `settings-sync:${childId}` with two postgres_changes listeners (profiles UPDATE + category_preferences ANY); returns unsubscribe function; add `SettingsChangeHandlers` interface to the same file
- [x] T013 [US3] Add CDC settings subscription to `components/RealtimeProvider.tsx` inside the main `useEffect`, scoped to `role === 'child'`: call `subscribeSettingsChanges(childData.id, familyId, { onProfileUpdate, onCategoryUpdate })`; `onProfileUpdate` updates `useSettingsStore.dailyLimitMinutes`; `onCategoryUpdate` maps category name to the correct `useSettingsStore` boolean; assign to `unsubSettings` ref and call in cleanup; import `subscribeSettingsChanges` from `../services/realtime/familyChannel`

**Checkpoint**: Scenarios C, D, H pass — settings changes reach the child automatically.

---

## Phase 6: Polish & Validation

**Purpose**: Quality gates across all stories.

- [x] T014 Run `npm run test:realtime-channel` and confirm all 8 scenarios (A-H) pass; fix any remaining failures
- [x] T015 [P] Run `npx tsc --noEmit` and fix any TypeScript errors introduced in T002–T013
- [x] T016 [P] Run `npm run test` and confirm full test suite (unit + integration) still passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup
- **US1 (Phase 3)**: Depends on Foundational — tests only, no production code changes expected
- **US2 (Phase 4)**: Depends on Foundational (HeartbeatEvent type) — T005 + T006 can run in parallel; T007 depends on T005; T008 depends on T006; T009 depends on T007 + T008
- **US3 (Phase 5)**: Depends on Foundational (settings_sync type) — T011 + T012 can run in parallel; T013 depends on T012
- **Polish (Phase 6)**: Depends on all story phases complete

### User Story Dependencies

- **US1**: Foundational complete — tests only; no production code changes
- **US2**: Foundational complete — T005 and T006 are parallel (different files)
- **US3**: Foundational complete + US2 complete (shares `RealtimeProvider.tsx`) — T011 and T012 are parallel

### Within Each User Story

- Write tests FIRST (RED), then implement until tests pass (GREEN)
- Store changes (T005, T006) before component changes (T007, T008)
- `familyChannel.ts` (T012) before `RealtimeProvider.tsx` (T013)
- All implementation before validation (Phase 6)

---

## Parallel Opportunities

```bash
# Phase 4 (US2) — parallel start after T004:
T005: store/useRealtimeStore.ts   ← add latestHeartbeat
T006: store/useSessionStore.ts    ← add currentActivity

# Phase 5 (US3) — parallel start after T010:
T011: services/realtime/commandProcessor.ts   ← settings_sync handler
T012: services/realtime/familyChannel.ts      ← subscribeSettingsChanges

# Phase 6 — parallel start after T014:
T015: npx tsc --noEmit
T016: npm run test
```

---

## Implementation Strategy

### MVP First (US1 — channel subscription confirmed)

1. T001 Setup (npm script)
2. T002 Foundational (types)
3. T003 US1 tests — verify channel + command delivery already works
4. **STOP and VALIDATE** — channel is live; both devices communicate

### Incremental Delivery

1. Setup + Foundational → types ready
2. US1 → channel subscription confirmed
3. US2 → heartbeat + dashboard status live
4. US3 → settings sync working
5. Each increment is independently testable

---

## Notes

- [P] = different files, no incomplete dependencies — safe to run in parallel
- [US1/US2/US3] = maps directly to spec.md user story priorities
- TDD gate: write test before implementing; confirm RED before writing code; confirm GREEN after
- The `RealtimeProvider.tsx` is touched by both US2 (T007, T008) and US3 (T013) — execute these sequentially within each story phase; do not run US2 and US3 RealtimeProvider edits in parallel
- Stable test UUIDs use family prefix `f3333...019`, parent `a3333...019`, child `c3333...019` to avoid collisions with spec 018 test data
