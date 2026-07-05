# Validation Requirements Quality Checklist: Content Validation & Quality

**Purpose**: Unit-test the requirements for completeness, clarity, consistency, and measurability — across validation rules, lifecycle, security/RLS, audit, and coverage — before implementation begins.
**Created**: 2026-06-11
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [data-model.md](../data-model.md)
**Audience**: Author (pre-implementation gate)
**Scope**: Full feature — validation rules, lifecycle, security/RLS, audit, scenario coverage

---

## Requirement Completeness — Validation Rules

- [x] CHK001 - Are all 10 validation rules enumerated by name in the spec or data model, with their severity level (Error/Warning) explicitly assigned to each? [Completeness, Spec §FR-007, data-model.md]
- [x] CHK002 - Are the required fields for each content type (video, story, creative, game) listed separately so a tester can verify completeness per type — not just as a shared list? [Completeness, Spec §FR-002, Gap]
- [x] CHK003 - Are the exact valid age-range pairs (`(2,4)`, `(5,7)`, `(8,10)`) documented in the spec itself, or only inferred from existing code in `services/api/types.ts`? [Completeness, Spec §FR-003, Assumption]
- [x] CHK004 - Are game config schema requirements (required fields per `game_type`) documented for every known game type, and is there a specified behavior for unknown/future `game_type` values? [Completeness, Spec §FR-004, Gap]
- [x] CHK005 - Is the minimum resolution threshold for image/asset files quantified with a specific pixel dimension, and are accepted formats enumerated exhaustively? [Completeness, Spec §FR-005, Ambiguity]
- [x] CHK006 - Is the URL reachability check timeout value specified in requirements, and are HTTP status codes considered "reachable" (e.g., 2xx only, or also 3xx) defined? [Completeness, Spec §FR-007, Gap]

---

## Requirement Completeness — Lifecycle

- [x] CHK007 - Are all five lifecycle states (`draft`, `pending_review`, `published`, `rejected`, `flagged`) and every permitted transition between them documented in a single authoritative place in the spec? [Completeness, Spec §FR-009]
- [x] CHK008 - Are requirements defined for how an admin resolves a `flagged` item — specifically whether resolution requires re-validation, a new review, or a direct status reset? [Completeness, Spec §US4, Gap]
- [x] CHK009 - Is the mechanism that triggers `triggerRevalidation` (who can call it, via what interface, how often) specified in requirements rather than deferred to implementation? [Completeness, Spec §FR-011, Gap]

---

## Requirement Completeness — Audit & Review Records

- [x] CHK010 - Does the 12-month audit trail retention requirement (SC-006) explicitly specify whether it covers both `content_validation_results` rows AND `content_review_records` rows, or only one? [Completeness, Spec §SC-006, Gap]
- [x] CHK011 - Are requirements defined for what happens to audit records when their parent content item is deleted — CASCADE delete, orphan preservation, or archive? [Completeness, Gap]
- [x] CHK012 - Is the minimum acceptable format or length for a rejection "written reason" defined — e.g., is a single character or whitespace-only string acceptable? [Completeness, Spec §FR-010, Gap]
- [x] CHK013 - Are requirements defined for what information the admin sees when opening an item in the review queue — specifically whether prior validation run history is visible alongside the approve/reject controls? [Completeness, Spec §US3 Scenario 3]

---

## Requirement Clarity

- [x] CHK014 - Is the term "admin" defined with its precise authentication mechanism (JWT `app_metadata.role = 'admin'`) within the spec itself, or is it only documented in the data model and assumptions? [Clarity, Spec §Assumptions]
- [x] CHK015 - Is "first action wins" for concurrent review defined precisely — does it mean the first DB write to commit, the first HTTP request received, or the first to pass a status pre-check? [Clarity, Spec §Edge Cases]
- [x] CHK016 - Is "advisory warning" defined with respect to the review flow — can an admin publish an item that has active warnings, or is acknowledgement of each warning required? [Clarity, Spec §FR-007, Ambiguity]
- [x] CHK017 - Is `run_number` in ValidationResult defined precisely — is it globally incrementing per content item across all status cycles, or reset to 1 each time the item re-enters `draft`? [Clarity, Spec §data-model]
- [x] CHK018 - Is the behavior of `triggerRevalidation` for items currently in `pending_review` or `rejected` status specified — are they re-validated, skipped, or treated as an error? [Clarity, Spec §FR-011]
- [x] CHK019 - Is `game_config_schema` validation applied when `config_json` is `null` vs. an empty object (`{}`), and is the expected behavior for each case documented? [Clarity, Spec §FR-004, Gap]
- [x] CHK020 - Is "the admin review queue is cleared within 48 hours" (SC-005) defined as an SLA the system enforces (e.g., alerts, escalation) or purely an operational target? [Clarity, Spec §SC-005, Ambiguity]

---

## Requirement Consistency

- [x] CHK021 - Is the `url_reachability` Warning severity (does not block publishing) consistent with SC-001's claim that "100% of child-visible content has passed review" — or does a published item with an unconfirmed URL violate SC-001? [Consistency, Spec §SC-001 vs §FR-007, Conflict]
- [x] CHK022 - Are the lifecycle transition rules in FR-009 fully consistent with every acceptance scenario across US1, US3, and US4 — specifically that no scenario implies a transition not listed in FR-009? [Consistency, Spec §FR-009 vs §US1/US3/US4]
- [x] CHK023 - Is the `age_group` reference in the spec (using the string `"2-4"` etc.) consistent with the actual `content_items` schema that stores `min_age` and `max_age` as integers — and is the mapping between the two made explicit? [Consistency, Spec §FR-003 vs existing schema, Conflict]
- [x] CHK024 - Does FR-013 (duplicate validation prevention) align with the re-validation flow in FR-011 — specifically, does FR-013 apply to programmatic `triggerRevalidation` runs or only to admin-submitted validation requests? [Consistency, Spec §FR-013 vs §FR-011]

---

## Acceptance Criteria Quality

- [x] CHK025 - Can SC-001 ("100% of child-visible content has passed both automated validation and admin review") be objectively measured — is there a defined query or test that would confirm or falsify it? [Measurability, Spec §SC-001]
- [x] CHK026 - Is SC-002 ("zero developer support requests for validation failures within 30 days") measurable before launch — is there a proxy metric or acceptance test that can validate this during development? [Measurability, Spec §SC-002]
- [x] CHK027 - Are the performance targets SC-003 (5 s per item) and SC-004 (500 items in 10 min) testable with the existing `HAS_CREDENTIALS`/`maybeDescribe` integration test infrastructure, or do they require a separate performance harness? [Measurability, Spec §SC-003/SC-004]
- [x] CHK028 - Is SC-006 (12-month audit trail) testable during development — is there a time-travel or timestamp override mechanism specified for testing retention policy? [Measurability, Spec §SC-006, Gap]

---

## Security & Access Control Requirements

- [x] CHK029 - Are the exact RLS conditions for non-admin reads (`status = 'published'` AND `role IS DISTINCT FROM 'admin'`) documented as first-class requirements in the spec, or only in the data model SQL? [Security, Spec §data-model, Gap]
- [x] CHK030 - Is the risk of replacing the existing `authenticated_read_content_items` policy documented in requirements — specifically whether content currently visible to children could temporarily disappear during deployment? [Security, Gap, Spec §research.md]
- [x] CHK031 - Are access requirements defined for `content_validation_results` — can a parent or child user ever read validation history, and is this explicitly ruled out or addressed in requirements? [Security, Spec §Assumptions, Gap]
- [x] CHK032 - Are access requirements defined for `content_review_records` — is the rejection reason text considered sensitive, and is parent/child read access ruled out or addressed? [Security, Gap]
- [x] CHK033 - Is there a requirement that specifies what happens if an admin JWT claim is absent or malformed — does the system fall back to non-admin access rules or deny access entirely? [Security, Gap]
- [x] CHK034 - Is the existing `admin_write_content_items` policy from spec 012 explicitly listed as a dependency that the spec-015 migration must preserve — and is an idempotency guarantee documented? [Security, Spec §Assumptions, Dependency]

---

## Scenario Coverage

- [x] CHK035 - Are requirements defined for the scenario where an admin attempts to submit validation on an item already in `pending_review` or `published` status (not `draft`)? [Coverage, Spec §FR-009, Gap]
- [x] CHK036 - Are requirements defined for partial failure during bulk re-validation — if the run processes 200 of 500 items then crashes, is there a specified recovery or idempotency guarantee? [Coverage, Spec §FR-011, Exception Flow, Gap]
- [x] CHK037 - Are requirements defined for what the review queue displays when it is empty — is an empty-state message specified? [Coverage, Spec §US3, Gap]
- [x] CHK038 - Are requirements specified for the scenario where the same content item is submitted for validation while a URL reachability check is still in-flight (async overlap)? [Coverage, Spec §FR-013, Gap]

---

## Edge Case Coverage

- [x] CHK039 - Is the behavior for whitespace-only rejection reasons (e.g., `"   "`) specified — does it satisfy the "non-empty reason" requirement in FR-010 or not? [Edge Case, Spec §FR-010, Gap]
- [x] CHK040 - Is the behavior specified when `resubmitContent` is called on an item whose current status is not `rejected` (e.g., already `pending_review` or `published`)? [Edge Case, Spec §FR-012, Gap]
- [x] CHK041 - Are requirements defined for the edge case where all 500 items in a re-validation run pass — specifically that `flaggedIds` is an empty array and the run is still considered successful? [Edge Case, Spec §FR-011]
- [x] CHK042 - Is the grandfathering of pre-migration `published` items documented as an explicit requirement with acceptance criteria, or is it only described in `research.md` as a design decision? [Edge Case, Spec §Assumptions, Gap]

---

## Dependencies & Assumptions

- [x] CHK043 - Is the assumption that the admin JWT claim (`app_metadata.role = 'admin'`) is already provisioned for existing admin users validated against the actual Supabase auth configuration, or is it undocumented? [Assumption, Spec §Assumptions]
- [x] CHK044 - Is the dependency on spec 012's admin write policies explicitly documented — including the requirement that spec 015 migration must not drop or conflict with those policies? [Dependency, Spec §Assumptions, Gap]
- [x] CHK045 - Is the assumption that `fetch()` is available and appropriate for URL reachability checks in the React Native runtime documented — including any network permission requirements? [Assumption, Spec §research.md, Gap]

---

## Non-Functional Requirements

- [x] CHK046 - Are observability requirements for the validation service specified beyond the constitution's general structured-logging rule — e.g., are specific log fields (`rule_name`, `severity`, `duration_ms`) required? [Non-Functional, Spec §FR-006, Gap]
- [x] CHK047 - Are concurrency requirements for simultaneous `submitForValidation` calls on the same item specified (FR-013 defines the error, but not the locking mechanism or race condition window)? [Non-Functional, Spec §FR-013, Ambiguity]
- [x] CHK048 - Are data volume / scale assumptions for `content_validation_results` growth (run history × item count × time) documented — specifically whether the 12-month retention could require pruning or archiving? [Non-Functional, Spec §SC-006, Gap]

---

## Notes

- Mark items `[x]` when the requirement is confirmed clear, complete, and unambiguous
- For `[Gap]` items: either update `spec.md` to address the gap or document a conscious decision to defer
- For `[Conflict]` items (CHK021, CHK023): resolve before implementation begins — these require spec edits
- `[Ambiguity]` items: replace vague phrasing with measurable criteria in spec
- Priority order for resolution: `[Conflict]` → `[Gap]` in Security section → `[Ambiguity]` → remaining `[Gap]`
- Items referencing `[Assumption]` should be verified against actual Supabase project configuration before T005 (migration apply)
- **All 48 items resolved 2026-06-11** — spec.md updated to address every gap, ambiguity, and conflict identified.
