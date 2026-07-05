# Research: Content Validation & Quality (spec 015)

**Date**: 2026-06-11 | **Plan**: [plan.md](plan.md)

---

## Decision 1 — Lifecycle Status Column vs. Separate State Table

**Decision**: Add a `status TEXT` column directly to `content_items`.

**Rationale**: A separate state table would add a JOIN to every content read query and makes the lifecycle harder to enforce atomically. A single column on the row is sufficient given the simple linear lifecycle (`draft → pending_review → published/rejected`). Concurrent update conflicts are handled at the application layer via conditional UPDATE (`WHERE status = 'pending_review'`).

**Alternatives considered**:
- Separate `content_lifecycle_events` event-sourced table — rejected; overkill for a small-team workflow
- Separate `content_state` table — rejected; adds JOIN overhead and no benefit at this scale

---

## Decision 2 — Where Validation Runs

**Decision**: Validation runs client-side in the TypeScript service (`services/api/contentValidation.ts`), not in a Supabase Edge Function.

**Rationale**: The project has no Edge Functions today. All business logic lives in `services/api/`. An in-process TypeScript validator follows §II Library-First (standalone module) and avoids adding a new deployment target. The validation result is persisted to `content_validation_results` by the service after running.

**Alternatives considered**:
- Supabase Edge Function for validation — rejected; adds deployment complexity, not YAGNI (§VII)
- PostgreSQL triggers — rejected; difficult to test, breaks §I (TDD), no plain-language error messages

---

## Decision 3 — Game Config Schema Validation

**Decision**: Hardcode per-`game_type` validator functions in `services/api/contentValidationRules.ts` as a `Record<string, (config: unknown) => string | null>` map.

**Rationale**: The project already ships game types `counting` and `matching` with known config shapes (see ContentPlan.md Phase 4). A map of validator functions is testable, typed, and easily extended by adding a new entry — no library needed.

**Alternatives considered**:
- JSON Schema library (ajv) — rejected; heavy dependency for 2–3 schemas, violates §VII YAGNI
- Runtime schema from database — rejected; rules must be in code per clarification Q2

---

## Decision 4 — URL Reachability Check

**Decision**: Use `fetch()` with a 3-second timeout and `HEAD` method. Classify failures as `warning` (advisory), not `error` (blocking). Perform only during `submitForValidation`, never during `triggerRevalidation` (to avoid rate-limiting external services).

**Rationale**: Network conditions at submission time are unreliable. A timeout should not block a content item that is otherwise valid. The admin review step is the safety net for URL verification (per spec clarification Q3). Skipping reachability during bulk re-validation avoids hammering YouTube/Vimeo with HEAD requests for hundreds of items.

**Alternatives considered**:
- Block on URL failure — rejected; per clarification Q3, advisory only
- DNS-only check — rejected; a DNS-resolvable host can still return 404/403

---

## Decision 5 — Concurrent Review Conflict (First-Wins)

**Decision**: Use a conditional SQL UPDATE — `UPDATE content_items SET status='published' WHERE id=$id AND status='pending_review' RETURNING id`. If 0 rows are updated, the item was already reviewed by another admin.

**Rationale**: PostgreSQL atomically checks and updates in a single statement. No application-level lock needed. The returning row count (0 or 1) is the signal. This is the simplest correct implementation for the first-wins requirement (per clarification Q4).

**Alternatives considered**:
- `SELECT FOR UPDATE` pessimistic lock — rejected; over-engineering for a low-concurrency admin tool
- Optimistic version column — rejected; adds a column just for this edge case

---

## Decision 6 — Grandfathering Existing Content

**Decision**: The `status` column migration adds the column with `DEFAULT 'published'`, so all existing `content_items` rows receive `status = 'published'` immediately. The column default is then changed to `'draft'` so future INSERTs start as draft.

**Rationale**: Existing items have already been manually reviewed (they are live in the child interface today). Retroactively blocking them would break the child experience. A deployment-time one-shot upgrade is the simplest migration. This matches the spec edge case: "grandfathered in".

---

## Decision 7 — RLS on New Tables

**Decision**: Both new tables (`content_validation_results`, `content_review_records`) are admin-read + service-write. Children and parents have no access.

**Rationale**: Validation results and review decisions are internal admin data. Children have no use for them. Parents could theoretically see review history but this is explicitly out of scope. Service role writes are needed for the TypeScript service layer (which uses the service role key for writes).

**RLS naming** (per constitution §Data):
- `admin_read_content_validation_results`
- `service_write_content_validation_results`
- `admin_read_content_review_records`
- `admin_write_content_review_records` (admins insert their own decisions)
- `service_write_content_review_records`

---

## Decision 8 — Updated Child-Facing Read Policy on content_items

**Decision**: Replace the broad `authenticated_read_content_items` policy (all authenticated users see all rows) with two policies: one for non-admin authenticated users (sees only `status = 'published'`) and one for admins (sees all statuses).

**Rationale**: SC-001 requires that no unreviewed content reaches children. The only enforcement point for this in Supabase is the RLS policy on `content_items`. The existing policy grants access to all rows regardless of status; after this migration it must filter by `status = 'published'` for non-admin readers.

**Admin JWT detection**: follows the existing spec-012 pattern — `auth.jwt() ->> 'role' = 'admin'`.
