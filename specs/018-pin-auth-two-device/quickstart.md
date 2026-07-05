# Quickstart: Integration Test Scenarios

**Spec**: 018-pin-auth-two-device | **Date**: 2026-06-12  
**Test file**: `tests/integration/pinAuth.test.ts`  
**Test runner**: `npm run test:pin-auth`

---

## Prerequisites

- Live Supabase project (env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- Migration `20260612000002_pin_auth_schema.sql` applied (`npm run migrate:pin-auth`)
- A parent profile with known email/UUID in `profiles` table (seeded by `scripts/seed-profiles.ts`)
- A child profile with known `child_id` and `family_id` (headless, no auth.users entry)

---

## Scenario A — Child PIN verify: correct PIN passes

```text
Given  @child_pin_hash = sha256('123456') stored in AsyncStorage
When   verifyPin('123456', '@child_pin_hash') is called
Then   returns true
```

---

## Scenario B — Child PIN verify: incorrect PIN fails

```text
Given  @child_pin_hash = sha256('123456') stored in AsyncStorage
When   verifyPin('654321', '@child_pin_hash') is called
Then   returns false
```

---

## Scenario C — PIN lockout after 5 failures

```text
Given  @child_pin_lockout is empty (no lockout)
When   recordPinFailure('@child_pin_lockout') is called 5 times
Then   the 5th call returns {failCount: 5, lockUntil: <now+60s>}
And    the lockUntil is approximately Date.now() + 60_000 (within 1s tolerance)
```

---

## Scenario D — Lockout clears on remote reset

```text
Given  @child_pin_lockout = {failCount: 5, lockUntil: <future>}
When   clearPinLockout('@child_pin_lockout') is called
Then   getPinLockoutState('@child_pin_lockout') returns {failCount: 0, lockUntil: null}
```

---

## Scenario E — dispatch_child_pin_reset RPC creates pending reset

```text
Given  a parent with valid auth session (using service_role key for test)
And    a child_id from usePairingStore
When   dispatchChildPinReset(childId, familyId) is called
Then   getChildPinResetStatus(childId) returns {pending: true, commandId: <uuid>}
And    the realtime_commands row has acknowledged_at = null
```

---

## Scenario F — get_pending_pin_reset RPC returns queued reset (anon)

```text
Given  a reset_child_pin command in realtime_commands with acknowledged_at = null for childId
When   getPendingPinReset(childId) is called with anon key
Then   returns {pending: true, command_id: <uuid>}
```

---

## Scenario G — acknowledge_pin_reset RPC marks complete (anon)

```text
Given  a pending reset command with known command_id for childId
When   acknowledgePinReset(commandId, childId) is called with anon key
Then   returns {success: true}
And    getChildPinResetStatus(childId) returns {pending: false}
And    the realtime_commands row has acknowledged_at IS NOT NULL
```

---

## Scenario H — second reset supersedes first (deduplication)

```text
Given  reset #1 is pending (acknowledged_at IS NULL) for childId
When   dispatchChildPinReset(childId, familyId) is called again (reset #2)
Then   reset #1 has acknowledged_at IS NOT NULL (superseded)
And    reset #2 has acknowledged_at IS NULL (latest, pending)
And    getPendingPinReset(childId) returns reset #2's command_id
```

---

## Scenario I — OTP rate limit: 4th request blocked

```text
Given  pinRecoveryManager has recorded 3 attempts for test email within 1 hour
When   sendForgotPinOtp(testEmail) is called a 4th time
Then   returns {allowed: false, reason: contains 'Too many attempts'}
And    supabase.auth.signInWithOtp is NOT called
```

---

## Scenario J — Realtime broadcast received by child (online delivery)

Note: Requires jest.setTimeout(15000) for this describe block.

```text
Given  child subscribes to family:{familyId} broadcast channel via watchForPinResetCommand
When   dispatchChildPinReset(childId, familyId) is called by parent
Then   the onReset callback is called within 3000ms with the command_id
```

---

## Cleanup

Each test that creates a `reset_child_pin` command must clean up in `afterEach`:

```typescript
await supabase
  .from('realtime_commands')
  .delete()
  .eq('child_id', TEST_CHILD_ID)
  .eq('command_type', 'reset_child_pin');
```
