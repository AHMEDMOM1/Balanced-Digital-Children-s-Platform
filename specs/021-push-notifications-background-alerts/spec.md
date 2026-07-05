# Feature Specification: Push Notifications — Background Alerts

**Feature Branch**: `021-push-notifications-background-alerts`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "phase 8 from @TwoDevicePlan.md"

## Clarifications

### Session 2026-06-13

- Q: Where does the notification trigger fire — on the child device or via a server-side process? → A: Server-side (database event / background process watching the sessions and event tables). Fires even if the child app crashes.
- Q: When does the parent see the OS permission prompt for push notifications? → A: After successful parent login, before the first child session begins — contextual and purposeful.
- Q: Should sent notification events be stored and visible in the parent dashboard? → A: Yes — persist each event with its delivery status so parents can review missed/failed alerts in the dashboard.
- Q: If the parent extends a time limit and the child hits the new limit, should a second notification be sent? → A: Yes — each limit-reached event triggers its own notification regardless of whether a previous limit was extended.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Screen Time Limit Alert (Priority: P1)

When a child reaches their daily screen time limit, the parent receives a push notification immediately — even if the parent app is closed or the phone is locked. The server detects the limit-reached event from session data and dispatches the notification. The parent can then decide whether to extend the session or let the limit stand.

**Why this priority**: Screen time enforcement is the primary parental control concern for this platform. Without this alert, parents have no way to know the limit was reached unless they actively open the dashboard. This is the highest-value notification for child safety.

**Independent Test**: Can be fully tested by setting a short time limit, letting it expire on the child device, and confirming the parent device receives a notification within 60 seconds while the parent app is closed.

**Acceptance Scenarios**:

1. **Given** the child has a 30-minute daily screen time limit and has been playing for 30 minutes, **When** the limit is reached, **Then** the server dispatches a push notification and the parent receives it within 60 seconds reading "Screen time limit reached — [Child Name] has used 30 minutes today"
2. **Given** the parent app is open in the foreground, **When** the screen time limit is reached, **Then** no duplicate push notification is sent (the live dashboard already shows this)
3. **Given** the parent device is temporarily offline, **When** it reconnects within 1 hour, **Then** the notification is delivered upon reconnection
4. **Given** the parent has not granted notification permissions, **When** the limit is reached, **Then** the system logs the event as undelivered and the parent is reminded to enable notifications on their next app open
5. **Given** the parent extended the time limit after the first alert and the child plays until the extended limit is reached, **When** the extended limit is reached, **Then** a second notification is sent — each limit-reached event triggers its own alert

---

### User Story 2 — Blocked Content Attempt Alert (Priority: P2)

When a child attempts to access a content category the parent has blocked (e.g., videos blocked, but child tries to navigate to videos), the server detects the blocked-access event and the parent receives a push notification so they are aware the restriction was tested.

**Why this priority**: Knowing that a child is actively trying to access blocked content gives parents important context for conversations about boundaries. It is lower priority than the time limit alert because the child is already blocked — no action is urgently required.

**Independent Test**: Can be tested by blocking a category on the parent device, then attempting to access that category on the child device, and confirming the notification arrives on the parent device within 60 seconds.

**Acceptance Scenarios**:

1. **Given** a content category is blocked by the parent, **When** the child attempts to navigate to that category, **Then** the server dispatches a notification and the parent receives it within 60 seconds reading "Blocked content attempted — [Child Name] tried to access [Category]"
2. **Given** the same category is attempted multiple times within 5 minutes, **When** subsequent attempts occur, **Then** only one notification is sent per 5-minute window per category (no flooding)
3. **Given** no categories are blocked, **When** the child navigates freely, **Then** no alert is sent

---

### User Story 3 — Session End Summary (Priority: P3)

When the child's play session ends (either naturally, through a parent command, or via time limit), the server detects the session completion and the parent receives a brief notification summarising total play time so they stay informed without needing to open the dashboard.

**Why this priority**: Provides ambient awareness for parents who prefer a passive summary over live monitoring. Less urgent than the first two stories because it is informational rather than action-requiring.

**Independent Test**: Can be tested by starting a session on the child device, ending it, and confirming the parent device receives a summary notification within 60 seconds.

**Acceptance Scenarios**:

1. **Given** an active child session, **When** it ends (any reason), **Then** the server dispatches a notification and the parent receives it reading "Session ended — [Child Name] played for [X] minutes"
2. **Given** a session lasted less than 1 minute, **When** it ends, **Then** no session-end notification is sent (avoids noise from accidental opens)
3. **Given** the parent has opted out of session-end notifications, **When** a session ends, **Then** no notification is sent for this type only; other alert types still function

---

### Edge Cases

- What happens if the parent device never grants notification permissions? System must degrade gracefully (no crash, in-app reminder shown on next open; event logged as undelivered)
- What if the parent has multiple devices? Only the most recently active device receives the notification (out of scope for v1 — one device per parent)
- What if the server-side process fails to dispatch a notification? The event is recorded as failed; the parent can see the missed alert in the dashboard notification history
- What if the child app crashes mid-session rather than ending cleanly? The abandoned-session recovery (spec 020) marks it expired; no session-end notification is sent for expired sessions
- What if the same time-limit event triggers duplicate server calls across a brief reconnection window? De-duplication on the Notification Event record prevents duplicate alerts within a 5-minute window

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST register the parent device to receive push notifications after the parent completes login and before their first child session begins; registration MUST be repeated automatically whenever the OS issues a new notification token
- **FR-002**: System MUST send a push notification to the registered parent device within 60 seconds when the child's daily screen time limit is reached; each limit-reached event (including after an extension) generates its own notification
- **FR-003**: System MUST send a push notification to the registered parent device within 60 seconds when the child attempts to access a blocked content category
- **FR-004**: System MUST send a push notification to the registered parent device within 60 seconds when a child session ends, provided the session lasted at least 1 minute
- **FR-005**: Notifications MUST include enough context to be actionable without opening the app: child name, event type, and relevant detail (duration or category)
- **FR-006**: System MUST NOT send a push notification for an event if the parent app is active in the foreground at the moment of the trigger
- **FR-007**: System MUST enforce a 5-minute de-duplication window per notification type per child to prevent notification flooding (at most one blocked-content alert per category per 5 minutes); `time_limit_reached` events are **exempt** from de-duplication — each limit-reached event (including after an extension) always generates its own notification regardless of recency (see FR-002)
- **FR-008**: Parent MUST be able to opt out of session-end notifications independently of other notification types; time-limit and blocked-content alerts are always enabled
- **FR-009**: System MUST persist the parent device's notification token so that alerts can be sent when the parent app is closed; token MUST be updated automatically when the OS regenerates it
- **FR-010**: System MUST gracefully handle absent notification permission: no crash, no silent failure — an in-app prompt is shown on the parent's next open
- **FR-011**: Notification triggers MUST be evaluated server-side by a background process watching the sessions and event tables — not on the child device — so that alerts fire even if the child app has crashed
- **FR-012**: System MUST record each dispatched or attempted notification as a Notification Event with its delivery status so that parents can view a notification history in the dashboard; canonical status values: `dispatched`, `failed`, `suppressed_dedup`, `suppressed_duration` (session < 60s), `suppressed_no_token` (no device registration), `suppressed_pref` (parent opted out of session-end); foreground suppression is handled client-side and does not produce a suppressed event record

### Key Entities

- **Notification Token**: The identifier that routes a push message to a specific physical device. One per registered parent device; automatically refreshed whenever the OS issues a new token.
- **Notification Event**: A persistent record of each notification trigger. Fields: type (time-limit / blocked-content / session-end), child id, triggered-at timestamp, status (dispatched / failed / suppressed_dedup / suppressed_duration / suppressed_no_token / suppressed_pref), notification text. Enables de-duplication, audit trail, and dashboard history display.
- **Notification Preference**: Per-parent toggle controlling which notification types are active. Session-end defaults to on and is opt-out; time-limit and blocked-content alerts are permanently enabled and cannot be toggled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Push notification reaches the parent device within 60 seconds of the triggering event in 95% of cases on a reliable network
- **SC-002**: Zero duplicate notifications for the same event within any 5-minute window (enforced via Notification Event de-duplication)
- **SC-003**: Parents who have granted notification permission receive 100% of time-limit and blocked-content alerts (no silent drops on the application side; all dispatched events recorded)
- **SC-004**: Session-end notification opt-out persists across app restarts — a parent who opts out never receives session-end alerts in subsequent sessions
- **SC-005**: The system degrades gracefully without permission: no crashes, no unhandled errors, and an in-app prompt appears on the parent's next launch
- **SC-006**: 100% of notification trigger events (including suppressed ones) are recorded as Notification Events within 5 seconds of the trigger firing

## Assumptions

- Push notification delivery requires an active internet connection on the parent device at delivery time; delivery while the parent is offline is best-effort and OS-dependent
- The `device_registrations` table already exists in the database with a `device_token` column reserved (from TwoDevicePlan.md Phase 0 / spec 013)
- Session data is already written to the `sessions` table (spec 020); the server-side trigger process reads session completion events
- Screen time limit tracking already exists and records a limit-reached event when the child's daily limit is hit (implemented in prior phases)
- Content category blocking already records a blocked-access event when a restricted category is attempted (implemented in prior phases)
- Push notifications are sent only to the parent device; the child device receives no push notifications
- One parent device per family is in scope for v1; multi-device parent support is out of scope
- Notification content is English-only for v1
- Child names are already stored in the parent's profile data (existing `profiles` table)
