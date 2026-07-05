# Tasks: Child Device QR Scan & Pairing

**Spec**: 017-child-qr-scan | **Branch**: 010-content-seed-initial | **Date**: 2026-06-12

**Input**: Design documents from `specs/017-child-qr-scan/`

**TDD**: Test tasks are included and MUST be written before implementation (constitution §I NON-NEGOTIABLE).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no cross-task dependencies at time of execution)
- **[Story]**: US1, US2, US3 (maps to spec.md user stories)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New dependencies, npm scripts, DB migration SQL, and apply script — required before any user story work begins.

- [X] T001 Add 3 npm scripts to package.json: `"migrate:child-pairing": "npx ts-node scripts/apply-child-pairing-schema.ts"`, `"test:child-pairing": "jest tests/integration/childPairing.test.ts --no-coverage"`, `"test:child-pairing-unit": "jest tests/unit/childPairingToken.test.ts --no-coverage"` per plan.md npm Scripts section
- [X] T002 Install expo-camera and expo-crypto via `npx expo install expo-camera expo-crypto` and verify both appear in package.json dependencies
- [X] T003 [P] Create supabase/migrations/20260612000001_consume_pairing_token.sql with both SECURITY DEFINER functions (`consume_pairing_token(UUID, UUID)` and `consume_pairing_token_by_code(TEXT)`) and `GRANT EXECUTE TO anon` on each, per plan.md Phase 0 SQL
- [X] T004 [P] Create scripts/apply-child-pairing-schema.ts following scripts/apply-two-device-schema.ts pattern: loadEnv(), check if `consume_pairing_token` already exists in pg_proc, apply migration SQL or print idempotency message

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migration applied to live DB + TypeScript types added to services/api/types.ts — blocks all user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Apply child pairing migration via `npm run migrate:child-pairing`; verify `consume_pairing_token` and `consume_pairing_token_by_code` exist and anon has EXECUTE permission
- [X] T006 Add `ConsumePairingTokenResult`, `ChildPairingState`, and `QrPayload` interfaces to services/api/types.ts before existing `PairingToken` interface, per plan.md Phase 1 and data-model.md TypeScript Types section

**Checkpoint**: DB RPCs live + TypeScript types defined — user story work can now begin.

---

## Phase 3: User Story 1 — Child Pairs via QR Code (Priority: P1) 🎯 MVP

**Goal**: A child device with no prior pairing opens the app, is routed directly to the "Link to Parent" screen, scans the parent's QR code, creates a child profile, sets a 6-digit PIN, and enters the child interface.

**Independent Test**: `npm run test:child-pairing-unit` (7+ unit tests pass) + `npm run test:child-pairing` Scenarios A–D pass + manual: fresh device → child-scan screen → scan QR → child-setup-pin → `/(child)` → reopen app → index shown (not child-scan again).

### TDD Gate — Write Tests First (RED)

> **⚠️ Run `npm run test:child-pairing-unit` after T007 — MUST FAIL with "Cannot find module '../../services/api/childPairing'" before T010 begins.**

- [X] T007 [P] [US1] Write tests/unit/childPairingToken.test.ts importing from services/api/childPairing.ts (module does not yet exist): tests for parseQrPayload (valid JSON→object, malformed→null, missing expires_at→null), isTokenExpired (past expires_at→true, future→false), parseManualCode ('482-931'→'482931', '482931'→'482931', '123'→null)
- [X] T008 [P] [US1] Write tests/integration/childPairing.test.ts with HAS_CREDENTIALS/maybeDescribe pattern: Scenario A (valid UUID token → success + child_id; add timing assertion: `const start = Date.now(); ... expect(Date.now()-start).toBeLessThan(5000)` per SC-002), B (double-consume → invalid_token), C (expired token → invalid_token), D (wrong family_id → invalid_token), E (manual code path → success), F (watchForChildPaired fires after consumePairingToken; add `jest.setTimeout(15000)` to the describe block for Realtime CDC delivery wait), G (atomicity: bogus token leaves no profile row — use before/after count pattern: capture count via `select count exact head:true` before bogus call, repeat after, expect after===before per quickstart.md Scenario G fix) per quickstart.md scenarios; include afterAll cleanup deleting created profiles and tokens
- [X] T009 [US1] Confirm TDD RED gate: run `npm run test:child-pairing-unit` — verify it fails with "Cannot find module" (do NOT proceed to T010 until this is confirmed)

### Implementation — User Story 1

- [X] T010 [US1] Create services/api/childPairing.ts: implement parseQrPayload, isTokenExpired, parseManualCode (pure functions) and consumePairingToken (calls `supabase.rpc('consume_pairing_token', { p_token, p_family_id })`, maps JSON result to ConsumePairingTokenResult, emits structured JSON log per constitution §V) using getClient() anon key
- [X] T011 [US1] Confirm TDD GREEN gate: run `npm run test:child-pairing-unit` — all 7+ unit tests must PASS before continuing
- [X] T012 [P] [US1] Create store/usePairingStore.ts with Zustand store: PairingStoreState interface, loadPairingState (reads @child_pairing_state + @child_pin_hash from AsyncStorage), savePairingState (JSON stringify → AsyncStorage.setItem), savePinHash (setItem + update has_pin in state), clearPairingState (remove both keys) per contracts/child-pairing-api.md Store section
- [X] T013 [P] [US1] Create app/auth/child-setup-pin.tsx: 6-dot PIN display (matching 4-dot pattern in app/auth/setup-pin.tsx but 6 digits), numeric keypad, two-step enter+confirm flow, on match: Crypto.digestStringAsync(SHA256, pin), AsyncStorage.setItem('@child_pin_hash', hash), usePairingStore.savePinHash(hash), fire-and-forget profiles.pin_hash update (do NOT await), router.replace('/(child)') per contracts/child-pairing-api.md child-setup-pin Screen Contract
- [X] T014 [US1] Create app/auth/child-scan.tsx — camera mode: useCameraPermissions hook, if permission not granted show "camera unavailable" + manual button; if granted render CameraView with barcodeScannerSettings barcodeTypes qr and onBarcodeScanned=handleScan; handleScan: isScanning guard, parseQrPayload, isTokenExpired advisory check, consumePairingToken, on success savePairingState then router.replace('/auth/child-setup-pin'), error banner for each error code per contracts/child-pairing-api.md child-scan Screen Contract
- [X] T015 [US1] Modify app/index.tsx: add useEffect on mount calling usePairingStore.getState().loadPairingState() then checking state — if pairingState === null AND !isAuthenticated: router.replace('/auth/child-scan'); else if pairingState !== null AND !pairingState.has_pin: router.replace('/auth/child-setup-pin') per plan.md Phase 5 routing section. ALSO create/modify app/(child)/_layout.tsx: add a useEffect that reads usePairingStore.getState().pairingState on mount — if pairingState !== null && !pairingState.has_pin redirect to '/auth/child-setup-pin' (FR-017 MUST: direct deep-link to /(child) without completed PIN setup is blocked)

**Checkpoint**: User Story 1 complete — first-time child device opens → QR scan → profile created → PIN setup → child interface entered.

---

## Phase 4: User Story 2 — Child Pairs via Manual Code Entry (Priority: P1)

**Goal**: When the camera is unavailable or permission denied, the child types the 6-digit code shown on the parent's screen and achieves the identical pairing + PIN setup outcome.

**Independent Test**: In app/auth/child-scan.tsx, tap "Enter code manually", enter a valid 6-digit code from an active token, confirm child-setup-pin navigation. Run `npm run test:child-pairing` — Scenario E must pass.

### Implementation — User Story 2

- [X] T016 [US2] Add consumePairingTokenByCode to services/api/childPairing.ts: call parseManualCode (return invalid_token if null), call `supabase.rpc('consume_pairing_token_by_code', { p_manual_code: stripped })`, map result to ConsumePairingTokenResult, emit structured log with hook 'consumePairingTokenByCode' per contracts/child-pairing-api.md
- [X] T017 [US2] Add manual entry UI mode to app/auth/child-scan.tsx: add `mode` state ('camera'|'manual'), "Enter code manually" button on camera view (switches mode), TextInput for 6-digit input with numeric keyboard, "XXX-XXX" display formatting, submit handler calling consumePairingTokenByCode, "Switch to camera" button, error messages per contracts/child-pairing-api.md UI Elements table

**Checkpoint**: User Story 2 complete — manual code entry produces identical pairing outcome to QR scan.

---

## Phase 5: User Story 3 — Parent Dashboard Appears Automatically (Priority: P2)

**Goal**: When the child's token consumption succeeds (Phase 3 or 4), the parent's active QR pairing screen automatically navigates to the family dashboard within 5 seconds.

**Independent Test**: `npm run test:child-pairing` Scenario F — `watchForChildPaired` callback fires with child_id after `consumePairingToken` marks the token used (verifies Phase 1 Realtime is triggered by Phase 2 consumption).

### Implementation — User Story 3

- [X] T018 [US3] Run `npm run test:child-pairing` and confirm Scenario F passes: the `watchForChildPaired` subscription (implemented in services/api/pairing.ts, Phase 1) receives the CDC UPDATE on pairing_tokens and calls the callback with the new child_id — no new code required; this task is verification-only

**Checkpoint**: All three user stories complete — full two-device flow functional end-to-end.

---

## Phase 6: Polish & Verification

**Purpose**: Full regression, TypeScript check, and end-to-end manual confirmation.

- [X] T019 [P] Run `npm run test` — full suite (241+ existing tests plus new tests) must pass with zero failures and zero regressions
- [X] T020 [P] Run `npx tsc --noEmit` — verify zero new TypeScript errors in the 5 new/modified files: services/api/childPairing.ts, store/usePairingStore.ts, app/auth/child-scan.tsx, app/auth/child-setup-pin.tsx, app/index.tsx
- [X] T021 Manual quickstart.md Step 3 verification: open app on fresh simulator with no AsyncStorage → routed to child-scan → scan QR from parent simulator → child-setup-pin appears within 5 seconds → set 6-digit PIN → navigates to `/(child)` → close app → reopen → app/index.tsx shown with "Start Playing" button (not child-scan); on parent simulator: confirm auto-navigation to parent dashboard (Phase 1 Realtime)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T003 and T004 in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 complete — BLOCKS all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 complete; T007/T008 in parallel; T012/T013 in parallel after T010/T011
- **US2 (Phase 4)**: Depends on Phase 3 complete (child-scan.tsx exists, service shape defined)
- **US3 (Phase 5)**: Depends on Phase 4 complete (consumePairingToken must be triggering Realtime)
- **Polish (Phase 6)**: Depends on all user stories complete; T019/T020 in parallel

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies; delivers full QR path end-to-end
- **US2 (P1)**: Depends on US1 (child-scan.tsx base screen + service function skeleton already exist)
- **US3 (P2)**: Depends on US1/US2 (token consumption must already work to trigger Realtime)

### Within US1

- T007 and T008 (tests) MUST fail before T010 (implementation) begins — hard TDD gate
- T012 (store) and T013 (child-setup-pin screen) can proceed in parallel once T010/T011 complete
- T014 (child-scan camera mode) depends on T010 (service) and T012 (store)
- T015 (app/index.tsx routing) depends on T012 (store) only

---

## Parallel Execution Examples

### Phase 1 Setup (parallel):

```text
Task T003: Create supabase/migrations/20260612000001_consume_pairing_token.sql
Task T004: Create scripts/apply-child-pairing-schema.ts
```

### Phase 3 US1 — Tests (parallel):

```text
Task T007: Write tests/unit/childPairingToken.test.ts
Task T008: Write tests/integration/childPairing.test.ts
```

### Phase 3 US1 — Post-service (parallel):

```text
Task T012: Create store/usePairingStore.ts
Task T013: Create app/auth/child-setup-pin.tsx
```

### Phase 6 Polish (parallel):

```text
Task T019: npm run test (full suite)
Task T020: npx tsc --noEmit
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (migration + types)
3. Complete Phase 3: User Story 1 (QR scan → PIN setup → child interface)
4. **STOP and VALIDATE**: Fresh device → child-scan → scan QR → PIN → `/(child)` ✓
5. MVP delivered: child can pair with parent via QR code

### Incremental Delivery

1. Setup + Foundational → DB RPCs live, types defined
2. US1 complete → QR scan path works end-to-end (MVP)
3. US2 complete → manual code fallback available (camera-free pairing)
4. US3 complete → parent dashboard auto-navigates (full two-device experience)
5. Polish → regression confirmed, TypeScript clean

---

## Notes

- [P] tasks touch different files — safe to run concurrently
- TDD RED gate at T009 is a hard stop — confirm "Cannot find module" before writing any service code
- Cloud PIN sync in T013 is fire-and-forget per FR-016 — call `supabase.from('profiles').update(...)` without `await`; log any error as `warn`. **Phase 2 known limitation**: this update WILL be blocked by RLS (child has no auth session; anon key cannot update `profiles` directly) — the warn log is expected; local hash is sufficient for Phase 2. Phase 3 will add a `set_child_pin_hash` RPC to complete cloud sync. (research.md Decision 7)
- `consume_pairing_token_by_code` takes only `p_manual_code TEXT` — no family_id required (research.md Decision 3); family_id is returned in the result from the matched token
- T018 (US3) requires no new code — it is a verification task confirming Phase 1's `watchForChildPaired` is triggered by Phase 2's token consumption
- SC-006 (offline PIN entry works after pairing): Phase 2 stores the PIN hash locally (T013) but the returning-user PIN-entry screen (comparing entered PIN against stored hash on app re-open) is **Phase 3 scope**. SC-006 is partially deferred — do not claim it complete at Phase 2 sign-off.
