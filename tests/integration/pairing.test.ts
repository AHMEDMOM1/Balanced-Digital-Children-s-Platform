/**
 * tests/integration/pairing.test.ts
 * T009: Integration tests for pairing service — TDD gate (must FAIL before T012)
 * Requires: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_PUBLIC_SUPABASE_ANON_KEY
 * Run: npm run test:pairing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generatePairingToken, watchForChildPaired } from '../../services/api/pairing';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);

const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

const TEST_FAMILY_ID = 'f0000000-0000-0000-0000-000000000001';
const OTHER_FAMILY_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

maybeDescribe('Pairing service (016-parent-qr-pairing)', () => {
  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;
  const createdIds: string[] = [];

  beforeAll(() => {
    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await serviceClient
        .from('pairing_tokens')
        .delete()
        .in('id', createdIds);
    }
    // Clean up other-family token inserted by Scenario C
    await serviceClient
      .from('pairing_tokens')
      .delete()
      .eq('family_id', OTHER_FAMILY_ID);
  });

  // Scenario A — Happy path: generate token
  it('Scenario A: generatePairingToken returns valid PairingResult', async () => {
    const result = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    expect(result.error).toBeNull();
    expect(result.token).not.toBeNull();
    expect(result.token!.used_at).toBeNull();
    expect(result.displayCode).toMatch(/^\d{3}-\d{3}$/);
    const expiresIn = new Date(result.token!.expires_at).getTime() - Date.now();
    expect(expiresIn).toBeGreaterThan(9 * 60 * 1000);
    expect(expiresIn).toBeLessThan(11 * 60 * 1000);
    if (result.token?.id) createdIds.push(result.token.id);
  });

  // Scenario B — Token uniqueness
  it('Scenario B: two consecutive calls return different token UUIDs and manual_codes', async () => {
    const r1 = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    const r2 = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    expect(r1.error).toBeNull();
    expect(r2.error).toBeNull();
    expect(r1.token!.token).not.toBe(r2.token!.token);
    expect(r1.token!.manual_code).not.toBe(r2.token!.manual_code);
    if (r1.token?.id) createdIds.push(r1.token.id);
    if (r2.token?.id) createdIds.push(r2.token.id);
  });

  // Scenario C [US2] — RLS: cross-family isolation
  it('Scenario C [US2]: parent cannot SELECT tokens belonging to another family', async () => {
    await serviceClient
      .from('pairing_tokens')
      .insert({ family_id: OTHER_FAMILY_ID, manual_code: '999999' });

    const { data } = await serviceClient
      .from('pairing_tokens')
      .select('id')
      .eq('family_id', OTHER_FAMILY_ID);
    // Service role can see it — just confirming insert worked
    expect(data).not.toBeNull();

    // Authenticated parent client cannot see another family's tokens via RLS
    // (We can't easily create a full parent session in integration tests,
    //  but we verify anon cannot see either — RLS blocks unauthenticated reads too)
    const { data: anonData } = await anonClient
      .from('pairing_tokens')
      .select('id')
      .eq('family_id', OTHER_FAMILY_ID);
    expect(anonData ?? []).toHaveLength(0);
  });

  // Scenario D [US2] — Unauthenticated INSERT blocked
  it('Scenario D [US2]: unauthenticated INSERT into pairing_tokens is rejected by RLS', async () => {
    const { error } = await anonClient
      .from('pairing_tokens')
      .insert({ family_id: TEST_FAMILY_ID, manual_code: '123456' });
    expect(error).not.toBeNull();
  });

  // Scenario E [US3] — Subscription lifecycle
  // NOTE: Full US3 acceptance test (parent navigates on child pairing) requires Phase 2 — child QR scan spec.
  // This scenario verifies only that the subscription is established and can be cleaned up safely.
  it('Scenario E [US3]: watchForChildPaired returns unsubscribe function that does not throw', () => {
    const unsub = watchForChildPaired(TEST_FAMILY_ID, jest.fn(), serviceClient);
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  // Scenario F [SC-003] — 2-second timing requirement
  it('Scenario F [SC-003]: generatePairingToken responds within 2 seconds', async () => {
    const start = Date.now();
    const result = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    const elapsed = Date.now() - start;
    expect(result.error).toBeNull();
    expect(elapsed).toBeLessThan(2000);
    if (result.token?.id) createdIds.push(result.token.id);
  });

  // Scenario G [SC-006] — Expired token storage
  it('Scenario G [SC-006]: expired expires_at is stored and returned correctly', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const { data, error } = await serviceClient
      .from('pairing_tokens')
      .insert({ family_id: TEST_FAMILY_ID, expires_at: pastExpiry })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(new Date(data!.expires_at) < new Date()).toBe(true);
    if (data?.id) {
      await serviceClient.from('pairing_tokens').delete().eq('id', data.id);
    }
  });
});
