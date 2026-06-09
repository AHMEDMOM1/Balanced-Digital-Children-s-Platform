# Feature Specification: Resilience & Real-Device Testing

**Feature Branch**: `006-resilience-testing`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "phase 4"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Graceful Offline Behavior (Priority: P1)

As a parent or child, when the device loses internet connectivity, the app continues functioning with cached data and clearly indicates the offline state.

**Why this priority**: Offline resilience is the most critical edge case — poor connectivity is common on mobile devices and must not break the app experience.

**Independent Test**: Can be tested by enabling airplane mode at different points in the app lifecycle (launch, mid-session) and verifying correct cached-data display and offline indicators.

**Acceptance Scenarios**:

1. **Given** the app is launched with no internet, **When** the child navigates to any content screen, **Then** they see cached content with an "offline" badge and no crash occurs.
2. **Given** the app is launched with no internet, **When** the parent opens the dashboard, **Then** they see stale cached data with a "last synced 3 min ago" indicator.
3. **Given** the app is online and displaying content, **When** connectivity drops, **Then** within 5 seconds an offline indicator appears and the app continues using cache.

---

### User Story 2 - Session Persistence After App Interruption (Priority: P1)

As a child, when my app is killed by the operating system or I switch away and the OS reclaims resources, my active session resumes from where it left off when I return.

**Why this priority**: Children frequently switch apps or get interrupted; losing session progress frustrates users and undermines screen-time tracking accuracy.

**Independent Test**: Can be tested by starting a session, force-killing the app from the OS task switcher, reopening, and verifying the timer resumes from the previous elapsed time (not reset to zero).

**Acceptance Scenarios**:

1. **Given** a child has a 10-minute active session, **When** the OS kills the app, **Then** upon reopening the timer resumes from 10 minutes (not reset).
2. **Given** a child is mid-session, **When** the app is backgrounded for more than 30 seconds, **Then** the timer saves the current elapsed time to local storage.
3. **Given** a child's session was interrupted, **When** they reopen the app within the same screen-time limit window, **Then** the remaining time reflects the already-consumed session time.

---

### User Story 3 - Parent PIN Recovery (Priority: P2)

As a parent, when I forget my PIN, I can securely reset it via email verification and a security question set during onboarding.

**Why this priority**: A locked-out parent cannot manage their child's screen time, making this critical for the parent experience.

**Independent Test**: Can be tested by triggering "Forgot PIN" from the PIN entry screen, completing the email verification, answering the security question, and setting a new PIN.

**Acceptance Scenarios**:

1. **Given** a parent is on the PIN entry screen, **When** they tap "Forgot PIN", **Then** they are prompted to enter their registered email address.
2. **Given** the parent has submitted their email, **When** the verification link is sent and clicked, **Then** they are prompted to answer their security question.
3. **Given** the parent answers the security question correctly, **When** they submit the answer, **Then** they are allowed to set a new PIN.

---

### User Story 4 - Server Time Enforcement (Priority: P2)

As a parent, my child cannot bypass the screen-time limit by changing the device clock, because all time calculations use server-side timestamps.

**Why this priority**: Clock-changing is a common workaround children attempt on parental-control apps; server-side time is the only reliable defense.

**Independent Test**: Can be tested by manually changing the device clock forward, starting a session, and verifying the system correctly uses server time (session ends at the true limit).

**Acceptance Scenarios**:

1. **Given** the child has changed their device clock 2 hours ahead, **When** they start a session, **Then** the server timestamp is used and the elapsed time recorded is accurate to real wall-clock time.
2. **Given** the child's session exceeds the daily limit according to server time, **When** the app checks the limit, **Then** the session is ended regardless of the local device time.

---

### User Story 5 - Low-End Device Performance (Priority: P3)

As a child using a low-end Android device, animations and transitions remain smooth, gracefully degrading to static images when performance dips.

**Why this priority**: The app targets a family audience that includes budget devices; poor performance on low-end hardware excludes a significant user segment.

**Independent Test**: Can be tested on a low-end device (e.g., Galaxy A series) by monitoring FPS during animation-heavy screens and verifying degradation triggers.

**Acceptance Scenarios**:

1. **Given** a child is on a low-end device, **When** an animated element plays, **Then** if FPS drops below 30 for more than 2 consecutive seconds the animation degrades to a static image.
2. **Given** the animation has degraded to a static image, **When** the screen changes and a new animation starts, **Then** the app re-checks current FPS before deciding to play or degrade.

---

### User Story 6 - Battery Saver Mode Adaptation (Priority: P3)

As a child using a device in battery saver mode, the app reduces realtime reconnection attempts to conserve power.

**Why this priority**: Battery-draining behavior is a top user complaint; adapting to battery saver mode shows respect for the device's power state.

**Independent Test**: Can be tested by enabling battery saver mode, disconnecting from the network, and verifying reduced reconnection frequency.

**Acceptance Scenarios**:

1. **Given** the device enters battery saver mode, **When** the realtime connection drops, **Then** the app increases the reconnection interval from 1s to 15s.
2. **Given** the device exits battery saver mode, **When** the realtime connection is still down, **Then** the app reverts to the normal 1s reconnection interval.

### Edge Cases

- What happens when a child immediately reopens the app after a force-kill (within 1 second)? → FR-003 handles this: the most recent saved state (from the background-triggered save) is restored on relaunch.
- How does the system handle gradual connectivity degradation (not full loss but high packet loss)? → FR-002 applies; the offline indicator triggers when connectivity drops below functional threshold (per netinfo API's isConnected/isInternetReachable); partial connectivity is treated as "online" with reduced quality.
- What if the email verification link for PIN recovery expires? → FR-005: links expire after 15 minutes; the user must request a new one.
- What if the parent tries to set the same PIN as the forgotten one? → FR-005: allowed.
- How does the app behave on a device with less than 500MB of free storage? → FR-001: cache threshold reduces to 50MB with a low-storage warning.
- What happens when cache reaches the 100MB limit during an offline session? → FR-001: LRU eviction maintains the limit based on access recency.
- What happens when a session save is in-flight and the OS kills the app (race condition)? → FR-003: the 30-second periodic save plus the background-transition save bounds data loss to at most 30 seconds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a local cache of last-seen content items and daily stats, accessible for offline display, retained for up to 7 days or 100MB, whichever is reached first, using a Least Recently Used (LRU) eviction strategy. When total free device storage falls below 500MB, the cache MUST reduce its eviction threshold to 50MB and display a low-storage warning. If cached data is stale (last sync >7 days ago) or corrupted (checksum mismatch on read), the entry MUST be evicted and treated as unavailable for offline display.
- **FR-002**: System MUST display an "offline" indicator on child content screens and parent dashboard within 5 seconds of connectivity loss. The indicator text MUST display the elapsed time since last successful sync in human-readable format (e.g., "Last synced 3 min ago"), computed from the timestamp of the most recent successful data fetch. When connectivity is restored, the system MUST silently re-sync cached data in the background and remove the offline indicator within 5 seconds. During rapid connectivity changes (flapping, defined as >3 transitions within 30 seconds), the system MUST debounce by waiting 3 seconds after the last detected change before updating the indicator state.
- **FR-003**: Child sessions MUST persist elapsed time across app restarts by saving session state to local storage every 30 seconds and also whenever the app transitions to the background (AppState change). On relaunch after an immediate force-kill (within 1 second), the system MUST load the most recent saved state, tolerating up to 30 seconds of data loss for the in-flight interval.
- **FR-004**: System MUST restore an active child session from local storage upon app relaunch, including elapsed time and current activity.
- **FR-005**: Parent PIN recovery MUST follow a two-step flow: email verification then security question challenge, with a limit of 3 attempts per hour escalating to a 24-hour cooldown after 3 consecutive locked hours. The 24-hour cooldown MUST reset after 24 consecutive hours with no failed attempts (measured from the last failed attempt timestamp, not from lockout start). If the parent email is unverified or not found, the system MUST return "If the email is registered, a recovery link has been sent" to prevent account enumeration and log the failure internally. Email verification links MUST expire after 15 minutes. If email delivery fails (bounce, spam block, invalid address), the system MUST log the failure and show the same generic message "If the email is registered, a recovery link has been sent". Setting the same PIN as the forgotten one MUST be allowed. Concurrent recovery attempts from different parent devices MUST be serialized per email address: only the most recently initiated recovery token is valid; all earlier tokens for the same email are invalidated on new request.
- **FR-006**: Screen-time enforcement MUST use server-side timestamps for all duration calculations; local device time must never be authoritative. When the device is offline and the daily screen-time limit is reached, the system MUST enforce the limit locally using the last known server-synced time and cached daily usage snapshot.
- **FR-007**: When an animated element causes FPS to drop below 30 for more than 2 consecutive seconds on any screen or transition, the app MUST replace it with a static fallback image. If the element is already a static image, degradation MUST be a no-op. Once degraded, the app MUST restore the animation only after FPS exceeds 30 for 5 consecutive seconds. Rapid degrade/restore cycles (more than 3 transitions within 60 seconds) MUST be debounced: the system must wait 30 seconds after the last transition before considering another state change.
- **FR-008**: In battery saver mode, the app MUST reduce realtime reconnection attempts to one every 15 seconds (from the standard 1 second). If battery saver mode changes during a reconnection attempt, the interval for the next attempt MUST use the current battery state.
- **FR-009**: The app MUST detect battery saver mode changes (enter/exit) within 10 seconds and adjust reconnection behavior accordingly, including when the mode change occurs while the app is in the background (detected on foreground).
- **FR-010**: The app MUST log all resilience events (cache fallback, session restore, animation degradation, PIN recovery attempt, offline transition) to a local file and forward them to a remote crash reporting service when connectivity is available. Local event logs MUST retain the most recent 500 events (LRU eviction). Event logs MUST be batched for remote forwarding: flush every 5 minutes or when 50 events are queued, whichever comes first. When multiple resilience events fire simultaneously (e.g., offline + FPS degrade + battery saver enter), each MUST be logged independently with its own timestamp and no data loss. Cache lookups and event logging MUST NOT block the UI thread: all resilience operations MUST complete their critical path in under 50ms on mid-tier devices.

### Key Entities *(include if feature involves data)*

- **Cached Content**: A locally stored snapshot of content items (stories, games, videos, creative activities) used for offline display, with a timestamp of last synchronization.
- **Session State**: Persisted data representing an active child session, including child ID, content item ID, elapsed seconds, start time, and screen-time limit snapshot.
- **Parent Recovery Request**: A time-limited recovery token associated with a parent's email address, used for PIN reset verification, with a lockout counter that resets after 24 hours of no failed attempts.
- **Resilience Event Log**: A record of each resilience mechanism activation (type, timestamp, success/failure, screen context) stored locally and batched for remote reporting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cold start (fresh app launch with no cached session data from a prior run, after a fresh install or app data clear) completes in under 3 seconds on a mid-tier device (e.g., Pixel 4a).
- **SC-002**: Session persistence across OS kill restores elapsed time with less than 30 seconds of data loss (timer accuracy within 30 seconds), bounded further to near-zero for background-transition kills.
- **SC-003**: Offline indicator appears within 5 seconds of connectivity loss on both child and parent screens.
- **SC-004**: PIN recovery flow completes successfully in under 3 minutes for 95% of parents attempting it.
- **SC-005**: Screen-time enforcement using server time prevents clock-changing bypass attempts where the device clock is altered by up to 24 hours forward or backward (verified through test matrix covering ±1h, ±6h, ±24h).
- **SC-006**: Accessibility audit passes with zero WCAG 2.1 Level AA violations (verified via VoiceOver on iOS and TalkBack on Android) on 5 key screens: child content browser, child activity screen, parent dashboard, parent controls, parent PIN entry.
- **SC-007**: Automated E2E tests for parent-onboarding, child-session-end, and pin-gate-bypass-attempt pass in CI on both iOS and Android via a device-farm service.
- **SC-008**: Animation degradation triggers within 500ms of detecting FPS below threshold for 2 seconds.

## Assumptions

- The app has existing local persistence mechanisms for caching and session state.
- A security question is collected during parent onboarding and stored alongside the parent profile.
- Email delivery service is already configured and functional (used for PIN recovery links).
- A realtime messaging connection is already integrated and handles reconnection internally; the app can only control reconnection interval.
- FPS monitoring is available through the platform's animation frame APIs (`requestAnimationFrame` on both platforms, `Choreographer` on Android, `CADisplayLink` on iOS) on all target devices.
- PIN recovery security relies on the parent's email account security; the app does not independently verify email ownership beyond the recovery link flow.
- Low-end device testing targets Galaxy A series and similar; high-end targets iPhone SE and similar.
- Remote crash reporting service (e.g., Sentry) will be configured as part of Phase 5 production readiness; Phase 4 implements the logging infrastructure.

## Clarifications

### Session 2026-06-08
- Q: Which screens should FPS monitoring and animation degradation apply to? → A: All screens including transitions — consistent user experience across child and parent views.
- Q: How should E2E tests for resilience scenarios be executed? → A: Automated in CI using a device-farm service.
- Q: How long should cached content persist for offline use? → A: Persistent across sessions, evicted after 7 days or when storage exceeds 100MB.
- Q: What rate/attempt limits should apply to PIN recovery? → A: 3 attempts per hour, escalating to 24h cooldown after 3 consecutive locked hours.
- Q: How should resilience failures be reported? → A: Log to a local file plus remote crash reporting service.
