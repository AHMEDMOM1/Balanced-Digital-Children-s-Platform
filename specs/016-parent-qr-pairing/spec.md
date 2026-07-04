# Feature Specification: Parent Device Registration & QR Pairing

**Feature Branch**: `016-parent-qr-pairing`

**Created**: 2026-06-11

**Status**: Draft

**Input**: TwoDevicePlan.md — Phase 1 (Parent Device: Registration & QR Generation)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parent Registers and Receives Pairing Code (Priority: P1)

A parent opens the app for the first time, creates a family account via email verification, and is immediately shown a pairing code (both as a scannable visual code and a human-readable text code) that their child's device can use to link to the family.

**Why this priority**: This is the entire purpose of Phase 1 — without the pairing code screen, no child device can ever be linked to a parent account. Every other phase depends on this flow existing.

**Independent Test**: Can be fully tested on the parent device alone: register an account, complete email verification, and confirm that a pairing code screen appears showing both a visual code and a text code with a countdown timer.

**Acceptance Scenarios**:

1. **Given** a new parent opens the app for the first time, **When** they enter their name and email and verify with the one-time code sent to their email, **Then** they are shown a pairing screen displaying a visual code, a human-readable text code in `XXX-XXX` format, and a countdown timer showing minutes and seconds remaining.
2. **Given** a parent is on the pairing screen, **When** the countdown timer reaches zero, **Then** the current codes are automatically invalidated and new codes are generated and displayed without any action from the parent.
3. **Given** a parent is on the pairing screen, **When** they tap "Regenerate", **Then** a new visual code and text code are generated and displayed within 2 seconds, and the timer resets to 10 minutes.

---

### User Story 2 - Pairing Code Security: Single Use and Time-Limited (Priority: P1)

Each pairing code issued to a parent can only be used once and only within a 10-minute window. After either condition is violated, the code is permanently invalid — a new code must be generated.

**Why this priority**: Security is non-negotiable. A reusable or non-expiring pairing code could allow an unauthorised device to join a family account at any time. This story is P1 because it is a prerequisite for the pairing codes generated in US1 to be trustworthy.

**Independent Test**: Can be tested by verifying: (a) a code that has already been used cannot be used a second time *(requires Phase 2 — the child device must consume the token for this scenario to be testable)*; (b) a code that has passed its expiry time is rejected even if it was never used *(testable in Phase 1 by inserting a token with a past `expires_at` timestamp)*.

**Acceptance Scenarios**:

1. **Given** a pairing code has been successfully used by a child device, **When** another device attempts to use the same code, **Then** the attempt is rejected with an "already used" error and the second device is not added to the family. *(Phase 2 required to test: the child device must consume the token.)*
2. **Given** a pairing code was generated more than 10 minutes ago and has not been used, **When** any device attempts to use that code, **Then** the attempt is rejected with an "expired" error.
3. **Given** a parent generates a new pairing code while an old code for the same family is still unexpired, **When** the old code is attempted, **Then** it is still valid (only the new code replaces it on-screen; old unexpired unused codes remain valid until they expire naturally).

---

### User Story 3 - Parent is Notified When Child Pairs Successfully (Priority: P2)

After the child device uses the pairing code and links to the family, the parent device automatically detects this and navigates the parent to their family dashboard — no manual refresh or action required.

**Why this priority**: Without automatic detection, the parent would be stuck on the pairing screen indefinitely. However, the pairing screen can still function (Phase 2 completes pairing on the child side) without this notification — the parent could manually navigate away — making it P2 rather than P1.

**Independent Test**: Can be tested end-to-end with Phase 2 in place: complete the pairing flow on the child device and confirm the parent device transitions to the dashboard automatically within 5 seconds.

**Acceptance Scenarios**:

1. **Given** a parent is waiting on the pairing screen, **When** a child device successfully completes the pairing using the displayed code, **Then** the parent device automatically navigates to the family dashboard within 5 seconds without any parent interaction.
2. **Given** a parent is waiting on the pairing screen and their internet connection is briefly lost, **When** the connection is restored and the child completes pairing, **Then** the parent device still receives the notification and navigates to the dashboard.

---

### Edge Cases

- What happens when a parent exits the pairing screen mid-wait and returns — is the same code still shown or is a new one generated?
- What happens when a parent attempts to generate a new code while still connected but the network request fails — is the old code still displayed?
- What happens when the parent device's system clock is significantly different from the server clock — does the countdown timer still expire correctly?
- What happens when a parent account has already paired with one child device and generates a new pairing code — is the second child added to the same family? (Scoped out of Phase 1 UI; the data model supports it but no dashboard entry point is added until a later phase.)
- What happens when the parent sees the "child paired" notification but navigating to the dashboard fails — is there a fallback?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After email verification, the system MUST display a pairing screen containing both a visual scannable code and a human-readable 6-digit text code formatted as `XXX-XXX`.
- **FR-002**: Each pairing code MUST expire automatically after 10 minutes from the moment it was generated, regardless of whether it has been viewed or shared. Up to ±5 seconds of tolerance is permitted to account for network round-trip time between code generation and server timestamp recording; expiry enforcement is always server-authoritative.
- **FR-003**: The pairing screen MUST display a live countdown timer showing the time remaining until the current code expires, updated at least once per second.
- **FR-004**: When the countdown reaches zero, the system MUST automatically generate and display a new pairing code without requiring any parent action.
- **FR-005**: The parent MUST be able to manually request a new pairing code at any time by tapping a "Regenerate" button; the new code MUST appear within 2 seconds.
- **FR-006**: Each pairing code MUST be single-use — after a child device successfully uses the code, that specific code MUST be permanently invalidated on the server and cannot be reused.
- **FR-007**: The system MUST notify the parent device in real time when a child device successfully uses the pairing code; the parent MUST be automatically navigated to the family dashboard within 5 seconds of the parent device receiving the Realtime UPDATE event indicating the child has paired.
- **FR-008**: The visual code and text code displayed on the pairing screen MUST represent the same pairing invitation. The visual code encodes a machine-readable payload (unique token identifier, family identifier, and expiry timestamp) for scanning by the child device. The text code is a human-readable 6-digit short code for manual entry on devices without cameras. Both are generated from the same server-side record and become invalid simultaneously.
- **FR-009**: The pairing screen MUST be shown immediately after email OTP verification during first-time registration (replacing any previous "set up PIN" prompt that appeared at this step). No PIN setup screen is shown during Phase 1; PIN authentication on the parent device is introduced in Phase 3.
- **FR-010**: The system MUST support one parent account pairing with more than one child device over time — each pairing generates its own independent code, and each child device paired is tracked separately within the family. The data model must accommodate multiple children per family, but the UI entry point for adding a second child from the dashboard is out of scope for Phase 1.
- **FR-011**: While a new pairing code is being generated (after "Regenerate" is tapped or the timer expires), the "Regenerate" button MUST show a loading indicator and be disabled; the existing visual code and text code MUST remain fully visible until the new codes replace them atomically. "Atomically" means both the visual code and text code update within the same React render cycle (a single `setState` call), so the parent never sees a state where one has updated but the other has not.
- **FR-012**: The Realtime subscription used to detect child pairing (FR-007) MUST automatically attempt to re-establish after a connection interruption without any parent interaction. If the connection is restored before the parent navigates away, the parent device MUST still receive the pairing notification and navigate to the dashboard. Subscription reconnection attempts and their outcomes MUST be logged. If the subscription cannot be established at all on initial mount, the pairing screen MUST remain functional (token display and manual code remain visible and usable); the parent MAY manually navigate away if needed.
- **FR-013**: When the pairing screen first loads, before the initial token has been received from the server, the screen MUST display the text code area as "---" and the QR code area as a loading indicator. If the initial token generation fails, the screen MUST display an error banner with a "Try again" action that re-triggers token generation.
- **FR-014**: The countdown timer MUST be computed from the server-authoritative `expires_at` timestamp returned with the token, not from the parent device's local clock. This ensures accuracy regardless of device clock skew.
- **FR-015**: If token generation fails during a "Regenerate" request or auto-renewal, the previously displayed token and QR code MUST remain visible. An error banner MUST be shown and the "Regenerate" button MUST be re-enabled to allow a manual retry.
- **FR-016**: Each time the pairing screen mounts, it MUST generate a fresh token on mount. If the parent navigates away and returns, a new token is generated; the screen does not attempt to resume a previously displayed token.
- **FR-017**: If navigation to the family dashboard fails after receiving the child-paired Realtime event, the parent MUST be presented with a navigable path to the parent area (fallback to the app root) rather than remaining stranded on the pairing screen.
- **FR-018**: The pairing token MUST be associated with the `family_id` derived exclusively from the authenticated parent's session. No client-provided `family_id` value may override the session-derived value. This is enforced at the database level via RLS policies.
- **FR-019**: The QR code component MUST have an accessible label (e.g., "QR code — scan to pair your child's device"). The text code and remaining countdown time MUST be readable by assistive technology as static text. Countdown tick updates do not require screen reader announcements.

### Key Entities

- **Pairing Invitation**: A time-limited, single-use invitation created by a parent account to allow one child device to join the family. Contains a unique identifier (used for the scannable code), a human-readable code, a creation timestamp, an expiry timestamp, and a consumed flag that becomes set when a child device uses it.
- **Family**: The grouping that links a parent account to one or more child devices for shared settings and communication. Created during parent registration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A parent completes the full registration-to-pairing-screen flow (email entry → OTP verification → pairing screen visible) in under 3 minutes on their first use. *(This metric spans the full flow including email entry and OTP verification, which are outside Phase 1 scope. Phase 1's contribution is the redirect from OTP success to the pairing screen; the 3-minute budget is an end-to-end user experience target.)*
- **SC-002**: Every pairing code expires within 10 minutes ± 5 seconds of generation regardless of network conditions or device state.
- **SC-003**: A new pairing code is visible on screen within 2 seconds of the parent tapping "Regenerate" or the timer reaching zero. The 2-second target is measured from the moment the generation request is sent to the server to the moment new codes appear on screen, inclusive of network round-trip time.
- **SC-004**: The parent device transitions to the family dashboard within 5 seconds of the child device completing the pairing, when both devices have active internet connections.
- **SC-005**: Zero pairing codes can be used more than once — any second attempt returns an error and no second child device is added. *(Full automated verification requires Phase 2 child-side implementation. Phase 1 verifies the server-side enforcement foundation via RLS policy integration tests.)*
- **SC-006**: Zero pairing codes older than 10 minutes can be used successfully — expired codes are always rejected server-side.

## Assumptions

- The email/OTP registration flow (entering name, email, receiving OTP, verifying OTP) already exists; Phase 1 only changes what happens *after* a successful OTP verification.
- The Phase 0 database schema changes (adding the `pairing_tokens` table and `device_registrations` table) are applied to the database before Phase 1 is implemented.
- Phase 1 is scoped to the **parent device only** — the child device scanning the code is covered in Phase 2.
- A parent account is always associated with exactly one family; families are created automatically during parent registration.
- The parent device is assumed to have an active internet connection when the pairing screen first loads (token generation requires a live Supabase connection). Brief connection interruptions after the screen is displayed are handled via Supabase Realtime's built-in reconnect logic (see FR-012); full offline operation of the pairing screen is out of scope.
- The human-readable text code is intended as a fallback when the child device cannot use a camera — the primary pairing mechanism is the scannable visual code.
- "Family dashboard" refers to the existing parent control screen that is already built; Phase 1 does not modify the dashboard itself.
- Parent PIN setup is deferred entirely to Phase 3 (PIN Authentication) and is out of scope for Phase 1. After a child device successfully pairs, the parent navigates directly to the family dashboard without setting a PIN.
- No maximum number of simultaneously valid pairing tokens per family is enforced in Phase 1. Each Regenerate request produces an additional valid token; all unexpired unused tokens remain valid until they expire naturally.
- Expired, unconsumed pairing tokens are retained in the database indefinitely in Phase 1. Automated token cleanup is out of scope for this phase.
- Rate-limiting of token generation requests at the API or database level is out of scope for Phase 1. FR-011's button disabled state prevents concurrent requests within a single session.

## Clarifications

### Session 2026-06-11

- Q: When does the parent set their PIN during initial registration — before the QR screen, after pairing, or deferred to Phase 3? → A: Deferred entirely to Phase 3. Phase 1 navigates the parent directly to the family dashboard after the child pairs, with no PIN setup prompt. PIN authentication is added in Phase 3.
- Q: Does Phase 1 include a way to add a second child from the parent dashboard, or is that a future phase? → A: Future phase only. Phase 1 covers first-time registration; the data model supports multiple children but no dashboard entry point is added in this phase.
- Q: What does the parent see while a new pairing code is being generated (during "Regenerate" or auto-renewal)? → A: The "Regenerate" button shows a loading indicator and is disabled; the existing codes remain fully visible until the new codes replace them atomically.
