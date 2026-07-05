# Feature Specification: Child Device QR Scan & Pairing

**Feature Branch**: `017-child-qr-scan`

**Created**: 2026-06-11

**Status**: Draft

**Input**: TwoDevicePlan.md — Phase 2 (Child Device: QR Scan & PIN Creation)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Child Pairs with Parent via QR Code (Priority: P1)

A child (or a parent setting up the child's device) opens the app on the child device for the first time. The app shows a "Link to Parent" screen. They point the camera at the QR code displayed on the parent's device, the code is scanned, a child profile is created, and the child creates a PIN before entering the child interface.

**Why this priority**: This is the entire purpose of Phase 2. Without a child device successfully consuming the pairing token, the two-device architecture cannot function at all. All other user stories depend on this one completing first.

**Independent Test**: Can be tested end-to-end using a real parent QR screen (Phase 1) and a child device: open the child app → see "Link to Parent" screen → scan QR → confirm child profile is created and PIN creation screen appears.

**Acceptance Scenarios**:

1. **Given** a child device that has never been paired, **When** the child app is opened, **Then** the app displays a "Link to Parent" screen with a QR scan option and a "Enter code manually" fallback — not the child play interface.
2. **Given** the child is on the "Link to Parent" screen with the camera active, **When** the parent's valid (unexpired, unused) QR code is scanned, **Then** the system validates the token, creates the child profile, and navigates to the PIN creation screen within 5 seconds.
3. **Given** the child has set a PIN after pairing, **When** the child app is opened again on the same device, **Then** only the PIN entry screen is shown — the QR scan screen is never shown again.

---

### User Story 2 - Child Pairs Using Manual Code Entry (Priority: P1)

When the child device's camera is unavailable, broken, or the parent prefers not to use the camera, the child can type the 6-digit code shown below the QR on the parent's screen to complete the same pairing.

**Why this priority**: The manual fallback is required to make Phase 2 viable on devices with no working camera or in environments where QR scanning is impractical. It shares identical server-side logic with QR scanning, making it a necessary part of the same delivery.

**Independent Test**: Can be tested by tapping "Enter code manually" on the child device, typing the code displayed on the parent's QR screen, and confirming the same pairing and PIN creation flow results.

**Acceptance Scenarios**:

1. **Given** the child is on the "Link to Parent" screen, **When** they tap "Enter code manually", **Then** a text input appears accepting the 6-digit code.
2. **Given** the child has entered a valid 6-digit code, **When** they submit it, **Then** the pairing proceeds identically to a QR scan — child profile created, PIN creation screen shown.
3. **Given** the child enters a code that is expired or already used, **When** they submit it, **Then** an error is displayed explaining the code is invalid and asking them to request a new one from the parent.

---

### User Story 3 - Parent Dashboard Appears Automatically When Child Pairs (Priority: P2)

The parent is waiting on the QR pairing screen while the child completes pairing on the child device. The moment the child's token is consumed, the parent's screen automatically transitions to the family dashboard — no manual refresh needed.

**Why this priority**: This automatic transition (implemented in Phase 1's `watchForChildPaired`) is fully triggered by the child-side token consumption implemented in this phase. It is P2 because the parent can manually navigate away if the notification does not arrive, but the experience is significantly better with it working.

**Independent Test**: Can be tested end-to-end: parent waits on QR screen, child completes pairing, confirm parent dashboard appears within 5 seconds without parent doing anything.

**Acceptance Scenarios**:

1. **Given** the parent is waiting on the QR pairing screen and the child successfully consumes the token, **When** the child's profile is created and token is marked used, **Then** the parent device automatically navigates to the family dashboard within 5 seconds.

---

### Edge Cases

- What happens when the child scans a QR code after the 10-minute expiry window? → Server rejects the token; child sees an error prompting the parent to regenerate the code.
- What happens when the child scans a code that was already consumed by another device? → Server rejects the token; child sees an error indicating the code has already been used.
- What happens if the network request to consume the token fails after the QR is scanned (e.g., connection drops mid-request)? → No partial state is created; the token remains unconsumed and the child can try again.
- What happens when the child device's clock is significantly wrong and the local expiry check gives a false result? → The server-side expiry check is always the final authority; the local check is advisory only.
- What happens if PIN creation fails (e.g., the app is closed mid-setup)? → The child profile already exists and the token is consumed; on re-opening the app the child should be taken back to PIN creation, not the QR scan screen.
- What happens when a parent has already paired one child device and a second child scans the same (already-used) token? → Rejected by server. Parent must regenerate a new code for the second child.

## Requirements *(mandatory)*

### Functional Requirements

**Token Consumption**

- **FR-001**: When a child device submits a pairing token (via QR or manual code), the system MUST validate server-side that the token: (a) exists, (b) has not been previously consumed, and (c) has not expired. The child device MUST be able to initiate this operation without a pre-existing account or authenticated session — the pairing token itself is sufficient one-time authorization for the consumption call.
- **FR-002**: Upon successful validation, the system MUST create a child profile linked to the parent's family account. No user-visible data entry is required during pairing — the profile is created with the minimum data needed for family linkage only. The parent adds any additional profile details (name, age group, etc.) separately after pairing.
- **FR-003**: Token consumption and child profile creation MUST be atomic — the token is never marked as used without a corresponding child profile, and a child profile is never created without the token being marked as used.
- **FR-004**: The system MUST reject consumed tokens with an error indicating the code has already been used.
- **FR-005**: The system MUST reject expired tokens with an error indicating the code has expired.
- **FR-006**: Server-side expiry validation MUST be the definitive authority regardless of the child device's local clock.

**QR Code Scanning**

- **FR-007**: The child device MUST allow the user to scan the QR code displayed on the parent's pairing screen using the device camera.
- **FR-008**: The child device MUST parse and validate the QR payload structure (token identifier, family identifier, expiry timestamp) before submitting to the server.
- **FR-009**: If the QR payload's embedded expiry timestamp indicates the code is locally expired, the child device SHOULD display an advisory error without making a server request, prompting the parent to regenerate.

**Manual Code Entry**

- **FR-010**: The child device MUST offer a "Enter code manually" option as a fallback to QR scanning on the same pairing screen.
- **FR-011**: The manual entry input MUST accept the 6-digit pairing code shown on the parent's screen (formatted as `XXX-XXX` or plain 6 digits — both accepted).
- **FR-012**: Manual code submission MUST use the same server-side validation and profile creation path as QR scanning, producing identical outcomes for valid codes.

**PIN Creation**

- **FR-013**: After a token is successfully consumed and the child profile created, the child device MUST display a PIN creation screen before proceeding to the child interface.
- **FR-014**: The child MUST enter a 6-digit PIN and confirm it by entering it a second time; mismatched entries MUST be rejected with a clear message.
- **FR-015**: The PIN MUST be stored in a hashed form on the child device locally so that subsequent logins work without an internet connection.
- **FR-016**: The PIN hash MUST also be saved to the child's profile in the cloud database, enabling a parent to remotely reset the PIN from the parent dashboard in a future phase. A cloud sync failure MUST NOT prevent the child from completing setup — if the sync cannot be completed immediately, the system MUST proceed with local-only PIN storage and retry the sync in the background without blocking the user.
- **FR-017**: The child interface MUST NOT be accessible until PIN creation is successfully completed.

**Subsequent Device Behaviour**

- **FR-018**: After pairing is complete, the child device MUST store its paired status and device identity locally so that on subsequent app opens the correct screen (PIN entry, not QR scan) is shown immediately — without a network request.
- **FR-019**: The stored pairing state MUST persist across app restarts and device reboots.

**Parent Notification Trigger**

- **FR-020**: When the child device's token consumption succeeds (child profile created, token marked used), the change MUST be observable by the parent's active QR pairing screen via the existing real-time notification mechanism, triggering automatic navigation to the family dashboard.

### Key Entities

- **Pairing Token**: A single-use, time-limited invitation (already created in Phase 1). Contains a unique token identifier, the family identifier, creation and expiry timestamps, and a consumed flag that this phase sets.
- **Child Profile**: A new user profile record created during this phase. Linked to the parent's family, assigned the child role, and associated with the consuming device.
- **Pairing State**: Device-local record storing the outcome of a successful pairing: device role, family identifier, and child profile identifier. Used on subsequent opens to bypass the QR scan screen.
- **Child PIN**: A 6-digit code set by or for the child during pairing setup. Stored hashed locally and synced to the cloud.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A child completes the full first-time pairing flow (scan QR → create PIN → enter child interface) in under 3 minutes from first app open.
- **SC-002**: Token validation and child profile creation complete within 5 seconds of the QR code being scanned or the manual code being submitted.
- **SC-003**: Zero pairing tokens are consumed more than once — any second attempt returns a rejection error with no partial state created.
- **SC-004**: Zero expired tokens are accepted by the server — server-side expiry is always enforced regardless of client clock.
- **SC-005**: Manual code entry produces identical pairing outcomes to QR scanning for all valid codes.
- **SC-006**: After pairing, the child PIN entry works offline (no internet required to verify PIN on subsequent logins).
- **SC-007**: The parent dashboard appears automatically within 5 seconds of the child's pairing request completing, when both devices have active internet connections.

## Assumptions

- The Phase 1 (Parent QR Pairing — spec 016) is fully implemented and deployed: the parent device can generate, display, and regenerate a QR code with a valid pairing token before this phase is exercised.
- The Phase 0 database migration (pairing_tokens table, device_registrations table, profiles.pin_hash column) is already applied.
- The child device has access to its device camera for QR scanning; the manual code fallback covers cases where the camera is unavailable.
- The child play interface (the screen shown after PIN creation) already exists and is navigable.
- A child device is always a separate physical device from the parent device — the same physical device does not operate in both roles after pairing.
- One parent account may pair with multiple child devices over time; each child device pairing is independent and creates a separate child profile.
- The child PIN is 6 digits (consistent with TwoDevicePlan.md Part A, Improvement 4).
- The pairing state (device role, family_id, child_id) is stored locally on the child device only — it does not need to be synced elsewhere.
- PIN reset by a parent remotely is out of scope for Phase 2; it will be addressed in Phase 3 (PIN Authentication).
- The child profile is created with minimum data only (family link and role); no name, age group, or other profile details are collected during pairing. The parent adds these from the parent dashboard after pairing is complete.

## Clarifications

### Session 2026-06-11

- Q: Should the child device's first-open flow show a general "Start Playing" button (as in the current single-device app) before redirecting unpaired devices to the QR scan screen, or should unpaired child devices go directly to the pairing screen? → A: Check the locally stored pairing state on app open. If unpaired: show the "Link to Parent" (QR scan) screen directly. The "Start Playing" button is only shown to already-paired child devices proceeding to PIN entry.
- Q: Should the token consumption endpoint be a direct Supabase database call with RLS, a Supabase Edge Function, or a REST endpoint? → A: Direct Supabase database call following the existing API Hook Pattern (services/api/pairing.ts). RLS policies enforced at the database level. No Edge Function needed for Phase 2.
- Q: What PIN length should the child device use — 4 digits (current app) or 6 digits (TwoDevicePlan.md recommendation)? → A: 6 digits, per TwoDevicePlan.md Part A Improvement 4. The existing 4-digit PIN in the single-device flow will be updated in Phase 3.
- Q: How does the child device authenticate when consuming the pairing token, given that it has no existing account at that point? → A: No prior authentication is required. The pairing token itself acts as a single-use credential — the child device presents only the token to initiate consumption. A server-side atomic operation validates the token, creates the child profile, and marks the token used in a single indivisible step, with the token UUID providing sufficient authorization for this one-time call.
- Q: Should the child device collect any profile information (name, age group) during the pairing flow, or is the child profile auto-created with no user-visible data entry? → A: Auto-create with no data entry. The profile is created with the minimum data required for family linkage only (family identifier and role). The parent adds name, age group, and other details from the parent dashboard after pairing.
- Q: If saving the child's PIN hash to the cloud database fails (e.g., network drops after token consumption), should the child be blocked from entering the child interface? → A: No — the child MUST NOT be blocked. Proceed with local-only PIN storage and retry the cloud sync in the background. The local PIN hash is sufficient for day-to-day use; cloud sync is required only for remote PIN reset, which is a future phase.
