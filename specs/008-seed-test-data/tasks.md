# Tasks: Seed & Test Data

**Input**: Design documents from `specs/008-seed-test-data/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Note**: The seed SQL file (`server/seeds/002_reports_seed.sql`) already exists and requires no changes. All remaining work is constitution compliance: CLI scripts (Constitution III), verification script, and integration tests (Constitution I + IV).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- All tasks include exact file paths

---

## Phase 1: Setup (Audit Existing Seed)

**Purpose**: Confirm the existing seed file is correct before adding scripts and tests around it

- [x] T001 Audit `server/seeds/002_reports_seed.sql` — confirm: `ON CONFLICT (child_id, stat_date) DO NOTHING` is present; all 4 category columns (`stories_seconds`, `games_seconds`, `videos_seconds`, `creative_seconds`) are populated with `random()`-bounded non-zero expressions; `is_finalized` is set to `(v_day < CURRENT_DATE)`

---

## Phase 2: Foundational (CLI Script — Constitution III)

**Purpose**: Expose seed application as an npm command before any test or verification work begins

**⚠️ CRITICAL**: T002 must complete before T003 — the integration test will reference the `seed:reports` script name in its documentation

- [x] T002 Add `"seed:reports": "supabase db execute -f server/seeds/002_reports_seed.sql"` to the `scripts` section of `package.json`

**Checkpoint**: `npm run seed:reports` is now a valid command (requires Supabase CLI + linked project)

---

## Phase 3: User Story 1 — Developer Seeds Reports Data (Priority: P1) 🎯 MVP

**Goal**: A developer runs `npm run seed:reports` then `npm run seed:verify` and sees "Result: PASS" confirming 30 days of varied data exist per child with correct finalization flags

**Independent Test**: `npx jest tests/integration/seedVerify.test.ts` — all 6 test cases pass; `npm run seed:reports && npm run seed:verify` exits 0 on a real Supabase dev project

### Tests for User Story 1 (TDD — write first, must FAIL before T005)

- [x] T003 [US1] Create `tests/integration/seedVerify.test.ts` with mocked `@supabase/supabase-js` following the pattern in `tests/integration/clockBypass.test.ts`. Include 6 test cases:
  1. Mock returns 30 rows per child → expect verify to pass and exit 0
  2. Mock returns 0 rows → expect verify to report "0 rows found" and exit 1
  3. Mock returns rows where `stories_seconds = 0` for one row → expect verify to report category failure and exit 1
  4. Mock returns past rows with `is_finalized = true` → expect verify to pass the finalization check
  5. Mock returns today's row with `is_finalized = false` → expect verify to pass the today check
  6. Mock returns rows where `MIN(total_seconds) = 800` (below 1200 threshold) → expect verify to report "total_seconds below minimum" and exit 1 (covers FR-003)

- [x] T004 [US1] Run `npx jest tests/integration/seedVerify.test.ts` and confirm all 6 tests FAIL (red phase — `scripts/seed-verify.ts` does not exist yet)

### Implementation for User Story 1

- [x] T005 [US1] Create `scripts/seed-verify.ts` — connect using `services/api/client.ts` singleton; run 4 queries against `daily_stats`: (1) `SELECT child_id, COUNT(*) GROUP BY child_id` for row counts, (2) `SELECT MIN(stories_seconds), MIN(games_seconds), MIN(videos_seconds), MIN(creative_seconds)` for category floor checks, (3) `SELECT MIN(total_seconds) FROM daily_stats` — fail if result < 1200 (FR-003), (4) `SELECT is_finalized, COUNT(*) GROUP BY is_finalized` for finalization flags. Output human-readable result lines and `Result: PASS` or `Result: FAIL` to stdout. Exit with code 1 on any failure.

- [x] T006 [US1] Add `"seed:verify": "npx ts-node scripts/seed-verify.ts"` to the `scripts` section of `package.json`

- [x] T007 [US1] Run `npx jest tests/integration/seedVerify.test.ts` and confirm all 6 tests PASS (green phase)

**Checkpoint**: US1 complete — `npm run seed:reports` applies seed; `npm run seed:verify` reports PASS; `npx jest tests/integration/seedVerify.test.ts` all green

---

## Phase 4: User Story 2 — QA Tests Multi-Child Comparison (Priority: P2)

**Goal**: The verification script explicitly reports how many children were seeded, and the test confirms ≥2 children receive seeded data, enabling QA to trust the comparison view has data for both children

**Independent Test**: Add test case to existing `tests/integration/seedVerify.test.ts`; mock returns rows for 2 children with different totals → script reports "Children seeded: 2" and does not fail

- [x] T008 [P] [US2] Add test case 6 to `tests/integration/seedVerify.test.ts`: mock returns rows for 2 children (child A: total_seconds=7200, child B: total_seconds=900) → verify script outputs "Children seeded: 2" and exits 0

- [x] T009 [US2] Extend `scripts/seed-verify.ts` to include a "Children seeded: N" output line in the summary (reuse the row-count query result from T005; just add a child count line to stdout)

**Checkpoint**: US2 complete — verification script reports child count; multi-child scenario confirmed by test. Note: SC-005 visual rendering (comparison bars differ in height) is verified manually during T014's real-env step — open Reports → Comparison tab and confirm two children's bars are at visually distinct heights.

---

## Phase 5: User Story 3 — Seed Covers All Activity Categories (Priority: P3)

**Goal**: Every seeded `daily_stats` row has non-zero values for all 4 activity types; the verification script calls this out explicitly with a ✓/✗ indicator

**Independent Test**: Add test case to existing `tests/integration/seedVerify.test.ts`; mock returns rows where all 4 MIN values > 0 → script outputs "All 4 categories non-zero: ✓"

- [x] T010 [P] [US3] Add test case 7 to `tests/integration/seedVerify.test.ts`: mock returns rows with all MIN category values > 0 → verify script outputs "All 4 categories non-zero: ✓" and exits 0; also test the failure case: mock returns MIN(stories_seconds) = 0 → script outputs "All 4 categories non-zero: ✗" and exits 1

- [x] T011 [US3] Extend `scripts/seed-verify.ts` to include an explicit "All 4 categories non-zero: ✓/✗" output line (reuse the MIN query from T005; just add a formatted line to stdout)

**Checkpoint**: All user stories complete — verification covers row counts, child count, category floors, and finalization flags

---

## Phase 6: Polish & End-to-End Validation

**Purpose**: Confirm the entire workflow works against a real Supabase environment and all tests pass together

- [x] T012 Run `npx jest tests/integration/seedVerify.test.ts` with all 8 test cases and confirm 100% pass rate

- [x] T013 [P] Run `npx tsc --noEmit` and confirm `scripts/seed-verify.ts` has zero TypeScript errors

- [x] T014 Apply the seed and verify against a real dev/staging Supabase project: record wall-clock start time, run `npm run seed:reports`, record end time — confirm elapsed < 60s (SC-002 / FR-009); then run `npm run seed:verify` and confirm stdout ends with "Result: PASS"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 confirmation (T001) — BLOCKS T003+
- **User Story 1 (Phase 3)**: Depends on Phase 2 (T002 must be done before T003)
  - Within US1: T003 → T004 (red) → T005 → T006 → T007 (green). Strictly sequential.
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion (T007 must pass first)
  - T008 and T009 can run in parallel (different concerns in same file + new file)
- **User Story 3 (Phase 5)**: Depends on Phase 3 completion; T010 and T011 can run in parallel
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after T001 + T002 — no dependency on US2 or US3
- **US2 (P2)**: Can start after US1 complete — extends the same test file and script
- **US3 (P3)**: Can start after US1 complete — extends the same test file and script; runs in parallel with US2

### Within User Story 1 (strict TDD order)

```
T003 (write test) → T004 (confirm RED) → T005 (implement) → T006 (add script) → T007 (confirm GREEN)
```

### Parallel Opportunities (within Phase 4 + 5)

```
# Once US1 (T007) passes, US2 and US3 can start in parallel:
T008 [US2] — add test case 6 to seedVerify.test.ts
T010 [US3] — add test cases 7a + 7b to seedVerify.test.ts

# Then implementation in parallel:
T009 [US2] — add child count output to seed-verify.ts
T011 [US3] — add category line output to seed-verify.ts
```

---

## Parallel Example: User Story 1

```bash
# All in strict sequence (TDD requires it):
# 1. Write test
#    → tests/integration/seedVerify.test.ts
# 2. Confirm red
#    → npx jest tests/integration/seedVerify.test.ts
# 3. Implement
#    → scripts/seed-verify.ts
# 4. Add npm script
#    → package.json
# 5. Confirm green
#    → npx jest tests/integration/seedVerify.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Audit seed file (T001)
2. Complete Phase 2: Add `seed:reports` script (T002)
3. Complete Phase 3: Write test → red → implement seed-verify.ts → add verify script → green (T003–T007)
4. **STOP and VALIDATE**: `npm run seed:reports && npm run seed:verify` returns PASS on dev environment
5. Ship US1 as standalone deliverable — reports screen has data, devs can seed any environment in one command

### Incremental Delivery

1. Foundation: T001 + T002 (seed is runnable)
2. US1: T003–T007 (seed is verifiable; integration test passes)
3. US2: T008–T009 (multi-child comparison confirmed)
4. US3: T010–T011 (all category coverage confirmed)
5. Polish: T012–T014 (TypeScript clean, real-env validated)

---

## Notes

- [P] tasks = different files or independent additions, no dependencies between them
- T004 is intentionally "confirm red" — do NOT skip this step; TDD requires observing the test fail
- `scripts/seed-verify.ts` queries the real Supabase DB; mock it in tests using `jest.mock('@supabase/supabase-js')`
- The seed SQL file itself never changes in this feature; all tasks touch only TypeScript files + package.json
- Commit after T002 (CLI gap closed), after T007 (US1 green), after US2 and US3 complete
