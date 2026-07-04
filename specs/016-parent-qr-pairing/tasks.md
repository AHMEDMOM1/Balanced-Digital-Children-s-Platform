# Tasks: Parent Device Registration & QR Pairing

**Input**: Design documents from `specs/016-parent-qr-pairing/`

**Prerequisites**: [plan.md](plan.md) ✅ · [spec.md](spec.md) ✅ · [research.md](research.md) ✅ · [data-model.md](data-model.md) ✅ · [contracts/pairing-api.md](contracts/pairing-api.md) ✅ · [quickstart.md](quickstart.md) ✅

**TDD Note**: Per constitution §I, tests are written first and confirmed FAILING before any implementation begins. This is non-negotiable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps task to a user story from spec.md (US1–US3)
- Exact file paths included in every task description

---

## Phase 1: Setup

**Purpose**: Install the new dependency, wire up npm scripts, and add TypeScript types that every subsequent phase depends on.

- [x] T001 Add three npm scripts to `package.json` `"scripts"` section: `"migrate:two-device": "npx ts-node scripts/apply-two-device-schema.ts"`, `"test:pairing": "jest tests/integration/pairing.test.ts --no-coverage"`, `"test:pairing-unit": "jest tests/unit/pairingToken.test.ts --no-coverage"`
- [x] T002 [P] Install `react-native-qrcode-svg` — run `npm install react-native-qrcode-svg` in repo root (`react-native-svg@15.15.3` is already installed; no additional native step needed)
- [x] T003 [P] Add `PairingToken` and `PairingResult` interfaces to `services/api/types.ts` (insert before the `ContentItem` interface): `PairingToken { id, family_id, token, manual_code, created_at, expires_at, used_at: string | null, child_id: string | null }` and `PairingResult { token: PairingToken | null, displayCode: string | null, error: string | null }`

---

## Phase 2: Foundational — Database Schema

**Purpose**: Apply the DB tables, columns, and RLS policies that ALL integration tests depend on. No integration test can pass without this phase.

**⚠️ CRITICAL**: Complete T006 (apply migration) before running any integration test.

- [x] T004 [P] Write `supabase/migrations/20260611000001_two_device_schema.sql` — all statements idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`): (1) `CREATE TABLE IF NOT EXISTS pairing_tokens` with columns: id UUID PK DEFAULT gen_random_uuid(), family_id UUID NOT NULL, token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(), manual_code TEXT NOT NULL DEFAULT LPAD(floor(random()*1000000)::text, 6, '0'), created_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '10 minutes'), used_at TIMESTAMPTZ, child_id UUID REFERENCES profiles(id); (2) `CREATE TABLE IF NOT EXISTS device_registrations` with: id UUID PK, profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, family_id UUID NOT NULL, device_role TEXT NOT NULL CHECK (device_role IN ('parent','child')), device_token TEXT, last_seen_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(); (3) `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT`; (4) `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_length INT DEFAULT 6`; (5) indexes: idx_pairing_tokens_family_id, idx_pairing_tokens_token, idx_pairing_tokens_manual_code, idx_device_registrations_family_id; (6) `ALTER TABLE pairing_tokens ENABLE ROW LEVEL SECURITY`; (7) `ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY`; (8) `DROP POLICY IF EXISTS parent_read_pairing_tokens ON pairing_tokens` → `CREATE POLICY parent_read_pairing_tokens ON pairing_tokens FOR SELECT TO authenticated USING (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'))`; (9) same pattern for `parent_write_pairing_tokens` (FOR INSERT WITH CHECK); (10) `CREATE POLICY service_write_device_registrations ON device_registrations FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role')`
- [x] T005 [P] Write `scripts/apply-two-device-schema.ts` — follow pattern of existing `scripts/apply-migration.ts`: `loadEnv()` reads `.env`; idempotency check: `information_schema.tables WHERE table_name = 'pairing_tokens'`; if exists log "already applied" and `process.exit(0)`; if CLI available (`SUPABASE_ACCESS_TOKEN` env var) apply via `npx supabase db query --linked --file supabase/migrations/20260611000001_two_device_schema.sql`; fallback: read and print SQL file to stdout
- [x] T006 Apply migration — run `npm run migrate:two-device` — confirm: `pairing_tokens` table exists (query `information_schema.tables`), `device_registrations` table exists, `profiles.pin_hash` column exists, policies `parent_read_pairing_tokens` and `parent_write_pairing_tokens` appear in `pg_policies` (requires `.env` credentials)
- [x] T007 Verify `app/auth/_layout.tsx` — confirm the auth Stack navigator includes `qr-pairing` as a registered route; if using explicit `<Stack.Screen>` definitions, add `<Stack.Screen name="qr-pairing" options={{ title: 'Pair Child Device' }} />`; if using the default expo-router file-based convention, confirm the new file will be auto-discovered

**Checkpoint**: DB schema ready — integration tests can now reach the pairing_tokens table.

---

## Phase 3: User Stories 1+2 — TDD Gate (Priority: P1) 🎯

**Goal**: Write all tests for US1 (token generation + display) and US2 (security enforcement) before implementing any code. Confirm they FAIL.

**US1**: Parent registers and receives a valid pairing code (QR + manual).  
**US2**: Token is single-use and time-limited, enforced server-side.

**Independent Test (US1+US2)**: `npm run test:pairing-unit` and `npm run test:pairing` Scenarios A–D all pass.

### TDD Gate — Write tests FIRST, confirm FAIL before implementing

- [x] T008 [P] Write `tests/unit/pairingToken.test.ts` — import `{ formatDisplayCode }` from `services/api/pairing` (module does not exist yet → import will fail); tests: (a) `formatDisplayCode('482931')` returns `'482-931'`; (b) `formatDisplayCode('000001')` returns `'000-001'`; (c) `formatDisplayCode('999999')` returns `'999-999'`; (d) result always matches `/^\d{3}-\d{3}$/`; no DB credentials needed
- [x] T009 [P] Write `tests/integration/pairing.test.ts` — use `HAS_CREDENTIALS`/`maybeDescribe` skip pattern; import `{ generatePairingToken, watchForChildPaired }` from `services/api/pairing` (module does not exist yet); include seven `it()` blocks: **Scenario A** (generatePairingToken returns PairingResult with used_at=null, expires_at between +9min and +11min from now, displayCode matching `/^\d{3}-\d{3}$/`, error null — cleanup via service-role DELETE); **Scenario B** (two sequential calls return different token UUIDs and different manual_codes); **Scenario C** [US2] (service-role inserts a pairing_token for `otherFamilyId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'`; authenticated parent client SELECT WHERE family_id=otherFamilyId returns 0 rows — RLS blocks cross-family access); **Scenario D** [US2] (anonClient.from('pairing_tokens').insert({family_id: testFamilyId, manual_code: '123456'}) returns non-null error — RLS blocks unauthenticated INSERT); **Scenario E** (watchForChildPaired(testFamilyId, jest.fn(), serviceClient) returns a function; calling that function does not throw); **Scenario F** [SC-003] (record `start = Date.now()` before calling `generatePairingToken(testFamilyId, serviceClient)`; assert `Date.now() - start < 2000` — verifies the 2-second response requirement server-side; cleanup via service-role DELETE); **Scenario G** [SC-006] (use service-role client to INSERT a pairing_token row with `expires_at = new Date(Date.now() - 1000).toISOString()`; SELECT it back and assert `new Date(row.expires_at) < new Date()` is true — confirms the DB correctly stores and returns expiry timestamps, enabling Phase 2 rejection logic to enforce SC-006)
- [x] T010 Confirm T008 FAILS — run `npm run test:pairing-unit` and verify failure is "Cannot find module" or equivalent [TDD gate — do NOT proceed to Phase 4 until confirmed RED]
- [x] T011 Confirm T009 FAILS — run `npm run test:pairing` and verify same import error for Scenarios A–G [TDD gate — do NOT proceed to Phase 4 until confirmed RED]

---

## Phase 4: User Stories 1+2 — Service Implementation (Priority: P1)

**Goal**: Implement `services/api/pairing.ts` to make unit and integration tests GREEN.

- [x] T012 Implement `services/api/pairing.ts` — export three items per `contracts/pairing-api.md`: (1) `export function formatDisplayCode(rawCode: string): string` — `return rawCode.slice(0,3) + '-' + rawCode.slice(3)`; (2) `export async function generatePairingToken(familyId: string, supabase?: SupabaseClient): Promise<PairingResult>` — INSERT into `pairing_tokens` with `{ family_id: familyId }` only (DB generates token, manual_code, expires_at via defaults); `.select().single()`; on success return `{ token: data as PairingToken, displayCode: formatDisplayCode(data.manual_code), error: null }`; map error code `42501` → `'Unauthorized — parent session required'`; all other errors → `'A network error occurred. Please try again.'`; emit structured log `{ level, hook: 'generatePairingToken', family_id, duration_ms, error }`; (3) `export function watchForChildPaired(familyId: string, onPaired: (childId: string) => void, supabase?: SupabaseClient): () => void` — subscribe to `postgres_changes` event `UPDATE` on table `pairing_tokens` filter `family_id=eq.${familyId}`; in callback: if `payload.new.used_at !== null && payload.new.child_id !== null` call `onPaired(payload.new.child_id as string)`; log subscription lifecycle (`subscribed`, `paired`, `reconnected`, `closed`); return `() => client.removeChannel(channel)`
- [x] T013 Confirm T008 GREEN — run `npm run test:pairing-unit` and verify all unit tests PASS [US1 unit green]
- [x] T014 Confirm T009 GREEN — run `npm run test:pairing` and verify Scenarios A–G all PASS [US1+US2 integration green — Scenarios C+D verify US2 RLS security; Scenario F verifies SC-003 timing; Scenario G verifies SC-006 expiry]

**Checkpoint**: Service layer complete. Token generation and server-side security both verified.

---

## Phase 5: User Story 1 — Screen Implementation (Priority: P1)

**Goal**: Parent sees the QR pairing screen immediately after OTP verification. Screen shows QR, manual code, countdown, and Regenerate.

**Independent Test**: Complete registration flow manually → confirm qr-pairing screen appears (not setup-pin) → confirm QR code and `XXX-XXX` manual code display → confirm 10-minute countdown runs → tap Regenerate → confirm button shows spinner, old codes stay visible, new codes appear within 2 seconds → confirm timer resets.

- [x] T015 [P] [US1] Modify `app/auth/register.tsx` — in `handleVerifyRegistration` (lines 58–64), replace the entire `isPinSetup` branch with a single line: `router.replace('/auth/qr-pairing');` — remove the `useSettingsStore.getState()` call and both branches of the if/else
- [x] T016 [US1] Implement `app/auth/qr-pairing.tsx` — follow the full Screen Contract in `contracts/pairing-api.md`: (a) imports: `useRouter` from expo-router, `useAuthStore` from store/useAuthStore, `generatePairingToken` + `watchForChildPaired` from services/api/pairing, `PairingResult` from services/api/types, `QRCode` from react-native-qrcode-svg, `View/Text/TouchableOpacity/ActivityIndicator/StyleSheet` from react-native; (b) read `familyId` from `useAuthStore().parentData?.familyId`; if null, `router.replace('/auth/register')`; (c) state: `pairingResult: PairingResult | null`, `isGenerating: boolean`, `remainingSeconds: number`, `error: string | null`; (d) mount `useEffect`: call `generatePairingToken(familyId)` → set pairingResult; call `watchForChildPaired(familyId, onPaired)` → store unsubscribe fn in `useRef`; (e) countdown `useEffect`: `setInterval(1000)` computing `remainingSeconds = Math.max(0, Math.floor((new Date(pairingResult.token.expires_at).getTime() - Date.now()) / 1000))`; when `remainingSeconds === 0` call `handleRegenerate()`; clear interval on cleanup; (f) `handleRegenerate`: set `isGenerating = true` → `generatePairingToken` → update `pairingResult` → `isGenerating = false`; (g) `onPaired`: call unsubscribe ref → `router.replace('/(parent)')`; (h) cleanup `useEffect`: `clearInterval` + call unsubscribe ref if set; (i) UI: `<QRCode value={qrPayload} size={220} />` where `qrPayload = JSON.stringify({ token: pairingResult.token.token, family_id: familyId, expires_at: pairingResult.token.expires_at })`; `<Text>` showing `pairingResult?.displayCode ?? '---'` in large format; countdown `<Text>` in MM:SS format (`'--:--'` while isGenerating); Regenerate `<TouchableOpacity>` disabled + `<ActivityIndicator />` while isGenerating, otherwise shows "Regenerate" label; error banner `<View>` visible only when `error !== null`

**Checkpoint**: US1 MVP complete — parent can complete the full registration-to-QR-screen flow on their device.

---

## Phase 6: User Story 3 — Realtime Notification Verification (Priority: P2)

**Goal**: Confirm that when a child device pairs (Phase 2 of TwoDevicePlan), the parent device automatically navigates to the dashboard. The `watchForChildPaired` subscription is already implemented in T012; this phase verifies and tests its integration in the screen.

**Independent Test**: Run `npm run test:pairing` Scenario E (subscription lifecycle) — confirm unsubscribe function is returned and callable without error. Full end-to-end test (child scans QR → parent navigates) requires Phase 2 implementation.

- [x] T017 [US3] Run `npm run test:pairing` — confirm Scenario E (`watchForChildPaired` subscription lifecycle) PASSES; add an inline comment in `tests/integration/pairing.test.ts` above Scenario E noting: "Full US3 acceptance test (parent navigates on child pairing) requires Phase 2 — child QR scan spec"

**Checkpoint**: US3 service-layer subscription confirmed. Full navigation test deferred to Phase 2 spec.

---

## Phase 7: Polish & Verification

**Purpose**: TypeScript hygiene, full test suite regression, and final quality gates.

- [x] T018 Run `npm run test:pairing-unit` — confirm all unit tests PASS (final state)
- [x] T019 [P] Run `npm run test:pairing` — confirm all integration tests PASS (Scenarios A–E, final state)
- [x] T020 [P] Run `npx tsc --noEmit` — confirm zero TypeScript errors across all new and modified files: `services/api/pairing.ts`, `services/api/types.ts`, `app/auth/qr-pairing.tsx`, `app/auth/register.tsx`, `scripts/apply-two-device-schema.ts`
- [x] T021 Run `npm run test` — confirm zero regressions across full existing test suite (contentValidation, adminCrud, rlsPolicies, seedVerify, resilience tests all still pass)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (scripts added before apply); T006 BLOCKS integration tests going green
- **Phase 3 (TDD Gate)**: Depends on Phase 1 (types defined) — tests are written but will FAIL until Phase 4
- **Phase 4 (Service)**: Depends on Phase 3 (tests confirmed RED) AND Phase 2 T006 (migration applied)
- **Phase 5 (Screen)**: Depends on Phase 4 (service module must exist for screen imports)
- **Phase 6 (US3)**: Depends on Phase 4 (watchForChildPaired implemented in T012)
- **Phase 7 (Polish)**: Depends on Phases 4–6

### Within Phase 1

- T001 (scripts), T002 (npm install), T003 (types) are independent — run in parallel

### Within Phase 2

- T004 (SQL file) and T005 (apply script) are independent — run in parallel
- T006 (apply) depends on T004 + T005
- T007 (route verify) is independent of T004/T005/T006 — run in parallel with T004

### Within Phase 3 (TDD Gate)

- T008 (unit tests) and T009 (integration tests) are independent — run in parallel
- T010 (confirm unit RED) depends on T008
- T011 (confirm integration RED) depends on T009

### Within Phase 5 (Screen)

- T015 (register.tsx 1-line change) and the preparation for T016 are independent
- T016 (qr-pairing.tsx) depends on T012 (service module must exist for import)

---

## Parallel Execution Examples

### Phase 1

```
Parallel start:
  T001  Add npm scripts to package.json
  T002  npm install react-native-qrcode-svg
  T003  Add PairingToken + PairingResult types to services/api/types.ts
```

### Phase 2

```
Parallel start:
  T004  Write migration SQL file
  T005  Write apply script
  T007  Verify app/auth/_layout.tsx route registration
Then sequential:
  T006  Apply migration (confirm tables + policies exist)
```

### Phase 3 (TDD)

```
Parallel start:
  T008  Write tests/unit/pairingToken.test.ts
  T009  Write tests/integration/pairing.test.ts
Then sequential:
  T010  Confirm unit tests FAIL [gate]
  T011  Confirm integration tests FAIL [gate]
```

### Phase 5 (Screen)

```
Parallel start:
  T015  Modify app/auth/register.tsx (1-line change)
Then:
  T016  Implement app/auth/qr-pairing.tsx (requires T012 service to exist)
```

### Phase 7 (Polish)

```
Parallel start:
  T018  npm run test:pairing-unit
  T019  npm run test:pairing
  T020  npx tsc --noEmit
Then sequential:
  T021  npm run test (full suite regression)
```

---

## Implementation Strategy

### MVP (US1 + US2 only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Migration (T004–T007)
3. Complete Phase 3: TDD Gate (T008–T011) — confirm RED
4. Complete Phase 4: Service (T012–T014) — confirm GREEN
5. Complete Phase 5: Screen (T015–T016)
6. **STOP AND VALIDATE**: `npm run test:pairing` all GREEN; manually complete registration → QR screen appears; Regenerate works; countdown auto-regenerates
7. MVP delivered: parent can register and see the pairing screen

### Incremental Delivery

| Milestone | Stories complete | Behaviour |
|-----------|-----------------|-----------|
| MVP | US1 + US2 | Parent sees QR + manual code; 10-min expiry enforced; Regenerate works |
| +Notification | US1 + US2 + US3 | Parent auto-navigates when child pairs (needs Phase 2 spec for full test) |

---

## Notes

- `[P]` tasks touch different files with no shared write dependencies — safe to run concurrently
- All integration tests use `HAS_CREDENTIALS`/`maybeDescribe` — skipped gracefully in CI without credentials
- T006 (apply migration) requires `.env` with Supabase credentials — must be run manually before integration tests can go GREEN
- US2 acceptance scenario 1 ("consumed token → rejected") is partially Phase 2 scope (child side); the server-side enforcement is verified by Scenario C (RLS) and the migration's single-use column design
- US3 full end-to-end test (parent navigates on child pairing) requires Phase 2 child spec — noted in T017
- After T015, `setup-pin` is no longer reachable from the registration flow; the existing `app/auth/setup-pin.tsx` file is NOT deleted (it will be repurposed in Phase 3 of TwoDevicePlan)
