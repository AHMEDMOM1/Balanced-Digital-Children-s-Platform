# Research: PIN Authentication on Two Devices

**Spec**: 018-pin-auth-two-device | **Date**: 2026-06-12

## Decision 1 — Parent PIN Storage Migration

**Decision**: Migrate parent PIN from 4-digit plaintext to 6-digit SHA-256 hash stored in AsyncStorage key `@parent_pin_hash`.

**Rationale**: `useSettingsStore.pinCode` stores a plaintext 4-digit string used by `PinModal` for direct string comparison. The spec requires 6-digit PINs on both devices, offline verification via local hash, and cloud sync. Storing plaintext violates the hash-only-locally principle and makes the 4→6 upgrade impossible without a reset.

**Migration path**: On app open, if `useSettingsStore.isPinSetup === true` but `AsyncStorage['@parent_pin_hash']` is absent → the parent has an old 4-digit PIN. Redirect to `setup-pin.tsx` (now upgraded to 6 digits) to re-set. This is a one-time forced re-setup; the old PIN is abandoned since we cannot upgrade 4-digit plaintext to a valid 6-digit hash.

**Cloud column**: `profiles.pin_hash` (TEXT, already present from spec 016 two-device migration). The existing `profiles.unlock_pin_hash` column is legacy from the Phase 3 resilience spec; new code writes to `pin_hash`. The `reset_parent_pin` RPC (already deployed) writes to `unlock_pin_hash` — a new RPC `update_parent_pin_hash` will write to `pin_hash`.

**Alternatives considered**:
- Keep 4-digit plaintext: Rejected — spec requires 6 digits and hash-based offline verification.
- Store hash inside `useSettingsStore`: Rejected — mixing PIN security state with content preferences in one store is a poor separation of concerns.

---

## Decision 2 — Child Offline Reset Delivery

**Decision**: Use a new SECURITY DEFINER RPC pair (`get_pending_pin_reset`, `acknowledge_pin_reset`) for offline delivery of the remote PIN reset command to headless child devices.

**Rationale**: Headless child profiles have no `auth.users` entry, so they cannot access RLS-protected tables. The existing `realtime_commands` table requires `sender_id REFERENCES auth.users(id)` and its policies check `auth.uid()`, which is null for the anon client. SECURITY DEFINER RPCs bypass RLS and run as the defining role (postgres/service_role), allowing the child to read/acknowledge their pending reset command by presenting only their `child_id` (trusted from local pairing state).

**Online delivery**: Supabase Broadcast channel `family:{familyId}` does not require authentication — the anon key can subscribe and receive broadcast events. The parent broadcasts a `reset_child_pin` event on this channel simultaneously with inserting the DB record.

**Deduplication**: FR-011 requires only the latest reset command to apply. `get_pending_pin_reset` returns the most recently created unacknowledged reset for the given `child_id`. Any earlier unacknowledged resets for the same child are marked acknowledged (superseded) when a newer one is created.

**Alternatives considered**:
- Extend existing `realtime_commands` table with an anon SELECT policy: Rejected — the table's `sender_id REFERENCES auth.users(id)` FK prevents inserting without a valid auth.users row for the sender. The parent is authenticated so INSERT works; the child SELECT is the problem. A policy `USING (child_id = current_setting('request.jwt.claims.sub')::uuid)` would work for authenticated users but not anon. A `FOR SELECT TO anon USING (true)` would expose all family commands to any anonymous client — unacceptable.
- Create a separate `child_pin_resets` table with anon access: Same issues around proving identity. The SECURITY DEFINER RPC approach is cleaner because the child_id is the "credential" — weak but acceptable for a local family-trust model where the pairing itself established trust.

---

## Decision 3 — Background Lock Mechanism

**Decision**: Use React Native `AppState` API in both `app/(child)/_layout.tsx` and `app/(parent)/_layout.tsx`. Record `backgroundAt` timestamp when entering background; on `active` event, if elapsed ≥ 300,000ms (5 minutes), navigate to PIN entry.

**Rationale**: `AppState` is the standard React Native API for tracking foreground/background transitions. A ref (not state) is used for `backgroundAt` to avoid re-renders. The 5-minute threshold is hardcoded per spec (no configuration needed per YAGNI).

**Navigation on lock**: Child → `router.replace('/auth/child-pin-entry')`. Parent → `router.replace('/auth/parent-pin-entry')`. Both use `replace` so the lock screen is not in the back stack.

**Alternatives considered**:
- `useEffect` with `Date.now()` polling: Rejected — wasteful battery usage and inaccurate.
- `expo-app-state`: Not needed; React Native's built-in `AppState` is sufficient.

---

## Decision 4 — Forgot PIN OTP Flow

**Decision**: Use Supabase Auth's built-in `supabase.auth.signInWithOtp({ email })` and `supabase.auth.verifyOtp({ email, token, type: 'email' })` for the email OTP flow.

**Rationale**: Supabase's native OTP sends a 6-digit code (matching the "one-time code" description in the spec), handles expiry (10 min by default), and manages delivery via the configured email provider. After `verifyOtp` succeeds, the parent has an active Supabase auth session — allowing direct update of `profiles.pin_hash` without a special RPC.

**Rate limiting**: `pinRecoveryManager.attempt(email)` (already implemented, 3 per hour per email, stored in SQLite resilience_logs) is called before `signInWithOtp`. If rate limited, the OTP is never sent.

**After reset**: Parent's new 6-digit PIN hash is stored in `@parent_pin_hash` (AsyncStorage) and synced to `profiles.pin_hash`. The `useSettingsStore.pinCode` plaintext field is cleared (set to empty string) and `isPinSetup` remains true.

**Alternatives considered**:
- Custom token + email Edge Function: Rejected — adds infrastructure complexity when Supabase Auth handles this natively.
- Magic link (passwordless login): Rejected — a numeric OTP code is less confusing than a deep-link URL on mobile, and the spec says "one-time code."

---

## Decision 5 — "Reset Child PIN" Pending Status (FR-015)

**Decision**: Parent inserts a `reset_child_pin` record into `realtime_commands`; `acknowledged_at IS NULL` means pending. The child sets `acknowledged_at` by calling `acknowledge_pin_reset` RPC only AFTER completing new PIN creation. The parent dashboard queries `realtime_commands` for the latest reset command for the child to determine pending/complete status.

**Rationale**: Using the existing `realtime_commands` table (parent INSERT is allowed via authenticated session) keeps the architecture consistent. Tying acknowledgement to PIN creation completion (not command receipt) matches the clarified spec requirement (US4 AS5, Clarification 2026-06-12).

**New command_type value**: `reset_child_pin` added to the CHECK constraint via migration.

---

## Decision 6 — Child PIN Reset Listener Component

**Decision**: Create `components/ui/ChildPinResetListener.tsx` — a side-effect-only component (returns null) that subscribes to the family broadcast channel using `usePairingStore` (not `useAuthStore`). Mount it inside `app/(child)/_layout.tsx`.

**Rationale**: `RealtimeProvider` relies on `useAuthStore.role` and `useAuthStore.parentData/childData` which are empty for headless child devices. A dedicated lightweight component that reads `usePairingStore.pairingState.family_id` and `child_id` is simpler than extending `RealtimeProvider` to handle both auth models.

**Offline check**: On mount (after the channel subscribes), the component calls `get_pending_pin_reset(child_id)`. If a pending reset exists, it immediately navigates to `child-setup-pin`.

---

## Existing Infrastructure Reused

- `services/resilience/pinRecoveryManager.ts` — `attempt(email)` for OTP rate limiting (3/hour). No other methods are used; the security-question flow is superseded by Supabase native OTP.
- `services/realtime/familyChannel.ts` — `subscribeFamilyChannel()` reused by `ChildPinResetListener`.
- `store/usePairingStore.ts` — `pairingState.family_id`, `child_id`, and `savePinHash()` reused.
- `app/auth/child-setup-pin.tsx` — reused as the PIN creation screen after remote reset (no changes needed).
- `profiles.pin_hash` column — already added by spec 016 migration.
- `reset_parent_pin` RPC — already deployed (writes to `unlock_pin_hash`). A new `update_parent_pin_hash` RPC writes to `pin_hash`. Both are called during forgot-PIN reset.

---

## Open Questions (Deferred to Implementation)

- **`unlock_pin_hash` vs `pin_hash` long-term**: Legacy `unlock_pin_hash` column will eventually be dropped. For spec 018, both are written during parent PIN reset to maintain backward compatibility with any existing integrations. A separate migration to drop `unlock_pin_hash` is out of spec 018 scope.
