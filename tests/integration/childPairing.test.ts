/**
 * tests/integration/childPairing.test.ts
 * T008: Integration tests for child pairing RPC — TDD gate (must FAIL before T010)
 * Requires: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_PUBLIC_SUPABASE_ANON_KEY
 * Run: npm run test:child-pairing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { consumePairingToken, consumePairingTokenByCode } from '../../services/api/childPairing';
import { generatePairingToken, watchForChildPaired } from '../../services/api/pairing';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);

const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

// Dedicated family IDs for this test suite — isolated from pairing.test.ts
const TEST_FAMILY_ID = 'f1111111-0000-0000-0000-000000000017';
const OTHER_FAMILY_ID = 'ffffffff-ffff-ffff-ffff-000000000017';

// Stable UUIDs for the test parent profile (created in beforeAll, deleted in afterAll)
const TEST_PARENT_PROFILE_ID = 'a1111111-0000-0000-0000-000000000017';

maybeDescribe('Child pairing RPC (017-child-qr-scan)', () => {
  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;
  const createdProfileIds: string[] = [];
  const createdTokenIds: string[] = [];

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Seed a parent profile for TEST_FAMILY_ID so the RPC can find a parent
    const { error: seedErr } = await serviceClient.from('profiles').upsert({
      id: TEST_PARENT_PROFILE_ID,
      role: 'parent',
      family_id: TEST_FAMILY_ID,
      full_name: 'Test Parent 017',
      is_active: true,
    }, { onConflict: 'id' });
    if (seedErr) throw new Error('beforeAll: failed to seed parent profile: ' + seedErr.message);

    // Verify it landed
    const { data: check } = await serviceClient
      .from('profiles').select('id,family_id,role').eq('id', TEST_PARENT_PROFILE_ID).single();
    if (!check) throw new Error('beforeAll: parent profile not found after upsert');
  });

  afterAll(async () => {
    // Clean up child profiles created during tests
    if (createdProfileIds.length > 0) {
      await serviceClient.from('profiles').delete().in('id', createdProfileIds);
    }
    // Clean up pairing tokens
    if (createdTokenIds.length > 0) {
      await serviceClient.from('pairing_tokens').delete().in('id', createdTokenIds);
    }
    // Clean up any remaining tokens for our test families
    await serviceClient.from('pairing_tokens').delete().eq('family_id', TEST_FAMILY_ID);
    await serviceClient.from('pairing_tokens').delete().eq('family_id', OTHER_FAMILY_ID);
    // Clean up seeded parent profile
    await serviceClient.from('profiles').delete().eq('id', TEST_PARENT_PROFILE_ID);
  });

  // Scenario A — Happy path: valid UUID token consumed
  it('Scenario A: valid UUID token → success, child_id UUID, token marked used (SC-002 <5s)', async () => {
    const { token: pt } = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    expect(pt).not.toBeNull();
    if (pt?.id) createdTokenIds.push(pt.id);

    const start = Date.now();
    const result = await consumePairingToken(pt!.token, TEST_FAMILY_ID, anonClient);
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(result.child_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(result.error).toBeNull();
    expect(elapsed).toBeLessThan(5000);

    if (result.child_id) createdProfileIds.push(result.child_id);

    // Verify DB state
    const { data } = await serviceClient
      .from('pairing_tokens')
      .select('used_at,child_id')
      .eq('id', pt!.id)
      .single();
    expect(data!.used_at).not.toBeNull();
    expect(data!.child_id).toBe(result.child_id);
  });

  // Scenario B — Double-consume rejected
  it('Scenario B: same token consumed twice → second call returns invalid_token', async () => {
    const { token: pt } = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    expect(pt).not.toBeNull();
    if (pt?.id) createdTokenIds.push(pt.id);

    const first = await consumePairingToken(pt!.token, TEST_FAMILY_ID, anonClient);
    expect(first.success).toBe(true);
    if (first.child_id) createdProfileIds.push(first.child_id);

    const second = await consumePairingToken(pt!.token, TEST_FAMILY_ID, anonClient);
    expect(second.success).toBe(false);
    expect(second.error).toBe('invalid_token');
  });

  // Scenario C — Expired token rejected
  it('Scenario C: expired token → invalid_token (server-side expiry enforced)', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const { data: expiredToken } = await serviceClient
      .from('pairing_tokens')
      .insert({ family_id: TEST_FAMILY_ID, expires_at: pastExpiry })
      .select()
      .single();
    if (expiredToken?.id) createdTokenIds.push(expiredToken.id);

    const result = await consumePairingToken(expiredToken!.token, TEST_FAMILY_ID, anonClient);
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_token');
  });

  // Scenario D — Wrong family_id rejected
  it('Scenario D: wrong family_id → invalid_token (cross-family blocked)', async () => {
    const { token: pt } = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    expect(pt).not.toBeNull();
    if (pt?.id) createdTokenIds.push(pt.id);

    const result = await consumePairingToken(pt!.token, OTHER_FAMILY_ID, anonClient);
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_token');

    // Token should NOT be consumed by the failed attempt
    const { data } = await serviceClient
      .from('pairing_tokens')
      .select('used_at')
      .eq('id', pt!.id)
      .single();
    expect(data!.used_at).toBeNull();
  });

  // Scenario E — Manual code path produces identical outcome to UUID path
  it('Scenario E: manual code path → success with same shape as UUID path', async () => {
    const { token: pt } = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    expect(pt).not.toBeNull();
    if (pt?.id) createdTokenIds.push(pt.id);

    const result = await consumePairingTokenByCode(pt!.manual_code, anonClient);
    expect(result.success).toBe(true);
    expect(result.child_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(result.family_id).toBe(TEST_FAMILY_ID);
    expect(result.error).toBeNull();

    if (result.child_id) createdProfileIds.push(result.child_id);
  });

  // Scenario F [US3] — Realtime: watchForChildPaired fires after consumePairingToken
  it('Scenario F [US3]: watchForChildPaired callback fires within 5s of token consumption', async () => {
    jest.setTimeout(15000);

    let receivedChildId: string | null = null;
    const unsub = watchForChildPaired(
      TEST_FAMILY_ID,
      (childId) => { receivedChildId = childId; },
      serviceClient
    );

    // Wait for subscription to be active
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { token: pt } = await generatePairingToken(TEST_FAMILY_ID, serviceClient);
    expect(pt).not.toBeNull();
    if (pt?.id) createdTokenIds.push(pt.id);

    const result = await consumePairingToken(pt!.token, TEST_FAMILY_ID, anonClient);
    expect(result.success).toBe(true);
    if (result.child_id) createdProfileIds.push(result.child_id);

    // Wait up to 8 seconds for CDC delivery
    await new Promise(resolve => setTimeout(resolve, 8000));

    unsub();

    expect(receivedChildId).not.toBeNull();
    expect(receivedChildId).toBe(result.child_id);
  }, 15000);

  // Scenario G — Atomicity: bogus token leaves no profile row (before/after count pattern)
  it('Scenario G: bogus token leaves no profile row (atomicity)', async () => {
    // Capture count BEFORE the bogus call
    const { count: countBefore } = await serviceClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', TEST_FAMILY_ID)
      .eq('role', 'child');

    const bogusToken = '00000000-0000-0000-0000-000000000000';
    const result = await consumePairingToken(bogusToken, TEST_FAMILY_ID, anonClient);
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_token');

    // Count AFTER must be unchanged
    const { count: countAfter } = await serviceClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', TEST_FAMILY_ID)
      .eq('role', 'child');

    expect(countAfter).toBe(countBefore);
  });
});
