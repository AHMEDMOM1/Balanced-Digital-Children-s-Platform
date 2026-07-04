# Quickstart & Integration Scenarios: Child Device QR Scan & Pairing

**Spec**: 017-child-qr-scan | **Date**: 2026-06-12

---

## Prerequisites

1. `.env` file with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
2. Phase 1 migration already applied: `npm run migrate:two-device` (pairing_tokens, device_registrations, profiles.pin_hash)
3. Phase 2 migration applied: `npm run migrate:child-pairing` (consume_pairing_token + consume_pairing_token_by_code RPCs)

---

## Step 0 — Apply the Phase 2 Migration

```bash
npm run migrate:child-pairing
```

Verify:
- Function `consume_pairing_token(UUID, UUID)` exists in `pg_proc`
- Function `consume_pairing_token_by_code(TEXT)` exists in `pg_proc`
- `anon` role has `EXECUTE` permission on both functions

---

## Step 1 — Unit Tests (no credentials needed)

```bash
npm run test:child-pairing-unit
# runs: tests/unit/childPairingToken.test.ts
```

Confirms:
- `parseQrPayload` parses valid JSON and rejects malformed input
- `isTokenExpired` correctly compares `expires_at` to current time
- `parseManualCode` strips hyphens and validates 6-digit constraint

---

## Step 2 — Integration Tests (credentials required)

```bash
npm run test:child-pairing
# runs: tests/integration/childPairing.test.ts
```

Confirms (in order):
1. Valid UUID token consumed → `success: true`, `child_id` is a UUID, token `used_at` is set
2. Second call with same token → `invalid_token` error (double-consume blocked)
3. Expired token → `invalid_token` error (server-side expiry enforced)
4. Wrong `family_id` → `invalid_token` error (cross-family blocked)
5. Manual code path → identical success result to UUID path
6. `watchForChildPaired` callback fires when token consumed (US3 acceptance test)
7. Atomicity: invalid token → no profile row inserted

---

## Step 3 — Manual On-Device Verification

1. Launch the app on a child device / simulator (one that has no pairing state in AsyncStorage).
2. Confirm the app routes directly to the "Link to Parent" screen (child-scan), not `app/index.tsx`.
3. On a parent device/simulator, navigate to the QR pairing screen and display a valid QR.
4. Child device: tap camera view, scan the QR → confirm "Creating account" indicator → confirm navigation to child-setup-pin.
5. Set a 6-digit PIN and confirm → confirm navigation to `/(child)`.
6. Reopen the app → confirm the normal index screen appears (not child-scan).
7. On the parent device: confirm automatic navigation to parent dashboard (Phase 1 Realtime).

---

## Integration Test Scenarios (for `tests/integration/childPairing.test.ts`)

### Scenario A — Happy path: valid UUID token

```typescript
// Setup: create a fresh pairing token
const { token: pt } = await generatePairingToken(TEST_FAMILY_ID, serviceClient);

// Act: consume it via anon key
const result = await consumePairingToken(pt!.token, TEST_FAMILY_ID, anonClient);

expect(result.success).toBe(true);
expect(result.child_id).toMatch(/^[0-9a-f-]{36}$/);
expect(result.error).toBeNull();

// Verify token is marked used in DB
const { data } = await serviceClient.from('pairing_tokens').select('used_at,child_id').eq('id', pt!.id).single();
expect(data!.used_at).not.toBeNull();
expect(data!.child_id).toBe(result.child_id);
```

### Scenario B — Double-consume rejected

```typescript
const result2 = await consumePairingToken(pt!.token, TEST_FAMILY_ID, anonClient);
expect(result2.success).toBe(false);
expect(result2.error).toBe('invalid_token');
```

### Scenario C — Expired token rejected

```typescript
const pastExpiry = new Date(Date.now() - 1000).toISOString();
const { data: expiredToken } = await serviceClient
  .from('pairing_tokens')
  .insert({ family_id: TEST_FAMILY_ID, expires_at: pastExpiry })
  .select().single();

const result = await consumePairingToken(expiredToken!.token, TEST_FAMILY_ID, anonClient);
expect(result.success).toBe(false);
expect(result.error).toBe('invalid_token');
```

### Scenario D — Wrong family_id rejected

```typescript
const result = await consumePairingToken(freshToken.token, OTHER_FAMILY_ID, anonClient);
expect(result.success).toBe(false);
expect(result.error).toBe('invalid_token');
```

### Scenario E — Manual code path

```typescript
const result = await consumePairingTokenByCode(freshToken.manual_code, anonClient);
expect(result.success).toBe(true);
expect(result.family_id).toBe(TEST_FAMILY_ID);
```

### Scenario F [US3] — Realtime: parent notified on child consumption

```typescript
let receivedChildId: string | null = null;
const unsub = watchForChildPaired(TEST_FAMILY_ID, (childId) => {
  receivedChildId = childId;
}, serviceClient);

const freshToken = /* generate new token */;
await consumePairingToken(freshToken.token, TEST_FAMILY_ID, anonClient);

// Wait for Realtime CDC delivery (up to 5 seconds)
await new Promise(resolve => setTimeout(resolve, 5000));

expect(receivedChildId).not.toBeNull();
unsub();
```

### Scenario G — Atomicity: invalid token leaves no profile row

```typescript
// Capture count BEFORE the bogus call (Scenario A may have already created a child profile)
const { count: countBefore } = await serviceClient
  .from('profiles')
  .select('id', { count: 'exact', head: true })
  .eq('family_id', TEST_FAMILY_ID)
  .eq('role', 'child');

const bogusToken = '00000000-0000-0000-0000-000000000000';
await consumePairingToken(bogusToken, TEST_FAMILY_ID, anonClient);

// Capture count AFTER — must be unchanged
const { count: countAfter } = await serviceClient
  .from('profiles')
  .select('id', { count: 'exact', head: true })
  .eq('family_id', TEST_FAMILY_ID)
  .eq('role', 'child');

expect(countAfter).toBe(countBefore);
```
