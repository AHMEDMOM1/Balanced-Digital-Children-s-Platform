# Feature Specification: PIN Authentication on Two Devices

**Feature Branch**: `018-pin-auth-two-device`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "phase 3 from @TwoDevicePlan.md"

## Overview

After a child device has been paired with a parent device (via QR code or manual code), all subsequent sessions on both devices are secured by a PIN. This feature covers the full lifecycle of PIN-based access: daily logins on the child device, daily logins on the parent device, forgotten PIN recovery on the parent device (self-service via email), and forgotten PIN recovery on the child device (parent-initiated remote reset).

The pairing flow itself (first-time setup) is covered in specs 016 and 017. This spec begins where those leave off: both devices have been paired and PINs have been set.

## Clarifications

### Session 2026-06-12

- Q: In US4 Acceptance Scenario 5, what event changes the reset status from "pending" to complete — reception of the command by the child device, or completion of the child's new PIN creation? → A: Child completes new PIN creation (confirms reset fully succeeded).
- Q: Should the "Forgot PIN" flow rate-limit OTP generation requests per email address? → A: 3 OTP requests per hour per email address.
- Q: If multiple reset commands are queued for a child device (parent sent more than one while child was offline), how should the child handle them on reconnection? → A: Only the latest reset command applies — earlier queued ones are discarded.

## User Scenarios & Testing

### User Story 1 — Returning Child Logs In with PIN (Priority: P1)

A child who previously paired their device and created a PIN opens the app. Instead of going to the child content interface immediately, they are presented with a PIN entry screen. After entering the correct 6-digit PIN, they access the child interface.

**Why this priority**: This is the daily-use flow for the child device. Without it, any person who picks up the child device could access the content without authorization.

**Independent Test**: On a device with pairing state and a saved PIN hash in local storage, open the app → PIN entry screen appears → enter correct 6-digit PIN → child interface loads. Enter wrong PIN → error shown, interface not accessible.

**Acceptance Scenarios**:

1. **Given** the child device has been paired and a PIN was set during pairing, **When** the app is opened, **Then** a 6-digit PIN entry screen is shown (not the child content interface directly).
2. **Given** the PIN entry screen is shown, **When** the correct PIN is entered, **Then** the child content interface loads immediately.
3. **Given** the PIN entry screen is shown, **When** an incorrect PIN is entered, **Then** an error is shown and the interface remains locked.
4. **Given** the PIN entry screen is shown, **When** an incorrect PIN is entered 5 consecutive times, **Then** the device shows a cooldown message (1 minute) and blocks further attempts temporarily.
5. **Given** the child is in the content interface and the app is backgrounded for more than 5 minutes, **When** they return to the foreground, **Then** the PIN entry screen is shown again.

---

### User Story 2 — Parent Logs In with PIN on Parent Device (Priority: P1)

A parent who completed email registration and set a PIN opens the parent device app. They are shown a PIN entry screen and, after entering the correct PIN, land on the parent dashboard.

**Why this priority**: Parallel to US1 — the parent device must also require PIN entry on every session to prevent children from accessing parental controls.

**Independent Test**: On a device with a parent profile and local PIN hash, open the app → PIN entry screen → enter correct PIN → parent dashboard loads.

**Acceptance Scenarios**:

1. **Given** the parent device has been set up with email + PIN, **When** the app is opened, **Then** a PIN entry screen is shown.
2. **Given** the PIN entry screen is shown, **When** the correct PIN is entered, **Then** the parent dashboard loads.
3. **Given** the PIN entry screen is shown, **When** an incorrect PIN is entered, **Then** an error is shown and the dashboard remains inaccessible.
4. **Given** the parent is on the dashboard and backgrounds the app for more than 5 minutes, **When** they return, **Then** the PIN entry screen is shown again.

---

### User Story 3 — Parent Resets Their Own Forgotten PIN (Priority: P2)

A parent who has forgotten their PIN can initiate a reset from the PIN entry screen. They receive a one-time code by email, verify it, and create a new PIN.

**Why this priority**: Self-service recovery is essential for parent access — without it, a forgotten PIN locks the parent out of all controls permanently.

**Independent Test**: On the parent PIN screen, tap "Forgot PIN" → enter registered email → receive OTP → enter OTP → create new PIN → parent dashboard loads.

**Acceptance Scenarios**:

1. **Given** the parent PIN entry screen, **When** "Forgot PIN" is tapped, **Then** the app navigates to an email entry screen.
2. **Given** the email entry screen, **When** the registered email is entered and submitted, **Then** a one-time code is sent to that email within 60 seconds.
3. **Given** the OTP has been sent, **When** the correct code is entered within 10 minutes, **Then** the parent is prompted to create a new PIN.
4. **Given** the OTP has been sent, **When** an incorrect code is entered, **Then** an error is shown; after 3 failed attempts the request is invalidated and a new OTP must be requested.
5. **Given** a new PIN has been created, **When** the creation is confirmed, **Then** the new PIN hash is saved locally and synced to the cloud, and the parent dashboard loads.

---

### User Story 4 — Parent Remotely Resets Child's Forgotten PIN (Priority: P2)

When a child forgets their PIN, a parent can initiate a remote PIN reset from the parent dashboard. The child device receives a command and transitions directly to the PIN creation screen.

**Why this priority**: The child has no self-service recovery path (no email account). Remote reset by the parent is the only recovery mechanism.

**Independent Test**: On the parent dashboard, find the child's profile and tap "Reset Child PIN" → confirm → on the child device, a PIN creation screen appears (within 10 seconds if the device is online).

**Acceptance Scenarios**:

1. **Given** the parent dashboard showing a paired child, **When** "Reset Child PIN" is tapped and confirmed, **Then** a reset command is dispatched to the child device.
2. **Given** the child device is online and receives the reset command, **When** the command arrives, **Then** any currently active child session ends and the PIN creation screen is shown.
3. **Given** the child device is offline when the reset is dispatched, **When** the child device comes back online, **Then** the PIN creation screen is shown before the child can access content.
4. **Given** the child completes the new PIN creation, **When** the PIN is confirmed, **Then** the new hash is saved locally and the child can immediately access content.
5. **Given** the parent dispatches a reset, **When** the child completes new PIN creation on the child device, **Then** the parent dashboard clears the "pending" status and shows the reset as complete.

---

### Edge Cases

- What happens if the child enters their PIN while offline? → Local hash comparison must work without network; offline PIN verification is required.
- What happens if the local PIN hash is corrupted or missing? → Display an error message explaining the device must be re-paired; show a button to start the pairing flow again.
- What happens if the parent's email is unrecognized during forgotten-PIN flow? → Show a generic "If an account exists for that email, a code has been sent" message (no account enumeration).
- What happens if both a session-timeout PIN challenge and an inbound remote-reset command arrive simultaneously? → The remote reset takes precedence; the new PIN creation screen is shown.
- What happens if the child enters the PIN incorrectly many times and the parent simultaneously sends a remote reset? → The reset command clears the lockout counter and shows the creation screen.

## Requirements

### Functional Requirements

- **FR-001**: The child device MUST display a PIN entry screen on every app open when the device has a saved pairing state and PIN hash.
- **FR-002**: The child device MUST display a PIN entry screen when the app returns from background after 5 or more minutes of inactivity.
- **FR-003**: The system MUST verify the entered PIN against the locally stored hash; network access MUST NOT be required for PIN verification on either device.
- **FR-004**: After 5 consecutive incorrect PIN attempts on either device, further attempts MUST be blocked for at least 1 minute.
- **FR-005**: The parent device MUST display a PIN entry screen on every app open when the parent profile is set up.
- **FR-006**: The parent device MUST provide a "Forgot PIN" option that initiates an email one-time code flow.
- **FR-007**: The forgotten-PIN OTP MUST expire after 10 minutes, be invalidated after 3 incorrect entries, and the system MUST allow no more than 3 OTP generation requests per hour per email address.
- **FR-008**: After a successful forgotten-PIN reset, the new PIN hash MUST be saved locally AND synced to the cloud profile.
- **FR-009**: The parent dashboard MUST provide a "Reset Child PIN" action for each paired child.
- **FR-010**: A confirmed parent-initiated child PIN reset MUST be delivered to the child device within 10 seconds when the child device is online.
- **FR-011**: A parent-initiated child PIN reset MUST be queued and delivered when the child device reconnects if it was offline at dispatch time. If multiple reset commands are queued, only the most recently dispatched command MUST be applied; earlier queued commands MUST be discarded.
- **FR-012**: On receiving a remote PIN reset command, the child device MUST immediately show the PIN creation screen, regardless of current app state.
- **FR-013**: The child device MUST clear any rate-limit lockout when a remote PIN reset command is received.
- **FR-014**: The system MUST NOT require the user to re-enter the pairing flow when only the PIN is forgotten — pairing state (child_id, family_id) MUST be preserved through PIN reset.
- **FR-015**: The parent dashboard MUST show a "pending" status for a remote child PIN reset and MUST clear that status only when the child device confirms new PIN creation (not merely upon command delivery).

### Key Entities

- **PIN Hash**: A one-way hash of the user's 6-digit PIN, stored locally on each device. Used for offline verification. Synced to cloud profile for cross-device consistency.
- **PIN Lockout State**: A counter and timestamp tracking consecutive failed PIN attempts; resets on success or remote reset command. Stored locally; not synced.
- **Remote Reset Command**: A message sent from parent device to child device instructing the child to enter new PIN creation mode. Delivered via the family Realtime channel; queued if child is offline.
- **Pairing State**: Persisted on the child device: child_id, family_id, parent_id, paired_at. Survives PIN reset and app reinstall recovery is out of scope.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A returning child can unlock the child interface within 10 seconds of opening the app (PIN entered + verified).
- **SC-002**: PIN verification works 100% of the time when the device is offline (no network dependency).
- **SC-003**: A parent can complete the forgotten-PIN email reset flow in under 3 minutes from tapping "Forgot PIN" to accessing the dashboard.
- **SC-004**: A remote child PIN reset is acknowledged on the child device within 10 seconds when the child device is online.
- **SC-005**: 0% of PIN reset attempts expose account existence to unauthenticated callers (no account enumeration in the email reset flow).
- **SC-006**: Pairing state is preserved through all PIN reset paths — no child device requires re-pairing after a PIN reset.

## Assumptions

- Both devices have completed the pairing flow (specs 016 and 017) before this feature is exercised. This spec does not cover first-time setup.
- The parent device uses the existing email OTP authentication infrastructure (already live) for the forgotten-PIN recovery path.
- PIN length is 6 digits on both the parent device and the child device, consistent with the decision made in TwoDevicePlan.md.
- The Realtime family channel (already established) is used for the remote reset command delivery. No new transport layer is needed.
- Offline command queuing for the remote PIN reset reuses the existing `realtime_commands` table mechanism.
- The parent dashboard already displays paired child profiles; this spec adds a "Reset Child PIN" action to that existing UI without redesigning the dashboard.
- App-background timeout (5 minutes) before re-locking applies to both devices equally.
