# Implementation Plan: PIN Authentication on Two Devices

**Branch**: `010-content-seed-initial` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-pin-auth-two-device/spec.md`

## Summary

Implement the full PIN lifecycle for both devices: returning-user PIN entry on child and parent, parent forgotten-PIN recovery via Supabase email OTP (3/hour rate-limited), and parent-to-child remote PIN reset via Supabase Broadcast (online) + SECURITY DEFINER RPC (offline queue). Parent PIN migrates from 4-digit plaintext to 6-digit SHA-256 hash stored in AsyncStorage. Both devices enforce a 5-minute background re-lock via `AppState`.

## Technical Context

**Language/Version**: TypeScript 5.x (React Native / Expo SDK 51)

**Primary Dependencies**:
- `expo-crypto` (SHA-256 hashing — already installed from spec 017)
- `@supabase/supabase-js` (Realtime Broadcast, Auth OTP, RPC — already installed)
- `@react-native-async-storage/async-storage` (local PIN hash/lockout storage — already installed)
- `zustand` (stores — already installed)
- `expo-router` (navigation — already installed)

**Storage**: PostgreSQL (Supabase) for `realtime_commands` and `profiles.pin_hash`; SQLite (expo-sqlite, `resilience_logs`) for OTP rate limiting via `pinRecoveryManager`; AsyncStorage for local PIN hash and lockout state.

**Testing**: Jest + `@testing-library/react-native` (unit); Jest with live Supabase credentials (integration).

**Target Platform**: iOS 16+ / Android 10+ (React Native Expo managed workflow).

**Performance Goals**: PIN verify < 100ms (local hash only, no network); remote reset delivery < 10s online (SC-004); forgot-PIN flow < 3min (SC-003).

**Constraints**: No network required for PIN verification (FR-003); child device has no auth session (headless profile); offline command queuing must survive app restarts.

**Project Type**: Mobile app (React Native / Expo).

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Test-First (TDD) | ✅ PASS | Tests written before implementation per phase gating below |
| II. Library-First | ✅ PASS | New services in `services/api/pinAuth.ts` and `services/api/childPinReset.ts` with clear boundaries |
| III. CLI Interface | ✅ PASS | `migrate:pin-auth`, `test:pin-auth`, `test:pin-auth-unit` npm scripts added |
| IV. Integration Testing | ✅ PASS | 10 integration scenarios (A–J) in `tests/integration/pinAuth.test.ts` |
| V. Observability | ✅ PASS | All API hooks emit structured logs; AppState transitions logged |
| VI. Versioning | ✅ PASS | New `pin_hash` column is additive; CHECK constraint extended via migration |
| VII. YAGNI | ✅ PASS | No premature abstractions; reuse existing `pinRecoveryManager`, `familyChannel`, `usePairingStore` |
| RLS Mandatory | ✅ PASS | New RPC functions are SECURITY DEFINER with explicit child_id validation; `realtime_commands` RLS unchanged |

## Project Structure

### Documentation (this feature)

```text
specs/018-pin-auth-two-device/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── pin-auth-api.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
services/api/
├── pinAuth.ts           # New: PIN verify, lockout, OTP flow
├── childPinReset.ts     # New: remote reset dispatch + child receive
└── types.ts             # Modified: add ParentPinState, PinLockoutState, ChildPinResetCommand, etc.

services/realtime/
├── types.ts             # Modified: add 'reset_child_pin' to CommandType
└── commandProcessor.ts  # Modified: handle 'reset_child_pin' → navigate + clear lockout

app/auth/
├── child-pin-entry.tsx  # New: returning child PIN entry (US1)
├── parent-pin-entry.tsx # New: returning parent PIN entry full-screen (US2)
├── forgot-pin.tsx       # New: 3-step email OTP reset (US3)
└── setup-pin.tsx        # Modified: 4-digit → 6-digit, hash-based

app/(child)/
└── _layout.tsx          # Modified: AppState background lock + mount ChildPinResetListener

app/(parent)/
├── _layout.tsx          # Modified: AppState background lock
└── index.tsx            # Modified: add "Reset Child PIN" action

components/ui/
├── PinModal.tsx         # Modified: 4-digit → 6-digit, hash comparison
└── ChildPinResetListener.tsx  # New: side-effect component for child remote reset

store/
└── useSettingsStore.ts  # Modified: pinCode cleared after migration guard in setup-pin flow

supabase/migrations/
└── 20260612000002_pin_auth_schema.sql  # New: extend command_type, add 4 SECURITY DEFINER RPCs

scripts/
└── apply-pin-auth-schema.ts   # New: idempotent migration runner

tests/
├── unit/
│   └── pinAuth.test.ts  # New: unit tests for services/api/pinAuth.ts
└── integration/
    └── pinAuth.test.ts  # New: integration tests (Scenarios A–J)
```

## Phase 0: Setup

1. Add npm scripts to `package.json`:
   - `"migrate:pin-auth": "npx ts-node scripts/apply-pin-auth-schema.ts"`
   - `"test:pin-auth": "jest tests/integration/pinAuth.test.ts --no-coverage"`
   - `"test:pin-auth-unit": "jest tests/unit/pinAuth.test.ts --no-coverage"`

2. Create `supabase/migrations/20260612000002_pin_auth_schema.sql`:
   - Alter `realtime_commands.command_type` CHECK constraint to add `'reset_child_pin'`
   - Create `dispatch_child_pin_reset(p_family_id UUID, p_child_id UUID, p_sender_id UUID) → json`
   - Create `get_pending_pin_reset(p_child_id UUID) → json`
   - Create `acknowledge_pin_reset(p_command_id UUID, p_child_id UUID) → json`
   - Create `update_parent_pin_hash(p_email TEXT, p_new_hash TEXT) → void`
   - GRANT EXECUTE on get_pending_pin_reset and acknowledge_pin_reset TO anon

3. Create `scripts/apply-pin-auth-schema.ts`:
   - Pattern: `scripts/apply-child-pairing-schema.ts`
   - Check if `reset_child_pin` exists in `pg_proc` before applying
   - Apply idempotently

4. Apply migration: `npm run migrate:pin-auth`

## Phase 1: Type Definitions (Blocking Prerequisite)

Add to `services/api/types.ts`:
- `ParentPinState`, `PinLockoutState`, `ChildPinResetCommand`, `DispatchPinResetResult`, `PendingPinResetResult`

Add to `services/realtime/types.ts`:
- `'reset_child_pin'` to `CommandType` union

**Checkpoint**: Types defined — service implementations can proceed.

## Phase 2: User Story 1 — Returning Child Logs In with PIN

### TDD Gate (write tests first — must fail):
- `tests/unit/pinAuth.test.ts`: tests for `verifyPin`, `recordPinFailure`, `getPinLockoutState`, `clearPinLockout`
- Tests import from `services/api/pinAuth.ts` which does not yet exist → RED

### Implementation:
- Create `services/api/pinAuth.ts` (pure functions + AsyncStorage operations)
- Create `app/auth/child-pin-entry.tsx` (6-dot display, numeric keypad, lockout UI)
- Modify `app/index.tsx`: add routing condition — if `pairingState !== null && pairingState.has_pin && !pinVerified` → navigate to `/auth/child-pin-entry`
- Modify `app/(child)/_layout.tsx`: add `AppState` listener for 5-minute background re-lock → navigate to `/auth/child-pin-entry`

**Independent Test**: Set `@child_pin_hash` in AsyncStorage → launch app → child-pin-entry appears → correct PIN → `/(child)` loads.  
**Unit gate**: `npm run test:pin-auth-unit` — all tests GREEN.

## Phase 3: User Story 2 — Parent Logs In with PIN

### Implementation:
- Modify `app/auth/setup-pin.tsx`: upgrade from 4 dots/digits to 6; on PIN confirm: hash with SHA-256 → `AsyncStorage.setItem('@parent_pin_hash', hash)` + clear `useSettingsStore.pinCode` + fire-and-forget `profiles.pin_hash` update
- Modify `components/ui/PinModal.tsx`: upgrade to 6 dots; use `verifyPin` for hash comparison (replace string equality `pin === correctPin`)
- Create `app/auth/parent-pin-entry.tsx` (full-screen, 6-dot PIN, lockout logic, "Forgot PIN" link)
- Modify `app/index.tsx`: if `@parent_pin_hash` exists → navigate to `/auth/parent-pin-entry` instead of showing `PinModal`
- Modify `app/(parent)/_layout.tsx`: add `AppState` listener for 5-minute background re-lock → navigate to `/auth/parent-pin-entry`

**Migration guard**: In `parent-pin-entry.tsx` on mount — if `isPinSetup === true` but `@parent_pin_hash` is null → navigate to `setup-pin.tsx` (forced re-set to 6-digit).

**Independent Test**: Set `@parent_pin_hash` → launch app → parent-pin-entry appears → correct PIN → `/(parent)` loads.

## Phase 4: User Story 3 — Parent Forgotten PIN Reset

### Implementation:
- Create `app/auth/forgot-pin.tsx` (3-step: email → OTP → new PIN)
- Add `sendForgotPinOtp`, `verifyForgotPinOtp`, `updateParentPinHash` to `services/api/pinAuth.ts`
- Wire "Forgot PIN" link in `parent-pin-entry.tsx` → `/auth/forgot-pin`

**Rate limit behaviour**: `sendForgotPinOtp` calls `pinRecoveryManager.attempt(email)` first. If rate-limited, returns `{allowed: false, reason}` without calling Supabase.

**Independent Test**: Tap "Forgot PIN" → enter email → receive code → enter code → create 6-digit PIN → `/(parent)` loads → `@parent_pin_hash` updated.

## Phase 5: User Story 4 — Remote Child PIN Reset

### Implementation:
- Create `services/api/childPinReset.ts` (dispatch, watch status, get pending, acknowledge)
- Modify `services/realtime/commandProcessor.ts`: handle `reset_child_pin` → `clearPinLockout('@child_pin_lockout')` + navigate to `child-setup-pin`
- Create `components/ui/ChildPinResetListener.tsx` (broadcast subscriber + offline poll)
- Modify `app/(child)/_layout.tsx`: mount `<ChildPinResetListener />`
- Modify `app/(parent)/index.tsx`: add "Reset Child PIN" button in Quick Actions → confirm dialog → `dispatchChildPinReset` → show pending badge

**Parent tracking**: After dispatch, parent subscribes via `watchChildPinResetStatus` (CDC on `realtime_commands`) → badge clears when `acknowledged_at` is set.

**Deduplication**: `dispatch_child_pin_reset` RPC supersedes prior unacknowledged resets (see data-model.md).

**Independent Test**: Parent taps "Reset Child PIN" → confirms → child device (online) shows `child-setup-pin` within 10s → child creates new PIN → parent badge clears.  
Run `npm run test:pin-auth` — Scenarios E, F, G, H, J pass.

## Phase 6: Polish & Verification

1. Run `npm run test` — full suite, zero regressions, zero failures.
2. Run `npx tsc --noEmit` — zero new TypeScript errors across all new/modified files.
3. Manual E2E: fresh child device (has_pin=true) → PIN entry → correct PIN → child interface. Background 6 minutes → return → PIN entry shown again.

## npm Scripts Added to package.json

```json
"migrate:pin-auth": "npx ts-node scripts/apply-pin-auth-schema.ts",
"test:pin-auth": "jest tests/integration/pinAuth.test.ts --no-coverage",
"test:pin-auth-unit": "jest tests/unit/pinAuth.test.ts --no-coverage"
```

## Key Decisions Summary

| Decision | Choice | Reference |
|---|---|---|
| Parent PIN storage | 6-digit SHA-256 hash in `@parent_pin_hash` | research.md Decision 1 |
| Child offline reset delivery | SECURITY DEFINER RPCs callable with anon key | research.md Decision 2 |
| Background lock mechanism | React Native `AppState` in layout files | research.md Decision 3 |
| Forgot PIN OTP provider | Supabase Auth native OTP | research.md Decision 4 |
| Pending status completion trigger | Child completes PIN creation (not command receipt) | spec.md Clarification + research.md Decision 5 |
| Child Realtime component | Separate `ChildPinResetListener` using `usePairingStore` | research.md Decision 6 |
