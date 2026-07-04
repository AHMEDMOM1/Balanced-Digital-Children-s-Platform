# Research: Content RLS Admin Write Policies

**Feature**: `012-content-rls-policies`
**Date**: 2026-06-11

---

## Decision 1: Policy Granularity — `FOR ALL` vs Separate INSERT/UPDATE/DELETE

**Decision**: Use a single `FOR ALL` policy (`admin_write_<table>`) per table.

**Rationale**:
- SC-004 requires exactly 3 policies per table. Three separate write policies would give 5 total (read + service + insert + update + delete).
- `FOR ALL` is the idiomatic Supabase pattern for admin/bypass roles (same as `service_write_*` in spec 009).
- The `FOR ALL` policy also covers SELECT for admins — this is harmless because the `authenticated_read_*` policy already grants SELECT to all authenticated users; the `OR` logic means the outcome is identical.
- Simpler migration, simpler catalog audit, consistent with existing conventions.

**Alternatives considered**:
- Separate INSERT/UPDATE/DELETE policies: Rejected because it would produce 5 policies per table (conflicts with SC-004) and is more verbose without any security benefit.
- One combined `admin_write_*` policy using `FOR INSERT OR UPDATE OR DELETE` syntax: PostgreSQL does not support this syntax; would need 3 statements. Rejected for the same reason.

---

## Decision 2: Admin Role JWT Field — `auth.jwt() ->> 'role'` vs `auth.email()`

**Decision**: Use `auth.jwt() ->> 'role' = 'admin'` sourced from Supabase `app_metadata`.

**Rationale**:
- `app_metadata` is server-set only (via Supabase Auth admin API / service role) — users cannot modify their own `app_metadata`. This makes the check tamper-evident.
- `auth.jwt() ->> 'role'` reads the `role` key directly from the JWT payload, which Supabase populates from `app_metadata` at token issue time. No database lookup required — purely stateless.
- This is the documented Supabase best practice for custom role-based access control.

**Alternatives considered**:
- `auth.email()` or email-based allow-list: Not tamper-evident (email can change), doesn't scale.
- A separate `admin_users` table with `auth.uid()` lookup: Requires a DB query on every RLS check; higher latency; adds a dependency that could break RLS if the table is empty.
- `auth.role() = 'service_role'`: This is the service role bypass (already used by spec 009 `service_write_*` policies). Not appropriate for human admin users who log in via the app.

---

## Decision 3: Migration Strategy — Additive vs Full Redo

**Decision**: Additive migration — new file only adds admin write policies; spec 009 policies are untouched.

**Rationale**:
- Spec 009 migration (`20260610000001_content_schema_v1.sql`) is already applied and correct.
- Replacing it would require re-running a migration that already ran, risking column drops and data loss.
- The additive approach is the standard PostgreSQL migration practice (append-only migration history).
- Idempotency achieved via `DROP POLICY IF EXISTS` before each `CREATE POLICY` — safe to re-run.

**Alternatives considered**:
- Replace spec 009 migration file with a combined file: Rejected — already applied, dangerous to re-run.
- Add admin policies to spec 009 migration retroactively: Rejected — migration history must be append-only per §VI.

---

## Decision 4: Integration Test — Admin Write Success Path

**Decision**: Skip automated testing of admin write success (SC-002); verify via policy catalog + manual Dashboard test.

**Rationale**:
- Testing admin write success requires a Supabase user account with `app_metadata: { role: 'admin' }`.
- Creating admin test users is part of admin user management, which is explicitly out of scope for spec 012.
- The policy catalog test (SC-004) provides strong evidence the policy is correctly defined.
- Manual verification via Supabase Dashboard SQL Editor (documented in quickstart.md) fills the gap.

**Alternatives considered**:
- Create a test admin user in `beforeAll` using the service role key: Adds test user management overhead; service role can bypass RLS anyway, making the test circular (service role always works).
- Use a dedicated test admin JWT from a fixture: Requires managing signed test tokens; adds complexity; deferred to a future admin-management feature.
