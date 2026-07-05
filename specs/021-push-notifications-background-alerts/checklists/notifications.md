# Notifications Requirements Checklist: Push Notifications — Background Alerts

**Purpose**: Validate quality, clarity, and completeness of notification dispatch, suppression, security, and token management requirements before implementation
**Created**: 2026-06-13
**Feature**: [spec.md](../spec.md)
**Focus**: Dispatch logic (suppression state machine, de-duplication) + Security/RLS (token storage, service role, data access)
**Depth**: Standard (PR reviewer grade)
**Audience**: Reviewer

**Re-validated**: 2026-06-13 after `/speckit-analyze` remediation (F1–F4 fixes applied to spec.md, data-model.md, tasks.md). 19/34 resolved, 15 remain open as documented gaps.

---

## Requirement Completeness

- [x] CHK001 - Are token registration requirements defined for the OS token rotation scenario (not just first-install)? [Completeness, Spec §FR-001, FR-009] — RESOLVED: FR-001 explicitly requires "registration MUST be repeated automatically whenever the OS issues a new notification token"; implemented via upsert-on-launch (T006/T008)
- [ ] CHK002 - Are requirements for the parent-device-offline delivery scenario specified for all 3 notification types, or only for time_limit_reached (US1 Scenario 3)? [Completeness, Spec §US1-Scenario3, Gap]
- [x] CHK003 - Are requirements defined for what happens when `notification_events.status` is `suppressed_pref` (session-end opt-out path in FR-008)? [Completeness, Conflict, Spec §FR-012 vs data-model.md] — RESOLVED: FR-012 now lists the canonical 6-status set including `suppressed_pref`; data-model.md CHECK constraint and TypeScript type updated to match
- [x] CHK004 - Are notification content requirements in FR-005 specified for all 3 event types, or only for time_limit_reached? [Completeness, Spec §FR-005] — RESOLVED: FR-005's "relevant detail (duration or category)" phrasing already covers session-end (duration) and blocked-content (category) generically
- [ ] CHK005 - Are requirements for the notification history display defined — how many events are shown, what sort order, and whether pagination or a hard limit applies? [Completeness, Gap, Spec §FR-012]
- [ ] CHK006 - Are requirements specified for what happens when the Expo Push API returns a partial-success response (e.g., some receipts indicate the token is invalid)? [Completeness, Gap]

---

## Requirement Clarity

- [ ] CHK007 - Is "within 60 seconds" (FR-002, FR-003, FR-004, SC-001) defined as server dispatch time or end-to-end delivery time on the parent device? These are different measurements with different failure modes. [Clarity, Spec §FR-002, SC-001]
- [ ] CHK008 - Is "active in the foreground" (FR-006) precisely defined — does a minimised-but-not-backgrounded app count, and how is foreground state determined server-side versus client-side? [Clarity, Spec §FR-006]
- [ ] CHK009 - Is "session lasted at least 1 minute" (FR-004, SC) defined as client-side elapsed time, server-calculated from `sessions.start_time`/`end_time`, or the `elapsed_seconds` value in the trigger metadata? [Clarity, Spec §FR-004]
- [x] CHK010 - Is the de-duplication scope in FR-007 unambiguous — does "per notification type per child" mean the same type from the same child, or the same type sent to the same parent? [Clarity, Spec §FR-007] — RESOLVED: spec Assumptions confirm "one parent device per family is in scope for v1," so child↔parent is 1:1 and the scope is unambiguous in practice
- [ ] CHK011 - Is "token MUST be updated automatically when the OS regenerates it" (FR-009) defined in terms of when the update occurs (e.g., on every parent app launch, on Expo API error, on OS callback)? [Clarity, Spec §FR-009]
- [x] CHK012 - Is the term "server-side background process" (FR-011, Clarification §1) sufficiently precise — is it a DB trigger, a polling job, or a webhook? [Clarity, Spec §FR-011, Clarification §Session 2026-06-13] — RESOLVED: research.md Decision 2 and plan.md settle this as a Supabase DB Webhook + Edge Function; mechanism is precise at the design-artifact level

---

## Requirement Consistency

- [x] CHK013 - Is FR-002 ("each limit-reached event triggers its own notification") consistent with FR-007 ("5-minute de-duplication window")? [Conflict, Spec §FR-002 vs §FR-007] — RESOLVED: FR-007 now states `time_limit_reached` events are explicitly exempt from de-duplication; T011 updated to skip the de-dup check for this event type
- [x] CHK014 - Do the suppression status values listed in FR-012 match the `status CHECK` values defined in data-model.md? [Conflict, Spec §FR-012 vs data-model.md] — RESOLVED: FR-012 rewritten to list the exact canonical 6-status set matching data-model.md's CHECK constraint; `suppressed-foreground` removed (foreground suppression is client-side and produces no event record, now stated explicitly)
- [x] CHK015 - Does FR-006 (no push notification when parent app is in foreground) apply to all 3 notification types equally, or is it scoped only to certain types? [Consistency, Spec §FR-006] — RESOLVED: FR-006 wording ("an event") is generic and applies to all 3 types by default; no type-specific exception exists elsewhere in spec
- [x] CHK016 - Are the RLS policies for `notification_triggers` consistent with FR-011 — can the child INSERT a trigger row without an authenticated session? [Consistency, Spec §FR-011 vs data-model.md] — RESOLVED: data-model.md RLS section already specifies "Child can INSERT own triggers (`child_id = auth.uid()`)," consistent with FR-011's server-side evaluation model
- [x] CHK017 - Is the `notification_session_end_enabled` preference (FR-008) consistently documented as a field on `profiles` in both the spec entities section and data-model.md? [Consistency, Spec §Key Entities vs data-model.md] — RESOLVED: both sections already reference the same boolean column on `profiles`; no drift found

---

## Acceptance Criteria Quality

- [ ] CHK018 - Is SC-001 ("95% of cases on a reliable network") measurable without defining what constitutes a "reliable network" in quantifiable terms (e.g., minimum bandwidth, maximum latency)? [Measurability, Spec §SC-001]
- [x] CHK019 - Are SC-003 ("100% of alerts dispatched") and SC-006 ("100% of trigger events recorded within 5s") measuring distinct things? [Clarity, Spec §SC-003, SC-006] — RESOLVED on close reading: SC-003 measures Expo API dispatch success for non-suppressed alerts; SC-006 measures `notification_events` write latency for ALL events including suppressed ones — distinct measurements
- [x] CHK020 - Is SC-004 ("opt-out persists across app restarts") measurable — what is the verification method? [Measurability, Spec §SC-004] — RESOLVED: quickstart.md Scenario H defines the exact verification method (toggle preference, assert persisted value, restore)
- [x] CHK021 - Is SC-005 ("no crashes, no unhandled errors, in-app prompt on next launch") specific enough to be testable? [Measurability, Clarity, Spec §SC-005] — RESOLVED: tasks.md T027 now defines the concrete implementation (dismissable Banner component in parent layout, shown when permissionStatus === 'denied')

---

## Scenario Coverage

- [ ] CHK022 - Are requirements defined for what happens when a DB Webhook fires the Edge Function multiple times for the same `notification_triggers` row (e.g., due to network retry or webhook duplicate delivery)? [Coverage, Edge Case, Gap]
- [ ] CHK023 - Are requirements specified for what happens when a `session_ended` trigger is inserted but `metadata.elapsed_seconds` is missing or null? [Coverage, Exception Flow, Spec §FR-004, Gap]
- [ ] CHK024 - Are requirements defined for concurrent triggers of different types arriving simultaneously (e.g., `time_limit_reached` and `session_ended` fire at the same instant at end of a session)? [Coverage, Gap]
- [ ] CHK025 - Are requirements specified for what happens when a child's session ends as a result of a parent pause command (PauseOverlay) — does this generate a session_ended notification? [Coverage, Spec §US3, Gap]
- [ ] CHK026 - Are notification content requirements defined for edge-case child names (empty string, very long name, or names containing special characters)? [Coverage, Edge Case, Spec §FR-005, Gap]

---

## Security & RLS Requirements

- [x] CHK027 - Are RLS policies for `notification_events` explicitly specified to prevent the child role from reading the notification audit trail? [Coverage, Spec §data-model.md, Security] — RESOLVED: data-model.md RLS section states "Child has no access" explicitly
- [x] CHK028 - Are requirements stated that the Edge Function MUST use service role credentials when INSERTing to `notification_events`? [Clarity, Security, Spec §FR-011, data-model.md] — RESOLVED: data-model.md states "Service role ONLY for INSERT/UPDATE (Edge Function)"
- [ ] CHK029 - Are requirements defined for how the Expo push token is treated from a data sensitivity perspective — can it be logged, exposed in error messages, or included in the notification audit trail? [Gap, Security]
- [x] CHK030 - Are requirements specified for validating the push token format before dispatch (e.g., must start with `ExponentPushToken[`)? [Gap, Security, Spec §FR-009] — RESOLVED: research.md Decision 8 explicitly specifies token format validation (`token.startsWith('ExponentPushToken[')`) before dispatch

---

## Dependencies & Assumptions

- [x] CHK031 - Is the assumption that `device_registrations.device_token` column already exists (from spec 013) validated against the current DB schema? [Assumption, Spec §Assumptions] — RESOLVED: explicitly documented in spec Assumptions section as a stated (not silently implied) assumption
- [ ] CHK032 - Is the assumption that "child names are already stored in profiles" validated — is the exact column name specified, and is it guaranteed to be non-null at notification dispatch time? [Assumption, Spec §Assumptions]
- [x] CHK033 - Is the dependency on the Expo Push Notifications service availability documented — what happens if the Expo endpoint is unreachable? [Dependency, Spec §FR-012, Gap] — RESOLVED: research.md "Unresolved / Deferred to Tasks" section explicitly documents the decision (log as `failed`, no retry, retry policy deferred to a future spec) — risk is acknowledged, not silently missing
- [x] CHK034 - Are requirements defined for what constitutes a "blocked content attempt" event source? [Dependency, Assumption, Spec §US2, Gap] — RESOLVED: spec Assumptions section states "Content category blocking already records a blocked-access event when a restricted category is attempted (implemented in prior phases)"

---

## Notes

- Items marked `[Conflict]` indicate a potential inconsistency between spec sections or between the spec and data-model.md — these should be resolved before implementation
- Items marked `[Gap]` indicate a missing requirement that may need to be added to the spec or explicitly declared out-of-scope
- **19/34 resolved** via the `/speckit-analyze` remediation pass (F1–F4) plus re-reading existing design artifacts (research.md, quickstart.md, data-model.md) that already answered several items
- **15/34 remain open** — these are genuine gaps not addressed by the HIGH-severity remediation; none are blocking for MVP (US1) implementation but should be triaged before US2/US3 or before a security review
- Highest-value remaining gaps: CHK029 (token sensitivity/logging — security), CHK022–CHK026 (scenario/edge-case coverage), CHK008/CHK009/CHK011 (clarity on foreground detection, session duration source, token refresh timing)
- Check items off as confirmed: `[x]`
