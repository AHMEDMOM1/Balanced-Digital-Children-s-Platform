# Feature Specification: Content Row Level Security — Admin Write Policies

**Feature Branch**: `012-content-rls-policies`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Phase 5 from ContentPlan.md — Row Level Security (RLS) policies on Supabase. All authenticated users (children and parents) can read all content from content_items, videos, stories, games, categories tables. Only admin role can insert/update/delete. No public (unauthenticated) read access. Apply to all content tables created in spec 009."

## Clarifications

### Session 2026-06-11

- Q: How many tables are in scope (spec 009 created 2 tables, not 5)? → A: Only `content_items` and `categories` — no separate `videos`, `stories`, or `activities` tables exist.
- Q: Did spec 009 already apply SELECT + service_role policies? → A: Yes — spec 009 migration `20260610000001_content_schema_v1.sql` enabled RLS and applied `authenticated_read_*` and `service_write_*` policies. Spec 012 is additive and adds only admin-role INSERT/UPDATE/DELETE policies.
- Q: Which JWT field identifies an admin? → A: `auth.jwt() ->> 'role' = 'admin'` sourced from Supabase `app_metadata` — stateless, server-set, tamper-evident.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Can Write Content (Priority: P1)

An admin managing the platform inserts a new video, story, activity, or game row using the Supabase Dashboard or an admin tool. The insert succeeds because the admin's JWT contains `role = 'admin'` in their app metadata. A standard child or parent attempting the same insert receives a permission denied response.

**Why this priority**: This is the core new capability. Spec 009 already locked down reads; spec 012 completes the picture by allowing authorised humans to create content without relying on the service role key.

**Independent Test**: Attempt an INSERT into `content_items` as a non-admin authenticated user and confirm it is rejected. Attempt the same INSERT as a user whose JWT has `role = 'admin'` and confirm it succeeds.

**Acceptance Scenarios**:

1. **Given** a user whose JWT contains `role = 'admin'`, **When** they INSERT a row into `content_items`, **Then** the insert succeeds.
2. **Given** a user whose JWT contains `role = 'admin'`, **When** they UPDATE or DELETE an existing row in `content_items`, **Then** the operation succeeds.
3. **Given** a standard authenticated user (child or parent), **When** they attempt to INSERT, UPDATE, or DELETE any row in `content_items`, **Then** the operation is rejected with a permission error.
4. **Given** a standard authenticated user, **When** they attempt to INSERT, UPDATE, or DELETE any row in `categories`, **Then** the operation is rejected.
5. **Given** a user whose JWT contains `role = 'admin'`, **When** they INSERT a row into `categories`, **Then** the insert succeeds.

---

### User Story 2 - Existing Read Access Is Unaffected (Priority: P2)

After spec 012's migration runs, authenticated children and parents continue to read content with no disruption. The additive migration does not modify or remove the existing `authenticated_read_*` and `service_write_*` policies from spec 009.

**Why this priority**: Additive database changes carry regression risk. Confirming the existing read path still works protects against migration errors.

**Independent Test**: Log in as a standard (non-admin) user and fetch content from `content_items` and `categories`. Both tables return rows without error.

**Acceptance Scenarios**:

1. **Given** a logged-in child or parent, **When** the app fetches content from `content_items`, **Then** rows are returned successfully.
2. **Given** a logged-in child or parent, **When** the app fetches categories from `categories`, **Then** rows are returned successfully.
3. **Given** no authentication credentials, **When** either table is queried, **Then** zero rows are returned (unauthenticated read remains blocked, as set by spec 009).

---

### User Story 3 - Policy Catalog Is Verifiable (Priority: P3)

An operator can query the database policy catalog and confirm the complete expected policy set is present on both tables — both the spec 009 policies and the new spec 012 admin write policies.

**Why this priority**: Security posture depends on policies being in place. Verifying the catalog programmatically means future audits or CI checks can confirm the policies have not been removed or altered.

**Independent Test**: Query `pg_policies` and confirm the expected policy names and commands exist on both tables.

**Acceptance Scenarios**:

1. **Given** the spec 012 migration has been applied, **When** the policy catalog is queried for `content_items`, **Then** it contains: `authenticated_read_content_items` (SELECT), `service_write_content_items` (ALL), `admin_write_content_items` (ALL — FOR ALL covers SELECT+INSERT+UPDATE+DELETE).
2. **Given** the spec 012 migration has been applied, **When** the policy catalog is queried for `categories`, **Then** it contains: `authenticated_read_categories` (SELECT), `service_write_categories` (ALL), `admin_write_categories` (ALL — FOR ALL covers SELECT+INSERT+UPDATE+DELETE).

---

### Edge Cases

- What if an admin user's JWT is expired or the `role` claim is missing? The policy check returns false → the operation is rejected (same as a standard user). This is the safe default.
- What if the service role key is used (seed scripts, Edge Functions)? Service role bypasses RLS entirely — the existing `service_write_*` policies from spec 009 cover this and remain unchanged.
- What if the spec 012 migration is run twice? Migration must be idempotent using `CREATE POLICY IF NOT EXISTS` or `DROP POLICY IF EXISTS` before `CREATE POLICY`.
- What if spec 009's migration was not applied (test environment)? Spec 012's migration should not crash — it should check for policy existence before creating.
- What if the user's JWT is mid-refresh (token rotation in progress) at the moment of a write attempt? The in-flight request carries the previous JWT; Supabase evaluates the policy against that JWT. If the previous token lacked `role='admin'`, the write is rejected. This is the safe default — token rotation does not create a security window.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST add a single `FOR ALL` admin policy to `content_items` using `auth.jwt() ->> 'role' = 'admin'` in both the `USING` clause (governs SELECT, UPDATE, DELETE row filtering) and the `WITH CHECK` clause (governs INSERT and UPDATE row validation). Using a single `FOR ALL` policy covers INSERT/UPDATE/DELETE and also SELECT for admin users — the SELECT overlap with `authenticated_read_*` is intentional and harmless (RLS uses OR logic across policies). Note: `auth.jwt() ->> 'role'` reads a custom claim from the JWT payload (set via `app_metadata`), NOT `auth.role()` which returns the Supabase session type ('authenticated'/'anon'/'service_role').
- **FR-002**: (Merged into FR-001) UPDATE permission for `content_items` is covered by the `FOR ALL` policy in FR-001 — no separate policy needed.
- **FR-003**: (Merged into FR-001) DELETE permission for `content_items` is covered by the `FOR ALL` policy in FR-001 — no separate policy needed.
- **FR-004**: The system MUST add an equivalent `FOR ALL` admin policy to `categories` using the same `auth.jwt() ->> 'role' = 'admin'` condition in both `USING` and `WITH CHECK` clauses.
- **FR-005**: The new policies MUST NOT modify, replace, or drop the existing `authenticated_read_*` and `service_write_*` policies applied by spec 009.
- **FR-006**: All new policies MUST be delivered in a single idempotent database migration file (using `DROP POLICY IF EXISTS` before each `CREATE POLICY`) so the migration can be re-run safely.
- **FR-007**: The migration MUST be stored in version control alongside the existing spec 009 migration file.
- **FR-008**: An integration test MUST verify that an unauthenticated or non-admin user receives a permission error on INSERT to `content_items` (write denied). Testing with an unauthenticated (anon-key) client is the automated approach; it covers the stricter case and is sufficient because spec 009's SELECT-only policy already denies writes to all non-service-role actors.
- **FR-009**: The integration test MUST also verify that the full expected policy set is present in the `pg_policies` catalog after migration.

### Key Entities

- **`content_items`** (existing): Single table holding all content types (videos, stories, activities, games) via a `type` discriminator. Target of new admin write policies.
- **`categories`** (existing): Lookup table for named content categories. Target of new admin write policies.
- **Admin User**: An authenticated Supabase user whose JWT `app_metadata` contains `role = 'admin'`. This claim is set server-side only (cannot be self-assigned).
- **Admin Write Policy**: A new RLS policy on each table permitting INSERT/UPDATE/DELETE when `auth.jwt() ->> 'role' = 'admin'`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of INSERT/UPDATE/DELETE attempts by non-admin authenticated users are rejected (0 unauthorised writes succeed after migration).
- **SC-002**: 100% of INSERT/UPDATE/DELETE attempts by admin-role users succeed (0 false rejections for legitimate admins). **Verification method**: Manual — grant `role='admin'` to a test account via `app_metadata` (see quickstart.md Step 4), sign out/in to refresh JWT, then attempt an INSERT. Automated verification is out of scope because it requires admin user management, which is explicitly excluded from spec 012. The policy catalog test (SC-004) provides automated confidence that the policy is correctly defined.
- **SC-003**: 100% of content reads by authenticated users continue to succeed after migration (0 regressions to the read path).
- **SC-004**: Both `content_items` and `categories` have exactly 3 policies each in the catalog after migration: `authenticated_read_*`, `service_write_*`, `admin_write_*`.
- **SC-005**: The migration runs idempotently — running it twice produces the same end state with 0 errors.
- **SC-006**: The integration test suite passes with 0 failures after migration is applied.

## Assumptions

- Only two tables are in scope: `content_items` and `categories`. The platform does not have separate `videos`, `stories`, `activities`, or `games` tables — all content types live in `content_items` with a `type` column.
- Spec 009's migration (`20260610000001_content_schema_v1.sql`) has been applied — RLS is already enabled and `authenticated_read_*` + `service_write_*` policies already exist on both tables.
- The admin role is stored in Supabase `app_metadata` as `{ "role": "admin" }`, accessible in RLS policies via `auth.jwt() ->> 'role'`. This is set server-side only (via the Supabase Auth admin API) — users cannot modify their own `app_metadata`.
- Admin user creation and role assignment are out of scope for this feature. The policies will exist but no admin user account needs to be created as part of spec 012.
- Existing app service queries (`services/api/`) use the anon key with the user's JWT — they are unaffected by the new write policies (app code never writes content directly).
- The service role key (used by `scripts/seed-content.ts`) bypasses RLS by design and is unaffected by these policies.
