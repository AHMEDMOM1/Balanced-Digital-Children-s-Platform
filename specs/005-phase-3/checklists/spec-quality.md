# Specification Quality Checklist: Live Reports & Charts

**Purpose**: Validate specification completeness, clarity, and measurability for PR review gate
**Created**: 2026-06-08
**Feature**: [spec.md](../spec.md)
**Focus**: General Requirements Quality (all FRs/NFRs)
**Depth**: Standard (~20 items)
**Audience**: PR Reviewers

---

## Requirement Completeness

- [ ] CHK001 Are all functional requirements (FR-001 through FR-007) accompanied by explicit acceptance criteria that define "done"? [Completeness, Spec §Requirements]
- [ ] CHK002 Is the "Today" realtime update requirement (FR-007) specified with a clear fallback behavior if the Supabase Realtime subscription fails or disconnects? [Gap, Spec §FR-007]
- [ ] CHK003 Are requirements defined for the "zero state" when a child has no activity logs for the selected range (empty state handling)? [Completeness, Spec §Edge Cases]
- [ ] CHK004 Are requirements specified for handling partial-day data when the daily rollup job hasn't run yet (is_finalized = false)? [Gap, Spec §FR-004]
- [ ] CHK005 Does the spec define what happens when a child's timezone changes mid-day (beyond the edge case note)? [Gap, Spec §Edge Cases]
- [ ] CHK006 Are requirements defined for the export feature when the OS share sheet is unavailable (e.g., restricted device profile)? [Gap, Spec §FR-006]
- [ ] CHK007 Is there a requirement for handling comparison view when the parent has exactly 1 child (FR-005 says "up to two")? [Gap, Spec §FR-005]

## Requirement Clarity

- [ ] CHK008 Is "instantly" in SC-002 ("reflects child activity changes instantly") quantified with a maximum acceptable latency threshold (e.g., < 500ms)? [Clarity, Spec §SC-002]
- [ ] CHK009 Is "under 1.5 seconds" in SC-001 measured from app launch, cache hit, or cold start — and does it include chart rendering time? [Clarity, Spec §SC-001]
- [ ] CHK010 Are the category buckets (stories, games, videos, creative) explicitly mapped to the `activity_type` enum values in the database? [Clarity, Spec §FR-001, Data Model §activity_logs]
- [ ] CHK011 Is "normalized percentage axes" in the comparison view (Decision 7) defined with a specific formula (e.g., each child's value / max of both children * 100)? [Clarity, Research §Decision 7]
- [ ] CHK012 Is the "midnight boundary" for "Today" strictly defined as the child device's local midnight — and does the rollup function correctly handle DST transitions? [Clarity, Spec §FR-004, Clarifications Q1]
- [ ] CHK013 Are the 60-second stale-while-revalidate and 24-hour cache TTL values (Decision 5) captured as measurable requirements or left as implementation details? [Clarity, Research §Decision 5]

## Requirement Consistency

- [ ] CHK014 Does FR-003 (pre-compute historical rollups) align with FR-004 (merge real-time for current day) — i.e., is the boundary between "historical" and "current day" unambiguous? [Consistency, Spec §FR-003, §FR-004]
- [ ] CHK015 Is the `is_finalized` flag in `daily_stats` (Data Model) consistent with the spec's statement that "historical days are immutable" (Assumption)? [Consistency, Data Model §daily_stats, Spec §Assumptions]
- [ ] CHK016 Does the comparison view's "max 2 children" limit (Decision 7) conflict with FR-005's "up to two children" phrasing? [Consistency, Spec §FR-005, Research §Decision 7]
- [ ] CHK017 Are the realtime subscription filters (RLS on channel) consistent with the `daily_stats` RLS policy (both restrict to parent's children)? [Consistency, Research §Decision 3, Data Model §RLS Policies]

## Acceptance Criteria Quality

- [ ] CHK018 Can SC-004 ("correctly normalizes and scales chart axes when children have vastly different total usage times") be objectively verified with a specific test case (e.g., Child A: 120min, Child B: 15min)? [Measurability, Spec §SC-004]
- [ ] CHK019 Does SC-003 ("100% of generated PDF exports successfully open") have a defined test corpus (minimum number of exports, device/OS combinations)? [Measurability, Spec §SC-003]
- [ ] CHK020 Is there an acceptance criterion for the live indicator badge (plan.md Phase 3) showing Realtime connection status? [Gap, Plan §Phase 3]

## Scenario Coverage

- [ ] CHK021 Are requirements defined for the "recovery" scenario when the nightly rollup job fails — does the fallback to raw activity logs (Edge Case) have a defined SLA or retry policy? [Coverage, Exception Flow, Spec §Edge Cases]
- [ ] CHK022 Are requirements specified for concurrent parent sessions viewing the same child's "Today" dashboard (multiple realtime subscribers)? [Coverage, Gap]
- [ ] CHK023 Are requirements defined for the "offline parent" scenario — cached historical data shown with stale indicator while realtime unavailable? [Coverage, Gap]

## Non-Functional Requirements

- [ ] CHK024 Are there explicit performance requirements for the comparison view query (two children, 30-day range) — distinct from the single-child SC-001? [Gap, NFR]
- [ ] CHK025 Are accessibility requirements defined for the charts (screen reader labels, color contrast for category bars)? [Gap, NFR]
- [ ] CHK026 Is there a requirement for data retention / deletion of `daily_stats` when a child profile is deleted (CASCADE implied but not stated)? [Gap, NFR, Data Model §daily_stats]

## Dependencies & Assumptions

- [ ] CHK027 Is the assumption "parent device has OS sharing capabilities" (Assumption) validated for target platforms (iOS Share Sheet, Android Intent)? [Assumption, Spec §Assumptions]
- [ ] CHK028 Is the dependency on `victory-native` + `@shopify/react-native-skia` for chart rendering documented as a requirement constraint? [Dependency, Research §Decision 1]
- [ ] CHK029 Is the pg_cron / Edge Function scheduling dependency for the rollup job captured as an operational requirement? [Dependency, Research §Decision 2]

## Ambiguities & Conflicts

- [ ] CHK030 Does the spec conflict on "Today" data source: FR-004 says "merge real-time activity with historical rollups" but FR-007 says "realtime subscriptions push live updates" — are both mechanisms required simultaneously? [Conflict, Spec §FR-004, §FR-007]
- [ ] CHK031 Is the term "live push updates" (SC-002) distinguished from the client-side merge strategy in FR-004, or do they describe the same mechanism? [Ambiguity, Spec §FR-004, §SC-002]
- [ ] CHK032 Is the "top_activity" field in `daily_stats` (most-used content item) required to be clickable/navigable in the UI, or display-only? [Ambiguity, Data Model §daily_stats, Plan §Phase 3]

## Traceability

- [ ] CHK033 Does each functional requirement (FR-001 to FR-007) trace to at least one user story (US1, US2, US3)? [Traceability, Spec §User Scenarios, §Requirements]
- [ ] CHK034 Are success criteria (SC-001 to SC-004) traceable to specific functional requirements? [Traceability, Spec §Success Criteria, §Requirements]

---

## Notes

- Generated for PR review gate — validates spec quality before implementation proceeds
- Focus: General requirements quality across all three user stories
- 34 items covering completeness, clarity, consistency, measurability, coverage, NFRs, dependencies, ambiguities, traceability
- All items reference spec sections or use [Gap]/[Ambiguity]/[Conflict] markers