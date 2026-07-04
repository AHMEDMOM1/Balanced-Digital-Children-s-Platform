# Tasks: PIN Authentication on Two Devices

**Spec**: 018-pin-auth-two-device | **Branch**: 010-content-seed-initial | **Date**: 2026-06-12

**Input**: Design documents from `specs/018-pin-auth-two-device/`

**TDD**: Test tasks are included and MUST be written before implementation (constitution §I NON-NEGOTIABLE).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no cross-task dependencies at time of execution)
- **[Story]**: US1, US2, US3, US4 (maps to spec.md user stories)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: npm scripts, migration SQL, migration apply script — required before any user story work begins.

- [x] T001 Add 3 npm scripts to package.json: `"migrate:pin-auth": "npx ts-node scripts/apply-pin-auth-schema.ts"`, `"test:pin-auth": "jest tests/integration/pinAuth.test.ts --no-coverage"`, `"test:pin-auth-unit": "jest tests/unit/pinAuth.test.ts --no-coverage"` per plan.md npm Scripts section
- [x] T002 Create supabase/migrations/20260612000002_pin_auth_schema.sql with: (1) ALTER TABLE realtime_commands DROP CONSTRAINT + ADD CONSTRAINT to extend command_type CHECK to include `'reset_child_pin'`; (2) SECURITY DEFINER function `dispatch_child_pin_reset(p_family_id UUID, p_child_id UUID, p_sender_id UUID) RETURNS json` — inserts reset_child_pin row + supersedes prior unacknowledged resets for same child; (3) SECURITY DEFINER function `get_pending_pin_reset(p_child_id UUID) RETURNS json` — returns most recent unacknowledged reset_child_pin for child; (4) SECURITY DEFINER function `acknowledge_pin_reset(p_command_id UUID, p_child_id UUID) RETURNS json` — sets acknowledged_at verifying child_id match; (5) SECURITY DEFINER function `update_parent_pin_hash(p_email TEXT, p_new_hash TEXT) RETURNS void` — updates profiles.pin_hash AND profiles.unlock_pin_hash; (6) GRANT EXECUTE on get_pending_pin_reset and acknowledge_pin_reset TO anon per data-model.md New SECURITY DEFINER RPCs section
- [x] T003 [P] Create scripts/apply-pin-auth-schema.ts following scripts/apply-child-pairing-schema.ts pattern: loadEnv(), check if `get_pending_pin_reset` already exists in pg_proc, apply migration SQL idempotently or print already-applied message
- [x] T004 Apply migration via `npm run migrate:pin-auth`; verify all 4 RPCs exist in pg_proc and `reset_child_pin` appears in the realtime_commands command_type CHECK constraint

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript types added + TDD test files written and confirmed RED — blocks all user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Add 5 TypeScript interfaces to services/api/types.ts: `ParentPinState`, `PinLockoutState`, `ChildPinResetCommand`, `DispatchPinResetResult`, `PendingPinResetResult` per data-model.md TypeScript Types section
- [x] T006 [P] Add `'reset_child_pin'` to the `CommandType` union in services/realtime/types.ts (currently `'pause' | 'resume' | 'time_update' | 'category_block' | 'force_end'`)
- [x] T007 [P] Write tests/unit/pinAuth.test.ts importing from services/api/pinAuth.ts (module does not exist yet): tests for `verifyPin` (correct hash → true, wrong hash → false, missing key → false), `recordPinFailure` (5th call sets lockUntil ≈ now+60s), `getPinLockoutState` (returns defaults when key absent), `clearPinLockout` (removes lockout state) per quickstart.md Scenarios A, B, C, D
- [x] T008 [P] Write tests/integration/pinAuth.test.ts with HAS_CREDENTIALS/maybeDescribe pattern: Scenario A (verifyPin correct), B (verifyPin incorrect), C (lockout after 5 failures — timing assertion lockUntil within 1s of now+60000), D (clearPinLockout resets state), I (sendForgotPinOtp rate limit: 4th request blocked, supabase not called); import from services/api/pinAuth.ts (does not exist); add `jest.setTimeout(20000)` to describe block; include afterEach cleanup of pinRecoveryManager state per quickstart.md
- [x] T009 Confirm TDD RED gate: run `npm run test:pin-auth-unit` and `npm run test:pin-auth` — BOTH must fail with "Cannot find module '../../services/api/pinAuth'" (do NOT proceed to T010 until both confirmed RED)

**Checkpoint**: DB migration applied + TypeScript types defined + test files written and RED — user story work can now begin.

---

## Phase 3: User Story 1 — Returning Child Logs In with PIN (Priority: P1) 🎯 MVP

**Goal**: A child who previously set a PIN opens the app and is required to enter their 6-digit PIN before accessing content. Rate limiting blocks after 5 failures.

**Independent Test**: Set `@child_pin_hash = sha256('123456')` in AsyncStorage → launch app → child-pin-entry screen appears → enter '123456' → `/(child)` loads. Enter wrong PIN 5 times → lockout message shown. `npm run test:pin-auth-unit` GREEN.

### TDD Gate — Unit Tests GREEN

> **⚠️ Run `npm run test:pin-auth-unit` after T010 — must PASS before T012 begins.**

- [x] T010 [US1] Create services/api/pinAuth.ts: implement `verifyPin(pin, storageKey)` (expo-crypto SHA256 hash of pin, compare against AsyncStorage hash), `recordPinFailure(lockoutKey)` (increment failCount; if failCount >= 5 set lockUntil = Date.now() + 60000; write to AsyncStorage), `getPinLockoutState(lockoutKey)` (read AsyncStorage; return {failCount:0, lockUntil:null} if absent; treat past lockUntil as null), `clearPinLockout(lockoutKey)` (remove key from AsyncStorage); emit structured console.debug log per constitution §V
- [x] T011 [US1] Confirm TDD GREEN gate: run `npm run test:pin-auth-unit` — all unit tests must PASS before continuing
- [x] T012 [US1] Create app/auth/child-pin-entry.tsx: 6-dot PIN display (matching child-setup-pin.tsx pattern but for entry not creation), numeric keypad, on digit entry call verifyPin('@child_pin_hash'); on match call clearPinLockout('@child_pin_lockout') then router.replace('/(child)'); on mismatch call recordPinFailure('@child_pin_lockout') and show error banner "Incorrect PIN" or lockout countdown if lockUntil set; NO "Forgot PIN" link (FR — child has no self-service recovery) per contracts/pin-auth-api.md child-pin-entry Screen Contract
- [x] T013 [P] [US1] Modify app/index.tsx: in the pairingState useEffect (after loadPairingState resolves), add condition before existing has_pin check: `if (state !== null && state.has_pin) { router.replace('/auth/child-pin-entry'); return; }` — this routes returning paired child to PIN entry on every app open
- [x] T014 [P] [US1] Modify app/(child)/_layout.tsx: add AppState listener using `AppState.addEventListener('change', nextState => {...})` with a `backgroundAt` ref; on `nextState === 'background'` set `backgroundAt.current = Date.now()`; on `nextState === 'active'` if `Date.now() - backgroundAt.current >= 300000` call `router.replace('/auth/child-pin-entry')`; cleanup listener in useEffect return; log AppState transitions per constitution §V

**Checkpoint**: User Story 1 complete — returning child opens app → child-pin-entry → correct 6-digit PIN → child interface. Background 5+ min → PIN re-required.

---

## Phase 4: User Story 2 — Parent Logs In with PIN on Parent Device (Priority: P1)

**Goal**: A parent who completed email registration and set a PIN is required to enter it on every app open. A 5-minute background timeout re-locks the app.

**Independent Test**: Set `@parent_pin_hash = sha256('654321')` in AsyncStorage → launch app as authenticated parent → parent-pin-entry screen appears → enter '654321' → `/(parent)` loads.

### Implementation — User Story 2

- [x] T015 [US2] Modify app/auth/setup-pin.tsx: (1) change 4-dot display to 6-dot: update map from `[0,1,2,3]` to `[0,1,2,3,4,5]`, change `< 4` guards to `< 6`; (2) on confirm-step success: `const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, confirmPin)`; `await AsyncStorage.setItem('@parent_pin_hash', hash)`; fire-and-forget `getClient().from('profiles').update({pin_hash: hash}).eq('id', parentProfileId)` (log warn on error per research.md Decision 1); clear `useSettingsStore.setPinCode('')`; then `router.replace('/(parent)')`
- [x] T016 [P] [US2] Modify components/ui/PinModal.tsx: (1) change 4-dot display to 6-dot: update map `[0,1,2,3]` → `[0,1,2,3,4,5]`, change `< 4` to `< 6`, update `pin.length === 4` check to `=== 6`; (2) change PIN comparison from `newPin === correctPin` to `await verifyPin(newPin, '@parent_pin_hash')` (import `verifyPin` from `../../services/api/pinAuth`; remove `correctPin` prop usage from comparison logic since hash-based)
- [x] T017 [US2] Create app/auth/parent-pin-entry.tsx: full-screen 6-dot PIN entry (matching child-pin-entry style), on correct PIN call `clearPinLockout('@parent_pin_lockout')` then `router.replace('/(parent)')`, on incorrect call `recordPinFailure('@parent_pin_lockout')` + show error/countdown, "Forgot PIN" link `TouchableOpacity` that calls `router.push('/auth/forgot-pin')` per contracts/pin-auth-api.md parent-pin-entry Screen Contract
- [x] T018 [US2] Modify app/(parent)/_layout.tsx: (1) add mount guard: `useEffect(() => { AsyncStorage.getItem('@parent_pin_hash').then(hash => { if (hash && !pinVerifiedRef.current) router.replace('/auth/parent-pin-entry'); }); }, [])` with `const pinVerifiedRef = useRef(false)` — set to true when returning from parent-pin-entry; (2) add AppState listener (same pattern as T014): on active if elapsed >= 300000ms reset `pinVerifiedRef.current = false` then `router.replace('/auth/parent-pin-entry')`; log transitions per constitution §V

**Checkpoint**: User Story 2 complete — parent opens app with @parent_pin_hash → parent-pin-entry → correct PIN → parent dashboard.

---

## Phase 5: User Story 3 — Parent Resets Their Own Forgotten PIN (Priority: P2)

**Goal**: A parent who forgets their PIN can reset via email OTP (rate-limited 3/hour), enters the code, and creates a new 6-digit PIN.

**Independent Test**: On parent-pin-entry, tap "Forgot PIN" → enter email → Supabase sends 6-digit code → enter code → confirm new 6-digit PIN → `/(parent)` loads → `@parent_pin_hash` updated.

### Implementation — User Story 3

- [x] T019 [US3] Add 3 functions to services/api/pinAuth.ts: (1) `sendForgotPinOtp(email)` — calls `pinRecoveryManager.attempt(email)`; if not allowed return `{allowed:false, reason}`; else call `supabase.auth.signInWithOtp({email, options:{shouldCreateUser:false}})`; return `{allowed:true}` on success or `{allowed:false, reason:'delivery_error'}` on Supabase error; log per §V; (2) `verifyForgotPinOtp(email, token)` — calls `supabase.auth.verifyOtp({email, token, type:'email'})`; return `{valid:true, session}` or `{valid:false}`; (3) `updateParentPinHash(newPin, email)` — hash with SHA256, `AsyncStorage.setItem('@parent_pin_hash', hash)`, call `supabase.rpc('update_parent_pin_hash', {p_email:email, p_new_hash:hash})` fire-and-forget (log warn on error), clear `useSettingsStore.setPinCode('')`, return true; per contracts/pin-auth-api.md
- [x] T020 [US3] Create app/auth/forgot-pin.tsx: 3-step screen using local state `step: 'email' | 'otp' | 'new-pin'`; Step 1 email entry: TextInput + submit button → calls `sendForgotPinOtp(email)` → on allowed advance to step 2; Step 2 OTP entry: 6-digit TextInput + 10-min countdown timer + submit button → calls `verifyForgotPinOtp(email, token)` → on valid advance to step 3; track OTP failures locally (reset and return to step 1 after 3 failures per FR-007); Step 3 new PIN creation: 6-dot enter+confirm flow identical to setup-pin.tsx (6 digits) → calls `updateParentPinHash(newPin, email)` → `router.replace('/(parent)')` per contracts/pin-auth-api.md forgot-pin Screen Contract

**Checkpoint**: User Story 3 complete — parent forgotten-PIN email OTP reset works end-to-end.

---

## Phase 6: User Story 4 — Parent Remotely Resets Child's Forgotten PIN (Priority: P2)

**Goal**: Parent dispatches a remote PIN reset from the dashboard. Online child sees PIN creation screen within 10s; offline child sees it on reconnect. Only latest reset applies; parent dashboard shows pending until child completes new PIN.

**Independent Test**: Run `npm run test:pin-auth` — Scenarios E, F, G, H, J pass. Manual: tap "Reset Child PIN" → child device (online) shows child-setup-pin within 10s → child creates PIN → parent badge clears.

### TDD Gate — Write Integration Tests First (RED)

> **⚠️ Run `npm run test:pin-auth` after T021 — Scenarios E-J must FAIL with "Cannot find module" or import error before T023 begins.**

- [x] T021 [US4] Add Scenarios E, F, G, H, J to tests/integration/pinAuth.test.ts: import `{ dispatchChildPinReset, getChildPinResetStatus, getPendingPinReset, acknowledgePinReset, watchForPinResetCommand }` from `../../services/api/childPinReset` (module does not exist); Scenario E (dispatch creates pending row), F (get_pending_pin_reset anon RPC returns pending), G (acknowledge anon RPC marks complete), H (second dispatch supersedes first — only latest is pending), J (broadcast delivery within 3000ms — `jest.setTimeout(20000)` on describe block); include afterEach cleanup deleting test reset_child_pin rows per quickstart.md
- [x] T022 [US4] Confirm TDD RED gate: run `npm run test:pin-auth` — Scenarios E-J must fail with "Cannot find module services/api/childPinReset" (do NOT proceed to T023 until confirmed RED)

### Implementation — User Story 4

- [x] T023 [US4] Create services/api/childPinReset.ts: implement all 6 functions per contracts/pin-auth-api.md: `dispatchChildPinReset` (rpc call + broadcast via broadcastCommand on family channel), `getChildPinResetStatus` (query realtime_commands for latest unacknowledged reset_child_pin for child), `watchChildPinResetStatus` (CDC subscription on realtime_commands, calls onStatusChange(false) when acknowledged_at set), `watchForPinResetCommand` (subscribeFamilyChannel broadcast listener filtered by childId), `getPendingPinReset` (anon rpc get_pending_pin_reset), `acknowledgePinReset` (anon rpc acknowledge_pin_reset); emit structured logs per §V
- [x] T024 [US4] Modify services/realtime/commandProcessor.ts: add `case 'reset_child_pin':` to the switch block — call `clearPinLockout('@child_pin_lockout')` (import from services/api/pinAuth), then navigate to `/auth/child-setup-pin` using expo-router (import `router` from `expo-router`); add `'reset_child_pin'` to the TypeScript CommandType usage (already defined in T006)
- [x] T025 [US4] Create components/ui/ChildPinResetListener.tsx: side-effect component (returns null); reads `pairingState` from `usePairingStore`; if pairingState is null: no-op; subscribes to `family:{familyId}` broadcast for `reset_child_pin` events filtered by `childId` via `watchForPinResetCommand`; on mount (after channel subscribes): calls `getPendingPinReset(childId)` — if pending navigates to `/auth/child-setup-pin` + calls `clearPinLockout`; on receiving broadcast: same; stores pending `commandId` in ref; when `usePairingStore.pairingState.has_pin` changes to true (useEffect watching has_pin): calls `acknowledgePinReset(commandId, childId)` to complete the reset; cleanup subscription on unmount per contracts/pin-auth-api.md ChildPinResetListener Contract
- [x] T026 [US4] Modify app/(child)/_layout.tsx: add `<ChildPinResetListener />` inside the return JSX (alongside existing SessionOverlay and PauseOverlay); import from `../../components/ui/ChildPinResetListener`
- [x] T027 [US4] Modify app/(parent)/index.tsx: add "Reset Child PIN" TouchableOpacity button to the Quick Actions section; on press show Alert.alert confirm dialog; on confirm call `dispatchChildPinReset(activeChild.id, parentData.familyId)` (import from services/api/childPinReset, get activeChild and parentData from useAuthStore); after dispatch show pending badge text "PIN reset pending…" using local state; use `watchChildPinResetStatus` in useEffect to clear badge when acknowledged_at is set; button only visible if `children.length > 0` (paired child exists)
- [x] T028 [US4] Confirm TDD GREEN gate: run `npm run test:pin-auth` — all Scenarios A-J must PASS (including E, F, G, H, J for US4)

**Checkpoint**: All four user stories complete — full two-device PIN authentication functional end-to-end.

---

## Phase 7: Polish & Verification

**Purpose**: Full regression, TypeScript check.

- [x] T029 [P] Run `npm run test` — full suite (all existing tests plus T007/T008 new tests) must pass with zero failures and zero regressions
- [x] T030 [P] Run `npx tsc --noEmit` — verify zero new TypeScript errors in all new/modified files: services/api/pinAuth.ts, services/api/childPinReset.ts, services/realtime/types.ts, services/realtime/commandProcessor.ts, app/auth/child-pin-entry.tsx, app/auth/parent-pin-entry.tsx, app/auth/forgot-pin.tsx, app/auth/setup-pin.tsx, components/ui/PinModal.tsx, components/ui/ChildPinResetListener.tsx, app/(child)/_layout.tsx, app/(parent)/_layout.tsx, app/(parent)/index.tsx, app/index.tsx

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T002 and T003 in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 complete — T005, T006, T007, T008 all in parallel; T009 after all four
- **US1 (Phase 3)**: Depends on Phase 2 complete; T010→T011 sequential; T013/T014 parallel after T012
- **US2 (Phase 4)**: Depends on US1 complete (pinAuth.ts exists for T016 import); T015/T016 parallel
- **US3 (Phase 5)**: Depends on US2 complete (parent-pin-entry.tsx exists for "Forgot PIN" link)
- **US4 (Phase 6)**: Depends on US3 complete; T021→T022 TDD RED; T023-T027 implementation
- **Polish (Phase 7)**: Depends on all user stories complete; T029/T030 in parallel

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies; delivers child PIN gate end-to-end
- **US2 (P1)**: Depends on US1 (pinAuth.ts must exist for T016); delivers parent PIN gate
- **US3 (P2)**: Depends on US2 (parent-pin-entry.tsx must exist for "Forgot PIN" link wiring)
- **US4 (P2)**: Depends on US1 (childPinReset uses clearPinLockout from pinAuth.ts); delivers remote reset

### Within US1

- T010 (service) → T011 (GREEN confirm) → T012 (screen) → T013/T014 (routing + lock, parallel)

### Within US4

- T021 (write tests) → T022 (RED confirm) → T023 (service) → T024/T025 (processor + component, can be parallel) → T026/T027 (layout + dashboard, can be parallel) → T028 (GREEN confirm)

---

## Parallel Execution Examples

### Phase 2 Foundational (all parallel):

```text
T005: Add types to services/api/types.ts
T006: Add reset_child_pin to services/realtime/types.ts
T007: Write tests/unit/pinAuth.test.ts
T008: Write tests/integration/pinAuth.test.ts
```

### Phase 3 US1 — Post-screen (parallel):

```text
T013: Modify app/index.tsx (child-pin-entry routing)
T014: Modify app/(child)/_layout.tsx (background lock)
```

### Phase 4 US2 — PIN upgrade (parallel):

```text
T015: Modify app/auth/setup-pin.tsx (4→6 digit, hash)
T016: Modify components/ui/PinModal.tsx (4→6 digit, hash)
```

### Phase 7 Polish (parallel):

```text
T029: npm run test (full suite)
T030: npx tsc --noEmit
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Complete Phase 1: Setup (migration + scripts)
2. Complete Phase 2: Foundational (types + TDD RED)
3. Complete Phase 3: US1 (child returning PIN entry)
4. **STOP and VALIDATE**: Child device → child-pin-entry → correct PIN → `/(child)` ✓
5. Complete Phase 4: US2 (parent PIN upgrade + parent-pin-entry)
6. **STOP and VALIDATE**: Parent device → parent-pin-entry → correct PIN → `/(parent)` ✓
7. P1 MVP delivered: both daily-use PIN flows functional

### Incremental Delivery

1. Setup + Foundational → DB RPCs live, types defined, TDD RED
2. US1 complete → child PIN gate works (MVP child)
3. US2 complete → parent PIN gate works (MVP parent)
4. US3 complete → forgotten PIN self-service recovery available
5. US4 complete → remote child PIN reset available (full spec)
6. Polish → full regression clean

---

## Notes

- [P] tasks touch different files — safe to run concurrently
- TDD RED gates at T009 and T022 are hard stops — confirm "Cannot find module" before writing any service code
- T015 migration guard: `useSettingsStore.isPinSetup === true` but `@parent_pin_hash === null` means old 4-digit PIN → force re-setup on `setup-pin.tsx` (detect in `app/(parent)/_layout.tsx` T018 mount guard — if both conditions true, navigate to `/auth/setup-pin` instead of `/auth/parent-pin-entry`)
- `ChildPinResetListener` (T025) tracks `commandId` in a ref; the acknowledgement triggers when `has_pin` changes from false to true in `usePairingStore` (the same state that `child-setup-pin.tsx` sets via `savePinHash`)
- Cloud PIN sync in T015 and T019 is fire-and-forget per research.md Decision 1 — warn log expected if RLS blocks direct update; `update_parent_pin_hash` RPC bypasses RLS
- The existing `pinRecoveryManager.attempt()` uses the SQLite `resilience_logs` table (not AsyncStorage) for rate tracking — no AsyncStorage conflict with `@parent_pin_hash`
