# Realtime & Session Requirements Checklist: Live Session Reports

**Purpose**: Validate the quality, completeness, and clarity of real-time data, session tracking, offline resilience, and data scoping requirements before implementation begins
**Created**: 2026-06-13
**Feature**: [spec.md](../spec.md)

**Scope**: Real-time CDC requirements, session write integrity, offline resilience, RLS data scoping, and timezone handling — the highest-risk requirement areas for this feature

---

## Requirement Completeness

- [ ] CHK001 - Are session write trigger requirements defined for all four content types (story, game, video, creative) explicitly by name, or only implied? [Completeness, Spec §FR-001]
- [ ] CHK002 - Is the session-end trigger requirement specified for all content exit paths: normal user close, force-close (app kill), app backgrounding, and device lock? [Completeness, Spec §FR-002]
- [ ] CHK003 - Are requirements defined for what the parent dashboard displays while today's sessions are loading from the database? [Completeness, Gap]
- [ ] CHK004 - Is the one-active-session constraint (FR-009) specified for the scenario where a new session starts while a previous session is still being closed? [Completeness, Spec §FR-009]
- [ ] CHK005 - Are requirements defined for what happens when the CDC migration (`supabase_realtime` publication) has not been applied and the parent subscribes? [Completeness, Edge Case]
- [ ] CHK006 - Is there a completeness requirement for `elapsed_seconds` — specifically, is it required to reflect real elapsed time or just the value passed by the client? [Completeness, Spec §FR-002]

---

## Requirement Clarity

- [ ] CHK007 - Is the 10-second threshold in SC-001 measured from the child's content-start event, the session INSERT, the CDC event, or the parent UI render? [Clarity, Spec §SC-001]
- [ ] CHK008 - Is "accurate to within 5 seconds" in SC-003 defined as absolute error (±5s) or relative error, and how is it measured? [Clarity, Spec §SC-003]
- [ ] CHK009 - Is "today's sessions" in FR-005 defined by `started_at` date or `ended_at` date — are sessions that started yesterday but ended today included? [Clarity, Spec §FR-005]
- [ ] CHK010 - Is the term "abandoned session" defined with precise criteria (e.g., `status='active'` AND `started_at` from a different app run) rather than just "app crash"? [Clarity, Spec §FR-007]
- [ ] CHK011 - Does FR-006 (daily total) clarify whether active (not-yet-ended) sessions contribute to the total, or only completed sessions? [Clarity, Spec §FR-006]
- [ ] CHK012 - Is "on reconnect" in FR-003 (offline write queue drain) defined by which reconnect event (Supabase SUBSCRIBED, OS network event, app foreground)? [Clarity, Spec §FR-003]
- [ ] CHK013 - Is SC-005 ("visible immediately upon parent reconnecting, no manual refresh") quantified — is "immediately" defined with a time bound? [Clarity, Spec §SC-005]

---

## Requirement Consistency

- [ ] CHK014 - Are the spec's logical field names (`content_type`, `duration_seconds`) consistently mapped to actual DB column names (`activity_type`, `elapsed_seconds`) in the Assumptions or Key Entities? [Consistency, Spec §Key Entities]
- [ ] CHK015 - Is the session `status` value set on abandoned-session recovery (`expired`) consistent between FR-007 and the data model's allowed CHECK values ('active', 'paused', 'completed', 'expired')? [Consistency, Spec §FR-007]
- [ ] CHK016 - Does FR-009 (close previous active session before opening new one) align with FR-002 (session close updates `ended_at` and `elapsed_seconds`) — is the auto-close required to set a valid `elapsed_seconds` or 0? [Consistency, Spec §FR-009]
- [ ] CHK017 - Is the US3 daily summary entity `DailySummary` (byType breakdown) consistent with FR-006 which only mentions a total — does FR-006 need to be extended to include the per-type breakdown? [Consistency, Spec §FR-006 vs §US3]

---

## Acceptance Criteria Quality

- [ ] CHK018 - Is SC-002 ("100% of completed sessions have both `started_at` and `ended_at`") verifiable given FR-007 allows abandoned sessions to be closed with `ended_at = started_at` — is this still "complete"? [Measurability, Spec §SC-002]
- [ ] CHK019 - Is SC-004 ("daily total matches arithmetic sum") independently verifiable given the timezone-adjusted "today" boundary — can both the total and the query boundary be independently observed? [Measurability, Spec §SC-004]
- [ ] CHK020 - Is SC-001 (10-second live update) measurable in an integration test without requiring two physical devices? [Measurability, Spec §SC-001]
- [ ] CHK021 - Are the success criteria (SC-001 through SC-005) collectively sufficient to verify all three user stories, or are there user stories without an associated SC? [Measurability, Spec §Success Criteria]

---

## Scenario Coverage

- [ ] CHK022 - Is there a scenario defined for the parent dashboard receiving a CDC UPDATE event (session close) in addition to INSERT (session open)? [Coverage, Spec §US2]
- [ ] CHK023 - Are requirements defined for when the parent's CDC subscription receives an UPDATE for a session that the parent's local state does not yet have (missed INSERT)? [Coverage, Gap]
- [ ] CHK024 - Is the session tracking requirement addressed for when a child is paused mid-session by the parent (via pause command) — does the session continue accumulating time? [Coverage, Spec §FR-002]
- [ ] CHK025 - Is there a scenario covering the parent dashboard when both completed sessions and an active (currently playing) session exist simultaneously today? [Coverage, Gap]
- [ ] CHK026 - Is the "no sessions today" empty-state requirement consistent between US2 acceptance scenarios and US3 acceptance scenarios (both define it independently)? [Coverage, Spec §US2 vs §US3]

---

## Edge Case Coverage

- [ ] CHK027 - Is the clock skew resolution (clamp `elapsed_seconds` to 0) fully specified in FR-002, and is it clear whether a zero-duration session appears in the parent's session list? [Edge Case, Spec §FR-002]
- [ ] CHK028 - Is there a requirement for what happens when the pending write queue (`AsyncStorage`) already contains an entry when a second session-start write fails? [Edge Case, Spec §FR-003]
- [ ] CHK029 - Are requirements defined for when `recoverAbandonedSessions` finds multiple abandoned sessions from multiple past days? [Edge Case, Spec §FR-007]
- [ ] CHK030 - Is the edge case addressed where the child opens the same content item twice within the auto-close window — two near-simultaneous sessions with the same `content_item_id`? [Edge Case, Spec §FR-009]
- [ ] CHK031 - Is behavior specified for sessions that have `family_id = null` (existing rows from before the migration) when the parent CDC filter uses `family_id=eq.X`? [Edge Case, Spec §Assumptions]

---

## Non-Functional Requirements (Security & Data Scoping)

- [ ] CHK032 - Are RLS requirements specified separately for INSERT and UPDATE operations on sessions — can a child update a session belonging to another child? [Security, Spec §FR-008]
- [ ] CHK033 - Is the `parent_read_sessions` RLS requirement scoped to `family_id` (as specified) or could it be inadvertently broader (e.g., any session where `parent_id = auth.uid()`)? [Security, Spec §FR-008]
- [ ] CHK034 - Is there a requirement preventing the child device from reading other children's sessions in the same family via the CDC subscription? [Security, Gap]
- [ ] CHK035 - Are data retention requirements defined for session records — when a child profile is deleted, are sessions cascaded or retained? [Security, Spec §Assumptions]

---

## Non-Functional Requirements (Performance & Timezone)

- [ ] CHK036 - Is the performance requirement for the initial "today's sessions" fetch from the database quantified — is there a maximum latency defined? [Performance, Gap]
- [ ] CHK037 - Is the timezone handling requirement traceable to the Constitution's mandate ("All child-facing date boundaries use `profiles.timezone_offset_minutes`")? [Dependency, Spec §Assumptions]
- [ ] CHK038 - Is the assumption "daily summaries are calculated client-side" validated against the scenario where a child has hundreds of sessions — is client-side aggregation performance-acceptable? [Assumption, Spec §Assumptions]

---

## Notes

- CHK005 and CHK031 are deployment-dependency items — implementation should include graceful skip behavior (same pattern as spec 019 Scenario C)
- CHK007 (SC-001 measurement start point) is the highest-clarity risk — ambiguity here affects integration test design and PR acceptance
- CHK018 requires careful reading: SC-002 says "100% of completed sessions" — `expired` (abandoned) sessions are NOT `completed`, so SC-002 may not apply to them
- Items CHK003, CHK023, CHK025, CHK034, CHK036 are [Gap] items — these areas are not addressed in the current spec and may need clarification before implementation
