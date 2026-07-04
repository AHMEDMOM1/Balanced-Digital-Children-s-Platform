# Security Requirements Quality Checklist: Content RLS Admin Write Policies

**Purpose**: Validate the completeness, clarity, and consistency of security access-control requirements before implementation
**Created**: 2026-06-11
**Feature**: [spec.md](../spec.md)

---

## Requirement Completeness

- [x] CHK001 - Are all actor types explicitly identified and their access level specified? (unauthenticated, authenticated child/parent, admin, service role) [Completeness, Spec §Key Entities]
- [x] CHK002 - Are read requirements documented for every table in scope, not just write requirements? [Completeness, Spec §FR-001 to FR-004]
- [x] CHK003 - Are write requirements (INSERT, UPDATE, DELETE) individually specified or is it documented that all three are covered together? [Completeness, Spec §FR-001 to FR-004]
- [x] CHK004 - Is the service-role bypass (seed scripts, Edge Functions) explicitly listed as a requirement or assumption — not left as an implicit platform behaviour? [Completeness, Spec §Assumptions]
- [x] CHK005 - Is the scope boundary for future tables explicitly stated? (i.e., are new tables out of scope, or is there a policy that covers them?) [Completeness, Spec §Assumptions]

---

## Requirement Clarity

- [x] CHK006 - Is the distinction between `auth.role()` (Supabase session type: 'authenticated'/'anon'/'service_role') and `auth.jwt() ->> 'role'` (custom JWT claim: 'admin') unambiguous in the spec? [Clarity, Spec §Key Entities]
- [x] CHK007 - Is "admin user" defined with a precise technical criterion (JWT claim source, field name, expected value) rather than a vague role concept? [Clarity, Spec §FR-007, Spec §Assumptions]
- [x] CHK008 - Is it specified whether the admin role check uses `USING` clause, `WITH CHECK` clause, or both — and why? [Clarity, Spec §FR-001 to FR-004]
- [x] CHK009 - Is the term "admin write policy" consistently used across spec, data-model, and requirements — or are there synonyms that could confuse implementers? [Clarity, Consistency]
- [x] CHK010 - Is it clear that the admin `FOR ALL` policy also covers SELECT, and that this overlap with `authenticated_read_*` is intentional (harmless OR logic)? [Clarity, Spec §data-model.md §Access Matrix]

---

## Requirement Consistency

- [x] CHK011 - Do the policy naming requirements (`admin_write_*`) in FR-001–FR-004 align with the naming convention established by spec 009's `service_write_*` pattern? [Consistency, Spec §FR-001, Constitution §Data]
- [x] CHK012 - Does FR-005 (must NOT modify spec 009 policies) explicitly prevent removal of `authenticated_read_*` and `service_write_*` — or does it only prohibit modification? [Consistency, Spec §FR-005]
- [x] CHK013 - Are the access levels in the data-model access matrix consistent with the user story acceptance scenarios? (e.g., US1 AC#3 says non-admin INSERT rejected — does data-model agree?) [Consistency, Spec §US1, data-model §Access Matrix]
- [x] CHK014 - Is SC-004 ("exactly 3 policies per table") consistent with the choice to use `FOR ALL` (single admin policy) rather than 3 separate write policies? [Consistency, Spec §SC-004]

---

## Acceptance Criteria Quality

- [x] CHK015 - Is SC-001 ("100% of non-admin writes rejected") achievable in automated testing, or does it require a test account with specific JWT claims? [Measurability, Spec §SC-001]
- [x] CHK016 - Is SC-002 ("100% of admin writes succeed") measurable without creating an admin test user — and is the manual verification path for SC-002 documented when automated testing is not feasible? [Measurability, Spec §SC-002]
- [x] CHK017 - Is SC-004 ("exactly 3 policies each") defined with a precise verification method (e.g., count from `pg_policies` catalog)? [Measurability, Spec §SC-004]
- [x] CHK018 - Is SC-005 (idempotent migration) defined with a measurable outcome (e.g., "0 errors when run twice, same end-state policy count")? [Measurability, Spec §SC-005]

---

## Edge Case Coverage

- [x] CHK019 - Is the requirement defined for an authenticated user whose JWT is syntactically valid but missing the `role` key entirely (not `null`, simply absent)? [Edge Case, Spec §Edge Cases]
- [x] CHK020 - Is the behaviour specified for a user who attempts a write while their JWT is in the process of being refreshed (token mid-rotation)? [Edge Case, Gap]
- [x] CHK021 - Are requirements specified for what happens if spec 009's migration was NOT applied before spec 012's migration runs — i.e., `content_items` or `categories` tables do not yet exist? [Edge Case, Spec §Assumptions]
- [x] CHK022 - Is the rollback path for spec 012's migration defined (i.e., SQL to drop only the admin policies without affecting spec 009 policies)? [Recovery, Spec §quickstart.md]

---

## Dependencies & Assumptions

- [x] CHK023 - Is the dependency on spec 009 migration being successfully applied before spec 012 migration runs explicitly stated as a pre-condition? [Dependency, Spec §Assumptions]
- [x] CHK024 - Is the assumption that `app_metadata` is server-set only (not user-modifiable) documented with enough detail to justify its security claim? [Assumption, Spec §FR-007, Spec §Assumptions]
- [x] CHK025 - Is the out-of-scope status of admin user management (granting `role='admin'` to accounts) stated clearly enough that implementers know not to build it here? [Assumption, Spec §Assumptions]

---

## Notes

- Focus: Security access-control requirements quality (PR reviewer audience)
- Depth: Standard — formal review gate before implementation begins
- Highest-risk items: CHK006 (role field ambiguity), CHK016 (SC-002 testability gap), CHK021 (spec 009 dependency)
- Items are "unit tests for requirements" — they test whether the spec is written correctly, not whether policies work
- All 25 items now passing — spec updated to address CHK006, CHK008, CHK010, CHK016, CHK020; CHK012 re-evaluated as passing (FR-005 explicitly prohibits "drop")
