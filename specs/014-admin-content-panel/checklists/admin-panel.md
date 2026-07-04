# Requirements Checklist: Admin Content Panel

**Purpose**: Validate specification quality, clarity, and completeness for the admin content panel feature before implementation begins.
**Created**: 2026-06-11
**Feature**: [spec.md](../spec.md)
**Focus**: Security/auth requirements quality (priority), form/validation requirements quality, content management completeness, edge case coverage.
**Depth**: Standard — PR reviewer gate (author + peer review)

---

## Security & Authentication Requirements

- [x] CHK001 - Are the exact criteria for the admin role check (JWT source, field name, expected value) specified unambiguously, not just "admin JWT"? [Clarity, Spec §FR-001]
- [x] CHK002 - Is the FR-009 constraint ("service-role credentials MUST NOT be embedded in app code") stated in a way that is independently testable without relying solely on code inspection? [Measurability, Spec §FR-009]
- [x] CHK003 - Are requirements for what constitutes a "non-admin or unauthenticated" attempt consistently defined across FR-001, SC-006, and US1 AS4? [Consistency, Spec §FR-001, §SC-006]
- [x] CHK004 - Is SC-006 ("0% of unauthenticated or non-admin requests reach admin screens") measurable without implementation details — is the test method implied or explicit? [Measurability, Spec §SC-006]
- [x] CHK005 - Is the redirect target for blocked access described in user-facing terms ("login screen") consistently across FR-001 and US1 AS4? [Clarity, Spec §FR-001]
- [x] CHK006 - Are requirements for admin panel access comprehensive enough to cover all entry points (in-app navigation, deep link, direct URL)? [Coverage, Spec §FR-001]

---

## Form & Validation Requirements Quality

- [x] CHK007 - Are all required fields for a new content item enumerated in a single authoritative location (FR-005: "title, type, category, min_age, max_age, thumbnail_url")? [Completeness, Spec §FR-005]
- [x] CHK008 - Are validation rules for age fields quantified with explicit bounds in the spec (e.g., valid range for min_age and max_age, max_age ≥ min_age rule)? [Clarity, Spec §FR-005]
- [x] CHK009 - Is "inline error messages" specific about placement — SC-005 says "next to the relevant field" and US1 AS2 confirms "for each missing field"? [Clarity, Spec §FR-005, §SC-005]
- [x] CHK010 - Is SC-005 ("0% of invalid submissions silently fail") consistent with the inline error requirement in FR-005 and US1 AS2? [Consistency, Spec §SC-005, §FR-005]
- [x] CHK011 - Are the type-specific fields for each content type (FR-004) explicitly distinguished as required vs optional within their type (e.g., is `url` required for video, or just shown)? [Clarity, Spec §FR-004]
- [x] CHK012 - Is the behavior of the submit button during an in-flight save request (disabled, loading state) specified in the requirements? [Completeness, Gap]
- [x] CHK013 - Is the behavior when an admin navigates away from an unsaved form specified (warn vs silently discard data)? [Coverage, Gap]
- [x] CHK014 - Is the config_json "blank → defaults to {}" rule stated in FR-004 as well as the Edge Cases section, or only in Edge Cases? [Consistency, Spec §FR-004, Edge Cases]

---

## Content Management Requirements Completeness

- [x] CHK015 - Does FR-004's video type field list include `url` (a URL field), consistent with US1 AS3 which explicitly mentions "a URL field and duration field appear" for video? [Consistency, Spec §FR-004, §US1 AS3]
- [x] CHK016 - Is the "type is read-only after creation" constraint stated in both FR-006 and the Edge Cases section consistently? [Consistency, Spec §FR-006, Edge Cases]
- [x] CHK017 - Is the default sort order for the content list (newest first) specified in FR-003? [Completeness, Spec §FR-003]
- [x] CHK018 - Is the category selector in the new-content form requirement (FR-004) explicit about whether it sources live data from the categories table or a static list? [Clarity, Spec §FR-004]
- [x] CHK019 - Is the page size (20 items) stated consistently across FR-002, SC-003, and the Clarifications section without contradiction? [Consistency, Spec §FR-002, §SC-003]
- [x] CHK020 - Is the title search matching strategy in FR-003 ("searchable by title keyword") specific enough — does it imply partial/contains match, prefix match, or exact match? [Clarity, Spec §FR-003]
- [x] CHK021 - Is the delete confirmation requirement (FR-007) specific about the prompt, what cancellation preserves, and what "confirmed" triggers? [Clarity, Spec §FR-007, §US3 AS1, §US3 AS2]
- [x] CHK022 - Are requirements for the categories list in FR-008 (display, create, delete) complete and consistent with US4 acceptance scenarios? [Completeness, Spec §FR-008, §US4]

---

## Edge Case & Error Handling Coverage

- [x] CHK023 - Is the JWT-expiry mid-form edge case specified with a testable outcome ("re-authenticate without losing form data")? [Clarity, Spec Edge Cases]
- [x] CHK024 - Is the "category deleted but content items retain the string value" behavior documented explicitly (including the no-FK-constraint rationale) to prevent misimplementation? [Clarity, Spec §US4 AS2, Edge Cases]
- [x] CHK025 - Are network/auth error messages in FR-010 described with measurable criteria ("user-facing message without crashing" — can "gracefully" be objectively verified)? [Clarity, Spec §FR-010]
- [x] CHK026 - Is the "Under Construction" fallback (Edge Cases) described with specific trigger conditions, not just "if no admin screen exists"? [Clarity, Spec Edge Cases]
- [x] CHK027 - Are requirements defined for the empty-categories state in the new-content form's category picker (zero categories in the table)? [Coverage, Gap]
- [x] CHK028 - Are requirements specified for whether duplicate content item titles are permitted or rejected? [Coverage, Gap]

---

## Non-Functional Requirements Measurability

- [x] CHK029 - Is SC-002 ("operations complete within 5 seconds") defined for all admin write operation types — create, edit, and delete? [Completeness, Spec §SC-002]
- [x] CHK030 - Is SC-001 ("create a new content item in under 3 minutes") clearly an end-to-end user task measure (form open → save confirmed)? [Clarity, Spec §SC-001]
- [x] CHK031 - Is the "admin panel does not require offline support" assumption explicit and unambiguous? [Clarity, Spec Assumptions]
- [x] CHK032 - Are accessibility requirements for admin UI elements (screen reader labels, keyboard navigation, color contrast) either documented as required or explicitly out of scope? [Coverage, Gap]

---

## Dependencies & Assumptions Quality

- [x] CHK033 - Is the spec 012 prerequisite documented with a failure mode description (what behavior occurs if the RLS policies are not applied before using the admin panel)? [Completeness, Spec Assumptions]
- [x] CHK034 - Is the "at least one admin user must exist before using the panel" assumption documented with a pointer to where/how admin users are created (spec 012's quickstart.md)? [Completeness, Spec Assumptions]
- [x] CHK035 - Is the "admins provide URLs, no file upload" constraint stated clearly enough to prevent feature scope creep? [Clarity, Spec Assumptions]

---

## Notes

**35/35 items passing (100%) — completed 2026-06-11**

**Round 1 fixes (8 items)**: CHK008, CHK011, CHK014, CHK015, CHK018, CHK020, CHK025, CHK033

**Round 2 fixes (7 items)**: CHK002, CHK012, CHK013, CHK026, CHK027, CHK028, CHK032
- CHK002: FR-009 strengthened with grep-verifiable criterion (no service-role key in `app/` or `services/`)
- CHK012: FR-005 extended with submit button disabled + loading indicator during in-flight save
- CHK013: Edge Cases updated — unsaved form navigation silently discards data (no confirmation dialog)
- CHK026: Edge Cases updated — "Under Construction" trigger tightened to Expo Router route resolution failure; explicitly absent in full deployment
- CHK027: Edge Cases updated — empty categories state: disabled picker with "No categories available" placeholder
- CHK028: Assumptions updated — duplicate titles permitted (no unique constraint)
- CHK032: Assumptions updated — accessibility explicitly out of scope for this spec
