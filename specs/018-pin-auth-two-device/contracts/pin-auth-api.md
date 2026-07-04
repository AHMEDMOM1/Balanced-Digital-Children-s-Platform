# Contract: PIN Authentication API

**Spec**: 018-pin-auth-two-device | **Date**: 2026-06-12

---

## `services/api/pinAuth.ts` — PIN Verification & OTP Service

### `verifyPin(pin: string, storedHashKey: '@child_pin_hash' | '@parent_pin_hash') → Promise<boolean>`

Hashes `pin` with SHA-256 (via `expo-crypto`), reads the stored hash from AsyncStorage at `storedHashKey`, returns `true` if they match.

**Preconditions**: AsyncStorage key must exist and contain a valid hex string.  
**Postconditions**: No side effects. Pure comparison.  
**Error**: Returns `false` if AsyncStorage read fails or hash is null.

---

### `recordPinFailure(lockoutKey: '@child_pin_lockout' | '@parent_pin_lockout') → Promise<PinLockoutState>`

Increments `failCount` in `PinLockoutState`. If `failCount >= 5`, sets `lockUntil = Date.now() + 60_000`. Writes updated state back to AsyncStorage.

**Returns**: Updated `PinLockoutState`.

---

### `getPinLockoutState(lockoutKey: string) → Promise<PinLockoutState>`

Reads and returns lockout state from AsyncStorage. Returns `{failCount: 0, lockUntil: null}` if no state found.

**Note**: If `lockUntil` is in the past, treats it as null (not locked).

---

### `clearPinLockout(lockoutKey: string) → Promise<void>`

Removes the lockout state from AsyncStorage. Called on successful PIN entry or on receipt of a remote reset command (FR-013).

---

### `sendForgotPinOtp(email: string) → Promise<{allowed: boolean; reason?: string}>`

1. Calls `pinRecoveryManager.attempt(email)` — if not allowed, returns `{allowed: false, reason}`.
2. Calls `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`.
3. Returns `{allowed: true}` on success, `{allowed: false, reason: 'delivery_error'}` on Supabase error.

**Preconditions**: Email must belong to an existing parent profile. `shouldCreateUser: false` prevents account enumeration.  
**Postconditions**: Rate limit counter incremented in `pinRecoveryManager`.

---

### `verifyForgotPinOtp(email: string, token: string) → Promise<{valid: boolean; session?: Session}>`

Calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`.  
Returns `{valid: true, session}` on success, `{valid: false}` on failure.

---

### `updateParentPinHash(newPin: string, email: string) → Promise<boolean>`

1. Hashes `newPin` with SHA-256.
2. Stores hash in `AsyncStorage['@parent_pin_hash']`.
3. Calls `supabase.rpc('update_parent_pin_hash', { p_email: email, p_new_hash: hash })` (fire-and-forget; failure logged as warn).
4. Clears `useSettingsStore.pinCode` (set to `''`) to complete the 4-digit → 6-digit migration.
5. Returns `true`.

---

## `services/api/childPinReset.ts` — Remote Child PIN Reset

### `dispatchChildPinReset(childId: string, familyId: string) → Promise<DispatchPinResetResult>`

Calls `supabase.rpc('dispatch_child_pin_reset', { p_child_id: childId, p_family_id: familyId, p_sender_id: currentUserId })`. On success, broadcasts `reset_child_pin` event on `family:{familyId}` channel via `broadcastCommand`. Returns `{success: true, command_id}`.

**Preconditions**: Parent must be authenticated (auth session required for INSERT).

---

### `getChildPinResetStatus(childId: string, familyId: string) → Promise<{pending: boolean; commandId?: string}>`

Queries `realtime_commands` for the latest `reset_child_pin` command where `child_id = childId` and `acknowledged_at IS NULL`. Returns `{pending: true, commandId}` or `{pending: false}`.

**Preconditions**: Parent must be authenticated.

---

### `watchChildPinResetStatus(childId: string, familyId: string, onStatusChange: (pending: boolean) => void) → () => void`

Subscribes to CDC updates on `realtime_commands` for the given child. Calls `onStatusChange(false)` when `acknowledged_at` becomes non-null. Returns an unsubscribe function.

---

### `watchForPinResetCommand(familyId: string, childId: string, onReset: (commandId: string) => void) → () => void`

Subscribes to `family:{familyId}` broadcast channel for `reset_child_pin` events. Filters events where `payload.child_id === childId`. Calls `onReset(commandId)`. Returns unsubscribe function.

**Preconditions**: No auth required. Uses anon key.

---

### `getPendingPinReset(childId: string) → Promise<PendingPinResetResult>`

Calls `supabase.rpc('get_pending_pin_reset', { p_child_id: childId })`. Returns `{pending: true, command_id}` or `{pending: false}`.

**Preconditions**: No auth required (SECURITY DEFINER RPC, callable with anon key).

---

### `acknowledgePinReset(commandId: string, childId: string) → Promise<boolean>`

Calls `supabase.rpc('acknowledge_pin_reset', { p_command_id: commandId, p_child_id: childId })`. Returns `true` on success.

**Preconditions**: No auth required (SECURITY DEFINER RPC, callable with anon key). Called by child after completing new PIN creation.

---

## Screen Contracts

### `app/auth/child-pin-entry.tsx`

**Purpose**: Returning child PIN entry (US1).  
**Shown when**: `usePairingStore.pairingState !== null && pairingState.has_pin === true && !pinVerified`.  
**On correct PIN**: Clear lockout → navigate to `/(child)`.  
**On incorrect PIN**: `recordPinFailure('@child_pin_lockout')` → show error or lockout message.  
**On lockout**: Show countdown timer. Block further input until `lockUntil` passes.

| Element | ID | Behaviour |
|---|---|---|
| 6-dot PIN display | `pinDots` | Fills as digits entered |
| Numeric keypad | `keypad` | Digits + backspace |
| Error banner | `errorBanner` | "Incorrect PIN" or "Too many attempts. Try again in Xs." |
| No "Forgot PIN" link | — | Children have no self-service recovery |

---

### `app/auth/parent-pin-entry.tsx`

**Purpose**: Returning parent PIN entry (US2).  
**Shown when**: `@parent_pin_hash` exists and parent has not yet verified this session.  
**On correct PIN**: Clear lockout → navigate to `/(parent)`.  
**On incorrect PIN**: `recordPinFailure('@parent_pin_lockout')` → show error.  
**On lockout (5 failures)**: Show 1-minute countdown.  
**"Forgot PIN" link**: Navigates to `app/auth/forgot-pin.tsx`.

| Element | ID | Behaviour |
|---|---|---|
| 6-dot PIN display | `pinDots` | |
| Numeric keypad | `keypad` | |
| Error banner | `errorBanner` | |
| Forgot PIN link | `forgotPinLink` | navigates to `/auth/forgot-pin` |

---

### `app/auth/forgot-pin.tsx`

**Purpose**: Parent forgot PIN email OTP reset (US3).  
**Flow**: email entry → OTP entry → new PIN creation → `/(parent)`.

**Step 1 — Email entry**:
- TextInput for email
- Submit button calls `sendForgotPinOtp(email)`
- On rate-limited: show reason message
- On success: advance to OTP entry step

**Step 2 — OTP entry**:
- 6-digit TextInput (numeric)
- Timer showing 10-minute expiry countdown
- Submit button calls `verifyForgotPinOtp(email, token)`
- On failure: show error; track attempts locally (3 max, after which re-send required)
- On success: advance to new PIN creation

**Step 3 — New PIN creation**:
- 6-dot PIN entry (same pattern as `child-setup-pin.tsx`)
- Two-step enter + confirm
- On match: `updateParentPinHash(newPin, email)` → navigate to `/(parent)`, show success

---

### `components/ui/ChildPinResetListener.tsx`

**Purpose**: Side-effect component; returns null. Mounted in `app/(child)/_layout.tsx`.  
**Behaviour**:
1. Reads `pairingState` from `usePairingStore`.
2. If `pairingState` is null: no-op.
3. Subscribes to `family:{familyId}` broadcast for `reset_child_pin` events (filtered by `childId`).
4. On mount/reconnect: calls `getPendingPinReset(childId)`; if pending → navigate to `child-setup-pin` + clear lockout.
5. On receiving broadcast event: navigate to `child-setup-pin` + clear lockout.
6. On `child-setup-pin` completion (`usePairingStore.has_pin` changes to true): calls `acknowledgePinReset(commandId, childId)`.
