---

description: "Phase 4 — Resilience & Real-Device Testing task list"
---

# Tasks: Resilience & Real-Device Testing

**Input**: Design documents from `specs/006-resilience-testing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included per the project constitution (Test-First mandatory). Each story includes test tasks before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Resilience services**: `services/resilience/`
- **Screens**: `app/(child)/`, `app/(parent)/`
- **Stores**: `store/`
- **E2E tests**: `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize resilience service structure and install dependencies

- [x] T001 Create `services/resilience/` directory with `services/resilience/index.ts` barrel export
- [x] T002 Install missing packages: `@react-native-community/netinfo`, `expo-file-system`, `expo-battery`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core resilience infrastructure shared by multiple user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] [Foundation] Implement `ConnectivityManager` in `services/resilience/connectivityManager.ts` — wraps `@react-native-community/netinfo` + `expo-battery` for network state and battery saver detection; debounce rapid connectivity changes (flapping >3 transitions within 30s → wait 3s after last change before updating state); detect battery saver mode changes in background (check on foreground)
- [x] T004 [P] [Foundation] Implement `EventLogger` in `services/resilience/eventLogger.ts` — local event store with batch sync for remote crash reporting; flush batch every 5 minutes or when 50 events queued (whichever first); log multiple simultaneous resilience events independently with individual timestamps and no data loss; all operations must complete critical path in under 50ms on mid-tier devices
- [x] T005 [Foundation] Wire `EventLogger` into existing app lifecycle in `app/_layout.tsx` — capture app state transitions for resilience logging

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Graceful Offline Behavior (Priority: P1) 🎯 MVP

**Goal**: App continues functioning with cached data and clear offline indicators on both child and parent screens

**Independent Test**: Enable airplane mode at launch and mid-session; verify cached content + "offline" badge display within 5 seconds

### Tests for User Story 1

- [x] T006 [P] [US1] Unit test for `CacheManager` in `tests/unit/resilience/cacheManager.test.ts` — eviction (100MB/7d), get/set, clear
- [x] T007 [P] [US1] Unit test for `offline badge` display logic in `tests/unit/resilience/offlineIndicator.test.ts` — connectivity state → visible badge
- [x] T008 [US1] Integration test for offline content fallback in `tests/integration/offlineFallback.test.ts` — mock no-network, verify cached content renders

### Implementation for User Story 1

- [x] T009 [P] [US1] Implement `CacheManager` in `services/resilience/cacheManager.ts` — LRU eviction, 100MB/7d retention, get/set/clear operations; evict and treat as unavailable on stale (>7d) or corrupted data (checksum mismatch on read); reduce eviction threshold to 50MB when total free storage <500MB
- [x] T010 [P] [US1] Add `OfflineBadge` component in `components/ui/OfflineBadge.tsx` — reusable badge with "offline" / "last synced 3 min ago" text variants
- [x] T011 [US1] Integrate `ConnectivityManager` + `OfflineBadge` into child content screens in `app/(child)/` — show cached content and badge when offline
- [x] T012 [US1] Integrate `ConnectivityManager` + `OfflineBadge` into parent dashboard in `app/(parent)/reports.tsx` — show stale cached data and "last synced" indicator
- [x] T013 [US1] Integrate `ConnectivityManager` + `OfflineBadge` into child `app/(child)/index.tsx` — show cached activities with badge when offline

**Checkpoint**: User Story 1 functional — app survives network loss with grace

---

## Phase 4: User Story 2 — Session Persistence (Priority: P1)

**Goal**: Active child session resumes from where it left off after OS kill or app restart

**Independent Test**: Start a session, force-kill from OS task switcher, reopen — timer resumes from previous elapsed time (not reset)

### Tests for User Story 2

- [x] T014 [P] [US2] Unit test for `SessionManager` in `tests/unit/resilience/sessionManager.test.ts` — save, restore, clear operations
- [x] T015 [P] [US2] Unit test for session auto-save intervals in `tests/unit/resilience/sessionAutoSave.test.ts` — verify 30s save cadence
- [x] T016 [US2] Integration test for session restore after simulated kill in `tests/integration/sessionRestore.test.ts` — mock store, verify elapsed time continuity

### Implementation for User Story 2

- [x] T017 [P] [US2] Implement `SessionManager` in `services/resilience/sessionManager.ts` — save with 30s debounce, restore on launch, clear on session end
- [x] T018 [US2] Integrate `SessionManager.save()` into `store/useSessionStore.ts` — call save on background (AppState) and every 30s during active session
- [x] T019 [US2] Integrate `SessionManager.restore()` into session startup in `store/useSessionStore.ts` — check for saved snapshot on app foreground, resume if valid
- [x] T020 [US2] Integrate `SessionManager.clear()` into normal session end flow — clear snapshot when session completes normally or time limit reached

**Checkpoint**: User Story 2 functional — sessions survive interruptions

---

## Phase 5: User Story 3 — Parent PIN Recovery (Priority: P2)

**Goal**: Parents reset forgotten PIN via email verification + security question, with rate limiting

**Independent Test**: Trigger "Forgot PIN" from PIN screen, complete email verification + security question, set new PIN

### Tests for User Story 3

- [x] T021 [P] [US3] Unit test for `PinRecoveryManager` in `tests/unit/resilience/pinRecoveryManager.test.ts` — attempt, verify, reset, lockout flows
- [x] T022 [P] [US3] Unit test for rate limiting logic in `tests/unit/resilience/pinRateLimit.test.ts` — 3 att/hr escalation, 24h cooldown
- [x] T023 [US3] Integration test for full recovery flow in `tests/integration/pinRecovery.test.ts` — email → question → PIN reset

### Implementation for User Story 3

- [x] T024 [P] [US3] Implement `PinRecoveryManager` in `services/resilience/pinRecoveryManager.ts` — rate limit tracking (local), email verification trigger, security question validation, PIN reset; enforce 24h cooldown reset from last failed attempt, 15-min email link expiry, concurrent recovery serialization (last-sent-link-wins per email)
- [x] T025 [US3] Add "Forgot PIN" flow UI in `app/auth/forgot-pin.tsx` — email entry → verification → security question → new PIN screen
- [x] T026 [US3] Integrate rate limit state into PIN entry screen in `app/auth/setup-pin.tsx` — show lockout message and remaining cooldown when locked

**Checkpoint**: User Story 3 functional — parents can self-recover PIN securely

---

## Phase 6: User Story 4 — Server Time Enforcement (Priority: P2)

**Goal**: Screen-time enforcement uses server timestamps; local device clock changes cannot bypass limits

**Independent Test**: Change device clock forward 2 hours, start session — session ends at true wall-clock limit

### Tests for User Story 4

- [x] T027 [P] [US4] Unit test for server time verification in `tests/unit/resilience/serverTime.test.ts` — verify elapsed time against server vs. local clock
- [x] T028 [US4] Integration test for clock-change bypass prevention in `tests/integration/clockBypass.test.ts` — mock clock offset, verify session respects server time

### Implementation for User Story 4

- [x] T029 [US4] Add server timestamp fetch on session start in `services/resilience/timeSync.ts` — record server time alongside local time for drift detection
- [x] T030 [US4] Implement clock-drift detection in `store/useSessionStore.ts` — compare local vs. server elapsed, clamp remaining limit to server time; when offline, enforce screen-time limit locally using last known server-synced time and cached daily usage snapshot
- [x] T031 [US4] Add warning indicator in child `app/(child)/index.tsx` — show "time sync" icon if clock drift exceeds 5 minutes

**Checkpoint**: User Story 4 functional — clock-changing bypass prevented

---

## Phase 7: User Story 5 — Low-End Device Performance (Priority: P3)

**Goal**: Animations degrade gracefully on low-end devices; FPS monitoring triggers static fallback

**Independent Test**: Run on Galaxy A series with animation-heavy screens — verify degradation triggers within 500ms of sustained FPS drop below 30

### Tests for User Story 5

- [x] T032 [P] [US5] Unit test for `FpsMonitor` in `tests/unit/resilience/fpsMonitor.test.ts` — start/stop, degrade threshold, restore detection
- [x] T033 [P] [US5] Unit test for degradation component logic in `tests/unit/resilience/degradationTrigger.test.ts` — FPS below 30 for 2s → static fallback

### Implementation for User Story 5

- [x] T034 [P] [US5] Implement `FpsMonitor` in `services/resilience/fpsMonitor.ts` — frame callback monitoring, threshold detection (30 FPS / 2s), degrade/restore callbacks; restore animation only after FPS >30 for 5 consecutive seconds; debounce rapid degrade/restore cycles (>3 transitions within 60s → wait 30s before next state change)
- [x] T035 [US5] Create `DegradableAnimation` wrapper component in `components/ui/DegradableAnimation.tsx` — wraps animated elements, auto-degrades to static image when FPS drops
- [x] T036 [US5] Replace static Lottie/animated usages across `app/(child)/*` and `app/(parent)/*` with `DegradableAnimation` wrapper

**Checkpoint**: User Story 5 functional — low-end devices get smooth degraded experience

---

## Phase 8: User Story 6 — Battery Saver Mode (Priority: P3)

**Goal**: App reduces realtime reconnection attempts when device is in battery saver mode

**Independent Test**: Enable battery saver, disconnect network — verify reconnection interval increases from 1s to 15s

### Tests for User Story 6

- [x] T037 [P] [US6] Unit test for battery saver reconnection logic in `tests/unit/resilience/batterySaver.test.ts` — interval switch on enter/exit
- [x] T038 [US6] Integration test for battery saver + reconnection in `tests/integration/batterySaverReconnect.test.ts` — mock battery state, verify interval change

### Implementation for User Story 6

- [x] T039 [US6] Add battery-saver-aware reconnection logic in `services/resilience/connectivityManager.ts` — expose `getReconnectionInterval()` returning 1s (normal) or 15s (battery saver); depends on T003 (ConnectivityManager impl)
- [x] T040 [US6] Integrate reconnection interval into Realtime provider in `components/RealtimeProvider.tsx` — read interval from `connectivityManager`, adjust retry timing; log subscribe/disconnect/reconnect events via EventLogger

**Checkpoint**: User Story 6 functional — battery-conscious reconnection

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Observability, E2E validation, accessibility, performance verification

- [x] T041 [P] [Polish] Add E2E test scripts to `package.json` scripts: `test:e2e:offline`, `test:e2e:session`, `test:e2e:pin-recovery`, `test:e2e:clock-bypass`
- [x] T042 [P] [Polish] Implement E2E test for parent-onboarding flow in `tests/e2e/parentOnboarding.test.ts`
- [x] T043 [P] [Polish] Implement E2E test for child-session-end flow in `tests/e2e/childSessionEnd.test.ts`
- [x] T044 [P] [Polish] Implement E2E test for pin-gate-bypass-attempt in `tests/e2e/pinBypass.test.ts`
- [x] T045 [Polish] Add resilience event logging to all story implementations — wire `EventLogger.log()` calls into each resilience module
- [x] T046 [Polish] Run accessibility audit on 5 key screens: child content browser, child activity screen, parent dashboard, parent controls, PIN entry
- [x] T047 [Polish] Verify cold start performance SC-001 (< 3s on Pixel 4a) — measure and document
- [x] T048 [Polish] Verify all success criteria (SC-001 through SC-008) — create verification report in `docs/resilience-verification.md`
- [x] T049 [Polish] Run `npx tsc --noEmit` and `npm run lint` — zero TypeScript errors in new code (pre-existing errors in `creative.tsx`); ESLint check requires eslint configuration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational completion
  - US1 (P1) and US2 (P1) are independent of each other — can run in parallel
  - US3 (P2), US4 (P2) are independent of each other
  - US5 (P3), US6 (P3) are independent of each other
- **Polish (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (ConnectivityManager, EventLogger)
- **US2 (P1)**: Depends on Phase 2 (EventLogger) — independent of US1
- **US3 (P2)**: Depends on Phase 2 (EventLogger) — independent of US1/US2
- **US4 (P2)**: Depends on Phase 2 (EventLogger) — independent of US1/US2/US3
- **US5 (P3)**: Depends on Phase 2 (EventLogger) — independent of all others
- **US6 (P3)**: Depends on Phase 2 (ConnectivityManager, EventLogger) — independent of all others

### Parallel Opportunities

- Phase 2: T003 (ConnectivityManager) and T004 (EventLogger) can run in parallel
- Phase 3: T006, T007 (tests) parallel; T009, T010 (implementation) parallel
- All P1 stories (US1, US2) can run in parallel after Foundational
- All P2 stories (US3, US4) can run in parallel
- All P3 stories (US5, US6) can run in parallel
- Polish: All test tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for CacheManager in tests/unit/resilience/cacheManager.test.ts"
Task: "Unit test for offline badge in tests/unit/resilience/offlineIndicator.test.ts"

# Launch all models/components for User Story 1 together:
Task: "Implement CacheManager in services/resilience/cacheManager.ts"
Task: "Add OfflineBadge component in components/ui/OfflineBadge.tsx"
```

---

## Implementation Strategy

### MVP First (US1 — Offline Behavior)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: User Story 1 (T006-T013)
4. **STOP and VALIDATE**: Enable airplane mode, verify offline resilience
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Offline) → Test independently → Deploy
3. Add US2 (Session Persistence) → Test independently → Deploy
4. Add US3 (PIN Recovery) → Test independently → Deploy
5. Add US4 (Server Time) → Test independently → Deploy
6. Add US5 (Performance) → Test independently → Deploy
7. Add US6 (Battery Saver) → Test independently → Deploy
8. Polish → Verification report complete

### Parallel Team Strategy

With multiple developers:
1. Team completes Setup + Foundational together
2. Developer A: US1 (Offline) + US4 (Server Time)
3. Developer B: US2 (Session) + US5 (Performance)
4. Developer C: US3 (PIN Recovery) + US6 (Battery Saver)
5. Stories integrate independently

---

## Task Summary

| Phase | Story | Tasks | Priority |
|---|---|---|---|
| 1 | Setup | T001-T002 | — |
| 2 | Foundational | T003-T005 | — |
| 3 | US1: Offline | T006-T013 | P1 🎯 |
| 4 | US2: Session | T014-T020 | P1 |
| 5 | US3: PIN Recovery | T021-T026 | P2 |
| 6 | US4: Server Time | T027-T031 | P2 |
| 7 | US5: Performance | T032-T036 | P3 |
| 8 | US6: Battery Saver | T037-T040 | P3 |
| 9 | Polish | T041-T049 | — |
| | **Total** | **49 tasks** | |

## Notes

- [P] tasks = different files, no dependencies — can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Tests must fail before implementing (Constitution: Test-First)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All resilience events must be logged via EventLogger (FR-010 / Constitution V)
