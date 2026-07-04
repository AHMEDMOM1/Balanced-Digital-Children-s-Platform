# Tasks: Content Schema & Storage Setup

**Input**: Design documents from `specs/009-content-schema-storage/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**TDD Note**: Per constitution §I, integration tests are written BEFORE the migration is applied — tests fail first, then the migration makes them pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Create the migrations directory and wire up the migration CLI entry point.

- [x] T001 Create `supabase/migrations/` directory at project root
- [x] T002 Create `scripts/apply-migration.ts` migration check CLI (checks if migration is applied, prints SQL instructions if not) and add `"db:migrate": "npx ts-node scripts/apply-migration.ts"` to `package.json` scripts section

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Write tests first (TDD), write the migration SQL, apply it, and verify the schema is correct before any TypeScript work starts.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T003 Write integration test file `tests/integration/contentSchema.test.ts` — tests for INSERT + SELECT round-trips for all 4 content types using the 5 new columns, categories CRUD, age-range filter (`min_age`/`max_age`), and category filter; tests should FAIL at this point (migration not yet applied)
- [ ] T004 Run `npx jest tests/integration/contentSchema.test.ts --no-coverage` — confirm tests FAIL as expected (column-not-found or table-not-found errors)
- [x] T005 Write migration file `supabase/migrations/20260610000001_content_schema_v1.sql` — copy from `specs/009-content-schema-storage/contracts/content-schema.sql` (adds 5 nullable columns to `content_items`, creates `categories` table, enables RLS with `authenticated_read_*` and `service_write_*` policies on both tables)
- [ ] T006 Run `npm run db:migrate` — if migration is not yet applied, follow the printed instructions to paste the SQL into Supabase Dashboard → SQL Editor → Run, then re-run `npm run db:migrate` to confirm applied
- [ ] T007 [P] Verify 5 new columns exist: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'content_items' AND column_name IN ('duration_seconds','content_text','assets_url','game_type','config_json')` — expect 5 rows
- [ ] T008 [P] Verify categories table: `SELECT column_name FROM information_schema.columns WHERE table_name = 'categories'` — expect id, name, icon_url, created_at
- [ ] T009 [P] Verify RLS enabled and policies exist: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('content_items','categories')` and `SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('content_items','categories')` — expect rowsecurity=true and 4 policies (authenticated_read_* + service_write_* for each table)
- [ ] T010 Run `npx jest tests/integration/contentSchema.test.ts --no-coverage` — all tests must now PASS

**Checkpoint**: Schema is live, RLS is active, integration tests pass. User story implementation can begin.

---

## Phase 3: User Story 1 — Content Database Structure (Priority: P1) 🎯 MVP

**Goal**: TypeScript type system and API hooks expose the new columns and categories table to app screens without breaking any existing hooks.

**Independent Test**: Run `npx tsc --noEmit` (zero errors) and `npx jest tests/integration/contentSchema.test.ts --no-coverage` (all pass).

### Implementation for User Story 1

- [x] T011 [US1] Add `VideoItem`, `StoryItem`, `ActivityItem`, `GameItem`, `Category`, `GameConfig`, and `ContentItemExtended` interfaces/types to `services/api/types.ts` — extend existing `ContentItem` base; keep all existing types untouched
- [x] T012 [P] [US1] Add `selectExtendedColumns` constant (string of all base + new column names) to `services/api/contentHelpers.ts` — used by extended hooks to select the new fields
- [x] T013 [P] [US1] Add `useVideoExtended()` hook to `services/api/videos.ts` — queries `content_items` with `type='video'` and selects `duration_seconds` via `selectExtendedColumns`; returns `VideoItem[]`
- [x] T014 [P] [US1] Add `useStoryExtended()` hook to `services/api/stories.ts` — queries `content_items` with `type='story'` and selects `content_text` via `selectExtendedColumns`; returns `StoryItem[]`
- [x] T015 [P] [US1] Add `useGameExtended()` hook to `services/api/games.ts` — queries `content_items` with `type='game'` and selects `game_type` and `config_json` via `selectExtendedColumns`; returns `GameItem[]`
- [x] T016 [P] [US1] Add `useCreativeExtended()` hook to `services/api/creative.ts` — queries `content_items` with `type='creative'` and selects `assets_url` via `selectExtendedColumns`; returns `ActivityItem[]` (covers FR-003)
- [x] T017 [P] [US1] Create `services/api/categories.ts` — export `useCategories()` hook that queries `categories` table and returns `Category[]`; follow existing hook pattern (`{ data, error, isLoading }`)
- [x] T018 [US1] Run `npx tsc --noEmit` — must report zero TypeScript errors

**Checkpoint**: User Story 1 complete — new columns accessible via typed hooks, no regressions in existing hooks, TypeScript clean.

---

## Phase 4: User Story 2 — Media Storage Buckets (Priority: P2)

**Goal**: Four Supabase Storage buckets created with public access so media files can be uploaded and referenced by URL.

**Independent Test**: Upload one test PNG to each bucket and confirm the public URL is reachable in a browser.

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create `thumbnails` bucket — Supabase Dashboard → Storage → New Bucket → name: `thumbnails`, Public: on
- [ ] T020 [P] [US2] Create `story-images` bucket — Supabase Dashboard → Storage → New Bucket → name: `story-images`, Public: on
- [ ] T021 [P] [US2] Create `activity-assets` bucket — Supabase Dashboard → Storage → New Bucket → name: `activity-assets`, Public: on
- [ ] T022 [P] [US2] Create `game-assets` bucket — Supabase Dashboard → Storage → New Bucket → name: `game-assets`, Public: on
- [ ] T023 [US2] Upload one test PNG to each of the 4 buckets; verify each public URL resolves (format: `https://<project-ref>.supabase.co/storage/v1/object/public/<bucket-name>/<filename>`)
- [ ] T024 [US2] Update `specs/009-content-schema-storage/quickstart.md` — add the actual Supabase project-ref URL pattern for this project's buckets

**Checkpoint**: User Story 2 complete — all 4 storage buckets accessible and accepting uploads.

---

## Phase 5: User Story 3 — Category Organisation (Priority: P3)

**Goal**: Categories table supports category-based content grouping; filtering by category name returns only matching rows.

**Independent Test**: Insert 3 rows with `category = 'math'`, query with category filter, verify exactly 3 rows returned.

### Implementation for User Story 3

- [ ] T025 [P] [US3] Insert 3 seed categories into `categories` table via Supabase Dashboard SQL Editor: `INSERT INTO categories (name) VALUES ('Math'), ('Animals'), ('Nature')` — verify all 3 inserted without error
- [ ] T026 [P] [US3] Assign `category = 'math'` to 3 content rows via SQL: `UPDATE content_items SET category = 'math' WHERE id IN (SELECT id FROM content_items LIMIT 3)` or insert 3 new test rows with `category = 'math'`
- [ ] T027 [US3] Verify category filter returns correct rows: `SELECT id, title FROM content_items WHERE category = 'math'` — must return exactly the 3 targeted rows
- [ ] T028 [US3] Verify null `icon_url` accepted: `INSERT INTO categories (name) VALUES ('Art')` — confirm success with no NOT NULL violation

**Checkpoint**: User Story 3 complete — category lookup table populated, filtering verified, null icon_url accepted.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Wire up test script, verify no regressions across the full suite.

- [x] T029 Add `"test:content-schema": "jest tests/integration/contentSchema.test.ts --no-coverage"` to `package.json` scripts section
- [x] T030 [P] Run full test suite: `npm run test` — verify zero regressions in any existing test suite
- [x] T031 [P] Run `npx tsc --noEmit` — confirm zero TypeScript errors with all new files in place

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 completion — no dependency on US2 or US3
- **Phase 4 (US2)**: Depends on Phase 2 completion — independent of US1 and US3
- **Phase 5 (US3)**: Depends on Phase 2 completion — independent of US1 and US2
- **Phase 6 (Polish)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only — independently testable
- **US2 (P2)**: Depends on Phase 2 only — independently testable (no TypeScript work)
- **US3 (P3)**: Depends on Phase 2 only — independently testable (data verification only)

### Within Phase 2 (TDD Order)

- T003 (write tests) → T004 (confirm fail) → T005 (write SQL) → T006 (apply via db:migrate) → T007/T008/T009 (verify) → T010 (confirm pass)

### Within US1 (Phase 3)

- T011 (types.ts) must complete before T012–T017 (hooks depend on the new types)
- T012–T017 are all [P] — different files, can run in parallel after T011
- T018 (tsc check) runs after T011–T017

---

## Parallel Example: Phase 3 (US1) API Hooks

```bash
# After T011 types.ts is complete, launch these 6 tasks in parallel:
Task T012: Add selectExtendedColumns to services/api/contentHelpers.ts
Task T013: Add useVideoExtended() to services/api/videos.ts
Task T014: Add useStoryExtended() to services/api/stories.ts
Task T015: Add useGameExtended() to services/api/games.ts
Task T016: Add useCreativeExtended() to services/api/creative.ts
Task T017: Create services/api/categories.ts
```

---

## Parallel Example: Phase 4 (US2) Bucket Creation

```bash
# All 4 bucket creation tasks are independent dashboard operations:
Task T019: Create thumbnails bucket
Task T020: Create story-images bucket
Task T021: Create activity-assets bucket
Task T022: Create game-assets bucket
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational — TDD cycle (T003–T010)
3. Complete Phase 3: US1 — TypeScript types + hooks (T011–T018)
4. **STOP and VALIDATE**: `npx tsc --noEmit` + `npx jest tests/integration/contentSchema.test.ts`
5. Schema is augmented, all new fields are typed and hookable — MVP deliverable

### Incremental Delivery

1. Phase 1 + Phase 2 → Schema live, tests green
2. Phase 3 (US1) → TypeScript layer complete (MVP)
3. Phase 4 (US2) → Storage ready for uploads
4. Phase 5 (US3) → Category browsing fully verifiable
5. Phase 6 → Polish, full suite clean

### Parallel Team Strategy

After Phase 2 completes:
- Developer A: Phase 3 (US1) — TypeScript types and hooks
- Developer B: Phase 4 (US2) — Supabase Dashboard bucket creation
- Both are independent and can merge separately

---

## Notes

- [P] tasks touch different files or external systems — safe to run in parallel
- T004 (confirm FAIL) is a required TDD gate — do not skip
- T006 (apply migration) uses `npm run db:migrate` CLI entry point; if migration is not applied, the script prints the SQL to run in Supabase Dashboard
- T019–T022 are manual Dashboard operations — Supabase Storage bucket provisioning has no CLI equivalent
- Existing hooks (`useVideos`, `useStories`, `useGames`, `useCreative`) must remain unchanged throughout
- `supabase/migrations/` directory will be new — it does not exist yet
