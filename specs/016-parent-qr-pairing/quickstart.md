# Quickstart & Integration Scenarios: Parent QR Pairing

**Spec**: 016-parent-qr-pairing | **Date**: 2026-06-11

---

## Prerequisites

1. `.env` file with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
2. Phase 0 migration applied: `npm run migrate:two-device`
3. A test parent user account in Supabase Auth with `app_metadata: { role: 'parent' }` (or use the service-role client for setup in integration tests)

---

## Step 0 — Apply the Migration

```bash
npm run migrate:two-device
```

Verify:
- `pairing_tokens` table exists in Supabase
- `device_registrations` table exists
- `profiles.pin_hash` column exists
- RLS policies `parent_read_pairing_tokens` and `parent_write_pairing_tokens` appear in `pg_policies`

---

## Step 1 — Unit Tests (no credentials needed)

```bash
npm run test:pairing-unit
# runs: tests/unit/pairingToken.test.ts
```

Confirms:
- `displayCode` formatting (6 digits → `XXX-XXX`)
- `PairingToken` / `PairingResult` type shapes

---

## Step 2 — Integration Tests (credentials required)

```bash
npm run test:pairing
# runs: tests/integration/pairing.test.ts
```

Confirms (in order):
1. `generatePairingToken` inserts a row with `used_at = null` and `expires_at ≈ now() + 10 min`
2. Two calls return different `token` UUIDs
3. Returned `manual_code` is exactly 6 digits; `displayCode` matches `XXX-XXX` pattern
4. Parent can SELECT their own family's tokens (RLS allows)
5. Parent cannot SELECT a different family's tokens (RLS blocks — test uses service-role to insert a token for a different family_id)
6. Unauthenticated client cannot INSERT `pairing_tokens` (RLS blocks)
7. `watchForChildPaired` returns a function; calling it does not throw (subscription cleanup)

---

## Step 3 — Manual On-Device Verification

1. Launch the app on a parent device / simulator.
2. Navigate to the registration screen and complete the email + OTP flow.
3. Confirm the QR pairing screen appears (not the setup-pin screen).
4. Confirm the QR code and `XXX-XXX` manual code are displayed.
5. Confirm the countdown timer counts down from 10:00.
6. Tap "Regenerate" — confirm the button shows a loading spinner, old codes remain visible, and new codes appear within 2 seconds with timer reset.
7. Wait for the timer to reach 0:00 — confirm auto-regeneration occurs.

---

## Integration Test Scenarios (for `tests/integration/pairing.test.ts`)

### Scenario A — Happy path: generate token

```typescript
const { token, displayCode, error } = await generatePairingToken(testFamilyId, serviceClient);
expect(error).toBeNull();
expect(token).not.toBeNull();
expect(token!.used_at).toBeNull();
expect(displayCode).toMatch(/^\d{3}-\d{3}$/);
const expiresIn = new Date(token!.expires_at).getTime() - Date.now();
expect(expiresIn).toBeGreaterThan(9 * 60 * 1000);   // > 9 minutes
expect(expiresIn).toBeLessThan(11 * 60 * 1000);     // < 11 minutes
```

### Scenario B — Token uniqueness

```typescript
const r1 = await generatePairingToken(testFamilyId, serviceClient);
const r2 = await generatePairingToken(testFamilyId, serviceClient);
expect(r1.token!.token).not.toBe(r2.token!.token);
expect(r1.token!.manual_code).not.toBe(r2.token!.manual_code);
```

### Scenario C — RLS: cross-family isolation

```typescript
// Insert a token for a different family using service role
const otherFamilyId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
await serviceClient.from('pairing_tokens').insert({ family_id: otherFamilyId, manual_code: '999999' });

// Parent client (authenticated as testParent) cannot see it
const { data } = await parentClient.from('pairing_tokens')
  .select('id').eq('family_id', otherFamilyId);
expect(data).toHaveLength(0);
```

### Scenario D — Unauthenticated INSERT blocked

```typescript
const anonClient = createClient(url, anonKey);
const { error } = await anonClient.from('pairing_tokens')
  .insert({ family_id: testFamilyId, manual_code: '123456' });
expect(error).not.toBeNull();
```

### Scenario E — Subscription lifecycle (no DB credentials for callback test)

```typescript
const unsub = watchForChildPaired(testFamilyId, jest.fn(), serviceClient);
expect(typeof unsub).toBe('function');
expect(() => unsub()).not.toThrow();
```
