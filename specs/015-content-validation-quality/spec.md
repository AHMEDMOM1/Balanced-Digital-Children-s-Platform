# Feature Specification: Content Validation & Quality

**Feature Branch**: `015-content-validation-quality`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "phase 7 from contentPlan.md — Content Validation & Quality: Keep content consistent and safe for children."

---

## Clarifications

### Session 2026-06-11

- Q: Are "content manager" and "reviewer/admin" the same person or separate roles? → A: Same role — one admin can both submit content and approve/reject it. The term "admin" is used consistently throughout this spec.
- Q: How are validation rules managed — hardcoded in code, or configurable in the database? → A: Hardcoded in code — rules are defined and versioned in the codebase; changing a rule requires a deployment.
- Q: If the URL reachability check itself fails (network timeout at submission time), should it be a blocking Error or advisory Warning? → A: Advisory Warning only — content advances to `pending_review` with a warning; the admin confirms the URL works during the human review step.
- Q: If two admins simultaneously approve/reject the same content item, which action wins? → A: First action wins — the first completed action sets the status; the second admin receives an error indicating the status has already changed.
- Q: When a rejected item is edited and resubmitted, does it keep its full validation history or start fresh? → A: Full history preserved — all prior validation runs and rejection reasons are retained alongside the new run, supporting the 12-month audit trail requirement.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Content Passes Automated Validation Before Publishing (Priority: P1)

An admin adds a new video to the platform. Before the video becomes visible to children, the system automatically checks that all required fields are filled, the age group is valid, the video URL is correctly formatted and reachable, and no mandatory data is missing. If any check fails with a blocking error, the content is held back with a clear list of what needs to be fixed. Non-blocking warnings are flagged for awareness but do not prevent the item from advancing to admin review.

**Why this priority**: This is the primary safety gate. No child-facing content should appear without passing baseline data-completeness checks. All other quality work depends on this gate being in place.

**Independent Test**: Can be fully tested by submitting a content item with a missing thumbnail and verifying that the system blocks publication and returns a specific error message identifying the missing field.

**Acceptance Scenarios**:

1. **Given** an admin submits a new video with no thumbnail URL, **When** the system runs validation, **Then** the content status remains `draft` and an error message identifies "thumbnail_url is required".
2. **Given** an admin submits a story with all required fields correctly filled, **When** the system runs validation, **Then** the content status advances to `pending_review`.
3. **Given** a game item is submitted with a malformed config (e.g., `choices` is a string instead of an array), **When** validation runs, **Then** the system returns a schema error identifying the invalid field and its expected type, and the item remains in `draft`.
4. **Given** a content item is submitted with an unrecognised age group value (e.g., `min_age=10, max_age=15`), **When** validation runs, **Then** the system returns an error stating the valid `(min_age, max_age)` combinations and the item remains in `draft`.
5. **Given** a video is submitted and the URL reachability check times out, **When** validation runs, **Then** the item advances to `pending_review` with an advisory warning noting "URL reachability could not be confirmed — verify during review".

---

### User Story 2 - Admin Sees Actionable Validation Feedback (Priority: P2)

When an admin submits content that fails validation, they receive a structured report listing every failed rule, the severity (blocking error vs. advisory warning), and a short plain-language description of how to fix each issue — without needing to contact a developer.

**Why this priority**: Fast feedback loops make it practical for non-technical staff to manage content quality. Without this, every failure creates a support bottleneck.

**Independent Test**: Can be fully tested by submitting a content item with multiple failures and confirming that each failure is listed with a distinct fix description, independent of whether human review is in place.

**Acceptance Scenarios**:

1. **Given** a content item fails three validation rules, **When** the admin views the validation report, **Then** all three failures are listed with severity labels and plain-language remediation steps.
2. **Given** a content item has two warnings and zero errors, **When** the admin views the report, **Then** the item is not blocked (warnings are advisory), but the warnings are visible with explanations.
3. **Given** a content item passes all rules, **When** the admin views its status, **Then** the status shows "Validation Passed" with a timestamp and is eligible for admin review.

---

### User Story 3 - Admin Approves or Rejects Content for Child Safety (Priority: P2)

After automated validation passes, the admin inspects the content for child-appropriateness — checking tone, imagery, cultural sensitivity, and suitability for the target age group — before the content becomes live. The admin can approve the content (making it visible to children) or reject it with a written reason.

**Why this priority**: Automated checks cannot assess context, tone, or cultural nuance. A human gate is the essential final safeguard before children see the content.

**Independent Test**: Can be fully tested by having an admin approve one pending item and reject another with a rejection note, then verifying that only the approved item appears in the child-facing content list.

**Acceptance Scenarios**:

1. **Given** a content item with status `pending_review`, **When** an admin approves it, **Then** its status changes to `published` and it becomes visible in the child interface.
2. **Given** a content item with status `pending_review`, **When** an admin rejects it with a note, **Then** its status changes to `rejected`, the note is stored, and it is not visible to children.
3. **Given** an admin is viewing the review queue, **When** they open a video content item, **Then** they can see the video, its metadata, age group, and category alongside the approve/reject controls.
4. **Given** two admins simultaneously try to approve the same `pending_review` item, **When** both actions are submitted, **Then** the first to complete sets the status to `published`; the second receives an error: "This item has already been reviewed".

---

### User Story 4 - Existing Content Can Be Re-Validated on Rule Changes (Priority: P3)

When a validation rule is updated in a new deployment (e.g., the minimum image resolution requirement increases), an admin can trigger re-validation of all existing published content against the new rules. Items that now fail are flagged for review without being automatically unpublished.

**Why this priority**: Platform quality standards evolve. Content added under older, looser rules should be reviewable against current standards without disrupting children's experience.

**Independent Test**: Can be fully tested by updating a rule threshold and triggering a re-validation run, then verifying that items newly failing the rule appear in a "flagged for review" list without their published status being automatically changed.

**Acceptance Scenarios**:

1. **Given** 20 published items exist and a resolution rule is tightened in a new deployment, **When** an admin triggers a re-validation run, **Then** all 20 items are re-checked and items failing the new rule appear in the flagged list.
2. **Given** a content item is flagged by re-validation, **When** an admin views it, **Then** the specific rule it failed and the current value (e.g., actual resolution) are displayed alongside the required threshold.
3. **Given** a content item is flagged but not yet reviewed, **When** a child opens the app, **Then** the item remains visible (it is not auto-unpublished — only admin action changes a published item's status).

---

### Edge Cases

- What happens when a video URL becomes unreachable after the content is already published? (Handled: URL reachability is advisory — the published item remains visible; admins should periodically review flagged URLs.)
- How does the system handle a game config that is valid JSON but logically invalid (e.g., `correct_answer` not present in `choices`)? (Out of scope for automated validation — logical game correctness is verified during the admin review step.)
- What if the same content item is submitted for validation twice simultaneously? (Handled by FR-013: the second submission returns error "Validation already in progress for this item". This also applies when a URL reachability check is in-flight for the same item.)
- How are content items that were created before the validation system was introduced handled? (Handled: existing rows are grandfathered with `status = 'published'` at migration time. They are not retroactively required to pass validation and are not flagged unless an admin explicitly triggers re-validation.)
- What happens when an admin account is deleted — their in-progress review items return to the `pending_review` queue without an assigned reviewer.
- If two admins simultaneously approve/reject the same item: "first action wins" means the first DB write to commit wins — decided by the conditional `UPDATE … WHERE status = 'pending_review'`; the admin whose UPDATE returns 0 rows updated receives the "already reviewed" error.
- What happens if an admin attempts to resubmit an item for validation when its status is not `rejected`? (The system returns error "Expected status 'rejected', current status is X". Only `rejected` items can be resubmitted.)
- What does the review queue return when empty? (The service returns an empty array — this is not an error condition.)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST prevent any content item from being published if it has one or more blocking validation errors.
- **FR-002**: The system MUST validate that all required fields are present and non-empty before a content item advances past `draft` status. Required fields by content type:
  - **All types**: `title`, `type`, `thumbnail_url`, `category`, `min_age`, `max_age`
  - **video**: additionally `url`
  - **creative**: additionally `assets_url`
  - **game**: additionally `config_json` and `game_type`
  - **story**: no fields beyond the shared set above
- **FR-003**: The system MUST validate that the `(min_age, max_age)` pair stored on the content item is one of the three valid integer combinations: `(2, 4)`, `(5, 7)`, or `(8, 10)`. These correspond to the age groups `"2-4"`, `"5-7"`, and `"8-10"` respectively. The `content_items` table stores age range as separate integer columns (`min_age`, `max_age`), not as a string field.
- **FR-004**: The system MUST validate game config JSON against the expected schema for its `game_type` and report any structural or type mismatches as blocking errors. Known schemas: `counting` requires `question` (string), `image_url` (string), `correct_answer` (number), and `choices` (array of numbers); `matching` requires `pairs` (array of `{ item: string, image: string }`, minimum 2 pairs). If `config_json` is null or missing, the rule fails with error "game config is required". If `game_type` is unrecognised, the rule fails with error "Unknown game_type — no schema available". Additional schemas may be added via code deployment without a spec change.
- **FR-005**: The system MUST validate that creative activity assets are in an accepted format — SVG or PNG (case-insensitive, checked by file extension of `assets_url`). Minimum resolution checking is deferred to manual admin review in this iteration; no automated pixel-dimension threshold is enforced by the validation service.
- **FR-006**: The system MUST produce a validation report for every content submission containing: the list of rules checked, pass/fail status per rule, severity classification, and a plain-language description for each failure. Every validation function MUST emit a structured log entry including at minimum: `hook` (function name), `rule_name`, `severity`, `passed`, and `duration_ms`.
- **FR-007**: The system MUST support two severity levels for validation rules: **Error** (blocks publishing — item remains in `draft`) and **Warning** (advisory — does not block advancement to `pending_review`). URL reachability is checked via HTTP HEAD request with a 3-second timeout; HTTP 2xx or 3xx responses are considered reachable; timeouts and 4xx/5xx are classified as Warning. An admin MAY approve an item that has active warnings; no explicit warning acknowledgement is required before approval.
- **FR-008**: The system MUST maintain a full audit trail for each content item recording every validation run (including runs after edit/resubmit), its outcome, and the timestamp. Prior runs are never deleted or overwritten.
- **FR-009**: Content items MUST follow a defined lifecycle. Permitted transitions: `draft` → `pending_review` (via `submitForValidation`, zero errors); `pending_review` → `published` (admin approval); `pending_review` → `rejected` (admin rejection); `rejected` → `draft` (admin resubmit); `published` → `flagged` (re-validation only). Any attempt to trigger a transition not in this list MUST return an error of the form "Expected status X, current status is Y".
- **FR-010**: Admins MUST be able to approve or reject content in `pending_review` status; rejection MUST require a non-empty, non-whitespace-only written reason (whitespace-only strings such as `"   "` are invalid and MUST be rejected). If the item was already reviewed by another admin, the system MUST return an error "This item has already been reviewed" and prevent a second status change. The locking mechanism is a conditional `UPDATE … WHERE status = 'pending_review'`; 0 rows updated indicates a concurrent review has already committed.
- **FR-011**: The system MUST support triggering a re-validation pass over all `published` items (items in `pending_review`, `rejected`, `draft`, or `flagged` states are excluded). The operation is triggered by an admin via a service API call — no scheduled or automatic trigger is required. If the run completes and zero items fail, `flaggedIds` is an empty array and the run is considered successful. If the run fails mid-way (crash or network error), items already processed retain their updated status; unprocessed items remain unchanged with no rollback.
- **FR-012**: Admins MUST be able to edit a rejected item and resubmit it for validation without creating a duplicate entry; the full history of prior validation runs and rejection reasons MUST be preserved and visible alongside the new run.
- **FR-013**: The system MUST prevent duplicate concurrent validation runs for the same content item; if a validation run is already in progress (including while a URL reachability check is in-flight), a second `submitForValidation` call for the same item MUST be rejected with error "Validation already in progress for this item". This requirement applies to admin-submitted validation calls only; programmatic `triggerRevalidation` runs (FR-011) are not subject to this guard.
- **FR-014**: After re-validation flags a published item, an admin MUST be able to resolve the flag by either: (a) approving the item to restore its `published` status after reviewing and accepting the failure, or (b) rejecting the item to move it to `rejected` status for rework. A `flagged` item follows the same approve/reject flow as a `pending_review` item.
- **FR-015**: Non-admin authenticated users (parents, children) MUST only be able to read content items with `status = 'published'`. Validation history (`content_validation_results`) and admin review decisions (`content_review_records`) MUST NOT be readable by non-admin users. If an admin JWT claim is absent or malformed, the system MUST fall back to non-admin access rules, not deny access entirely.

### Key Entities

- **ContentItem**: Represents a single piece of child-facing content (video, story, activity, game). Key attributes: unique identifier, type, title, age group, category, publication status, all type-specific fields (URL, config, assets).
- **ValidationRule**: A named rule defined in code (not database-configurable). Attributes: rule name, description, applies to (content type or all types), severity (Error/Warning), the field or property being checked, the acceptance threshold or schema. Rules change only via code deployment.
- **ValidationResult**: The outcome of running all applicable rules against a content item at a point in time. Attributes: content item reference, timestamp, list of rule outcomes (pass/fail + details), overall pass/fail, triggered by (automated submission or manual re-validation run). All historical results for a content item are retained permanently.
- **ReviewRecord**: An admin's decision on a content item. Attributes: content item reference, admin identity, decision (approved/rejected), written reason (required for rejection), timestamp.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of content items visible to children have passed both automated validation and admin review — zero unreviewed items reach the child interface. "Passed automated validation" means zero blocking **Error**-severity rule failures; advisory **Warning**-severity outcomes (including URL reachability) do not constitute a failed validation and do not prevent an item from advancing to admin review. The admin review step is the designated mechanism for assessing any outstanding warnings before approving publication.
- **SC-002**: Admins can identify and resolve all validation errors for a submitted item without requiring developer assistance — measured by zero developer support requests for validation failures within 30 days of launch. Development proxy: every validation error in the report MUST include a non-empty plain-language `message` field describing the fix required; an integration test confirms this for all 10 rules.
- **SC-003**: Automated validation completes for a single content item in under 5 seconds from submission. Testable within the standard `HAS_CREDENTIALS`/`maybeDescribe` integration test infrastructure using `Date.now()` timing.
- **SC-004**: Re-validation of up to 500 existing content items completes within 10 minutes of being triggered. This target requires a dedicated performance test seeding 500+ items and is not validated within the standard integration test suite.
- **SC-005**: The admin review queue is cleared within 48 hours of items entering it — platform SLA for admin turnaround.
- **SC-006**: The validation audit trail — covering both `content_validation_results` rows (all validation runs) and `content_review_records` rows (all admin decisions) — retains all historical records for at least 12 months, enabling retrospective quality reviews. Development proxy: the integration test inserts multiple validation runs for the same item and confirms all rows are retained without deletion or overwrite. No time-travel mechanism is required; the test verifies no DELETE operations are issued against these tables.

---

## Assumptions

- The platform already has a database schema for content items with a `status` column (or one will be added as part of this feature).
- Content is added by a small internal team (not user-generated content) — the volume is low enough for admin review to be practical.
- A single admin role handles both content submission and review; this feature adds validation workflow behaviour to that existing role, not a new role.
- **Admin identity**: An admin is a Supabase-authenticated user whose JWT contains the claim `app_metadata.role = 'admin'`. This claim is expected to be pre-provisioned in the Supabase auth configuration for all existing admin users before the migration is applied; no user migration is required as part of this feature.
- Video content is stored as external URLs (YouTube/Vimeo), so video validation checks the URL format and reachability rather than the file itself. URL reachability failures are advisory Warnings, not blocking Errors.
- The platform defines a fixed set of valid age ranges. In `content_items` these are stored as integer column pairs (`min_age`, `max_age`): the valid combinations are `(2, 4)`, `(5, 7)`, and `(8, 10)`. The string labels `"2-4"`, `"5-7"`, `"8-10"` used in `services/api/types.ts` and throughout this spec are human-readable shorthands; the `valid_age_range` validation rule checks the integer pair representation.
- Game config JSON schema definitions per `game_type` (counting, matching, etc.) are maintained by the development team and versioned alongside the app. Schema changes require a code deployment.
- All validation rules (thresholds, required fields, accepted formats) are defined in code, not in the database. Updating a rule requires a new deployment.
- The checklist in ContentPlan.md Phase 7 represents the minimum set of validation rules; additional rules may be added over time via code changes without requiring a new spec.
- Mobile-optimised asset checks (e.g., slow-connection video testing) are evaluated during the admin review step, not automated.
- Logical game correctness (e.g., `correct_answer` present in `choices`) is verified by the admin during review, not by automated validation.
- **Grandfathering**: All `content_items` rows existing before the spec-015 migration are grandfathered with `status = 'published'`. They are not retroactively required to pass validation and will not appear in the review queue unless an admin explicitly triggers re-validation.
- **Content deletion policy**: Content items are never hard-deleted from the database; status changes are the only approved removal mechanism. Both `content_validation_results` and `content_review_records` use `ON DELETE CASCADE` as a safety net only — this should never be triggered under normal platform operation.
- **Dependency on spec 012**: The `admin_write_content_items` RLS policy established by spec 012 MUST be preserved by the spec-015 migration. The migration script drops only the `authenticated_read_content_items` policy and MUST NOT modify write policies.
- **RLS enforcement for non-admin reads**: The Supabase RLS policy `authenticated_read_published_content_items` (replacing the previous broad policy) enforces SC-001 at the database level — non-admin authenticated users can only SELECT rows where `status = 'published'`.
- **Policy replacement deployment risk**: Dropping the existing `authenticated_read_content_items` policy and replacing it in a single migration step means there is no window where children can see non-published items. The migration is idempotent (`DROP POLICY IF EXISTS` + `CREATE POLICY IF NOT EXISTS`) and safe to re-run.
- **fetch() availability**: The `fetch()` API is available in the React Native runtime (Expo SDK 50+) without additional permissions. No special network permission configuration is required for the URL reachability check.
- **Validation results scale**: At launch, ~50–500 content items are expected. With an average of 3–5 validation runs per item over 12 months, `content_validation_results` will contain at most ~2,500 rows. No pruning or archiving strategy is required at this scale; the 12-month retention target is trivially met.
- **Concurrency locking**: The optimistic lock for concurrent review (FR-010) and for duplicate validation prevention (FR-013) relies on database-level atomic UPDATE operations and status pre-checks respectively. No application-level mutex or distributed lock is required.
