# Implementation Plan: Content RLS — Admin Write Policies

**Branch**: `012-content-rls-policies` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-content-rls-policies/spec.md`

## Summary

Add admin-role INSERT/UPDATE/DELETE policies to the two existing content tables (`content_items` and `categories`). Spec 009 already enabled RLS and applied SELECT + service_role policies; this spec is purely additive. Delivery: one idempotent SQL migration file + a migration apply script + an integration test that verifies the policy catalog and write-rejection behaviour.

## Technical Context

**Language/Version**: TypeScript 5.x (React Native / Expo)

**Primary Dependencies**: `@supabase/supabase-js` — Supabase client for integration test; PostgreSQL RLS policy SQL for the migration

**Storage**: Supabase PostgreSQL (existing project) — two tables targeted: `content_items`, `categories`

**Testing**: Jest 29 + `tests/integration/rlsPolicies.test.ts` (same `HAS_CREDENTIALS`/`maybeDescribe` pattern as existing integration tests)

**Target Platform**: Supabase hosted Postgres (cloud) — migration applied via `supabase db query` or Supabase Dashboard SQL Editor

**Project Type**: Mobile app (React Native / Expo) — this feature is a backend-only database migration with no UI changes

**Performance Goals**: RLS policy evaluation is sub-millisecond overhead — no specific performance targets

**Constraints**: Migration must be idempotent (safe to re-run). Must not modify spec 009 policies. Service-role key bypasses RLS by design.

**Scale/Scope**: 2 tables, 2 new policies (one per table using `FOR ALL` with admin JWT check)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| §I Test-First (TDD) | ✅ PASS | Integration test written before migration is applied (red state: admin policy absent = tests fail) |
| §II Library-First | ✅ N/A | Backend-only migration; no new modules or services |
| §III CLI Interface | ✅ PASS | `npm run migrate:rls-admin` and `npm run test:rls-policies` scripts added |
| §IV Integration Tests Required | ✅ PASS | `tests/integration/rlsPolicies.test.ts` covers RLS contract (policy catalog + write rejection) |
| §V Observability | ✅ N/A | No new API hooks; no service layer changes |
| §VI Versioning | ✅ PASS | New versioned migration file (`20260611000000_admin_write_policies.sql`) |
| §VII YAGNI | ✅ PASS | Single migration file, no abstraction layers |
| RLS Pattern | ✅ PASS | Follows `admin_write_*` naming — consistent with existing `service_write_*` convention |

**Gate result: ALL PASS** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/012-content-rls-policies/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output (policy definitions)
├── quickstart.md        ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             ← Phase 2 output (speckit-tasks)
```

### Source Code (repository root)

```text
supabase/migrations/
├── 20260610000001_content_schema_v1.sql    ← spec 009 (existing, do not modify)
└── 20260611000000_admin_write_policies.sql ← NEW (spec 012)

scripts/
└── apply-rls-admin.ts   ← NEW migration apply script (same pattern as apply-migration.ts)

tests/integration/
└── rlsPolicies.test.ts  ← NEW integration test

package.json             ← MODIFIED: add "migrate:rls-admin" and "test:rls-policies" scripts
```

**Structure Decision**: Single migration file + apply script + integration test. No new source modules or components — this is a pure database configuration change.

## Phase 0: Research

*All decisions resolved during clarification — no outstanding unknowns.*

See [research.md](research.md) for documented decisions and alternatives considered.

## Phase 1: Design

### Migration Design

**File**: `supabase/migrations/20260611000000_admin_write_policies.sql`

The migration adds one `FOR ALL` policy per table, scoped to users whose JWT `app_metadata` contains `role = 'admin'`. `FOR ALL` with `USING` and `WITH CHECK` on the same condition covers INSERT, UPDATE, DELETE, and SELECT for admin users.

```sql
-- Admin can INSERT, UPDATE, DELETE (and SELECT) on content_items
DROP POLICY IF EXISTS "admin_write_content_items" ON content_items;
CREATE POLICY "admin_write_content_items"
  ON content_items
  FOR ALL
  USING     (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK(auth.jwt() ->> 'role' = 'admin');

-- Admin can INSERT, UPDATE, DELETE (and SELECT) on categories
DROP POLICY IF EXISTS "admin_write_categories" ON categories;
CREATE POLICY "admin_write_categories"
  ON categories
  FOR ALL
  USING     (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK(auth.jwt() ->> 'role' = 'admin');
```

**Why `FOR ALL` not separate INSERT/UPDATE/DELETE policies?**
- SC-004 requires exactly 3 policies per table. Three separate write policies would yield 5.
- `FOR ALL` is idiomatic Supabase for admin/service bypass policies.
- Admins already read via `authenticated_read_*` — the `FOR ALL` SELECT overlap is harmless (OR logic).

**Policy naming** (constitution §Data): `admin_write_<table>` — consistent with `service_write_<table>`.

### Integration Test Design

**File**: `tests/integration/rlsPolicies.test.ts`

Three test groups (all skipped when `HAS_CREDENTIALS` is false):

1. **Policy catalog** (service role, FR-009, SC-004): Query `pg_policies` and assert all 3 expected policies exist on each table.
2. **Unauthenticated write rejection** (anon key, FR-008, SC-001): Unauthenticated INSERT to `content_items` is rejected — the simplest verifiable proxy for non-admin write denial, no test user creation needed.
3. **Read regression check** (service role, SC-003): `content_items` and `categories` still return rows after migration — confirms additive migration didn't break reads.

Note: Admin write success (SC-002) requires a JWT with `role='admin'` in `app_metadata`. Since admin user management is out of scope, this is verified via the policy catalog test + manual Supabase Dashboard check documented in quickstart.md.

### Apply Script Design

**File**: `scripts/apply-rls-admin.ts`

Follows the same structure as `scripts/apply-migration.ts`:
- `loadEnv()` reads `.env`
- Idempotency check: queries `pg_policies` for `admin_write_content_items`
- If already applied: logs success and exits 0
- If not applied: tries `supabase db query --linked --file` using `SUPABASE_ACCESS_TOKEN`
- Fallback: prints SQL to stdout for manual Dashboard application and exits 1

### npm Scripts

Add to `package.json` `scripts` section:
```json
"migrate:rls-admin": "npx ts-node scripts/apply-rls-admin.ts",
"test:rls-policies": "jest tests/integration/rlsPolicies.test.ts --no-coverage"
```

## Implementation Order

Per constitution §I (TDD), tests are written and confirmed FAILING before the migration is applied.

```
Phase 1 (Setup):
  T001  Add npm scripts to package.json

Phase 2 (TDD Gate):
  T002  Write supabase/migrations/20260611000000_admin_write_policies.sql
  T003  Write tests/integration/rlsPolicies.test.ts
  T004  Run test:rls-policies — confirm FAIL (policies not yet in DB) [TDD gate]

Phase 3 (Implementation):
  T005  Write scripts/apply-rls-admin.ts
  T006  Run migrate:rls-admin — apply migration to Supabase

Phase 4 (Verification):
  T007  Run test:rls-policies — confirm all tests PASS [green state]
  T008  Run npm run test — confirm 0 regressions [parallel with T009]
  T009  Run npx tsc --noEmit — confirm 0 TypeScript errors [parallel with T008]
```
