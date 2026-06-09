# Feature Specification: Real Data Layer & Realtime Parent-Child Sync

**Feature Branch**: `006-resilience-testing`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Reread phase one and two from Plan.md"

## Overview

This specification covers two tightly coupled features that together replace all mock data with real database content and enable a live bi-directional control channel between parent and child devices.

- **Phase 1 — Real Data Layer & APIs**: Replace all placeholder content arrays with real data fetched from a database, filtered and secured per child profile and parent-approved categories.
- **Phase 2 — Realtime Sync & Parent Commands**: Enable a parent device to instantly control a child's active session (pause, time adjustment, category blocking) with the child device reflecting changes within 2 seconds, even across unreliable network conditions.

---

## Clarifications

### Session 2026-06-09

- Q: What are the valid states for a session, and what transitions are allowed? → A: Four states — `active` → `paused` ↔ `active` → `ended`. Pause is bidirectional (resume returns to active); ended is terminal.
- Q: What is the compliance scope for the activity log and child data stored in this feature? → A: COPPA + GDPR-K basics apply — no behavioral tracking or profiling, activity logs retained for a maximum of 90 days, no data shared with third parties.
- Q: When a parent first creates a child profile, are all content categories available by default, or must the parent explicitly enable them? → A: All categories are enabled by default (opt-out model); parent blocks specific categories to restrict access.
- Q: Is there a maximum number of commands that can be queued while the child is offline, or a TTL after which queued commands are discarded? → A: Maximum 50 commands queued on-device; any command older than 24 hours is discarded on reconnect without being applied.
- Q: When a category block command arrives while a child is actively consuming content in that category, does the content stop immediately or finish the current item? → A: Immediate stop — content halts instantly and the exit animation plays; the current item is not allowed to finish.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Child Sees Age-Appropriate Content (Priority: P1)

A child opens the Stories, Games, Videos, or Creative screens and sees a curated list of content tailored to their age group and the categories their parent has approved — not a hardcoded placeholder list.

**Why this priority**: Without real content, every other feature is meaningless. This is the foundational data flow the entire platform depends on.

**Independent Test**: Install the app with a configured child profile; navigate to each content screen and verify that results match the child's age group and allowed categories. Delivers a working content discovery experience independently of any realtime features.

**Acceptance Scenarios**:

1. **Given** a child profile with age 6 and allowed categories ["stories", "games"], **When** the child opens the app, **Then** the Stories screen displays only stories suitable for age 6 and the Games screen shows age-appropriate games; Videos and Creative are inaccessible or empty.
2. **Given** a parent removes the "games" category from allowed content, **When** the child starts a new session, **Then** the Games screen is empty or hidden.
3. **Given** no network connection on launch, **When** the child opens a content screen, **Then** previously cached content is displayed with a visual indicator that content may be outdated.

---

### User Story 2 - Parent Instantly Pauses Child Session (Priority: P1)

A parent taps "Pause Now" in the parent app and, within 2 seconds, the child's screen freezes and displays a friendly mascot holding a "Take a break!" message — regardless of what activity the child was engaged in.

**Why this priority**: This is the most critical safety control. Parents must trust that tapping "Pause" immediately stops screen activity. Failure here breaks trust in the entire platform.

**Independent Test**: Open the parent app on one device and the child app on another; tap "Pause Now" and time the response. The child screen freeze is observable without any other realtime feature.

**Acceptance Scenarios**:

1. **Given** a child is watching a video, **When** the parent taps "Pause Now", **Then** the video freezes and the pause overlay appears on the child's device within 2 seconds.
2. **Given** the child's device had a brief network interruption, **When** connectivity restores, **Then** any pending pause command is applied immediately and not duplicated.
3. **Given** the parent taps "Resume", **When** the command reaches the child device, **Then** the overlay disappears and the child can continue where they left off.

---

### User Story 3 - Parent Adjusts Daily Screen Time Mid-Session (Priority: P2)

A parent reduces the child's remaining daily screen time from within the parent app. The child's on-screen timer updates immediately, and the session ends automatically when the new limit is reached — without requiring the child to restart the app.

**Why this priority**: Dynamic time control is a key parental tool. It must work live; a limit that only applies on the next app launch is not useful.

**Independent Test**: Set a child session with 30 minutes remaining; reduce to 5 minutes via the parent app; verify the child's timer updates and the session ends after 5 minutes.

**Acceptance Scenarios**:

1. **Given** a child session with 20 minutes remaining, **When** the parent reduces the daily limit so only 3 minutes remain, **Then** the child's remaining-time indicator updates to 3 minutes within 2 seconds.
2. **Given** the new time limit is already exceeded at the moment the command arrives, **When** the command is processed, **Then** the session ends gracefully with the time-up animation rather than an abrupt close.
3. **Given** the parent increases the time limit, **When** the command arrives, **Then** the child's remaining time increases accordingly.

---

### User Story 4 - Parent Blocks a Category (Priority: P2)

A parent blocks a content category (e.g., "videos") mid-session. Any active content in that category exits gracefully and the child is returned to the home screen with a gentle animation, not an abrupt crash.

**Why this priority**: Graceful category blocking protects both the child's experience and parental authority without causing confusing app errors.

**Independent Test**: While a child is watching a video, block "videos" from the parent app; verify the video exits gracefully and the child sees the home screen.

**Acceptance Scenarios**:

1. **Given** a child is actively watching a video, **When** the parent blocks the "videos" category, **Then** the video stops immediately (the current item does not finish), a friendly "go play outside" animation plays, and the child is taken to the home screen within 2 seconds of the command arriving.
2. **Given** the child navigates to the Videos screen after the block is applied, **Then** the screen shows a "this section is not available" message rather than a blank or broken list.

---

### User Story 5 - Offline Resilience with Command Replay (Priority: P3)

When a child's device loses network connectivity, the session continues with last-known time limits and cached content. When connectivity returns, all parent commands issued while offline are applied in order with no duplicates.

**Why this priority**: Network drops are common on children's devices. The session must not crash, and parental commands must not be lost or repeated.

**Independent Test**: Disable Wi-Fi on the child's device mid-session; issue a "pause" command from the parent app; re-enable Wi-Fi; verify the pause command is applied exactly once.

**Acceptance Scenarios**:

1. **Given** a child's device has no internet, **When** the session timer reaches its limit, **Then** the session ends using the cached limit and does not reset the timer.
2. **Given** a parent issued "pause" and "resume" while the child was offline, **When** connectivity is restored, **Then** both commands are applied in order (pause, then resume) and neither is applied twice.
3. **Given** the child's device has been offline for more than 90 seconds, **When** the parent views their dashboard, **Then** the parent sees a "Child device offline" indicator.

---

### Edge Cases

- What happens when a content category has zero items matching the child's age group? (Show an empty state, not an error.)
- What happens when the offline command queue reaches 50 items? (Oldest commands are silently dropped; newest commands take priority.)
- What happens when commands older than 24 hours are discarded on reconnect? (Session resumes with current server-side state; discarded commands are logged as expired in the audit log.)
- What if a parent command arrives while the app is in the background? (Command is queued and applied when app foregrounds.)
- What if two parent commands arrive simultaneously? (Apply in timestamp order; log both.)
- What if the child changes the device clock to bypass time limits? (Server time is the authoritative source; client clock is ignored for limit enforcement.)
- What happens if the realtime channel drops and the 30-second heartbeat fails three times? (Fall back to polling every 60 seconds until reconnected.)
- What if seed content is unavailable in the target language? (Display content in the available language with a locale tag; do not show an empty screen.)

---

## Requirements *(mandatory)*

### Functional Requirements

**Content Layer**

- **FR-001**: The system MUST fetch content (stories, games, videos, creative activities) from a central database filtered by the child's age group and parent-approved categories on every session start. All categories are available by default when a child profile is created; a parent must explicitly block a category to restrict it.
- **FR-002**: The system MUST enforce Row-Level Security so a parent can only access their own children's data, and a child can only see content in their allowed categories.
- **FR-003**: All content read and write operations MUST go through a single API module per content type — no direct database calls scattered across screens.
- **FR-004**: The system MUST provide at least 20 stories, 10 games, 15 videos, and 8 creative activities as seed content.
- **FR-005**: When a parent blocks or unblocks a category via a `category_block` command received during an active session, the change MUST take effect immediately — content stops in real time and the category is excluded from content lists for the remainder of the session. If no active session exists at the time the change is made, the change MUST be reflected in the child's content list on the next session start. Blocking removes content from the child's view; unblocking restores it to the default available state.
- **FR-006**: The system MUST cache content locally so that screens load within 1 second on repeat visits when network is available.

**Realtime Control**

- **FR-007**: The parent device MUST be able to send commands (pause, resume, time_update, category_block, force_end) to the child device over a named real-time channel scoped to the family.
- **FR-008**: Each command MUST carry a unique identifier so the child device applies it exactly once, even if the command is received multiple times due to reconnection replay.
- **FR-009**: The child device MUST reflect a pause, resume, or category block command within 2 seconds under normal network conditions. For a category block, content MUST stop immediately — the active item is not permitted to finish — and the exit animation MUST play before returning the child to the home screen.
- **FR-010**: The child device MUST send a heartbeat to the parent every 30 seconds; if the parent receives no heartbeat for 90 seconds, the parent dashboard MUST display a "Child device offline" indicator.
- **FR-011**: When the child device reconnects after an offline period, it MUST request and apply any commands issued while offline in chronological order before resuming normal operation. The on-device command queue MUST hold a maximum of 50 commands; if this limit is reached, the oldest commands are dropped to make room for newer ones. Commands older than 24 hours at the time of reconnection MUST be discarded without being applied.
- **FR-012**: All parent commands MUST be logged in the `activity_logs` table with timestamp, command type, command ID, and outcome. Valid outcome values: `applied` (command dispatched to session store), `deduplicated` (command_id was already processed), `expired` (discarded due to 24-hour TTL), `queue_evicted` (dropped due to 50-command cap). The log entry MUST be written by the child device after calling `applyCommand`, using `activity_type = 'command_received'` and `action = <command_type>`.

**Offline Behavior**

- **FR-013**: When launched with no network connection, the child app MUST display cached content and an offline badge rather than an error screen.
- **FR-014**: Time limits enforced offline MUST use the last server-synchronized values; the child's device clock MUST NOT be used as the authoritative time source.

**Compliance**

- **FR-015**: Activity logs MUST be automatically deleted after 90 days; no manual intervention required.
- **FR-016**: Activity logs MUST record only session metadata (content type, duration, command received) — no behavioral profiling, click-stream tracking, or inferred preferences.
- **FR-017**: Child activity data MUST NOT be shared with or transmitted to any third-party service.

**Resilience Edge Cases**

- **FR-018**: When a parent command arrives while the child app is suspended by the OS (background state), the command MUST be queued locally and applied as soon as the app returns to the foreground. The command MUST NOT be silently dropped.
- **FR-019**: When two or more parent commands carry the same or overlapping `created_at` timestamps, the system MUST apply them in ascending `created_at` order (earliest first). Each command MUST be logged as a separate `activity_logs` entry regardless of how many arrive simultaneously.
- **FR-020**: If the child device's realtime channel fails to receive any message for 3 consecutive 30-second heartbeat intervals (90 seconds total), the child device MUST fall back to polling the `realtime_commands` table every 60 seconds until the Broadcast channel reconnects, at which point polling MUST stop.

### Key Entities

- **Child Profile**: Represents a child user with age, allowed categories, and link to parent account.
- **Parent Profile**: Represents a parent user who manages one or more child profiles.
- **Content Item** (stories, games, videos, creative activities): A piece of age-tagged, category-tagged content available for child consumption.
- **Blocked Category**: A record of a content category that a parent has explicitly restricted for a specific child. All categories are accessible by default; only blocked categories are stored. Removing a block restores default access.
- **Session**: A single period of child app usage with start time, end time, and time-limit applied. Valid states: `active` → `paused` ↔ `active` → `ended`. `paused` and `active` are reversible via parent commands; `ended` is terminal.
- **Activity Log**: An audit record of content viewed, time spent, and parent commands received during a session.
- **Parent Command**: A control message (pause, resume, time_update, category_block, force_end) sent from parent to child with a unique ID and timestamp.
- **Heartbeat**: A periodic signal from the child device confirming it is active and connected.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A child navigating to any content screen sees their personalized, filtered content list within 1 second on a repeat visit.
- **SC-002**: A parent issuing a "Pause Now" command sees the child's screen freeze within 2 seconds in 95% of tests under normal network conditions (defined as Wi-Fi or LTE with round-trip latency ≤ 150 ms and no packet loss; CI network qualifies as normal).
- **SC-003**: Zero parent commands are lost or duplicated after a child device reconnects from an offline state in integration testing.
- **SC-004**: All content screens display graceful empty states (not errors) when no content matches the child's profile.
- **SC-005**: The parent dashboard correctly shows "Child device offline" within 90 seconds of the child device losing connectivity.
- **SC-006**: On reconnection, offline-queued commands are applied in the correct order within 5 seconds of network restoration.
- **SC-007**: The app launches and shows cached content within 3 seconds on a device with no active internet connection.
- **SC-008**: 100% of parent commands are recorded in the activity audit log with accurate timestamps and outcomes.
- **SC-009**: Activity logs older than 90 days are purged automatically with zero manual intervention required.
- **SC-010**: Zero child data fields exist that capture behavioral patterns, preferences, or inferred attributes beyond raw session metadata.

---

## Assumptions

- Both parent and child devices have the app installed and the parent-child relationship has been established before these features are used.
- The database is pre-seeded with sufficient content (20+ stories, 10+ games, 15+ videos, 8+ creative activities) before child screens are activated.
- The real-time channel infrastructure is provided by the existing platform backend; no third-party messaging service needs to be procured.
- Content moderation and age-rating assignment are handled outside this feature by an administrator or content team — this feature only consumes already-rated content.
- Offline caching stores the most recent successful content fetch; there is no background sync when the app is closed.
- The family identifier used for the real-time channel is established during parent onboarding and is immutable.
- RTL (right-to-left) layout support is required for all screens, as the app targets Arabic-speaking families.
- COPPA and GDPR-K compliance applies: activity logs are retained for a maximum of 90 days, no behavioral profiling is performed, and no child data is shared with third parties.
