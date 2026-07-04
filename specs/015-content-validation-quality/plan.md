# Implementation Plan: Content Validation & Quality

**Branch**: `015-content-validation-quality` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-content-validation-quality/spec.md`

---

## Summary

Add a content lifecycle (draft → pending_review → published/rejected) and a hardcoded validation engine to the platform. Every content item must pass automated rule checks before an admin can review and publish it. Validated results and admin decisions are persisted as immutable audit records. The existing child-facing RLS policy on `content_items` is tightened so that only `status = 'published'` items are visible to non-admin users, enforcing SC-001 at the database level.

Delivery: one SQL migration + two new TypeScript modules + integration and unit tests + updated types.

---

## Technical Context

**Language/Version**: TypeScript 5.x (React Native / Expo SDK 50+)

**Primary Dependencies**: `@supabase/supabase-js` — Supabase client for DB reads/writes and RLS enforcement; `fetch` API (built-in) for URL reachability check

**Storage**: Supabase PostgreSQL — two new tables (`content_validation_results`, `content_review_records`), one modified table (`content_items` — add `status` column, update RLS)

**Testing**: Jest 29 — `tests/unit/contentValidationRules.test.ts` (unit, no credentials needed) + `tests/integration/contentValidation.test.ts` (integration, `HAS_CREDENTIALS`/`maybeDescribe` pattern)

**Target Platform**: Supabase hosted Postgres (cloud) + React Native mobile app

**Project Type**: Mobile app (React Native / Expo) — backend schema changes + TypeScript service layer; no new UI screens (UI consumption is a separate concern for spec 014)

**Performance Goals**: SC-003 — single-item validation under 5 s; SC-004 — 500-item re-validation under 10 minutes

**Constraints**: Migration must be idempotent (safe to re-run). Must not break existing `authenticated_read_*` policies on `categories`. No external libraries for JSON schema validation — use typed validator functions.

**Scale/Scope**: ~50–500 content items at launch; 2 new tables; 10 validation rules; 1 updated RLS policy on `content_items`

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| §I Test-First (TDD) | ✅ PASS | Unit tests for rules written before rules are implemented (T003 before T006). Integration tests written before migration is applied (T004 before T008). |
| §II Library-First | ✅ PASS | Two standalone modules: `contentValidationRules.ts` (pure rule functions) and `contentValidation.ts` (lifecycle + persistence). Single clear purpose each. |
| §III CLI Interface | ✅ PASS | `npm run migrate:validation-lifecycle` and `npm run test:content-validation` scripts added to `package.json`. |
| §IV Integration Tests Required | ✅ PASS | `tests/integration/contentValidation.test.ts` covers: RLS policy (status filter), lifecycle transitions, concurrent review conflict, re-validation scan. |
| §V Observability | ✅ PASS | All functions in `contentValidation.ts` emit structured `console.log(JSON.stringify({level, hook, duration_ms, ...}))` per existing pattern in `admin.ts`. |
| §VI Versioning | ✅ PASS | New migration `20260612000000_content_lifecycle.sql`. TypeScript types are additive (MINOR bump — no breaking changes). |
| §VII YAGNI | ✅ PASS | Rules hardcoded (no rules engine UI). No abstraction layers beyond what is needed. URL reachability uses native `fetch`, no library. |
| RLS Pattern | ✅ PASS | New tables follow `admin_read_*` / `service_write_*` / `admin_write_*` naming. Updated `content_items` policy renamed to `authenticated_read_published_content_items`. |

**Gate result: ALL PASS** — no violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/015-content-validation-quality/
├── plan.md                          ← this file
├── spec.md                          ← feature specification
├── research.md                      ← Phase 0 output
├── data-model.md                    ← Phase 1 output
├── quickstart.md                    ← Phase 1 output
├── contracts/
│   └── validation-api.md            ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md                         ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260612000000_content_lifecycle.sql    ← NEW

services/api/
├── contentValidationRules.ts               ← NEW  (pure rule functions, no DB access)
├── contentValidation.ts                    ← NEW  (lifecycle + persistence, calls rules)
└── types.ts                                ← MODIFIED (add ContentStatus, ValidationReport, etc.)

scripts/
└── apply-validation-lifecycle.ts           ← NEW  (migration apply script)

tests/
├── unit/
│   └── contentValidationRules.test.ts      ← NEW  (pure unit, no credentials)
└── integration/
    └── contentValidation.test.ts           ← NEW  (requires SUPABASE credentials)

package.json                                ← MODIFIED (add 2 npm scripts)
```

**Structure Decision**: Two-module split (`rules` + `validation`) follows §II Library-First. Rules module is side-effect-free and fully unit-testable. Validation module owns all DB I/O and depends on rules module.

---

## Phase 0: Research

See [research.md](research.md) for full decisions. Key outcomes:

- Validation runs in-process TypeScript (no Edge Function)
- `status` column on `content_items` (not a separate state table)
- Existing rows grandfathered as `'published'`; future INSERTs default to `'draft'`
- Concurrent review: conditional UPDATE (`WHERE status = 'pending_review'`), 0-row result = conflict
- URL reachability: `fetch` HEAD, 3-second timeout, advisory Warning, skipped during bulk re-validation

---

## Phase 1: Design

See [data-model.md](data-model.md) and [contracts/validation-api.md](contracts/validation-api.md).

### Migration Design

**File**: `supabase/migrations/20260612000000_content_lifecycle.sql`

Key operations (all idempotent via `IF NOT EXISTS` / `DROP POLICY IF EXISTS`):

1. `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'`
2. Add `CHECK` constraint and index on `status`
3. `ALTER TABLE content_items ALTER COLUMN status SET DEFAULT 'draft'`
4. `DROP POLICY IF EXISTS "authenticated_read_content_items"` → replace with two policies
5. `CREATE TABLE IF NOT EXISTS content_validation_results` + RLS (3 policies)
6. `CREATE TABLE IF NOT EXISTS content_review_records` + RLS (3 policies)

### Validation Rules Design

**File**: `services/api/contentValidationRules.ts`

```
10 rules total:
  Error severity (block publishing):
    required_title, required_type, required_thumbnail, required_category,
    valid_age_range, video_url_required, video_url_format,
    asset_format, game_config_schema

  Warning severity (advisory only):
    url_reachability
```

Each rule: `(item: Partial<ContentItemExtended>) => ValidationRuleOutcome`

Game config schemas hardcoded for `counting` and `matching` game types.

### Validation Service Design

**File**: `services/api/contentValidation.ts`

Exported functions (see [contracts/validation-api.md](contracts/validation-api.md)):
- `submitForValidation(contentId)` — runs rules, persists result, advances status
- `approveContent(contentId)` — atomic conditional UPDATE + insert ReviewRecord
- `rejectContent(contentId, reason)` — atomic conditional UPDATE + insert ReviewRecord
- `resubmitContent(contentId)` — resets to draft, calls submitForValidation
- `getValidationHistory(contentId)` — all prior ValidationResult rows
- `getReviewQueue()` — all pending_review items
- `getFlaggedItems()` — all flagged items
- `triggerRevalidation()` — re-runs rules on all published items (no URL check)

### Apply Script Design

**File**: `scripts/apply-validation-lifecycle.ts`

Same pattern as existing `scripts/apply-migration.ts`:
- `loadEnv()` reads `.env`
- Idempotency check: queries for existence of `status` column on `content_items`
- If already present: log success, exit 0
- If absent: run `supabase db query --linked --file` or print SQL as fallback

### npm Scripts

```json
"migrate:validation-lifecycle": "npx ts-node scripts/apply-validation-lifecycle.ts",
"test:content-validation": "jest tests/integration/contentValidation.test.ts tests/unit/contentValidationRules.test.ts --no-coverage"
```

---

## Implementation Order

Per constitution §I (TDD): tests written and confirmed FAILING before implementation.

```
Phase 1 — Setup
  T001  Add npm scripts to package.json
  T002  Add TypeScript types to services/api/types.ts
         (ContentStatus, ValidationSeverity, ValidationRuleOutcome,
          ValidationReport, ReviewRecord; extend ContentItem with status)

Phase 2 — TDD Gate (tests FAIL here — no implementation yet)
  T003  Write tests/unit/contentValidationRules.test.ts
         (one test per rule: pass + fail cases; no DB needed)
  T004  Write tests/integration/contentValidation.test.ts
         (lifecycle transitions, concurrent review, re-validation)
  T005  Run test:content-validation — confirm FAIL [TDD gate]

Phase 3 — Implementation
  T006  Write services/api/contentValidationRules.ts
         (10 rule functions + game config schemas)
  T007  Write services/api/contentValidation.ts
         (all lifecycle functions + structured logging)
  T008  Write supabase/migrations/20260612000000_content_lifecycle.sql
  T009  Write scripts/apply-validation-lifecycle.ts

Phase 4 — Migration
  T010  Run migrate:validation-lifecycle — apply to Supabase [requires credentials]

Phase 5 — Verification
  T011  Run test:content-validation — confirm all tests PASS [green state]
  T012  Run npm run test — confirm 0 regressions
  T013  Run npx tsc --noEmit — confirm 0 TypeScript errors
```
