# Tasks: Real Data Layer & Realtime Parent-Child Sync — Phases 1 & 2

**Input**: Design documents from `/specs/001-data-realtime-sync/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api-hooks.md ✅ | contracts/realtime-channel.md ✅ | research.md ✅

**Scope**: Both Plan.md phases in sequence — Phase 1 (US1: Real Data Layer & APIs) followed by Phase 2 (US2–US5: Realtime Sync & Parent Commands).

**Tests**: Included per Constitution Principle I (TDD — NON-NEGOTIABLE). Write and verify each test FAILS before the corresponding implementation.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no shared in-progress dependency)
- **[Story]**: Which user story owns this task (US1–US5)

---

## ═══════════════════════════════════════════
## PLAN.MD PHASE 1 — Real Data Layer & APIs
## ═══════════════════════════════════════════

## Phase 1: Setup (Core Tables & Migrations)

**Purpose**: Apply all database migrations needed for the content layer and data retention. No app code can use real data until this is done.

- [ ] T001 Apply migration `server/migrations/001_core_tables.sql` to Supabase (creates `profiles`, `content_items`, `category_preferences`, `sessions`, `parent_settings`, `family_codes` tables)
- [ ] T002 [P] Apply migration `server/migrations/002_rls_policies.sql` — Row-Level Security policies for content and profile access
- [ ] T003 [P] Apply migration `server/migrations/003_reports_tables.sql` — `daily_stats` and aggregation schema
- [ ] T004 [P] Apply migration `server/migrations/004_data_retention.sql` — 90-day `activity_logs` auto-purge scheduled function (pg_cron or Edge Function)

**Checkpoint**: All six core tables live in Supabase with RLS; data-retention cron scheduled.

---

## Phase 2: Foundational (Content Infrastructure)

**Purpose**: Supabase client, shared TypeScript types, seed data, and local cache schema — BLOCKS all content story work until complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Verify Supabase client singleton `createClient` is exported from `services/api/client.ts` and reads `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` from environment
- [ ] T006 [P] Define shared TypeScript interfaces `ContentItem`, `Profile`, `CategoryPreference`, `ApiResponse<T>` in `services/api/types.ts` (single source of truth for all content types)
- [ ] T007 Apply seed data `server/seeds/001_initial_data.sql` — verify ≥20 stories, ≥10 games, ≥15 videos, ≥8 creative activities exist in `content_items`
- [ ] T008 [P] Apply seed data `server/seeds/002_reports_seed.sql` — test report records in `daily_stats`
- [ ] T009 Initialize expo-sqlite content cache schema in `services/resilience/cacheManager.ts`: create table `content_cache (id TEXT PK, child_id TEXT, type TEXT, data TEXT, cached_at INTEGER)` on DB open

**Checkpoint**: Supabase client ready; types defined; ≥53 seed content items in DB; local cache table schema initialized.

---

## Phase 3: User Story 1 — Child Sees Age-Appropriate Content (Priority: P1) 🎯 MVP

**Goal**: Child opens Stories, Games, Videos, or Creative screen and sees real content filtered to their age group and parent-approved categories — no placeholder arrays.

**⚠️ Cross-phase prerequisite (C1)**: T027 (`007_activity_logs.sql`, Phase 4) MUST be applied before implementing T014–T023. All `logActivity` functions write to `activity_logs`; without the table, content-view logging will fail silently or error at runtime. Run T027 immediately after Phase 1 completes — do not wait for the full Phase 4 sequence.

**Independent Test**: Install app with a configured child profile (age 6, categories: stories + games). Navigate to each content screen. Stories and Games show real items; Videos and Creative are empty (no items matching child's allowed categories). Disconnect Wi-Fi; reopen — cached content shows within 3 seconds with the offline badge.

### Tests for User Story 1 ⚠️ Write first — verify FAIL before implementing

- [ ] T010 [US1] Write integration test: `useStories(childId)` returns only items where `min_age ≤ child_age ≤ max_age` and `category NOT IN` child's blocked categories in `tests/integration/contentApi.test.ts`
- [X] T011 [P] [US1] Write unit test: age-group filter excludes `content_items` with `min_age > child_age` or `max_age < child_age` in `tests/unit/contentHooks.test.ts`
- [X] T012 [P] [US1] Write unit test: category blocked via `category_preferences.is_allowed = false` is absent from `useStories` result set in `tests/unit/contentHooks.test.ts`
- [ ] T013 [P] [US1] Write unit test: when Supabase is unreachable, hook returns `{ data: cachedItems, isOffline: true }` — never null data when cache is populated in `tests/unit/contentHooks.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Implement `useStories(childId)`, `useStory(id)`, and `logStoryActivity(childId, contentId, action, durationSeconds)` in `services/api/stories.ts`: fetch `content_items WHERE type='story'` with age-range + category-block filter applied inside hook; cache in expo-sqlite with 5-minute TTL; return stale cache with `isOffline: true` on network failure; emit structured log `{ level, hook, duration_ms, cached, error }` on every call
- [X] T015 [P] [US1] Implement `useGames(childId)`, `useGame(id)`, and `logGameActivity(childId, contentId, action, durationSeconds)` in `services/api/games.ts` — same contract as stories.ts with `type='game'`
- [X] T016 [P] [US1] Implement `useVideos(childId)`, `useVideo(id)`, and `logVideoActivity(childId, contentId, action, durationSeconds)` in `services/api/videos.ts` — same contract with `type='video'`
- [X] T017 [P] [US1] Implement `useCreativeActivities(childId)`, `useCreativeActivity(id)`, and `logCreativeActivity(childId, contentId, action, durationSeconds)` in `services/api/creative.ts` — same contract with `type='creative'`
- [X] T018 [US1] Re-export all hooks and log functions as named exports from `services/api/hooks.ts`: `useStories`, `useGames`, `useVideos`, `useCreativeActivities`, `useStory`, `useGame`, `useVideo`, `useCreativeActivity`, `logStoryActivity`, `logGameActivity`, `logVideoActivity`, `logCreativeActivity`
- [ ] T019 [US1] Replace hardcoded mock arrays in `app/(child)/stories.tsx` with `useStories(childId)` hook; show loading spinner during `isLoading`; render `EmptyState` when `data.length === 0`
- [ ] T020 [P] [US1] Replace hardcoded mock arrays in `app/(child)/games.tsx` with `useGames(childId)` hook; show loading spinner during `isLoading`; render `EmptyState` when `data.length === 0` — satisfies SC-004
- [ ] T021 [P] [US1] Replace hardcoded mock arrays in `app/(child)/videos.tsx` with `useVideos(childId)` hook; show loading spinner during `isLoading`; render `EmptyState` when `data.length === 0` — satisfies SC-004
- [ ] T022 [P] [US1] Replace hardcoded mock arrays in `app/(child)/creative.tsx` with `useCreativeActivities(childId)` hook; show loading spinner during `isLoading`; render `EmptyState` when `data.length === 0` — satisfies SC-004
- [X] T023 [US1] Update `app/(child)/story/[id].tsx`: use `useStory(id)` to load content; call `logStoryActivity(childId, id, 'start', 0)` on mount and `logStoryActivity(childId, id, 'complete', elapsed)` on unmount
- [ ] T024 [US1] Implement `EmptyState` component in `components/ui/EmptyState.tsx`: localised "No content available for your age group" message; full RTL text direction support via `services/utils/bidi.ts`
- [ ] T025 [US1] Implement `OfflineBadge` in `components/ui/OfflineBadge.tsx` if not yet present; display it in `app/(child)/index.tsx`, `app/(child)/stories.tsx`, `app/(child)/games.tsx`, `app/(child)/videos.tsx`, and `app/(child)/creative.tsx` whenever any content hook returns `isOffline: true` — satisfies SC-004 and SC-007 across all screens

**Checkpoint**: US1 fully functional — all four content screens show real filtered data; repeat visit loads < 1 second from cache; offline shows cached content + badge; empty categories render gracefully.

---

## ═══════════════════════════════════════════════════
## PLAN.MD PHASE 2 — Realtime Sync & Parent Commands
## ═══════════════════════════════════════════════════

## Phase 4: Setup (Realtime Infrastructure)

**Purpose**: Durable command table, channel configuration, and local queue schema required by every realtime user story.

- [ ] T026 Apply migration `server/migrations/006_realtime_commands.sql` to Supabase (creates `realtime_commands` table + RLS policies + partial index on unacknowledged commands)
- [ ] T027 [P] Apply migration `server/migrations/007_activity_logs.sql` and verify `activity_logs` table exists with correct columns (no PII fields) — **run immediately after Phase 1 completes; required by Phase 3 logActivity calls before Phase 4 is otherwise started**
- [ ] T028 [P] Enable Supabase Realtime for the `realtime_commands` table in the Supabase dashboard (required for Broadcast + Postgres Changes hybrid)
- [X] T029 Initialize expo-sqlite `queued_commands` table schema (columns: `id TEXT PK`, `family_id TEXT`, `command_type TEXT`, `payload TEXT`, `created_at INTEGER`, `acknowledged INTEGER DEFAULT 0`) in `services/resilience/db.ts`

**Checkpoint**: `realtime_commands` table live with RLS; local SQLite queue schema initialized.

---

## Phase 5: Foundational (Channel Primitives)

**Purpose**: Shared realtime types, channel skeleton, idempotent command store, and dispatcher — BLOCKS all realtime user stories until complete.

**⚠️ CRITICAL**: No realtime user story work can begin until this phase is complete.

- [ ] T030 Verify all realtime TypeScript interfaces (`RealtimeCommand`, `HeartbeatEvent`, `CommandAckEvent`, `TimeUpdatePayload`, `CategoryBlockPayload`, `CommandType`, `ChannelHandlers`) in `services/realtime/types.ts`
- [ ] T031 [P] Implement `familyChannel.subscribe(familyId, handlers)` skeleton: opens Supabase Broadcast channel `family:<familyId>`, wires `onCommand`/`onHeartbeat`/`onAck`/`onSubscribe`/`onDisconnect`/`onReconnect` callbacks, logs lifecycle events at `info` level in `services/realtime/familyChannel.ts`
- [ ] T032 [P] Implement `familyChannel.sendCommand(familyId, cmd)`: inserts row into `realtime_commands` then broadcasts on `family:<familyId>` channel; returns `Promise<void>` in `services/realtime/familyChannel.ts`
- [ ] T033 [P] Implement `familyChannel.disconnect()`: unsubscribes from channel, clears heartbeat interval, logs at `info` level in `services/realtime/familyChannel.ts`
- [X] T034 Add `processedCommandIds: Set<string>`, `status: 'active' | 'paused' | 'ended'`, `remainingMinutes: number`, and `blockedCategories: string[]` state fields to `store/useSessionStore.ts`
- [X] T035 Implement `applyCommand(cmd: RealtimeCommand): void` in `store/useSessionStore.ts`: check `processedCommandIds` — if already present return immediately; otherwise dispatch to `commandProcessor` then add `cmd.command_id` to set
- [ ] T036 Implement `commandProcessor.ts` dispatcher: route `CommandType` → store mutation for `pause`, `resume`, `time_update`, `category_block`, `force_end` in `services/realtime/commandProcessor.ts`
- [ ] T037 [P] Implement background command handling via React Native `AppState` listener in `components/RealtimeProvider.tsx`: when app transitions from `background → active`, flush any locally queued commands through `applyCommand` before resuming normal channel operation — satisfies FR-018

**Checkpoint**: Channel subscribes and disconnects cleanly; `applyCommand` is idempotent; dispatcher routes all five command types; background-to-foreground transition applies queued commands.

---

## Phase 6: User Story 2 — Parent Instantly Pauses Child Session (Priority: P1) 🎯 MVP

**Goal**: Parent taps "Pause Now"; child screen freezes with a friendly pause overlay within 2 seconds; parent taps "Resume" and overlay dismisses.

**Independent Test**: Two devices on the same Supabase project. Tap "Pause Now" on parent; measure time to pause overlay on child (must be < 2 seconds). Verify idempotency: send the same pause command twice — overlay appears exactly once.

### Tests for User Story 2 ⚠️ Write first — verify FAIL before implementing

- [ ] T038 [US2] Write integration test: `familyChannel.sendCommand(pause)` → `useSessionStore.status` transitions to `'paused'` within 2000ms in `tests/integration/realtimeCommands.test.ts`
- [X] T039 [P] [US2] Write unit test: calling `applyCommand` twice with the same `command_id` changes `status` exactly once in `tests/unit/sessionStore.test.ts`
- [X] T040 [P] [US2] Write unit test: `applyCommand({ command_type: 'resume' })` on a `'paused'` session transitions `status` back to `'active'` in `tests/unit/sessionStore.test.ts`

### Implementation for User Story 2

- [ ] T041 [US2] Implement `pause` and `resume` branches in `commandProcessor.ts`: `pause` → set `status = 'paused'`; `resume` → set `status = 'active'` in `services/realtime/commandProcessor.ts`
- [ ] T042 [US2] Implement heartbeat sender in `familyChannel.subscribe`: `setInterval` every 30 seconds emitting `HeartbeatEvent`; clear interval in cleanup callback in `services/realtime/familyChannel.ts`
- [ ] T043 [US2] Implement `PauseOverlay` component: fullscreen overlay with mascot image and localised "Take a break!" message; renders when `useSessionStore().status === 'paused'` in `components/ui/PauseOverlay.tsx`
- [ ] T044 [US2] Mount `RealtimeProvider` at root layout: call `familyChannel.subscribe` in `useEffect`, wire `onCommand → applyCommand`, cleanup on unmount in `components/RealtimeProvider.tsx`
- [ ] T045 [US2] Render `PauseOverlay` in root child layout so it overlays all child screens regardless of active route in `app/_layout.tsx` or `app/(child)/_layout.tsx`
- [ ] T046 [US2] Send `CommandAckEvent` via `familyChannel` after each `applyCommand` succeeds; update `realtime_commands.acknowledged_at` in Supabase in `store/useSessionStore.ts`
- [ ] T047 [US2] Log `applyCommand` execution with `{ command_id, command_type, duration_ms }` at `debug` level in `store/useSessionStore.ts`
- [ ] T048 [US2] Write `activity_logs` entry after each `applyCommand` call: `activity_type = 'command_received'`, `action = command_type`, `metadata = { command_id, outcome }` where outcome is one of `applied | deduplicated | expired | queue_evicted` — satisfies FR-012 and SC-008 in `store/useSessionStore.ts`

**Checkpoint**: US2 fully functional — pause overlay appears within 2 seconds; resume dismisses it; idempotency verified by unit test; every command produces an `activity_logs` row.

---

## Phase 7: User Story 3 — Parent Adjusts Daily Screen Time Mid-Session (Priority: P2)

**Goal**: Parent changes remaining time; child's on-screen timer updates immediately; session auto-ends when the new limit is reached using server time (never device clock).

**Independent Test**: Set session with 30 minutes remaining. Send `time_update` with `remaining_minutes: 3`. Verify child timer shows ~3 minutes within 2 seconds. Wait 3 minutes — verify session transitions to `ended` automatically.

### Tests for User Story 3 ⚠️ Write first — verify FAIL before implementing

- [ ] T049 [US3] Write integration test: `sendCommand({ command_type: 'time_update', payload: { remaining_minutes: 3 } })` → `useSessionStore.remainingMinutes` updates to 3 within 2000ms in `tests/integration/realtimeCommands.test.ts`
- [X] T050 [P] [US3] Write unit test: `applyCommand(time_update)` with `remaining_minutes: 0` immediately transitions `status → 'ended'` in `tests/unit/sessionStore.test.ts`
- [ ] T051 [P] [US3] Write unit test: elapsed-time watchdog calls `timeSync.getServerNow()` — never `Date.now()` — when evaluating limit in `tests/unit/sessionStore.test.ts`

### Implementation for User Story 3

- [ ] T052 [US3] Implement `time_update` branch in `commandProcessor.ts`: update `remainingMinutes` in store; if new value ≤ 0 immediately dispatch `force_end` in `services/realtime/commandProcessor.ts`
- [ ] T053 [US3] Implement `applyCommand` branch for `time_update` in `store/useSessionStore.ts`; use `timeSync.getServerNow()` as clock reference for limit math
- [ ] T054 [US3] Implement session auto-end watchdog in `store/useSessionStore.ts`: when `elapsed_seconds >= dailyLimitSeconds` (using server time), transition `status → 'ended'` and clear timers
- [ ] T055 [US3] Update `SessionOverlay` to read `remainingMinutes` from `useSessionStore` for live display in `components/ui/SessionOverlay.tsx`
- [ ] T056 [US3] Show time-up animation (via `DegradableAnimation`) when session auto-ends from time limit in `components/ui/SessionOverlay.tsx`

**Checkpoint**: US3 fully functional — time adjustments reflect instantly; session ends at new limit using server-authoritative time.

---

## Phase 8: User Story 4 — Parent Blocks a Category (Priority: P2)

**Goal**: Parent blocks a content category; active content stops **immediately** (not finish-current-item); exit animation plays; child navigates to home screen within 2 seconds.

**Independent Test**: Child is watching a video. Send `category_block` for `"video"`. Measure: video must stop and home screen must appear within 2 seconds. Verify Videos screen now shows unavailable/empty state.

### Tests for User Story 4 ⚠️ Write first — verify FAIL before implementing

- [ ] T057 [US4] Write integration test: `sendCommand({ command_type: 'category_block', payload: { category: 'video', is_allowed: false } })` → active video screen navigates to home within 2000ms in `tests/integration/realtimeCommands.test.ts`
- [X] T058 [P] [US4] Write unit test: `applyCommand(category_block)` adds category to `blockedCategories` array in store; duplicate calls do not add it twice in `tests/unit/sessionStore.test.ts`
- [X] T059 [P] [US4] Write unit test: `applyCommand({ category_block, is_allowed: true })` removes category from `blockedCategories` in `tests/unit/sessionStore.test.ts`

### Implementation for User Story 4

- [ ] T060 [US4] Implement `category_block` branch in `commandProcessor.ts`: emit immediate-stop signal to active content screens + update `blockedCategories` in store in `services/realtime/commandProcessor.ts`
- [ ] T061 [US4] Implement `applyCommand` branch for `category_block` in `store/useSessionStore.ts`: add/remove from `blockedCategories` based on `is_allowed`
- [ ] T062 [US4] Implement `DegradableAnimation` component: plays Lottie "go play outside" animation; falls back to static image if FPS < 30 for 2 seconds (uses `fpsMonitor`) in `components/ui/DegradableAnimation.tsx`
- [ ] T063 [US4] Wire category-block exit in all child content screen layouts: subscribe to `blockedCategories` from store; if current content's category is now blocked → stop playback immediately → play `DegradableAnimation` → `router.replace('/(child)')` in `app/(child)/stories.tsx`, `app/(child)/videos.tsx`, `app/(child)/games.tsx`, `app/(child)/creative.tsx`
- [ ] T064 [US4] Update `useVideos`, `useStories`, `useGames`, `useCreativeActivities` hooks to reactively exclude entries whose category is in `useSessionStore().blockedCategories` in `services/api/hooks.ts`
- [ ] T065 [US4] Persist category block to `category_preferences` in Supabase (upsert `is_allowed = false`) after command acknowledged in `services/api/hooks.ts`

**Checkpoint**: US4 fully functional — active content stops immediately; exit animation plays; content hooks filter newly blocked categories.

---

## Phase 9: User Story 5 — Offline Resilience with Command Replay (Priority: P3)

**Goal**: Session continues offline with cached limits (never device clock); on reconnect, all parent commands issued while offline apply in chronological order with no duplicates; commands exceeding 50 or older than 24 hours are discarded and logged; parent sees "Child device offline" badge after 90 seconds of silence.

**Independent Test**: Disable Wi-Fi mid-session. Issue "pause" from parent. Re-enable Wi-Fi. Verify pause applied exactly once within 5 seconds of reconnection. Verify parent dashboard shows offline badge after 90 seconds of disconnection.

### Tests for User Story 5 ⚠️ Write first — verify FAIL before implementing

- [ ] T066 [US5] Write integration test: offline → parent sends pause → reconnect → `status === 'paused'` applied exactly once within 5 seconds in `tests/integration/offlineFallback.test.ts`
- [ ] T067 [P] [US5] Write unit test: command queue respects 50-item FIFO cap (oldest evicted when full) and discards entries with `created_at < now - 24h` on dequeue in `tests/unit/commandQueue.test.ts`
- [ ] T068 [P] [US5] Write unit test: parent `onChildOffline` callback fires exactly once after 90 seconds without a heartbeat in `tests/unit/familyChannel.test.ts`
- [ ] T069 [P] [US5] Write unit test: two commands with identical `created_at` are both applied (not deduplicated by timestamp) and each produces a separate `activity_logs` row — satisfies FR-019 in `tests/unit/commandQueue.test.ts`

### Implementation for User Story 5

- [ ] T070 [US5] Implement offline command queue read/write/evict in expo-sqlite `queued_commands` table: max 50 rows FIFO, purge rows with `created_at < (now - 86400s)` on dequeue in `services/resilience/cacheManager.ts`
- [ ] T071 [US5] Implement reconnect replay in `familyChannel.subscribe` `onReconnect` handler: query `realtime_commands WHERE acknowledged_at IS NULL AND created_at > (now()-24h) AND (child_id = $myId OR child_id IS NULL) ORDER BY created_at ASC LIMIT 50` → call `applyCommand` for each in `services/realtime/familyChannel.ts`
- [ ] T072 [US5] Implement offline session continuation in `store/useSessionStore.ts`: when `connectivityManager.isOnline === false`, continue elapsed-time counter using last server-synced limit from `timeSync` cache; never read `Date.now()` for limit enforcement
- [ ] T073 [US5] Implement 90-second heartbeat timeout on parent side in `familyChannel.subscribe`: reset timer on each `HeartbeatEvent`; if timer expires emit `handlers.onChildOffline(childId)` in `services/realtime/familyChannel.ts`
- [ ] T074 [US5] Display "Child device offline" badge in parent-facing screen when `onChildOffline` fires in `app/(parent)/reports.tsx`
- [ ] T075 [US5] Implement polling fallback in `services/realtime/familyChannel.ts`: after 3 consecutive missed 30-second heartbeat intervals (90 seconds), start polling `realtime_commands WHERE acknowledged_at IS NULL` every 60 seconds; stop polling immediately on successful Broadcast reconnect — satisfies FR-020
- [ ] T076 [US5] Log expired/evicted commands (`action = 'command_expired'`, metadata: `{ command_id, reason: 'ttl_expired' | 'queue_full' }`) in `services/resilience/eventLogger.ts`
- [ ] T077 [US5] Verify `OfflineBadge` displays on all child content screens when app launches with no network; cached content is shown (no blank screen, no error) in `app/(child)/` screens

**Checkpoint**: US5 fully functional — offline sessions stable; replay is ordered and idempotent; parent sees offline indicator; expired commands logged.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Compliance verification, RTL audit, type safety, and quality gates across both Plan.md phases.

- [ ] T078 [P] Compliance audit: confirm `activity_logs` records only `{ activity_type, action, content_id, duration_seconds, command_type }` — no names, emails, device IDs, or inferred interests in `server/migrations/007_activity_logs.sql`
- [ ] T079 [P] Verify 90-day auto-purge in `server/migrations/004_data_retention.sql` runs as a scheduled Supabase function (pg_cron or Edge Function triggered daily)
- [ ] T080 [P] RTL audit for all UI components from both phases: `EmptyState`, `OfflineBadge`, `PauseOverlay`, `SessionOverlay`, `DegradableAnimation` — confirm RTL text direction via `services/utils/bidi.ts`
- [ ] T081 [P] Verify `familyChannel` lifecycle logs are structured (`{ level: 'info', event, family_id, timestamp }`) and appear on subscribe, disconnect, and reconnect in `services/realtime/familyChannel.ts`
- [ ] T082 [P] Run `npx tsc --noEmit` — zero TypeScript errors across `services/`, `store/`, and `app/(child)/` modules
- [ ] T083 [P] Run `npm run lint` — zero ESLint errors in `services/`, `store/`, `components/ui/`
- [ ] T084 Run full test suite `npm run test` — all unit + integration tests pass
- [ ] T085 Run E2E realtime paths: `npm run test:e2e:session` (session end) + `npm run test:e2e:offline` (offline fallback)
- [ ] T086 [P] Performance spot-check: content list load < 1 second on repeat visit (SC-001); parent pause command reflected on child < 2 seconds (SC-002); reconnect replay completes < 5 seconds (SC-006); offline session launch < 3 seconds (SC-007)
- [ ] T087 [P] Third-party data audit: scan all files under `app/(child)/` for imports of analytics SDKs, crash reporters, ad networks, or any external data-collection library; confirm zero such imports exist — satisfies FR-017 ("Child activity data MUST NOT be shared with any third-party service")

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (DB Setup) ─► Phase 2 (Content Infra) ─► Phase 3 (US1 Content)
        │                                                    │
        └─────────────────────────────────────────┐         │ (US4 needs
                                                  ▼         ▼  content hooks)
                                    Phase 4 (Realtime Setup)
                                              │
                                    Phase 5 (Channel Primitives)
                                              │
                              ┌───────────────┼──────────────┐
                              ▼               ▼              ▼
                      Phase 6 (US2)   Phase 9 (US5)         (all need Phase 5)
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            Phase 7 (US3)       Phase 8 (US4) ── also needs Phase 3 (US1)
                    │                   │
                    └─────────┬─────────┘
                              ▼
                       Phase 10 (Polish)
```

- **Phase 1 (DB Setup)**: No dependencies — start immediately
- **Phase 2 (Content Infra)**: Requires Phase 1 — blocks US1
- **Phase 3 (US1)**: Requires Phase 2 + **T027** (`activity_logs` migration) before starting T014–T023 (logActivity calls require the table)
- **Phase 4 (Realtime Setup)**: Run T027 immediately after Phase 1; remainder of Phase 4 can run in parallel with Phase 3
- **Phase 5 (Channel Primitives)**: Requires Phase 4 — blocks US2–US5
- **Phase 6 (US2)**: Requires Phase 5
- **Phase 7 (US3)**: Requires Phase 5 + Phase 6 (time_update is a command; channel must exist)
- **Phase 8 (US4)**: Requires Phase 5 + Phase 6 + Phase 3 (content hooks must exist for re-filtering)
- **Phase 9 (US5)**: Requires Phase 5 + Phase 6 (replay uses `applyCommand` + channel reconnect)
- **Phase 10 (Polish)**: All preceding phases complete

### Within Each User Story

1. Write failing tests (TDD — verify red before proceeding)
2. Implement store/model changes
3. Implement service layer
4. Wire into components and screens
5. Verify tests go green
6. Run checkpoint validation

---

## Parallel Opportunities

### Phase 2 (Content Infra) — run together after Phase 1 complete

```
T006 TypeScript types    T007 seed initial_data    T008 seed reports_seed
```

### Phase 3 (US1) Tests — run together

```
T011 age-group filter test    T012 category block test    T013 offline cache test
```

### Phase 3 (US1) Hooks — run together after T014 (stories) used as reference pattern

```
T015 useGames    T016 useVideos    T017 useCreativeActivities
```

### Phase 3 (US1) Screen wiring — run together after T018 (hooks.ts re-export) done

```
T020 games.tsx    T021 videos.tsx    T022 creative.tsx
```

### Phase 5 (Channel Primitives) — run together

```
T031 familyChannel.subscribe    T032 familyChannel.sendCommand    T033 familyChannel.disconnect
```

### Phase 6 (US2) — run together after T041 (pause branch) done

```
T039 idempotency test    T040 resume test    T042 heartbeat sender    T043 PauseOverlay
```

### Phase 8 (US4) — run together after T060 (category_block branch) done

```
T058 blockedCategories add test    T062 DegradableAnimation    T064 hooks re-filter    T065 Supabase persist
```

### Phase 9 (US5) — run together after T071 (reconnect replay) done

```
T067 queue cap test    T068 heartbeat timeout test    T076 expired command logging
```

### Phase 10 (Polish) — all [P] tasks run together

```
T078 compliance    T079 purge verify    T080 RTL audit    T081 lifecycle logs    T082 tsc    T083 lint    T086 perf
```

---

## Implementation Strategy

### MVP Scope — Plan.md Phase 1 Only (US1)

1. Complete Phase 1: DB Setup
2. Complete Phase 2: Content Infrastructure
3. Complete Phase 3: US1 (content screens with real data)
4. **STOP AND VALIDATE**: Each content screen shows filtered real data; cache verified; offline badge works
5. Demonstrate — content discovery experience live and independently testable

### Incremental Delivery

| Stage | Phases | Value Delivered |
|-------|--------|-----------------|
| Content MVP | 1 + 2 + 3 | Children see real age-filtered content (US1) |
| Safety MVP | + 4 + 5 + 6 | Parent can pause/resume child instantly (US2) |
| Time Control | + 7 | Time adjustments propagate live; session auto-ends (US3) |
| Category Control | + 8 | Category blocks enforce immediately with exit animation (US4) |
| Full Resilience | + 9 | Offline sessions stable; command replay correct (US5) |
| Ship-ready | + 10 | All gates green; compliance verified |

---

## Notes

- `[P]` = can run in parallel (different files, no shared in-progress dep)
- `[USn]` maps each task to spec.md user story for traceability
- Constitution Principle I (TDD) is non-negotiable — every test must be red before its implementation task begins
- All content filters (age, category, blocked categories) applied INSIDE hooks — never in screen components
- Use `timeSync.getServerNow()` for ALL time limit enforcement; never `Date.now()`
- No direct `supabase.from()` in screen components — content calls go through `services/api/`, channel calls go through `services/realtime/familyChannel`
- Commit after each checkpoint using `feat:` or `test:` conventional commit prefix
