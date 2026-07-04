# Data Model: PIN Authentication on Two Devices

**Spec**: 018-pin-auth-two-device | **Date**: 2026-06-12

## Existing Entities (Extended)

### profiles (existing table, extended)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| role | TEXT | 'parent' \| 'child' |
| pin_hash | TEXT | SHA-256 hex of 6-digit PIN. Written by spec 016 (child setup) and spec 018 (parent upgrade + forgot-PIN reset). NULL until PIN is set. |
| pin_length | INT | Default 6. Set when pin_hash is written. |
| unlock_pin_hash | TEXT | Legacy column from Phase 3 resilience spec. Still written by `reset_parent_pin` RPC for backward compat. New code uses `pin_hash`. |

**New parent behaviour**: After spec 018 is deployed, the parent's PIN creation writes a SHA-256 hash to both AsyncStorage `@parent_pin_hash` and `profiles.pin_hash`. Previously `useSettingsStore.pinCode` stored the plaintext.

---

### realtime_commands (existing table, extended)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| family_id | UUID | |
| sender_id | UUID FK → auth.users.id | Parent's auth user ID |
| child_id | UUID | Target child profile ID |
| command_type | TEXT | CHECK constraint extended to include `'reset_child_pin'` |
| payload | JSONB | For `reset_child_pin`: `{}` (no additional payload needed) |
| acknowledged_at | TIMESTAMPTZ | NULL = pending. Set by `acknowledge_pin_reset` RPC after child completes new PIN creation. |
| created_at | TIMESTAMPTZ | |

**State transitions for `reset_child_pin` commands**:
```
dispatched → pending (acknowledged_at IS NULL)
child completes new PIN → complete (acknowledged_at IS NOT NULL)
```

**Deduplication invariant**: When a new `reset_child_pin` command is inserted for `(family_id, child_id)`, any prior unacknowledged commands for the same child are marked acknowledged (superseded) by the `dispatch_child_pin_reset` SECURITY DEFINER function. This enforces FR-011 (latest-only delivery).

---

## Local Storage (AsyncStorage — per device)

### Child Device

| Key | Type | Contents |
|-----|------|---------|
| `@child_pairing_state` | JSON | `ChildPairingState` from spec 017: `{child_id, family_id, parent_id, paired_at, has_pin}` |
| `@child_pin_hash` | string | SHA-256 hex of 6-digit child PIN. Written on PIN creation/reset. |
| `@child_pin_lockout` | JSON | `{failCount: number, lockUntil: number \| null}`. Reset on correct PIN or remote reset. |

### Parent Device

| Key | Type | Contents |
|-----|------|---------|
| `@parent_settings` | JSON | Existing settings store (dailyTimeLimitMinutes, etc., `pinCode`, `isPinSetup`). `pinCode` is cleared after migration; `isPinSetup` remains the source of truth for whether parent has completed setup. |
| `@parent_pin_hash` | string | SHA-256 hex of 6-digit parent PIN. Replaces plaintext `pinCode`. Written on PIN setup or forgot-PIN reset. |
| `@parent_pin_lockout` | JSON | `{failCount: number, lockUntil: number \| null}`. Reset on correct PIN entry. |

---

## New SECURITY DEFINER RPCs (migration: `20260612000002_pin_auth_schema.sql`)

### `dispatch_child_pin_reset(p_family_id UUID, p_child_id UUID, p_sender_id UUID) → json`

Inserts a new `reset_child_pin` row in `realtime_commands`, marks any prior unacknowledged resets for the same child as superseded (`acknowledged_at = now()`, payload `{superseded: true}`), and returns `{command_id: TEXT}`.

Callable by: authenticated parent (via anon/service key since SECURITY DEFINER) — but in practice called by the parent's authenticated Supabase client which has a valid `sender_id`.

### `get_pending_pin_reset(p_child_id UUID) → json`

Returns the most recently created unacknowledged `reset_child_pin` command for the given child, or `{pending: false}` if none. Used by the child device on reconnect to check for queued resets.

Callable by: anon (no auth session required — child device uses anon key).

### `acknowledge_pin_reset(p_command_id UUID, p_child_id UUID) → json`

Sets `acknowledged_at = now()` on the specified command, verifying that `child_id` matches to prevent spoofing. Returns `{success: true}` or `{success: false, error: TEXT}`.

Callable by: anon (no auth session required).

### `update_parent_pin_hash(p_email TEXT, p_new_hash TEXT) → void`

Updates `profiles.pin_hash` for the parent with the given email. SECURITY DEFINER so it can be called after OTP verification when the parent has an active auth session. Also updates `unlock_pin_hash` for backward compat.

Callable by: authenticated user (called after Supabase OTP `verifyOtp` establishes a session).

---

## TypeScript Types (additions to `services/api/types.ts`)

```typescript
export interface ParentPinState {
  has_pin: boolean;
  pin_hash: string | null; // from AsyncStorage @parent_pin_hash
}

export interface PinLockoutState {
  failCount: number;
  lockUntil: number | null; // Unix ms timestamp
}

export interface ChildPinResetCommand {
  command_id: string;
  child_id: string;
  created_at: string;
}

export interface DispatchPinResetResult {
  success: boolean;
  command_id?: string;
  error?: string;
}

export interface PendingPinResetResult {
  pending: boolean;
  command_id?: string;
}
```
