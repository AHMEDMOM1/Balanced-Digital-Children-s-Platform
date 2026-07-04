# Feature Specification: Realtime Channel Launch (Both Devices)

**Feature Branch**: `019-realtime-channel-launch`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "phase 4 from @TwoDevicePlan.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Parent-Child Connection at Launch (Priority: P1)

When either the parent or child device finishes PIN verification and enters their respective interface, both devices automatically join the shared family communication channel. Commands sent by the parent (pause, resume, time updates, category blocks, force end, PIN reset, settings sync) arrive on the child device within 2 seconds, and the parent's dashboard updates in real time as the child's activity data streams in.

**Why this priority**: Without reliable channel subscription at launch, all real-time parental controls are broken. This is the foundation for every parent–child interaction on two separate devices.

**Independent Test**: Can be fully tested by pairing two devices (or two emulators), verifying the channel connection indicator on both, and confirming that a parent-initiated pause command visibly stops the child session without manual reconnect.

**Acceptance Scenarios**:

1. **Given** a parent has completed PIN entry and is on the parent dashboard, **When** the app initialises, **Then** the family channel is subscribed and the parent sees the child's live status within 5 seconds of the child being connected.
2. **Given** a child has completed PIN entry and is in the child play interface, **When** the parent sends a "pause" command, **Then** the child's screen shows the pause overlay within 2 seconds.
3. **Given** both devices are connected, **When** the parent sends a "resume" command, **Then** the child's screen dismisses the pause overlay within 2 seconds.

---

### User Story 2 - Child Heartbeat Visible to Parent (Priority: P2)

Every 30 seconds while the child is actively using the app, the child device sends a heartbeat signal that the parent dashboard can display — showing whether the child is online, what activity they are doing, and how long they have been playing.

**Why this priority**: Parents need to know at a glance whether their child is actively engaged or if the device has been abandoned. This powers the live activity indicator on the parent dashboard without requiring a manual refresh.

**Independent Test**: Can be fully tested by confirming the parent dashboard updates the child's status (last-seen, activity type, elapsed time) at least once per 30-second interval while the child is active.

**Acceptance Scenarios**:

1. **Given** the child is playing a game, **When** 30 seconds pass, **Then** the parent dashboard shows the child's current activity type and elapsed session time updated to within 30 seconds of real time.
2. **Given** the child's device goes offline or the app is backgrounded, **When** no heartbeat arrives for 90 seconds, **Then** the parent dashboard shows the child as "inactive" or "offline."

---

### User Story 3 - Settings Sync: Parent Changes Apply on Child Device (Priority: P3)

When a parent changes settings (screen time limits, category preferences), those changes are reflected on the child device automatically — even if the child device was offline at the time the change was made.

**Why this priority**: Without settings sync, the parent's control panel would be cosmetic. Changes must propagate to the child to be enforceable.

**Independent Test**: Can be tested by updating a screen time limit on the parent device, then verifying the child device enforces the new limit without a manual restart.

**Acceptance Scenarios**:

1. **Given** the parent reduces the child's daily screen time limit, **When** the change is saved, **Then** the child device applies the new limit within 10 seconds if online, or on the next reconnect if offline.
2. **Given** the parent blocks a content category, **When** the child attempts to access that category, **Then** the child sees a "category blocked" message and the content is hidden.

---

### Edge Cases

- What happens when the child device loses network mid-session? The channel reconnects automatically; any missed commands are replayed from the pending command store on reconnect.
- What happens when both devices are on different network types (Wi-Fi vs mobile data)? The channel operates over the cloud relay; local network path is irrelevant.
- What happens if a command is sent before the child connects for the first time? The command is stored persistently and delivered on the child's first connection.
- What happens when a heartbeat fails to send (e.g., network blip)? The next heartbeat at the following 30-second interval replaces the missed one; no data loss occurs.
- What happens when the same family has multiple child profiles in the future? This spec covers the single-child case; multi-child extension is out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both devices MUST join the family communication channel automatically after successful PIN verification, without requiring any user action.
- **FR-002**: The family channel MUST remain subscribed for the entire app session; if disconnected, the client MUST automatically attempt reconnection with exponential backoff.
- **FR-003**: The child device MUST emit a heartbeat signal every 30 seconds containing: timestamp, active/inactive status, elapsed session seconds, current activity type (story/game/video/creative), and current content item identifier.
- **FR-004**: The parent dashboard MUST display the child's last-known status (activity type, elapsed time, online/offline) derived from the most recent heartbeat.
- **FR-005**: The parent device MUST be able to broadcast these command types to the child: pause, resume, time_update, category_block, force_end, reset_child_pin, settings_sync.
- **FR-006**: The child device MUST process all received commands from the parent within 2 seconds of receipt when online.
- **FR-007**: When a parent changes settings (screen time limit, category blocks), those changes MUST be received by the child device and enforced within 10 seconds if the child is online.
- **FR-008**: The parent MUST be able to see whether the child device is currently online or offline.
- **FR-009**: Channel subscription MUST be established only after the user's identity and family membership are confirmed (post-PIN-entry); it MUST NOT open for unauthenticated users.
- **FR-010**: On app backgrounding, the channel MAY disconnect; on foregrounding, it MUST re-establish within 5 seconds.

### Key Entities

- **Family Channel**: A shared, real-time communication endpoint keyed by family identifier. Both parent and child devices subscribe to it. Carries broadcast messages (commands, heartbeats) and may relay change notifications for persisted data.
- **Heartbeat Signal**: A periodic status message sent by the child device containing: timestamp, session-active flag, elapsed seconds, activity type, content item identifier.
- **Command**: A structured message sent by the parent to the child specifying an action (pause, resume, time_update, category_block, force_end, reset_child_pin, settings_sync) with an optional payload.
- **Settings Snapshot**: A complete or partial representation of the child's enforced settings (time limits, blocked categories) used for settings_sync commands.
- **Channel Connection Status**: A boolean indicator (online/offline) maintained per device, surfaced to the parent dashboard.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A parent-issued "pause" command is visibly reflected on the child device within 2 seconds in 95% of test runs under normal network conditions.
- **SC-002**: The parent dashboard refreshes the child's activity status within 35 seconds of any change in the child's activity (accounting for the 30-second heartbeat interval plus delivery overhead).
- **SC-003**: After a network interruption, the channel re-establishes and pending commands are delivered within 10 seconds of reconnection in 95% of test runs.
- **SC-004**: Settings changes made on the parent device are enforced on the child device within 10 seconds when both devices are online.
- **SC-005**: Zero commands are silently lost when the child device is offline at the time of dispatch — all are delivered on the next reconnect.

## Assumptions

### Scope & Pairing

- Both parent and child devices are already paired (completed specs 016–017) and have valid family identifiers stored locally.
- Parent PIN authentication is already implemented (spec 018); channel subscription occurs after that gate.
- The family communication channel infrastructure (Supabase Realtime) already exists and is operational.
- A single child profile per family is in scope; multi-child support is deferred.
- A single parent device per family is in scope; multiple-parent scenarios are out of scope.
- Push notifications when the app is fully closed are out of scope (covered in Phase 8).
- Screen time limit and category preference data is already stored server-side and accessible to both devices.

### Command Processing

- The command processing logic for `pause`, `resume`, `time_update`, `category_block`, `force_end`, and `reset_child_pin` is already implemented in the child interface. The `settings_sync` command type is new to this spec; its type definition and handler are implemented here.
- All command types (including `settings_sync`) are acknowledged via a DB `acknowledged_at` update after processing; no per-command-type acknowledgement distinction is required.
- The parent device receives no per-command delivery confirmation; the child's online/offline status (derived from heartbeats) is the only feedback available to the parent.

### Delivery Semantics

- The delivery model is **at-least-once**: commands are persisted to the `realtime_commands` table and replayed on reconnect. The client-side idempotency guard (`appliedCommandIds` set) prevents double-application. SC-005 ("zero commands silently lost") is satisfied by DB persistence, not by channel reliability alone.
- Unacknowledged commands are persisted in `realtime_commands` and survive app restarts on both devices; they are replayed when the child reconnects.
- Commands are persisted independently of the Supabase Realtime service; they survive a Realtime outage and are replayed when the channel recovers.
- Queued commands are fetched and processed in DB insertion order (ascending `created_at`) on reconnect. No per-command processing timeout is enforced.
- When conflicting commands arrive for the same target (e.g., two `category_block` commands for the same category), last-received order (by DB insertion time, ascending) takes precedence.
- No maximum queue depth for unacknowledged commands is defined in this phase; commands accumulate until acknowledged.

### Settings Sync

- For FR-007, "settings" covers exactly: `daily_limit_minutes` (integer, minutes per day) and four category flags (`stories_enabled`, `games_enabled`, `creative_enabled`, `videos_enabled`). Other settings fields are out of scope.
- For SC-004, "enforced" means the child's settings store (`useSettingsStore`) has been updated with the new values; existing UI guards that read from this store immediately reflect the change without requiring an app restart.
- When both a `settings_sync` broadcast command and a CDC settings change notification arrive for the same field, last-applied-wins; both carry the same database source of truth, so the outcome is idempotent.
- FR-007's "on next reconnect if offline" means settings changes queued in the DB are delivered via CDC subscription or command replay immediately upon channel re-establishment; the 10-second window in SC-004 applies post-reconnect as well.

### Online Status & Heartbeat

- For FR-008 and SC-002, "online" means the parent has received a heartbeat from the child within the last 90 seconds. No heartbeat for ≥ 90 seconds means "offline."
- For SC-002, "change in child activity" means any received heartbeat, including both activity-type transitions (story → game) and periodic same-activity heartbeats. The dashboard updates on every received heartbeat.
- The heartbeat timer uses JavaScript `setInterval`, which is wall-clock based. Clock drift is acceptable for the 30-second interval; no clock-skew compensation is required.
- Background behavior of the parent's offline detector is platform-dependent; the timer may not fire when the parent app is backgrounded on iOS/Android. Offline detection is a best-effort indicator intended for active parent use.
- No separate "stale data" visual indicator is required; after 90 seconds without a heartbeat the parent dashboard shows "offline." There is no intermediate "last seen X seconds ago" state in this phase.

### Timing & Measurement

- FR-006's "within 2 seconds" is a best-effort target under normal network conditions. SC-001 (95th percentile in automated testing) is the verifiable acceptance gate; the 5% tolerance accounts for network jitter and scheduling variance.
- For SC-001, "2 seconds" is measured from the time the parent broadcasts the command to the time the child's subscription callback fires; integration tests measure with `Date.now()` at dispatch and at callback receipt.
- For SC-004/FR-007, "10 seconds" is measured from the time the parent's setting change is persisted to the database to the time the child device's settings store reflects the new value.
- SC-003's test methodology is defined in `quickstart.md` Scenario G; the integration test simulates a `CHANNEL_ERROR` status and measures time to re-subscription and command receipt.
- Reconnection uses exponential backoff via the existing connectivity manager; FR-010's 5-second target covers the full reconnect cycle for typical short network blips.

### Security & Authorization

- For FR-009, "authenticated" includes anonymous Supabase sessions — any valid Supabase session (anonymous or named) satisfies the authentication gate. The channel MUST NOT be opened if there is no Supabase session at all.
- FR-009 is enforced client-side: the `RealtimeProvider` component is rendered only within authenticated app layouts (post-PIN). Supabase Realtime broadcast does not support server-side join authorization checks by channel name.
- Cross-family channel subscription is prevented by requiring the subscriber to use the correct family ID from their own stored session; no additional server-side channel gate is possible in Supabase Realtime broadcast in this phase.
- The command_id deduplication guard (`appliedCommandIds`) serves a dual purpose: preventing replay attacks (security) and preventing double-application of replayed commands (idempotency).
- The Postgres CDC subscription for settings changes (`profiles`, `category_preferences`) respects table-level Row Level Security (RLS); row visibility is server-side enforced. Unauthorized subscribers receive no row data even if they successfully subscribe.

### Infrastructure

- Supabase anonymous sessions use the standard JWT access/refresh token flow; the Supabase client automatically refreshes the access token using the stored refresh token. Token expiry during an active session is handled transparently.
- Two additional Postgres CDC listeners for settings sync (`profiles` + `category_preferences`) share the same websocket connection as the family broadcast channel; additional battery/CPU overhead is minimal.
- The child device subscribes to two channels: `family:{familyId}` (broadcast) and `settings-sync:{childId}` (CDC). The parent device subscribes to one: `family:{familyId}`. Both are well within Supabase's per-client channel limits.
- Logging for channel lifecycle events (connect, disconnect, reconnect) and command processing follows Constitution Principle V (structured logging in all service hooks); no additional spec requirements beyond that principle are needed.
