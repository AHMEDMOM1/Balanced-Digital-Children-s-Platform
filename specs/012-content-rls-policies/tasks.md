# Tasks: Content RLS — Admin Write Policies

**Input**: Design documents from `specs/012-content-rls-policies/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**TDD Note**: Per constitution §I, the integration test is written BEFORE the migration is applied. Tests MUST fail (red state — admin policies absent) before the migration runs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Wire up CLI entry points before any implementation begins.

- [x] T001 Add `"migrate:rls-admin": "npx ts-node scripts/apply-rls-admin.ts"` and `"test:rls-policies": "jest tests/integration/rlsPolicies.test.ts --no-coverage"` to the `scripts` section of `package.json`

---

## Phase 2: Foundational — TDD Gate

**Purpose**: Write the migration SQL and integration test BEFORE applying the migration. Tests must FAIL at this point (admin policies do not exist in the DB yet).

**⚠️ CRITICAL**: Do not run `migrate:rls-admin` until T004 confirms tests are FAILING.

- [x] T002 [P] Write `supabase/migrations/20260611000000_admin_write_policies.sql` — two idempotent `FOR ALL` policies using `auth.jwt() ->> 'role' = 'admin'`: `DROP POLICY IF EXISTS "admin_write_content_items" ON content_items; CREATE POLICY "admin_write_content_items" ON content_items FOR ALL USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');` — and identical policy named `admin_write_categories` on `categories`; do NOT touch or repeat spec 009 policies

- [x] T003 [P] Write `tests/integration/rlsPolicies.test.ts` — use the same `SUPABASE_URL`/`SERVICE_ROLE_KEY`/`HAS_CREDENTIALS`/`maybeDescribe` skip pattern as `tests/integration/contentSchema.test.ts`; create the file with three describe blocks:
  - `describe('Policy catalog (US3)', () => { it('content_items has all 3 expected policies', ...) /* canonical approach: service-role client queries pg_policies via `client.from('pg_policies').select('policyname,cmd').eq('tablename','content_items')` — service-role key bypasses pg_policies RLS; assert policyname array includes authenticated_read_content_items, service_write_content_items, admin_write_content_items and count === 3 */; it('categories has all 3 expected policies', ...) /* same approach for tablename='categories' */ })`
  - `describe('Unauthenticated write rejection (US1)', () => { it('rejects unauthenticated INSERT to content_items', async () => { const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''; const anonClient = createClient(SUPABASE_URL, ANON_KEY); const { error } = await anonClient.from('content_items').insert([{ title: 'Test RLS', type: 'video' }]); expect(error).not.toBeNull(); }) })`
  - `describe('Read regression (US2)', () => { it('content_items still returns rows for service role client', ...) /* expect count >= 1 */; it('categories still returns rows for service role client', ...) /* expect count >= 1 */ })`

- [x] T004 Run `npm run test:rls-policies` — confirm the policy catalog tests FAIL (expected `admin_write_*` policies not found); the read regression tests should PASS (rows exist); the write rejection test should PASS (unauthenticated INSERT already rejected by existing SELECT-only policies). **This is the TDD red state for the catalog assertions.**

**Checkpoint**: TDD gate met — catalog tests fail because admin policies are absent. Implementation can begin.

---

## Phase 3: User Story 1 — Admin Can Write Content (Priority: P1) 🎯 MVP

**Goal**: The `admin_write_content_items` and `admin_write_categories` policies exist in the database. An admin-role JWT user can INSERT/UPDATE/DELETE content. Non-admin writes remain rejected.

**Independent Test**: Run `npm run test:rls-policies` — the policy catalog tests now pass.

### Implementation for User Story 1

- [x] T005 [US1] Write `scripts/apply-rls-admin.ts` — implement `loadEnv()` (reuse pattern from `scripts/apply-migration.ts`), `createClient()` with service role key, idempotency check: `SELECT count(*) FROM pg_policies WHERE policyname IN ('admin_write_content_items','admin_write_categories')` (if count === 2, log "Migration already applied" and exit 0; if count === 1, log "Partial migration detected — reapplying" and proceed); if not applied, try `supabase db query --linked --file` with `SUPABASE_ACCESS_TOKEN` from env; fallback: print the SQL content of `supabase/migrations/20260611000000_admin_write_policies.sql` to stdout for manual Dashboard application and exit 1; `main()` collects result and prints summary line

- [x] T006 [US1] Run `npm run migrate:rls-admin` — confirm output shows policies applied successfully (or paste SQL into Supabase Dashboard SQL Editor if `SUPABASE_ACCESS_TOKEN` is unavailable)

- [x] T011 [US1] Re-run `npm run migrate:rls-admin` a second time — confirm output shows "Migration already applied" and exits 0 with no errors (verifies SC-005 idempotency)

**Checkpoint**: Migration applied — admin write policies exist in the database and migration is confirmed idempotent.

---

## Phase 4: User Story 2 — Existing Read Access Unaffected (Priority: P2)

**Goal**: After migration, authenticated children and parents still read content normally. The additive migration did not break spec 009 policies.

**Independent Test**: Run `npm run test:rls-policies` — the read regression tests pass with row counts >= 1.

### Verification for User Story 2

*(Read regression tests were written in T003 and already pass — these tasks confirm the full test run after migration.)*

- [x] T007 [US2] Run `npm run test:rls-policies` — confirm ALL tests now pass: policy catalog tests (admin_write_* policies found), write rejection test (unauthenticated INSERT rejected), read regression tests (content_items and categories return rows)

**Checkpoint**: US2 complete — read path verified unbroken.

---

## Phase 5: User Story 3 — Policy Catalog Is Verifiable (Priority: P3)

**Goal**: The policy catalog shows the complete expected set of 3 policies per table. This is verified by the same test run as US2.

**Independent Test**: `pg_policies` query confirms exactly the expected policies exist on both tables.

### Verification for User Story 3

*(Policy catalog tests were written in T003 — T007 above covers their passage. This task adds the manual Supabase Dashboard verification as a secondary check.)*

- [x] T008 [US3] Run this SQL in Supabase Dashboard → SQL Editor: `SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename IN ('content_items', 'categories') ORDER BY tablename, policyname;` — confirm 6 rows total: `admin_write_categories` (ALL), `authenticated_read_categories` (SELECT), `service_write_categories` (ALL), `admin_write_content_items` (ALL), `authenticated_read_content_items` (SELECT), `service_write_content_items` (ALL)

**Checkpoint**: All 3 user stories complete — admin write policies in place, reads unaffected, catalog verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: TypeScript hygiene, regression check, quality gates per constitution.

- [x] T009 [P] Run `npx tsc --noEmit` — confirm 0 TypeScript errors introduced in `scripts/apply-rls-admin.ts` and `tests/integration/rlsPolicies.test.ts`
- [x] T010 [P] Run `npm run test` — confirm 0 regressions across all existing unit and integration tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (TDD Gate)**: Depends on Phase 1 (needs `test:rls-policies` script in package.json)
- **Phase 3 (US1)**: Depends on Phase 2 — TDD gate must confirm FAIL before migration runs
- **Phase 4 (US2)**: Depends on Phase 3 — migration must be applied before read regression can be verified as unbroken
- **Phase 5 (US3)**: Depends on Phase 3 — admin policies must exist before catalog verification passes
- **Phase 6 (Polish)**: Depends on Phases 3–5

### Within Phase 2

- T002 (migration SQL) and T003 (integration test) are independent — run in parallel
- T004 depends on T002 and T003 (both files must exist before running)

### Within Phase 6

- T009 (tsc) and T010 (full test suite) are independent — run in parallel

---

## Parallel Example: Phase 2 (TDD Gate)

```bash
# Launch in parallel:
Task T002: Write supabase/migrations/20260611000000_admin_write_policies.sql
Task T003: Write tests/integration/rlsPolicies.test.ts

# Then sequentially:
Task T004: npm run test:rls-policies  (confirm catalog tests FAIL)
```

## Parallel Example: Phase 6 (Polish)

```bash
# Launch in parallel:
Task T009: npx tsc --noEmit
Task T010: npm run test
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: TDD Gate (T002–T004)
3. Complete Phase 3: US1 migration + apply (T005–T006)
4. **STOP and VALIDATE**: Run `npm run test:rls-policies` — catalog tests pass
5. Admin write policies are live — MVP deliverable

### Incremental Delivery

1. Phase 1 + Phase 2 → Test gate in place
2. Phase 3 (US1) → Admin write policies applied (MVP)
3. Phase 4 (US2) → Read regression verified
4. Phase 5 (US3) → Policy catalog manually confirmed
5. Phase 6 → Polish, TypeScript clean, full suite clean

---

## Notes

- [P] tasks touch different files or run independent commands — safe to run in parallel
- T004 (confirm FAIL) is the required TDD gate — do not run `migrate:rls-admin` before this step
- `apply-rls-admin.ts` uses the same `loadEnv()` + `supabase db query` pattern as `scripts/apply-migration.ts`
- The `admin_write_*` policy uses `FOR ALL` (not separate INSERT/UPDATE/DELETE) — see research.md Decision 1
- Service-role key bypasses RLS; seed scripts continue to work unchanged
- Admin write success (SC-002) requires a real admin JWT — verified manually via quickstart.md Step 4
