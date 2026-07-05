# Pairing Requirements Checklist: Parent Device Registration & QR Pairing

**Purpose**: Validate the completeness, clarity, and consistency of security and UX requirements for the QR pairing screen before implementation begins. Intended for PR reviewer use.
**Created**: 2026-06-11
**Feature**: [spec.md](../spec.md)
**Scope**: Security (token lifecycle, RLS, family isolation) + UX (screen states, countdown, edge cases) — equal depth
**Audience**: PR reviewer (implementation-readiness gate)

---

## Requirement Completeness

- [x] CHK001 Are error state requirements defined for when the initial token generation fails on screen mount (e.g., no network when the pairing screen first opens)? [Completeness, Gap] — *FR-013: error banner with "Try again" action required on initial load failure.*
- [x] CHK002 Are loading/skeleton state requirements defined for the period between screen mount and the first token being returned by the server? [Completeness, Gap] — *FR-013: "---" placeholder text code and loading indicator required before first token is available.*
- [x] CHK003 Are requirements specified for what constitutes "permanent invalidation" of a used token — specifically, whether enforcement is via a flag (`used_at`), physical deletion, or both? [Completeness, Spec §FR-006] — *FR-006: "permanently invalidated on the server and cannot be reused." Mechanism (used_at flag, no deletion) is in data-model.md. Spec-level requirement is appropriately abstracted.*
- [x] CHK004 Are requirements documented for whether the server validates token expiry at consumption time independently of the client-side countdown? [Completeness, Spec §FR-002] — *FR-002: "expiry enforcement is always server-authoritative." SC-006: "rejected server-side." Explicit.*
- [x] CHK005 Are requirements defined for how the `family_id` associated with a new token is determined — from the authenticated session only, or can a client-provided value override the session value? [Completeness, Spec §FR-001] — *FR-018: family_id derived exclusively from authenticated session; client override explicitly prohibited; enforced via RLS.*
- [x] CHK006 Are requirements specified for the maximum number of simultaneously valid (unexpired, unused) tokens a single family account may hold? [Completeness, Gap] — *Assumptions: "No maximum number of simultaneously valid pairing tokens per family is enforced in Phase 1." Intentional absence explicitly documented.*

---

## Requirement Clarity

- [x] CHK007 Is "permanently invalidated" in FR-006 clarified to mean server-side record mutation — not client-side cache invalidation or UI removal only? [Clarity, Spec §FR-006] — *FR-006: "invalidated on the server" — server-side mutation is explicit.*
- [x] CHK008 Is "atomic" replacement in FR-011 quantified — does the visual code and text code update in a single render, or is sequential update acceptable if both complete within the same 2-second window? [Clarity, Spec §FR-011] — *FR-011: "'Atomically' means both update within the same React render cycle (a single setState call)." Fully quantified.*
- [x] CHK009 Is "visible" in FR-011 (existing codes remain visible during generation) defined — does it require the codes to be fully readable (non-faded, non-blurred, non-obscured) rather than merely present in the layout? [Clarity, Spec §FR-011] — *FR-011: "remain fully visible" — "fully" sets the bar at fully readable, not merely present in layout.*
- [x] CHK010 Is "automatically navigated" in FR-007 specified with sufficient precision — is the 5-second budget measured from when the child completes pairing server-side, from when the Realtime event is received on the parent device, or from when the navigation animation begins? [Clarity, Spec §FR-007] — *FR-007 updated: "within 5 seconds of the parent device receiving the Realtime UPDATE event." Start point is explicit.*
- [x] CHK011 Is "server-side" in SC-006 ("expired codes are always rejected server-side") defined precisely enough to exclude client-side expiry enforcement substituting for server validation? [Clarity, Spec §SC-006] — *FR-002: "expiry enforcement is always server-authoritative." SC-006: "rejected server-side." Combined these preclude client-only enforcement.*
- [x] CHK012 Is the "Regenerate" button label and interaction model (tap-to-request vs. tap-to-confirm) specified in requirements, or left entirely to implementation? [Clarity, Spec §FR-005] — *FR-005 names the "Regenerate" button. FR-011 defines tap → disabled + spinner → atomic code swap. Model is clear.*

---

## Requirement Consistency

- [x] CHK013 Are FR-002 ("exactly 10 minutes") and SC-002 ("10 minutes ± 5 seconds") consistent — FR-002 implies strict precision while SC-002 introduces a tolerance window? [Consistency, Spec §FR-002 vs §SC-002] — *Resolved: FR-002 updated to "10 minutes… up to ±5 seconds of tolerance." Consistent with SC-002.*
- [x] CHK014 Are FR-004 (auto-regenerate at countdown zero, "without requiring any parent action") and FR-011 (loading state visible during generation) consistent — do both requirements acknowledge that a brief loading indicator is shown during auto-regeneration? [Consistency, Spec §FR-004 vs §FR-011] — *FR-011 scope: "after 'Regenerate' is tapped or the timer expires" — covers both manual and auto-regeneration. Consistent.*
- [x] CHK015 Are FR-008 ("visual and text codes encode identical information") and the Pairing Invitation entity definition (unique UUID token vs. separate 6-digit manual_code field) consistent — the QR payload encodes the UUID while the text displays only the 6-digit code? [Consistency, Spec §FR-008 vs §Key Entities] — *FR-008 rewritten: "represent the same pairing invitation" with distinct payload descriptions. Consistent with Key Entities.*
- [x] CHK016 Are the Assumptions ("online connection required throughout QR pairing screen") and US3 AC-2 ("connection briefly lost then restored, child still pairs, parent still navigates") consistent — one excludes offline scenarios, the other requires graceful offline/reconnect recovery? [Consistency, Assumptions vs §US3 AC-2] — *Resolved: Assumption scoped to initial load; FR-012 added for Realtime auto-reconnect. Consistent.*

---

## Acceptance Criteria Quality

- [x] CHK017 Can SC-005 ("zero pairing codes can be used more than once") be objectively measured within Phase 1 scope alone, or does it require Phase 2 child-side pairing logic to be complete before it is testable? [Measurability, Spec §SC-005] — *SC-005 updated: "(Full automated verification requires Phase 2 child-side implementation. Phase 1 verifies the server-side enforcement foundation via RLS policy integration tests.)" Phase 2 dependency explicitly acknowledged.*
- [x] CHK018 Can SC-004 ("parent transitions within 5 seconds of child completing pairing") be measured in Phase 1, given that the child pairing action is implemented in Phase 2? [Measurability, Spec §SC-004] — *US3 Independent Test explicitly: "Can be tested end-to-end with Phase 2 in place." Documented.*
- [x] CHK019 Are US2 Acceptance Scenarios 1 and 2 (single-use rejection, expiry rejection) testable in Phase 1, or do both depend on Phase 2's token consumption logic to create the "used" or "expired" state? [Measurability, Spec §US2] — *US2 Independent Test updated: scenario (a) Phase 2 dependency explicit; scenario (b) Phase 1 testable via expired timestamp. Both now documented.*
- [x] CHK020 Is SC-003 ("new code visible within 2 seconds") defined for a specific network condition baseline (e.g., standard mobile connection) or stated as a hard maximum under all conditions including degraded networks? [Measurability, Spec §SC-003] — *SC-003 updated: "measured from the moment the generation request is sent to the server to the moment new codes appear on screen, inclusive of network round-trip time." Measurement scope clarified.*

---

## Scenario Coverage

- [x] CHK021 Are requirements defined for the scenario where a parent exits the pairing screen mid-wait and later returns — does the same unexpired token resume display, or is a new token generated on re-entry? [Coverage, Edge Case] — *FR-016: screen generates a fresh token on each mount; re-entry always produces a new token. Explicitly specified.*
- [x] CHK022 Are requirements defined for what the parent sees when token generation fails during "Regenerate" or auto-renewal — is the previous token still shown, or is an error banner displayed? [Coverage, Edge Case] — *FR-015: previous token remains visible; error banner shown; Regenerate button re-enabled. Explicit.*
- [x] CHK023 Are requirements defined for clock skew — is the countdown timer driven by the server-authoritative `expires_at` timestamp or by the local device clock, and what happens when the two differ significantly? [Coverage, Edge Case] — *FR-014: countdown computed from server-authoritative expires_at; device clock not used. Explicit.*
- [x] CHK024 Are requirements defined for what happens when the parent receives the "child paired" notification but navigation to the family dashboard fails — is there a retry, a fallback route, or a manual navigation prompt? [Coverage, Edge Case] — *FR-017: fallback to app root required; parent not left stranded on pairing screen. Explicit.*
- [x] CHK025 Is the second-child pairing scenario explicitly documented as data-model–supported but UI-deferred — confirming that Phase 1 does not block future second-child flows at the schema level? [Coverage, Spec §FR-010] — *FR-010: "data model must accommodate multiple children per family… UI entry point for adding a second child is out of scope for Phase 1." Explicit.*
- [x] CHK026 Are requirements defined for rapid successive "Regenerate" taps — is a debounce or rate-limit requirement specified on the button, or is each tap expected to trigger a separate server request? [Coverage, Gap] — *FR-011: button is disabled while generation is in flight. Disabled state is the specified mechanism preventing simultaneous requests.*

---

## Edge Case Coverage

- [x] CHK027 Are requirements specified for how the Realtime subscription behaves when the parent device's internet connection is lost mid-session — is reconnection automatic, and does the subscription re-establish without missing a paired event? [Edge Case, Gap] — *FR-012: "MUST automatically attempt to re-establish after a connection interruption without any parent interaction." Explicit.*
- [x] CHK028 Are requirements defined for the scenario where the QR code and text code could update at different times (partial update failure) — is this declared impossible by the requirement, or is a defined fallback required? [Edge Case, Spec §FR-011] — *FR-011: atomic = single setState call. Partial update is structurally impossible per requirement.*
- [x] CHK029 Are requirements specified for stale token cleanup — are expired, unconsumed tokens eventually removed from the database, or is indefinite retention explicitly accepted for Phase 1? [Edge Case, Gap] — *Assumptions: "Expired, unconsumed pairing tokens are retained in the database indefinitely in Phase 1. Automated token cleanup is out of scope." Intentional absence documented.*
- [x] CHK030 Are requirements defined for the pairing screen's behaviour when the Supabase Realtime subscription cannot be established at all (subscription setup fails on mount rather than dropping mid-session)? [Edge Case, Gap] — *FR-012 extended: "If the subscription cannot be established at all on initial mount, the pairing screen MUST remain functional (token display and manual code remain visible); the parent MAY manually navigate away if needed." Explicit.*

---

## Non-Functional Requirements

- [x] CHK031 Are accessibility requirements defined for the QR code visual — is an accessible label, description, or text alternative required for screen reader users who cannot perceive the visual code? [Coverage, Gap] — *FR-019: QR code MUST have accessible label. Text code provides alternative for users who cannot perceive the visual code.*
- [x] CHK032 Are accessibility requirements specified for the live countdown timer — should countdown updates be announced to assistive technology (e.g., ARIA live region), or is silent visual update explicitly acceptable? [Coverage, Gap] — *FR-019: countdown tick updates do not require screen reader announcements; remaining time is readable as static text. Silent update explicitly acceptable.*
- [x] CHK033 Are rate-limiting requirements defined for token generation — is there a specified maximum number of Regenerate requests per parent account per time window to prevent abuse? [Coverage, Gap] — *Assumptions: "Rate-limiting of token generation requests at the API or database level is out of scope for Phase 1. FR-011's button disabled state prevents concurrent requests." Intentional absence documented.*
- [x] CHK034 Is SC-001 (registration-to-pairing in under 3 minutes) scoped to Phase 1 components only, or does it include upstream registration performance that is outside Phase 1 scope and therefore not controllable here? [Measurability, Spec §SC-001] — *SC-001 updated: "This metric spans the full flow including email entry and OTP verification, which are outside Phase 1 scope. Phase 1's contribution is the redirect from OTP success to the pairing screen." Scope explicitly qualified.*

---

## Dependencies & Assumptions

- [x] CHK035 Is the assumption that the Phase 0 database schema is applied before Phase 1 begins documented as a hard blocking dependency rather than an advisory note? [Completeness, Assumptions] — *Assumptions: "The Phase 0 database schema changes… are applied to the database before Phase 1 is implemented." Stated as prerequisite condition.*
- [x] CHK036 Is the assumption that "families are created automatically during parent registration" validated against the actual schema — specifically, that no separate families table exists and `family_id` is a plain UUID column in `profiles`? [Completeness, Assumptions] — *Assumption correctly stated at spec level; technical validation (no separate families table, UUID column) is in research.md Decision 3.*
- [x] CHK037 Is the Phase 2 dependency (child-side pairing) explicitly documented in the spec as a prerequisite for testing US2 Acceptance Scenarios 1–2 and the US3 end-to-end flow? [Completeness, Gap] — *US2 Independent Test updated: scenario (a) Phase 2 dependency explicit; US3 Independent Test already states "with Phase 2 in place." Both documented.*
