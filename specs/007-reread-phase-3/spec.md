# Feature Specification: Live Reports, Resilience & Real-Device Readiness

**Feature Branch**: `007-reread-phase-3`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "reread phase 3 and phase 4"

## Overview

This specification consolidates two tightly related feature areas that must ship together to make the platform ready for real-world family use:

- **Phase 3 — Live Reports & Charts**: Give parents actionable insight into their children's screen time through a filterable activity dashboard, side-by-side child comparison, and shareable summaries.
- **Phase 4 — Resilience & Real-Device Readiness**: Ensure the app works reliably under real-world mobile conditions — poor connectivity, OS-level interruptions, low-end hardware, battery saver mode, and clock-manipulation attempts.

Both phases depend on the activity-logging infrastructure built in Phases 1 and 2 (the `activity_logs` and `sessions` tables, and the `daily_stats` rollup table).

---

## Clarifications

### Session 2026-06-09

- Q: How should "Today" midnight boundaries be calculated for reports? → A: All day boundaries are calculated using the child device's local timezone.
- Q: How should the parent dashboard receive live updates for "Today"? → A: Via live push subscriptions on session changes; if the subscription disconnects, fall back to 60-second polling with a "live disconnected" indicator.
- Q: What format should exports use? → A: PNG image captured from the visible report view, shared via the OS native share sheet.
- Q: How long should offline cached content persist? → A: Up to 7 days or 100 MB of storage, whichever is reached first, using LRU eviction.
- Q: What rate limits apply to parent PIN recovery? → A: 3 attempts per hour, escalating to a 24-hour cooldown after 3 consecutive locked hours.
- Q: Which screens should FPS monitoring and animation degradation cover? → A: All screens including transitions.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Graceful Offline Behavior (Priority: P1)

As a parent or child, when the device loses internet connectivity, the app continues functioning with cached data and clearly shows that it is offline.

**Why this priority**: Poor connectivity is common on mobile devices, especially in the family markets this app serves. The app must not crash or show a blank screen when offline — doing so would destroy trust and leave children unable to use the app at all.

**Independent Test**: Enable airplane mode at three points — before launch, immediately after launch, and mid-session. In all three cases, verify that cached content is displayed, an offline indicator with "last synced X ago" appears within 5 seconds, and no error screen or crash occurs.

**Acceptance Scenarios**:

1. **Given** the app is launched with no internet, **When** the child navigates to any content screen, **Then** previously cached content is shown with an offline badge and no crash or blank screen occurs.
2. **Given** the app is launched with no internet, **When** the parent opens the reports dashboard, **Then** stale cached report data is displayed with a "Last synced X ago" indicator.
3. **Given** the app is online and showing content, **When** connectivity drops, **Then** within 5 seconds an offline indicator appears and the app continues from cache.
4. **Given** the app was offline, **When** connectivity is restored, **Then** the offline indicator disappears within 5 seconds and data silently re-syncs in the background.
5. **Given** connectivity is rapidly flapping (more than 3 changes within 30 seconds), **When** the indicator updates, **Then** it waits 3 seconds after the last detected change before updating, to prevent flickering.

---

### User Story 2 - Session Persistence After App Interruption (Priority: P1)

As a child, when my app is killed by the operating system or backgrounded long enough for the OS to reclaim resources, my active session timer resumes from exactly where it left off when I reopen the app.

**Why this priority**: Children frequently switch apps or receive calls. Losing session progress means the screen-time limit is under-reported, allowing children to get more screen time than allowed while frustrating parents who expect accurate tracking.

**Independent Test**: Start a 10-minute session, note the elapsed time, force-kill the app from the OS task switcher, reopen within 5 seconds, and verify the timer resumes within 30 seconds of where it was, not reset to zero.

**Acceptance Scenarios**:

1. **Given** a child has a 10-minute active session, **When** the OS kills the app, **Then** upon reopening the timer resumes from approximately 10 minutes (within 30-second tolerance), not reset to zero.
2. **Given** a child is mid-session, **When** the app is moved to the background, **Then** the current elapsed time is saved to local storage within 5 seconds of backgrounding.
3. **Given** a child's session was interrupted, **When** they reopen the app within the same screen-time limit window, **Then** remaining time reflects already-consumed session time.

---

### User Story 3 - View Filterable Activity Dashboard (Priority: P1)

As a parent, I select Today, Week, or Month and see total screen time, category distribution (stories, games, videos, creative activities), and most-used content for a specific child — without waiting more than 1.5 seconds for the data to load.

**Why this priority**: This is the core value proposition of the reports feature. Parents need to quickly see how their child's time is being spent and whether the balance aligns with their goals.

**Independent Test**: Select a child, switch between Today / Week / Month date ranges three times each, and verify the chart data updates accurately within 1.5 seconds to match the actual session history for each period.

**Acceptance Scenarios**:

1. **Given** a child with activity history, **When** the parent selects "Week", **Then** the dashboard displays the total time and category distribution for the last 7 days within 1.5 seconds.
2. **Given** a child with an active current-day session, **When** the parent selects "Today", **Then** the dashboard reflects the most recent session data including sessions still in progress.
3. **Given** a child has no activity in the selected range, **When** the parent selects that range, **Then** the dashboard shows a "No activity during this period" empty state — not an error.
4. **Given** the parent is viewing the "Today" dashboard, **When** the child starts a new session on another device, **Then** the dashboard updates within 5 seconds without requiring a manual refresh.

---

### User Story 4 - Server Time Enforcement (Priority: P2)

As a parent, my child cannot extend their screen time by changing the device clock, because all session duration calculations use server-verified timestamps — not the local device clock.

**Why this priority**: Clock manipulation is the most common workaround children attempt on screen-time apps. Without server-side time, every limit can be bypassed trivially.

**Independent Test**: Set the device clock 2 hours forward. Start a child session. Verify the remaining-time counter decrements at the correct real-world pace, and that the session ends at the actual daily limit — not the manipulated-clock limit.

**Acceptance Scenarios**:

1. **Given** the child's device clock is set 2 hours ahead, **When** a session starts, **Then** the elapsed time recorded is accurate to real wall-clock time (not the manipulated clock).
2. **Given** the daily screen-time limit is reached according to server time, **When** the app checks the limit, **Then** the session ends regardless of what the local device clock shows.
3. **Given** the device is offline and the daily limit is reached, **When** the app enforces the limit, **Then** it uses the last server-synced time snapshot — not the local clock.

---

### User Story 5 - Parent PIN Recovery (Priority: P2)

As a parent who has forgotten their PIN, I can securely reset it via email verification followed by answering a security question set during onboarding.

**Why this priority**: A locked-out parent cannot manage their child's screen time at all. PIN recovery is a rare but critical path — when it fails, the parent loses all parental control capabilities.

**Independent Test**: Trigger "Forgot PIN" from the PIN entry screen, complete the email verification link, answer the security question, set a new PIN, and verify the new PIN works immediately.

**Acceptance Scenarios**:

1. **Given** a parent on the PIN entry screen taps "Forgot PIN", **When** they enter their registered email, **Then** they receive an email with a recovery link that expires in 15 minutes.
2. **Given** the parent clicks the recovery link, **When** the link is valid and not expired, **Then** they are prompted to answer their security question.
3. **Given** the parent answers their security question correctly, **When** they submit, **Then** they can set a new PIN and are returned to the app.
4. **Given** a parent fails 3 PIN recovery attempts within 1 hour, **When** they attempt again, **Then** recovery is blocked for 24 hours and a clear message explains when they can retry.
5. **Given** a parent attempts recovery with an unregistered email, **When** they submit, **Then** the response is "If the email is registered, a recovery link has been sent" — no indication of whether the account exists.

---

### User Story 6 - Side-by-Side Child Comparison (Priority: P2)

As a parent with multiple children, I can select two children and view their screen-time and category usage side-by-side for any supported date range.

**Why this priority**: Multi-child families need to manage screen time fairly across siblings. Comparison helps parents spot imbalances and adjust limits without switching views manually.

**Independent Test**: Select two children and a date range. Verify both children's data is shown simultaneously with normalized chart scales, and that the category breakdowns for each are accurate.

**Acceptance Scenarios**:

1. **Given** a parent with two children and activity history, **When** the comparison view is opened, **Then** both children's total time and category distribution are shown side-by-side.
2. **Given** one child has significantly more screen time than the other, **When** the comparison chart renders, **Then** the chart axes are normalized so the difference is proportionally visible without either bar being clipped or zero-height.
3. **Given** one child has no activity in the selected period, **When** the comparison view is shown, **Then** that child's column shows a "No activity" state rather than blank or an error.

---

### User Story 7 - Low-End Device Performance (Priority: P3)

As a child using a budget Android device, animated transitions and overlays remain smooth, gracefully replacing themselves with static images when the device is struggling to keep up.

**Why this priority**: The target market includes families using budget devices. Poor animation performance on low-end hardware is a top source of user complaints and negative reviews.

**Independent Test**: On a low-end device, monitor FPS during animated screens. Verify that if FPS drops below 30 for 2 consecutive seconds, the animation is replaced with a static fallback image within 500ms, and that the animation is not restored until FPS exceeds 30 for 5 consecutive seconds.

**Acceptance Scenarios**:

1. **Given** an animated element is playing on a low-end device, **When** FPS drops below 30 for more than 2 seconds, **Then** the animation is replaced with a static fallback image within 500ms.
2. **Given** an animated element has been replaced with a static image, **When** FPS consistently exceeds 30 for 5 seconds, **Then** the animation is restored.
3. **Given** degrade/restore transitions happen more than 3 times within 60 seconds, **When** another transition would occur, **Then** the system waits 30 seconds before attempting another state change.

---

### User Story 8 - Battery Saver Mode Adaptation (Priority: P3)

As a child using a device in battery saver mode, the app reduces background reconnection attempts to preserve battery life.

**Why this priority**: Battery drain is a common complaint. Users notice when apps discharge their battery quickly; adapting to battery saver mode demonstrates respect for the device state.

**Independent Test**: Enable battery saver mode, disconnect from the network, and verify that the reconnection interval increases from 1 second to 15 seconds. Disable battery saver mode and verify the interval reverts to 1 second.

**Acceptance Scenarios**:

1. **Given** the device enters battery saver mode and the realtime connection drops, **When** the app attempts to reconnect, **Then** it waits 15 seconds between attempts (instead of the normal 1 second).
2. **Given** the device exits battery saver mode and the realtime connection is still down, **When** the next reconnect attempt fires, **Then** it uses the standard 1-second interval.
3. **Given** battery saver mode is toggled while the app is in the background, **When** the app returns to the foreground, **Then** the correct reconnection interval is applied within 10 seconds.

---

### User Story 9 - Export Weekly Summary (Priority: P3)

As a parent, I can share the current report view as an image via the OS share sheet, allowing me to keep records or share with another guardian or teacher.

**Why this priority**: Parents occasionally need to show reports to co-parents, teachers, or therapists. A simple image export via the system share sheet avoids the need for a dedicated export service.

**Independent Test**: Open a weekly report for any child, tap Export, and verify the OS share sheet opens with a valid PNG image that accurately captures the visible chart and data.

**Acceptance Scenarios**:

1. **Given** the parent is viewing any report (single child or comparison), **When** they tap "Export", **Then** the OS share sheet opens with a PNG image of the current view.
2. **Given** the export is completed, **When** the image is opened in a standard image viewer, **Then** it renders without corruption and the data in the image matches what was on screen.

---

### Edge Cases

- What happens when a child has zero activity for the selected time range? (Show a "No activity during this period" empty state — not an error or blank screen.)
- What happens if the daily rollup generation job fails for a given day? (Fall back to calculating from raw activity logs for that missing day; the daily rollup is eventually consistent.)
- What happens if the timezone on the child's device changes mid-day? (Reports use the timezone at the time of each session's creation; a timezone change does not retroactively shift historical data.)
- What happens if the parent email is not registered during PIN recovery? (Return the same generic message as a successful request to prevent account enumeration.)
- What happens when the offline command queue reaches 50 items during an offline period? (Oldest commands are silently evicted; newest commands take precedence — consistent with Phase 2 behavior.)
- What happens when the app cache reaches 100 MB? (LRU eviction removes the least recently accessed items until the total drops below 100 MB.)
- What happens when a session state save is interrupted by an OS kill (race condition)? (The periodic 30-second save bounds data loss to at most 30 seconds; the background-transition save reduces this to near-zero for graceful interruptions.)
- What happens if the FPS monitor itself causes performance overhead? (FPS monitoring operations must complete in under 50ms on mid-tier devices and must not block the UI thread.)

---

## Requirements *(mandatory)*

### Functional Requirements

**Reports**

- **FR-001**: The system MUST aggregate child activity data into: total screen time (minutes), category distribution mapped from activity types (story → "Story Time", game → "Brain Games", video → "Videos", creative → "Creative Zone"), and most-used content items — for the "Today", "Week", and "Month" date ranges. All day boundaries MUST be calculated using the child device's local timezone.
- **FR-002**: The system MUST pre-compute daily rollups for historical data (past days) so that loading historical reports does not require scanning raw activity logs.
- **FR-003**: For the "Today" partial rollup, the system MUST merge pre-computed historical rollups with the current day's live activity via push subscription on session changes. If the push subscription disconnects, the system MUST fall back to polling every 60 seconds and display a "live disconnected" indicator.
- **FR-004**: The system MUST support side-by-side visualization of data for exactly two children simultaneously, including total time and category breakdown, with normalized chart axes.
- **FR-005**: The system MUST provide an export function that captures a PNG image of the currently displayed report view (single-child or comparison) and opens the OS native share sheet with that image.

**Resilience**

- **FR-006**: The system MUST maintain a local cache of last-seen content and report data, retained for up to 7 days or 100 MB (whichever is reached first), using Least Recently Used (LRU) eviction. When free device storage drops below 500 MB, the system MUST reduce the cache threshold to 50 MB and display a low-storage warning.
- **FR-007**: The system MUST display an offline indicator on all child content screens and the parent dashboard within 5 seconds of connectivity loss. The indicator MUST include the elapsed time since last successful sync in human-readable format (e.g., "Last synced 3 min ago"). When connectivity restores, the system MUST remove the indicator and silently re-sync within 5 seconds. During rapid connectivity flapping (more than 3 transitions in 30 seconds), the system MUST debounce by waiting 3 seconds after the last change before updating the indicator.
- **FR-008**: Child session elapsed time MUST be saved to local storage every 30 seconds AND on every app-to-background transition. On relaunch after a force-kill, the system MUST restore the most recently saved session state, tolerating up to 30 seconds of elapsed-time loss.
- **FR-009**: Screen-time limit enforcement MUST use server-verified timestamps for all duration calculations. When offline, the system MUST enforce limits using the last server-synced time snapshot — never the local device clock.
- **FR-010**: Parent PIN recovery MUST use a two-step flow: email verification link (valid 15 minutes) followed by a security-question challenge. The system MUST enforce a limit of 3 recovery attempts per hour, escalating to a 24-hour lockout after 3 consecutive locked hours. The lockout MUST reset after 24 consecutive hours with no failed attempts. If the submitted email is not registered, the response MUST be "If the email is registered, a recovery link has been sent" to prevent account enumeration.
- **FR-011**: When an animated element causes FPS to drop below 30 for more than 2 consecutive seconds on any screen or transition, the system MUST replace it with a static fallback image within 500ms. Once degraded, the animation MUST only be restored after FPS consistently exceeds 30 for 5 consecutive seconds. Rapid degrade/restore cycles (more than 3 transitions in 60 seconds) MUST be debounced: the system waits 30 seconds before considering another state change.
- **FR-012**: In battery saver mode, the system MUST reduce realtime reconnection attempts to one every 15 seconds (from the standard 1 second). Battery saver mode changes MUST be detected within 10 seconds and MUST apply to the next reconnection attempt, including changes that occur while the app is in the background.
- **FR-013**: The system MUST log all resilience events (cache fallback, session restore, animation degradation, PIN recovery attempt, offline transition) to local storage and batch-forward them to a crash reporting service when connectivity is available. Local logs MUST retain the most recent 500 events using LRU eviction. Batches MUST be flushed every 5 minutes or when 50 events are queued (whichever comes first). All resilience operations MUST complete their critical path in under 50ms on mid-tier devices and MUST NOT block the UI thread.

### Key Entities

- **Daily Stats Rollup**: Pre-computed aggregation of a child's screen time, category distribution, and top activities for a specific calendar day. Once finalized, historical rollups are immutable.
- **Partial Rollup (Today)**: The current day's live aggregation, computed from recent activity logs and updated via real-time subscription.
- **Session State**: Persisted data representing an active child session — child ID, content item ID, elapsed seconds, session start time, and daily screen-time limit snapshot. Used for recovery after OS interruption.
- **Parent Recovery Request**: A time-limited recovery token issued for a parent email address, used for PIN reset. Subject to rate limiting and lockout; invalidated on new request for the same email.
- **Cached Content Item**: A locally stored copy of a content item (story, game, video, or creative activity) or report data used for offline display, with a last-synced timestamp.
- **Resilience Event Log Entry**: A record of a resilience mechanism activation — type, timestamp, success or failure outcome, and screen context — stored locally and forwarded to crash reporting.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The reports dashboard fully loads with aggregated data for any supported date range in under 1.5 seconds.
- **SC-002**: The "Today" dashboard receives live updates and reflects a new child session within 5 seconds of the session starting — without any manual refresh.
- **SC-003**: 100% of generated PNG exports open in a standard image viewer without corruption, and accurately represent the on-screen report at the time of export.
- **SC-004**: Side-by-side comparison correctly renders normalized chart axes even when one child has 10× more usage than the other.
- **SC-005**: Cold start (fresh app launch after clearing app data) completes and shows cached content within 3 seconds on a mid-tier device.
- **SC-006**: Session timer is restored after a force-kill with less than 30 seconds of elapsed-time loss in all tested scenarios.
- **SC-007**: Offline indicator appears within 5 seconds of connectivity loss on both child content screens and the parent dashboard.
- **SC-008**: PIN recovery completes successfully end-to-end in under 3 minutes for 95% of parents attempting it.
- **SC-009**: Screen-time enforcement correctly ends the session when server time indicates the limit is reached, even when the device clock has been shifted by up to ±24 hours (tested at ±1h, ±6h, ±24h).
- **SC-010**: Animation degradation triggers within 500ms of FPS dropping below 30 for 2 seconds, measured on a low-end reference device (Galaxy A series equivalent).
- **SC-011**: Accessibility audit of 5 key screens (child content browser, child activity screen, parent dashboard, parent controls, parent PIN entry) passes with zero WCAG 2.1 Level AA violations, verified via VoiceOver on iOS and TalkBack on Android.
- **SC-012**: Automated E2E tests for parent onboarding, child session end, and PIN-gate bypass attempt all pass in CI on both iOS and Android.

---

## Assumptions

- Phases 1 and 2 are complete: `activity_logs`, `sessions`, and `daily_stats` tables exist in the database, and the session activity-logging infrastructure is operational.
- A nightly scheduled job aggregates completed days into finalized `daily_stats` rollups; this job is maintained outside this spec.
- The parent has set a security question during onboarding; PIN recovery is not available if no security question was set.
- Email delivery is already configured and functional; this spec only defines the recovery flow, not the email delivery mechanism.
- The OS share sheet (iOS Share Sheet / Android Intent) is available on all target devices.
- FPS monitoring is available via platform animation-frame APIs on all target devices.
- The realtime connection is managed by the existing channel infrastructure from Phase 2; this spec only controls the reconnection interval.
- Remote crash reporting service integration is in scope for Phase 5 (production readiness); Phase 4 implements the logging infrastructure that feeds it.
- Content moderation and rating are handled outside this feature by an administrator.
- All target devices run iOS 15+ or Android 10+.
- RTL layout support (for Arabic-speaking families) applies to all new screens introduced by this spec.
