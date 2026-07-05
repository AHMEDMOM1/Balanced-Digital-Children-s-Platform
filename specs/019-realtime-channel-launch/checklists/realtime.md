# Realtime Requirements Quality Checklist: Realtime Channel Launch (Phase 4)

**Purpose**: PR reviewer quality gate — validate that real-time channel, heartbeat, and settings sync requirements are complete, clear, consistent, and safe before implementation begins.
**Created**: 2026-06-13
**Feature**: [spec.md](../spec.md)
**Depth**: Standard (reviewer gate)
**Focus**: Channel delivery · Heartbeat · Settings sync · Security & authorization · Delivery semantics

---

## Requirement Completeness

- [x] CHK001 Are acknowledgement requirements defined for every command type, or only for specific ones (e.g., does `settings_sync` require an ack like `pause`/`resume` do)? [Completeness, Spec §FR-006]
  > **Resolved**: spec Assumptions §Command Processing: all command types are acknowledged via DB `acknowledged_at`; no per-type distinction.
- [x] CHK002 Are requirements defined for what the parent device sees when it sends a command — i.e., does the parent get any confirmation of delivery or only the child's online/offline status? [Completeness, Gap]
  > **Resolved**: spec Assumptions §Command Processing: parent receives no per-command confirmation; online/offline status is the only feedback.
- [x] CHK003 Does the spec define the maximum number of unacknowledged commands that may queue before older ones are discarded or an alert is raised? [Completeness, Gap]
  > **Resolved**: spec Assumptions §Delivery Semantics: no queue depth limit in this phase; commands accumulate until acknowledged.
- [x] CHK004 Are requirements specified for what happens when the child device has multiple unacknowledged commands from different parents (edge case: parent re-pairs with a new device)? [Completeness, Gap]
  > **Resolved**: spec Assumptions §Scope & Pairing: single parent device per family; multiple-parent scenarios are out of scope.
- [x] CHK005 Are logging requirements defined for channel lifecycle events (subscribe, disconnect, reconnect) and for each command type received? [Completeness, Spec §FR-006]
  > **Resolved**: spec Assumptions §Infrastructure: logging governed by Constitution Principle V (structured logging in all service hooks).
- [x] CHK006 Is there a requirement covering what happens to heartbeat data when the parent app is backgrounded — does the parent still detect child-offline after 90 seconds? [Completeness, Gap]
  > **Resolved**: spec Assumptions §Online Status & Heartbeat: offline detection is best-effort and platform-dependent when parent is backgrounded; acceptable for this phase.

---

## Requirement Clarity

- [x] CHK007 Is "within 2 seconds" in SC-001 defined with a specific measurement method (e.g., time from broadcast send to UI update), or is it ambiguous which timestamps are used as start/end? [Clarity, Spec §SC-001]
  > **Resolved**: spec Assumptions §Timing & Measurement: measured from `Date.now()` at broadcast dispatch to callback receipt in the subscriber.
- [x] CHK008 Is "within 10 seconds" in SC-004 / FR-007 specified relative to when the parent saves the change, or when the server acknowledges it? [Clarity, Spec §SC-004, FR-007]
  > **Resolved**: spec Assumptions §Timing & Measurement: measured from DB persistence on the parent side to settings store update on the child.
- [x] CHK009 Is "automatic reconnect" in FR-002 quantified with a maximum wait time, maximum retry count, or backoff ceiling — or is it open-ended? [Clarity, Spec §FR-002]
  > **Resolved**: spec Assumptions §Timing & Measurement: exponential backoff via existing connectivity manager; FR-010's 5-second target is the observable ceiling for typical blips.
- [x] CHK010 Is the term "online" in FR-008 and SC-002 defined precisely — does it mean "channel subscribed and receiving heartbeats", or "channel subscribed only"? [Clarity, Spec §FR-008]
  > **Resolved**: spec Assumptions §Online Status & Heartbeat: "online" = heartbeat received within the last 90 seconds.
- [x] CHK011 Is "settings" in FR-007 enumerated (screen time limits + category preferences only), or could it include future settings fields without a spec amendment? [Clarity, Spec §FR-007]
  > **Resolved**: spec Assumptions §Settings Sync: settings = `daily_limit_minutes` + four category flags only; additional fields require a spec amendment.
- [x] CHK012 Is "within 5 seconds" in FR-010 (re-establish after foreground) the same metric as SC-003 (10s post-reconnect command delivery), and are these consistent or conflicting? [Clarity, Spec §FR-010 vs §SC-003]
  > **Resolved** (no spec change needed): FR-010 measures channel re-establishment only (5s); SC-003 measures re-establishment + command delivery (10s total). Complementary, not conflicting.

---

## Requirement Consistency

- [x] CHK013 Does FR-009 (channel must not open for unauthenticated users) align with the assumption that the child uses an anonymous Supabase session — is anonymous-session considered "authenticated" for channel authorization purposes? [Consistency, Spec §FR-009, Assumptions]
  > **Resolved**: spec Assumptions §Security & Authorization: anonymous Supabase session satisfies the FR-009 authentication gate.
- [x] CHK014 SC-001 says 95% of runs within 2s, but FR-006 says "within 2 seconds" with no percentile qualifier — are these two requirements consistent, or does FR-006 imply 100%? [Consistency, Spec §SC-001 vs §FR-006]
  > **Resolved**: spec Assumptions §Timing & Measurement: FR-006 is best-effort; SC-001 (95th percentile) is the verifiable gate.
- [x] CHK015 FR-003 (heartbeat every 30s) and SC-002 (dashboard refreshes within 35s) are consistent in arithmetic — but are they consistent with FR-010 (re-establish within 5s)? A reconnect may delay the next heartbeat by up to 30s, giving a worst-case dashboard refresh of 35s after a 5s reconnect — is this addressed? [Consistency, Spec §FR-003, §SC-002, §FR-010]
  > **Resolved** (no spec change needed): SC-002's 35-second window explicitly accounts for the worst-case: 5s reconnect + up to 30s until next heartbeat = 35s. All three requirements are arithmetically consistent.
- [x] CHK016 The spec says settings are delivered "within 10 seconds if online" and "on next reconnect if offline" — is this consistent with FR-002, which only says the channel MUST reconnect without bounding when settings will be delivered post-reconnect? [Consistency, Spec §FR-007 vs §FR-002]
  > **Resolved**: spec Assumptions §Settings Sync: the 10-second window in SC-004 applies post-reconnect; CDC and command replay deliver changes immediately upon re-establishment.

---

## Acceptance Criteria Quality

- [x] CHK017 SC-003 states reconnect + command delivery within 10 seconds "in 95% of test runs" — is the test methodology (network simulation, retry count, error injection) defined or referenced? [Measurability, Spec §SC-003]
  > **Resolved**: spec Assumptions §Timing & Measurement: SC-003 test methodology is defined in `quickstart.md` Scenario G (CHANNEL_ERROR simulation).
- [x] CHK018 SC-005 states "zero commands silently lost" — is the delivery model defined as exactly-once, at-least-once, or at-most-once? Without this, SC-005 cannot be objectively verified. [Measurability, Gap]
  > **Resolved**: spec Assumptions §Delivery Semantics: at-least-once delivery via DB persistence; client-side idempotency guard prevents double-application.
- [x] CHK019 SC-002 states the dashboard "refreshes within 35 seconds of any change in child activity" — is "change in activity" defined as a new content type, any state change, or only transitions between `session_active: true/false`? [Clarity, Spec §SC-002]
  > **Resolved**: spec Assumptions §Online Status & Heartbeat: "change in activity" means any received heartbeat, including periodic same-activity ones; dashboard updates on every heartbeat.
- [x] CHK020 SC-004 says settings changes are "enforced on the child device within 10 seconds when both devices are online" — is "enforced" defined (e.g., does it mean the UI blocks access, or only that the setting value is updated in memory)? [Clarity, Spec §SC-004]
  > **Resolved**: spec Assumptions §Settings Sync: "enforced" = `useSettingsStore` updated; existing UI guards immediately reflect the new value.

---

## Scenario Coverage

- [x] CHK021 Are requirements defined for the scenario where the parent sends a command while the child is in the middle of reconnecting (race condition: command dispatched, child SUBSCRIBED event fires after broadcast)? [Coverage, Gap]
  > **Resolved** (no spec change needed): spec Edge Cases cover this — missed commands are replayed from the DB on reconnect via `fetchUnackedCommands` on SUBSCRIBED event.
- [x] CHK022 Are requirements defined for the scenario where two `category_block` commands arrive in rapid succession for the same category with conflicting `is_allowed` values — is last-write-wins specified? [Coverage, Edge Case, Gap]
  > **Resolved**: spec Assumptions §Delivery Semantics: last-received order (ascending DB insertion time) takes precedence; no explicit conflict resolution required.
- [x] CHK023 Are requirements defined for the case where the child device has no internet connectivity at all (not just a brief drop) — is there a maximum queue depth before commands are dropped? [Coverage, Gap]
  > **Resolved**: see CHK003 — no queue depth limit; covered by §Delivery Semantics assumption (commands accumulate until acknowledged).
- [x] CHK024 Is there a requirement covering what happens if the parent sends `settings_sync` while the child is applying a CDC-delivered settings update — is merge behavior defined? [Coverage, Conflict Resolution, Gap]
  > **Resolved**: spec Assumptions §Settings Sync: last-applied-wins; both routes carry the same DB source of truth, so the outcome is idempotent.

---

## Edge Case Coverage

- [x] CHK025 Is fallback behavior defined when the family channel cannot be established at all (e.g., Supabase Realtime is unavailable) — does the spec define degraded-mode behavior? [Edge Case, Spec §FR-002]
  > **Resolved**: spec Assumptions §Infrastructure: degraded mode = parent controls queued in DB but not delivered until channel recovers; no explicit degraded-mode UI required in this phase.
- [x] CHK026 Are requirements defined for the heartbeat timer behavior when the child's device clock drifts significantly — does the 30-second interval use wall clock or elapsed time? [Edge Case, Spec §FR-003]
  > **Resolved**: spec Assumptions §Online Status & Heartbeat: `setInterval` wall-clock based; drift is acceptable for 30-second intervals; no compensation required.
- [x] CHK027 Is there a requirement for what the parent sees if `latestHeartbeat` is non-null but stale by more than 90 seconds — e.g., is there a visual "stale data" indicator distinct from "offline"? [Edge Case, Gap]
  > **Resolved**: spec Assumptions §Online Status & Heartbeat: no stale indicator; after 90 seconds without heartbeat the dashboard shows "offline." No intermediate state required in this phase.
- [x] CHK028 Are requirements defined for the scenario where the child re-opens the app after a long absence and there are many queued commands — is there an ordering guarantee and a processing timeout per command? [Edge Case, Spec §FR-002]
  > **Resolved**: spec Assumptions §Delivery Semantics: FIFO order (ascending `created_at`); no per-command processing timeout.

---

## Security & Authorization Requirements

- [x] CHK029 Does the spec define authorization requirements for channel subscription — specifically, should the system prevent a parent from subscribing to a different family's `family:{id}` channel? [Security, Gap]
  > **Resolved**: spec Assumptions §Security & Authorization: cross-family subscription prevented by client using correct family ID from stored session; server-side channel join checks are not available in Supabase Realtime broadcast.
- [x] CHK030 Does the spec define requirements for preventing command replay attacks — i.e., is the `command_id` deduplication check (idempotency guard) a security requirement, a performance requirement, or both? [Security, Spec §contracts/channel-events.md]
  > **Resolved**: spec Assumptions §Security & Authorization: dual purpose — replay attack prevention (security) + double-application prevention (idempotency).
- [x] CHK031 Are requirements defined for what happens if an unauthorized client subscribes to `settings-sync:{childId}` — does the Postgres CDC RLS policy restrict row visibility at the server level, or is this client-enforced only? [Security, Gap]
  > **Resolved**: spec Assumptions §Security & Authorization: Postgres CDC respects table-level RLS server-side; unauthorized subscribers receive no row data.
- [x] CHK032 Does FR-009 specify whether the channel subscription is validated on the server (server-side channel join check) or only on the client (client refuses to subscribe if not authenticated)? [Security, Clarity, Spec §FR-009]
  > **Resolved**: spec Assumptions §Security & Authorization: FR-009 is client-side enforcement; `RealtimeProvider` rendered only within authenticated layouts.

---

## Non-Functional Requirements

- [x] CHK033 Are there performance requirements for the overhead of the CDC settings subscription on the child device — e.g., does maintaining two additional Postgres CDC listeners have a documented acceptable battery/CPU cost? [Non-Functional, Gap]
  > **Resolved**: spec Assumptions §Infrastructure: CDC listeners share the existing websocket connection; overhead is minimal and acceptable.
- [x] CHK034 Are there requirements for the maximum number of channels a single device may subscribe to simultaneously — relevant because `RealtimeProvider` opens both `family:{id}` and `settings-sync:{childId}` channels? [Non-Functional, Gap]
  > **Resolved**: spec Assumptions §Infrastructure: child subscribes to 2 channels, parent to 1; both well within Supabase's per-client limits.
- [x] CHK035 Are offline storage requirements defined for unacknowledged commands — e.g., are queued commands held in memory only, or must they survive an app restart? [Non-Functional, Gap]
  > **Resolved**: spec Assumptions §Delivery Semantics: commands persisted in `realtime_commands` table and survive app restarts.

---

## Dependencies & Assumptions

- [x] CHK036 Is the assumption "child uses an anonymous Supabase session" validated — i.e., is the anonymous session guaranteed to still be valid after the child device has been offline for an extended period (token expiry)? [Assumption, Spec §Assumptions]
  > **Resolved**: spec Assumptions §Infrastructure: Supabase client auto-refreshes JWT access tokens via stored refresh token; token expiry is transparent.
- [x] CHK037 Is the assumption "existing command processing logic is already wired into the child interface" scoped correctly — does it mean all command types including `settings_sync` are wired, or only the previously implemented ones? [Assumption, Spec §Assumptions]
  > **Resolved**: spec Assumptions §Command Processing clarified — existing logic covers pause/resume/time_update/category_block/force_end/reset_child_pin; `settings_sync` is new to this spec.
- [x] CHK038 Is the dependency on `realtime_commands` table persistence explicitly stated — specifically, does the spec require that commands survive a Supabase Realtime outage and be replayed after recovery? [Dependency, Spec §FR-002]
  > **Resolved**: spec Assumptions §Delivery Semantics: commands persisted independently of Realtime service; survive outage; replayed on recovery.

---

## Notes

- All 38 items resolved 2026-06-13 — spec Assumptions section extended with explicit policies for delivery semantics, timing measurement, online definition, settings enumeration, security model, and infrastructure constraints.
- CHK012 and CHK015 required no spec change — on analysis the requirements were already arithmetically consistent.
- CHK021 required no spec change — existing edge case text already covered the reconnect race via DB command replay.
