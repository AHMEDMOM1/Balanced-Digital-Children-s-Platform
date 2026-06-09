# Realtime Channel Checklist: Real Data Layer & Realtime Parent-Child Sync

**Purpose**: Validate that Phase 2 (Realtime Sync & Parent Commands) requirements are complete, clear, consistent, and unambiguous enough to implement without rework. Scope: `services/realtime/`, `store/useSessionStore.ts`, `services/resilience/` offline queue.
**Created**: 2026-06-09
**Feature**: [spec.md](../spec.md) | [contracts/realtime-channel.md](../contracts/realtime-channel.md) | [tasks.md](../tasks.md)
**Audience**: Author, pre-implementation
**Focus**: Realtime correctness first, then compliance, then security/RLS

---

## Realtime Correctness — Command Semantics

- [ ] CHK001 Is the exact sequence of state transitions for all five command types (`pause`, `resume`, `time_update`, `category_block`, `force_end`) fully specified, including what happens if a command arrives in an already-matching state (e.g., `pause` arrives when session is already `paused`)? [Completeness, Spec §FR-007, Clarifications]
- [ ] CHK002 Is the idempotency mechanism (UUID deduplication via `processedCommandIds`) specified precisely enough to distinguish "apply exactly once" from "deduplicate by content"? [Clarity, contracts/realtime-channel.md]
- [ ] CHK003 Are the requirements for what constitutes a valid `command_id` (UUID format, uniqueness scope, who generates it) explicitly documented? [Clarity, Gap]
- [ ] CHK004 Is the `category_block` immediate-stop requirement unambiguous — specifically, does it state that playback must halt before the exit animation begins, not concurrently? [Clarity, Spec §FR-009, Clarification Q5]
- [ ] CHK005 Are the requirements for `force_end` vs. session auto-end by time limit differentiated in the spec — do they produce distinct audit log entries? [Completeness, Spec §FR-012, data-model.md §sessions]
- [ ] CHK006 Is the `time_update` requirement explicit about whether `remaining_minutes` represents absolute remaining time or a delta relative to the current value? [Ambiguity, Spec §FR-007, contracts §TimeUpdatePayload]
- [ ] CHK007 Are the requirements for command acknowledgement (`CommandAckEvent`) specified — specifically, what constitutes a successful acknowledgement vs. a failed one, and is retry behavior defined? [Completeness, Gap]

---

## Realtime Correctness — Channel Lifecycle

- [ ] CHK008 Are the requirements for channel reconnection behaviour complete — specifically, does the spec define whether the child should wait for the reconnect replay to finish before resuming normal operation, or if both can proceed in parallel? [Completeness, Spec §FR-011]
- [ ] CHK009 Is the heartbeat interval (30 seconds) and offline detection threshold (90 seconds) documented as non-negotiable constraints, or are they configurable? The spec states fixed values — is this intentional and captured? [Clarity, Spec §FR-010]
- [ ] CHK010 Are requirements defined for what happens when the parent device loses connectivity — does the parent receive any indication that its commands may not have been delivered? [Gap, Exception Flow]
- [ ] CHK011 Is the channel naming convention (`family:<family_id>`) documented as a contract that both parent and child must agree on, and is the source of `family_id` (the immutable field set at parent profile creation) referenced? [Clarity, data-model.md §profiles]
- [ ] CHK012 Are requirements defined for simultaneous command delivery — if two `pause` commands arrive within milliseconds, is the outcome (apply once, log twice, log once) specified? [Completeness, Edge Case]

---

## Realtime Correctness — State Machine

- [ ] CHK013 Is the session state machine (`active → paused ↔ active → ended`) the only canonical definition of valid transitions, or does it also appear in the data model — and are the two consistent? [Consistency, Spec §Clarification Q1, data-model.md §sessions]
- [ ] CHK014 Is the `expired` state (server-side timeout) differentiated from `ended` (explicit `force_end`) in the requirements — specifically, do both trigger the same UI behaviour on the child device, or different behaviours? [Clarity, data-model.md §sessions state machine]
- [ ] CHK015 Are requirements defined for transitioning out of `paused` state when the daily time limit is reached while paused — does the session end or remain paused indefinitely? [Gap, Edge Case]
- [ ] CHK016 Is it specified what the child device should display when a `force_end` arrives while the session is already in `ended` state (terminal-to-terminal duplicate)? [Edge Case, Gap]

---

## Offline Resilience — Queue & Replay

- [ ] CHK017 Is the 50-command queue cap eviction policy (FIFO — oldest dropped) explicitly stated in the spec, not just in the contract? If only in the contract, is there a traceability link from the spec requirement (FR-011) to the contract? [Traceability, Spec §FR-011, contracts/realtime-channel.md]
- [ ] CHK018 Is the 24-hour TTL reference point unambiguous — does it measure from `created_at` on the server, from when the command was queued locally on the device, or from when the device went offline? [Ambiguity, Spec §FR-011, Clarification Q4]
- [ ] CHK019 Are the requirements for expired/evicted command logging complete — specifically, is the `action = 'command_expired'` value defined as a formal enum value or a free-text string, and is the metadata schema documented? [Completeness, Spec §FR-012, data-model.md §activity_logs]
- [ ] CHK020 Is it specified whether expired commands should be surfaced to the parent (e.g., "1 command was not applied") or silently discarded with only an audit trail? [Gap, Spec §FR-011]
- [ ] CHK021 Are requirements defined for what happens during reconnect replay if `realtime_commands` table returns a server error — does the child abort replay, skip the failing command, or retry? [Exception Flow, Gap]
- [ ] CHK022 Is the server-time authority requirement (`timeSync.getServerNow()`, never `Date.now()`) referenced consistently across the time-limit enforcement requirement (FR-014) and the time_update command handling requirement (FR-007)? [Consistency, Spec §FR-014, Spec §FR-007]

---

## Compliance — COPPA + GDPR-K

- [ ] CHK023 Is the 90-day activity log retention requirement traceable from the spec (FR-015) to the data-model (§activity_logs Retention) to the migration (`004_data_retention.sql`) — are all three consistent and cross-referenced? [Consistency, Traceability, Spec §FR-015]
- [ ] CHK024 Are the prohibited `activity_logs` fields (no names, emails, device IDs, inferred interests, click-stream) listed exhaustively in the spec, not just as examples? [Completeness, Spec §FR-016]
- [ ] CHK025 Is the "no third-party data sharing" requirement (FR-017) scoped to child data only, or does it also apply to parent data? The spec says "Child activity data MUST NOT be shared" — is parent telemetry out of scope intentionally? [Clarity, Spec §FR-017]
- [ ] CHK026 Are requirements defined for how a parent can request deletion of their child's activity logs before the 90-day automatic purge — is a manual deletion path required or explicitly excluded? [Gap, Compliance]
- [ ] CHK027 Is the metadata schema for `activity_logs.metadata` (JSONB) explicitly constrained in the spec to prevent accidental addition of PII fields in future features? [Gap, Spec §FR-016, data-model.md §activity_logs]

---

## Security — RLS & Data Access

- [ ] CHK028 Are the RLS policy requirements for `realtime_commands` consistent with the spec requirement that a child can only receive commands targeted at them (`child_id = $myId` or `child_id IS NULL`) — are there any spec scenarios (e.g., broadcast-to-all) that the policy would incorrectly block? [Consistency, Spec §FR-007, data-model.md §realtime_commands]
- [ ] CHK029 Is the service-role access pattern (cron/Edge Functions for data retention purge) documented as a requirement, or only as an implementation note in research.md — does the spec's compliance requirements imply service-role-only access for the purge operation? [Traceability, Spec §FR-015, research.md §Decision 6]
- [ ] CHK030 Are requirements defined for what happens when a parent issues a command for a `child_id` that does not belong to their family — does the RLS policy silently drop it, or is an error required? [Edge Case, Gap]

---

## Acceptance Criteria Quality

- [ ] CHK031 Is the 2-second response target (SC-002, FR-009) defined as a p50, p95, or p99 latency — and is the measurement boundary explicit (from parent tap to child UI change, or from command insert to channel delivery)? [Measurability, Spec §SC-002]
- [ ] CHK032 Is "zero commands lost or duplicated" (SC-003) a testable success criterion — specifically, is the test scenario (number of offline commands, reconnect conditions, verification method) defined? [Measurability, Spec §SC-003]
- [ ] CHK033 Is "within 5 seconds of network restoration" (SC-006 offline command replay) a hard deadline or a target — and is it measurable independently of device hardware? [Clarity, Spec §SC-006]
- [ ] CHK034 Is the "Child device offline" success criterion (SC-005) defined with a specific observable indicator — what is the parent UI expected to display, and is this defined in the spec or deferred to implementation? [Completeness, Spec §SC-005, Gap]

---

## Dependencies & Assumptions

- [ ] CHK035 Is the assumption that Phase 1 (content API hooks) is complete before Phase 2 begins documented in the spec or plan — specifically for the `category_block` command, which depends on content hooks re-filtering? [Assumption, Spec §Assumptions, plan.md §US4 dependency]
- [ ] CHK036 Is the immutability of `family_id` (set at parent profile creation, never changed) documented as a constraint in the spec — and is there a requirement for what happens if a family relationship is dissolved? [Assumption, data-model.md §profiles, Gap]
- [ ] CHK037 Is it documented what the child device should do if it receives a command before the `familyChannel.subscribe` call completes (race condition on app start)? [Edge Case, Gap]

---

## Notes

- Mark items `[x]` as resolved; add inline notes citing the spec section where clarification was found or added
- Items marked `[Gap]` indicate a requirement that is missing and should be added to `spec.md` before implementation begins
- Items marked `[Ambiguity]` indicate a requirement exists but needs sharpening
- Items marked `[Consistency]` indicate a potential conflict between two documents that must be reconciled
- Priority order for resolution: CHK001–CHK007 (command semantics) → CHK013–CHK016 (state machine) → CHK023–CHK027 (compliance) → remainder
