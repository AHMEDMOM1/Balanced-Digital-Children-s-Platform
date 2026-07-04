# Tasks: Content Validation & Quality

**Input**: Design documents from `specs/015-content-validation-quality/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/validation-api.md](contracts/validation-api.md)

**TDD Note**: Per constitution §I, tests are written first and confirmed FAILING before any implementation begins. This is non-negotiable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps task to a user story from spec.md (US1–US4)
- Exact file paths included in every task description

---

## Phase 1: Setup

**Purpose**: Wire up shared infrastructure that every subsequent phase depends on.

- [x] T001 Add `"migrate:validation-lifecycle"` and `"test:content-validation"` scripts to `package.json`
- [x] T002 [P] Add `ContentStatus`, `ValidationSeverity`, `ValidationRuleOutcome`, `ValidationReport`, `ReviewRecord` types to `services/api/types.ts`; extend `ContentItem` with optional `status?: ContentStatus` field

---

## Phase 2: Foundational — Database Schema

**Purpose**: Apply the DB schema that all user stories depend on. Integration tests cannot reach green state without this migration in place.

**⚠️ CRITICAL**: Complete this phase before integration tests are run for any user story.

- [x] T003 [P] Write `supabase/migrations/20260612000000_content_lifecycle.sql` — add `status` column to `content_items` (existing rows default to `'published'`; future INSERTs default to `'draft'`), add CHECK constraint + index, create `content_validation_results` table + RLS, create `content_review_records` table + RLS, replace `authenticated_read_content_items` policy with `authenticated_read_published_content_items` and `admin_read_all_content_items`
- [x] T004 [P] Write `scripts/apply-validation-lifecycle.ts` — idempotency check (query `information_schema.columns` for `status` on `content_items`); apply via `supabase db query --linked --file` if absent; print SQL fallback to stdout if CLI unavailable; follow pattern of existing `scripts/apply-migration.ts`
- [x] T005 Apply migration to Supabase: run `npm run migrate:validation-lifecycle` and confirm `status` column exists, both new tables exist, and new policies appear in `pg_policies` (requires `.env` credentials)

**Checkpoint**: DB schema ready — all subsequent tests can connect to real tables.

---

## Phase 3: User Story 1 — Automated Validation Gate (Priority: P1) 🎯 MVP

**Goal**: Every submitted content item is run through 10 hardcoded validation rules; items with any blocking error stay in `draft`; items with zero errors advance to `pending_review`.

**Independent Test**: Submit a content item with a missing thumbnail — verify status stays `draft` and the response identifies `required_thumbnail` as failed. Submit a fully-valid story — verify status advances to `pending_review`.

### TDD Gate — Write tests FIRST, confirm FAIL before implementing

- [x] T006 [P] Write `tests/unit/contentValidationRules.test.ts` — one `it()` block per rule (10 rules), each with a passing-case and a failing-case fixture; no DB or credentials needed; import from `services/api/contentValidationRules` (module does not exist yet — tests must fail at import)
- [x] T007 Confirm T006 FAILS: run `npx jest tests/unit/contentValidationRules.test.ts` and verify failure is "Cannot find module" or equivalent [TDD gate — do not proceed until confirmed RED]

### Implementation

- [x] T008 [P] Implement `services/api/contentValidationRules.ts` — export 10 rule functions (each `(item: Partial<ContentItemExtended>) => ValidationRuleOutcome`): `required_title`, `required_type`, `required_thumbnail`, `required_category`, `valid_age_range` (pairs `(2,4)/(5,7)/(8,10)`), `video_url_required`, `video_url_format`, `asset_format`, `game_config_schema` (validators for `counting` and `matching` game types), `url_reachability` (async `fetch` HEAD, 3 s timeout, Warning severity)
- [x] T009 Implement `submitForValidation(contentId)` in `services/api/contentValidation.ts` — load item from `content_items`, run all applicable rules via `contentValidationRules`, compute `passed` (zero errors), insert row into `content_validation_results` (run_number = MAX prior + 1, default 1), update `content_items.status` to `pending_review` or leave as `draft`, emit structured log `{level, hook:'submitForValidation', duration_ms, passed, errorCount}`, return `ValidationReport`
- [x] T010 Write integration tests for US1 in `tests/integration/contentValidation.test.ts` — use `HAS_CREDENTIALS`/`maybeDescribe` pattern; test: (a) missing thumbnail → status stays `draft`, error identifies rule; (b) valid story → status = `pending_review`; (c) video with URL timeout → advances with warning; (d) game with malformed config → stays `draft`; verify `content_validation_results` row inserted after each run
- [x] T011 Confirm T010 PASSES: run `npm run test:content-validation` and verify US1 integration tests green [US1 green state]

**Checkpoint**: Automated validation is live. Submitting content now produces a ValidationReport and advances the lifecycle correctly.

---

## Phase 4: User Story 2 — Actionable Validation Feedback (Priority: P2)

**Goal**: Admins can retrieve the full validation report for any content item, with per-rule pass/fail, severity labels, and plain-language messages.

**Independent Test**: After running `submitForValidation` on a failing item, call `getValidationHistory` and verify the returned array contains one entry with `rule_outcomes` that includes a failed rule with `severity: 'error'` and a non-empty `message`.

### TDD Gate

- [x] T012 Add integration test group "Validation history" to `tests/integration/contentValidation.test.ts` — test: (a) after two submissions (first fails, second passes after fix), `getValidationHistory` returns two entries ordered newest-first; (b) each entry contains `rule_outcomes` array with correct shape; confirm tests FAIL before T013 is implemented

### Implementation

- [x] T013 Implement `getValidationHistory(contentId)` in `services/api/contentValidation.ts` — query `content_validation_results WHERE content_id = $id ORDER BY created_at DESC`, map rows to `ValidationReport[]`, emit structured log, return `{ history, error }`

**Checkpoint**: Validation feedback is retrievable. Admins can query the full history of all runs for any item.

---

## Phase 5: User Story 3 — Human Review Workflow (Priority: P2)

**Goal**: Admins approve or reject `pending_review` items; first-wins atomic conflict handling; rejected items can be edited and resubmitted with history preserved.

**Independent Test**: Approve one pending item and reject another with a reason — verify only the approved item appears when querying published content (as a non-admin), and the rejected item's `content_review_records` row contains the written reason.

### TDD Gate

- [x] T014 [P] Add integration test group "Review workflow" to `tests/integration/contentValidation.test.ts` — test: (a) approve pending item → status = `published`; (b) reject with reason → status = `rejected`, reason stored; (c) reject without reason → returns error; (d) concurrent approve: two parallel calls → first succeeds, second returns "already reviewed" error; confirm FAIL before T016–T020
- [x] T015 [P] Add integration test group "Review queue and resubmit" to `tests/integration/contentValidation.test.ts` — test: (a) `getReviewQueue` returns only `pending_review` items oldest-first; (b) `resubmitContent` on a rejected item runs validation again, run_number increments, prior history preserved; confirm FAIL before T016–T020

### Implementation

- [x] T016 [P] Implement `approveContent(contentId)` in `services/api/contentValidation.ts` — conditional UPDATE `WHERE id=$id AND status='pending_review'` RETURNING id; if 0 rows → return "already reviewed" error; if 1 row → INSERT `content_review_records {decision:'approved'}`; emit structured log
- [x] T017 [P] Implement `rejectContent(contentId, reason)` in `services/api/contentValidation.ts` — validate reason non-empty; conditional UPDATE `WHERE status='pending_review'`; same 0/1-row logic as T016; INSERT `content_review_records {decision:'rejected', reason}`; emit structured log
- [x] T018 Implement `resubmitContent(contentId)` in `services/api/contentValidation.ts` — verify current status is `rejected`; UPDATE status to `draft`; call `submitForValidation(contentId)` (run_number will auto-increment based on existing history); return resulting report
- [x] T019 [P] Implement `getReviewQueue()` in `services/api/contentValidation.ts` — SELECT from `content_items WHERE status='pending_review' ORDER BY created_at ASC`; return `ContentItemExtended[]`
- [x] T020 [P] Implement `getFlaggedItems()` in `services/api/contentValidation.ts` — SELECT from `content_items WHERE status='flagged' ORDER BY created_at ASC`; return `ContentItemExtended[]`

**Checkpoint**: Full review workflow in place. Approved items appear to children; rejected items can be fixed and resubmitted; concurrent conflicts handled gracefully.

---

## Phase 6: User Story 4 — Re-Validation on Rule Changes (Priority: P3)

**Goal**: After a rule change is deployed, admins can trigger a bulk re-validation of all published content. Items now failing are marked `flagged` (not auto-unpublished). URL reachability check is skipped during bulk runs.

**Independent Test**: Seed three published items where one would fail a tightened rule. Call `triggerRevalidation()` and verify: (a) the failing item's status changes to `flagged`; (b) the other two remain `published`; (c) `processedCount` = 3; (d) `flaggedIds` contains exactly the failing item's ID.

### TDD Gate

- [x] T021 Add integration test group "Re-validation" to `tests/integration/contentValidation.test.ts` — test: (a) `triggerRevalidation` on a mix of valid/invalid published items flags only invalid ones; (b) flagged items remain visible to children (status = flagged, still readable); (c) `ValidationResult` rows are inserted for each re-validated item with `triggered_by='revalidation'`; confirm FAIL before T022

### Implementation

- [x] T022 Implement `triggerRevalidation()` in `services/api/contentValidation.ts` — fetch all `published` items in pages of 50; for each item run all rules EXCEPT `url_reachability`; insert `content_validation_results` row (`triggered_by='revalidation'`); if any errors → UPDATE status to `flagged`; collect `flaggedIds`; return `{ flaggedIds, processedCount, error }`; emit structured log per batch with timing

**Checkpoint**: Re-validation complete. Bulk quality sweeps are possible after any rule deployment.

---

## Phase 7: Polish & Verification

**Purpose**: Full test suite confirmation, TypeScript hygiene, and regression check.

- [x] T023 Run `npm run test:content-validation` — confirm all unit + integration tests PASS (green across all 4 user stories)
- [x] T024 [P] Run `npm run test` — confirm zero regressions in full test suite (existing `adminCrud`, `rlsPolicies`, `contentSchema`, `contentSeed` tests must still pass with updated RLS policies)
- [x] T025 [P] Run `npx tsc --noEmit` — confirm zero TypeScript errors across all modified files (`types.ts`, `contentValidationRules.ts`, `contentValidation.ts`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — blocks integration tests going green
- **Phase 3 (US1)**: Depends on Phase 2 (migration applied) — write tests first, implement after
- **Phase 4 (US2)**: Depends on Phase 3 (ValidationReport shape established)
- **Phase 5 (US3)**: Depends on Phase 3 (lifecycle state machine in place)
- **Phase 6 (US4)**: Depends on Phase 3 (published items + validation_results table in use)
- **Phase 7 (Polish)**: Depends on all prior phases

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|----------------------|
| US1 (P1) | Phase 2 complete | — |
| US2 (P2) | US1 (ValidationReport type exists) | US3 implementation |
| US3 (P2) | US1 (status lifecycle in place) | US2 implementation |
| US4 (P3) | US1 (published items + validation_results) | — |

### Within Each Phase

- TDD gate tasks must be confirmed FAILING before implementation tasks begin
- [P] tasks within a phase can run in parallel
- `contentValidationRules.ts` (T008) must be complete before `contentValidation.ts` (T009) calls it
- Migration must be applied (T005) before any integration test can reach green

---

## Parallel Execution Examples

### Phase 1
```
Parallel start:
  T001  Add npm scripts to package.json
  T002  Add TypeScript types to services/api/types.ts
```

### Phase 2
```
Parallel start:
  T003  Write migration SQL file
  T004  Write apply script
Then: T005  Apply migration
```

### Phase 3 (US1) — TDD flow
```
Parallel start (write tests first):
  T006  Unit tests for validation rules
Then:
  T007  Confirm FAIL [gate]
Parallel start (implement):
  T008  contentValidationRules.ts  ← no DB, can write offline
Then:
  T009  submitForValidation() in contentValidation.ts
  T010  Integration tests for US1
  T011  Confirm PASS [green gate]
```

### Phase 5 (US3) — parallel tests + impl
```
Parallel TDD:
  T014  "Review workflow" integration tests
  T015  "Review queue + resubmit" integration tests
Parallel implementation:
  T016  approveContent()
  T017  rejectContent()
  T019  getReviewQueue()
  T020  getFlaggedItems()
Then sequential:
  T018  resubmitContent() (calls submitForValidation — depends on T009)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Migration (T003–T005)
3. Complete Phase 3: US1 validation gate (T006–T011)
4. **STOP AND VALIDATE**: `npm run test:content-validation` all green; `npx tsc --noEmit` clean
5. MVP delivered: content submission now goes through automated validation before reaching admin review

### Incremental Delivery

| Milestone | Stories complete | Child-visible behaviour |
|-----------|-----------------|------------------------|
| MVP | US1 | Only `published` items visible; validation blocks incomplete content |
| +Feedback | US1 + US2 | Admins can view full validation history per item |
| +Review | US1 + US2 + US3 | Full approve/reject workflow; resubmit after rejection |
| Full | All (US1–US4) | Bulk re-validation after rule changes |

---

## Notes

- `[P]` tasks touch different files with no shared write dependencies — safe to run concurrently
- All integration tests use `HAS_CREDENTIALS`/`maybeDescribe` pattern — skipped gracefully in CI without credentials
- The migration (T005) must be applied before integration tests can reach green; unit tests (T006) can be written and run to RED before T005
- After applying the migration, verify the RLS change doesn't break existing tests (especially `adminCrud.test.ts` which reads `content_items` without status filter — now requires admin JWT)
- `resubmitContent` (T018) is the only US3 task that depends on US1 code — sequence it after T009
