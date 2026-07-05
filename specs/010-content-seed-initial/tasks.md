# Tasks: Initial Content Seed

**Input**: Design documents from `specs/010-content-seed-initial/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**TDD Note**: Per constitution §I, the integration test is written BEFORE the seed script is run — test fails first (0 rows), then passes after seeding.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Wire up CLI entry points before any implementation begins.

- [x] T001 Add `"seed:content": "npx ts-node scripts/seed-content.ts"` and `"test:content-seed": "jest tests/integration/contentSeed.test.ts --no-coverage"` to the `scripts` section of `package.json`

---

## Phase 2: Foundational — TDD Gate

**Purpose**: Write the integration test covering all three user stories BEFORE the seed script exists. Tests must FAIL at this point (no rows in DB).

**⚠️ CRITICAL**: Do not run `seed:content` until T003 confirms tests are FAILING.

- [x] T002 Write `tests/integration/contentSeed.test.ts` — use the same `maybeDescribe`/`HAS_CREDENTIALS` skip pattern as `tests/integration/contentSchema.test.ts`; assert: `count(videos) >= 3`, `count(stories) >= 3`, `count(creative) >= 2`, `count(games) >= 2`, `count(categories) >= 3`; assert `url IS NOT NULL` for all video rows (FR-006); assert `thumbnail_url IS NOT NULL` for all content_items rows (FR-007); assert age-range coverage: count of videos/stories/creative/games each `>= 1` WHERE `min_age <= 5` (SC-004, 2–5 age group); assert counting game config has keys `type/question/image_url/correct_answer/choices`; assert matching game config has `type` and `pairs` array with at least 2 items each having `item` and `image` keys
- [x] T003 Run `npm run test:content-seed` — confirm tests FAIL with assertion errors (expected 0 to be >= 3); this is the required TDD red state. **Note**: if tests unexpectedly pass, the DB already contains seed rows — run rollback SQL from `specs/010-content-seed-initial/quickstart.md` to clear them, then re-run T003 to confirm FAIL before proceeding

**Checkpoint**: Tests are failing as expected. Implementation can begin.

---

## Phase 3: User Story 1 — Child Sees Real Content (Priority: P1) 🎯 MVP

**Goal**: All 10 content items (3 videos + 3 stories + 2 activities + 2 games) and 3 categories inserted and visible in the app for the correct age groups.

**Independent Test**: Run `npm run test:content-seed` — US1 assertions (video/story/creative/game counts) pass.

### Implementation for User Story 1

- [x] T004 [US1] Create `scripts/seed-content.ts` — implement `loadEnv()` (reuse pattern from `scripts/apply-migration.ts`), `createClient()` with service role key, `seedCategory(client, cat)` (SELECT by name → skip or INSERT → return `'inserted' | 'skipped' | 'error'`), `seedContentItem(client, item)` (SELECT by title+type → skip or INSERT → return status), `main()` that processes SEED_CATEGORIES then SEED_ITEMS, collects all results, prints per-item log lines and final summary table, exits with code 1 if any errors
- [x] T005 [US1] Add seed data arrays to `scripts/seed-content.ts` — SEED_CATEGORIES: `[{name:'math', icon_url:'https://picsum.photos/seed/math/100'}, {name:'animals', icon_url:'https://picsum.photos/seed/animals/100'}, {name:'nature', icon_url:'https://picsum.photos/seed/nature/100'}]`; SEED_ITEMS: 3 videos (duration_seconds: 180/240/300, YouTube URLs, Picsum thumbnails), 3 stories (content_text: 3-paragraph story body each, Picsum thumbnails), 2 creative activities (assets_url: Picsum URLs), 2 games (Count the Apples: counting config with 4 choices; Match the Animals: matching config with 3 pairs) — all per the seed data table in `specs/010-content-seed-initial/plan.md`
- [x] T006 [US1] Run `npm run seed:content` — confirm output shows `3 inserted, 0 skipped, 0 failed` for categories and `10 inserted, 0 skipped, 0 failed` across all content types
- [x] T007 [US1] Run `npm run test:content-seed` — confirm US1 assertions pass: `count(videos) >= 3`, `count(stories) >= 3`, `count(creative) >= 2`, `count(games) >= 2`

**Checkpoint**: User Story 1 complete — 10 content items in DB, test assertions green.

---

## Phase 4: User Story 2 — Content Filterable by Category (Priority: P2)

**Goal**: Category rows exist in the `categories` table with correct names and icon URLs; content items carry matching `category` values so the filter UI has real data.

**Independent Test**: Run `npm run test:content-seed` — US2 assertions pass (`count(categories) >= 3`, category filter returns only matching items).

### Verification for User Story 2

*(Seed data inserted in Phase 3 covers the categories and category values — no additional implementation needed. These tasks verify correctness.)*

- [x] T008 [US2] Run `npm run test:content-seed` — confirm US2 assertions pass: `count(categories) >= 3`, category filter for `'math'` returns only math-labelled rows with zero non-math items in result
- [x] T009 [US2] Run the Supabase Dashboard verification queries from `specs/010-content-seed-initial/quickstart.md` — confirm `SELECT name FROM categories ORDER BY name` returns `animals`, `math`, `nature`

**Checkpoint**: User Story 2 complete — categories table populated, filter returns correct results.

---

## Phase 5: User Story 3 — Games Have Working Config JSON (Priority: P3)

**Goal**: Both seeded game rows carry valid `config_json` with all required keys for their `game_type`.

**Independent Test**: Run `npm run test:content-seed` — US3 assertions pass (counting config keys present, matching `pairs` array valid).

### Verification for User Story 3

*(Game config_json values were defined in T005 — no additional implementation needed. These tasks verify correctness.)*

- [x] T010 [US3] Run `npm run test:content-seed` — confirm US3 assertions pass: counting game config contains `type`, `question`, `image_url`, `correct_answer`, `choices`; matching game config contains `type` and `pairs` array with `>= 2` items each having `item` and `image` keys
- [x] T011 [US3] Manually verify in Supabase Dashboard SQL Editor: `SELECT title, game_type, config_json FROM content_items WHERE type = 'game'` — confirm both rows present with parseable JSON

**Checkpoint**: User Story 3 complete — all 3 user stories verified, all tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Idempotency verification, TypeScript hygiene, full suite regression check.

- [x] T012 Re-run `npm run seed:content` — confirm idempotency: output shows `0 inserted, 13 skipped, 0 failed` (10 items + 3 categories all skipped), exit code 0
- [x] T013 [P] Run `npx tsc --noEmit` and `npm run lint` — confirm zero TypeScript errors and zero ESLint errors in `scripts/seed-content.ts` and `tests/integration/contentSeed.test.ts` (constitution §Quality Gates steps 1–2)
- [x] T014 [P] Run `npm run test` — confirm zero regressions across all existing unit and integration tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (TDD Gate)**: Depends on Phase 1 (needs `test:content-seed` script in package.json)
- **Phase 3 (US1)**: Depends on Phase 2 — seed data is the implementation; test must be failing first
- **Phase 4 (US2)**: Depends on Phase 3 — categories are inserted by the seed script
- **Phase 5 (US3)**: Depends on Phase 3 — game configs are inserted by the seed script
- **Phase 6 (Polish)**: Depends on Phases 3–5

### Within Phase 3

- T004 (script structure) → T005 (add seed data) → T006 (run seed) → T007 (verify test)
- T004 and T005 are sequential — seed data lives in the same file as the script logic

### Parallel Opportunities (Phase 6)

- T013 (tsc) and T014 (full test suite) can run in parallel after T012

---

## Parallel Example: Phase 6 Polish

```bash
# After T012 (idempotency confirmed), launch in parallel:
Task T013: npx tsc --noEmit
Task T014: npm run test
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: TDD Gate (T002–T003)
3. Complete Phase 3: US1 seed script + verification (T004–T007)
4. **STOP and VALIDATE**: 10 content items in DB, integration test green
5. App is now demo-ready with real content — MVP deliverable

### Incremental Delivery

1. Phase 1 + Phase 2 → Test gate in place
2. Phase 3 (US1) → Content visible in app (MVP)
3. Phase 4 (US2) → Category filter has real data
4. Phase 5 (US3) → Game engine can render from DB
5. Phase 6 → Polish, idempotency confirmed, suite clean

---

## Notes

- [P] tasks touch different files or run independent commands — safe to run in parallel
- T003 (confirm FAIL) is a required TDD gate — do not run `seed:content` before this step
- `seed-content.ts` uses the same ESM + `loadEnv()` pattern as `scripts/apply-migration.ts`
- Seed data is defined inline (no external file) — YAGNI per constitution §VII
- All 3 user stories share a single seed script; Phases 4 and 5 are verification-only
- Rollback SQL is documented in `specs/010-content-seed-initial/quickstart.md`
