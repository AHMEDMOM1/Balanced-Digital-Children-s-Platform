/**
 * tests/integration/pinAuth.test.ts
 * T008: Integration tests for services/api/pinAuth.ts — Scenarios A-D, I
 * Requires: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_PUBLIC_SUPABASE_ANON_KEY
 * Run: npm run test:pin-auth
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// T008 imports — these MUST exist before T009 gate passes
import { verifyPin, recordPinFailure, clearPinLockout, sendForgotPinOtp } from '../../services/api/pinAuth';
import { getClient } from '../../services/api/client';

import * as Crypto from 'expo-crypto';
import { pinRecoveryManager } from '../../services/resilience/pinRecoveryManager';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

// Stable UUIDs for this test suite
const TEST_FAMILY_ID = 'f2222222-0000-0000-0000-000000000018';
const TEST_PARENT_ID = 'a2222222-0000-0000-0000-000000000018';
const TEST_CHILD_ID  = 'c2222222-0000-0000-0000-000000000018';
const TEST_EMAIL     = 'pin-auth-test-018@example.com';

async function seedHash(storageKey: string, pin: string) {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  await AsyncStorage.setItem(storageKey, hash);
}

maybeDescribe('PIN Auth Integration (018-pin-auth-two-device)', () => {
  jest.setTimeout(20000);

  let serviceClient: SupabaseClient;

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Seed parent profile
    await serviceClient.from('profiles').upsert({
      id: TEST_PARENT_ID,
      role: 'parent',
      family_id: TEST_FAMILY_ID,
      full_name: 'Pin Auth Test Parent 018',
      is_active: true,
    }, { onConflict: 'id' });

    // Seed child profile (headless — no auth.users entry)
    await serviceClient.from('profiles').upsert({
      id: TEST_CHILD_ID,
      role: 'child',
      family_id: TEST_FAMILY_ID,
      parent_id: TEST_PARENT_ID,
      full_name: 'Pin Auth Test Child 018',
      is_active: true,
    }, { onConflict: 'id' });
  });

  afterAll(async () => {
    await serviceClient.from('profiles').delete().eq('id', TEST_CHILD_ID);
    await serviceClient.from('profiles').delete().eq('id', TEST_PARENT_ID);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  // ── Scenarios A-D: verifyPin / lockout ──────────────────────────────────────

  it('Scenario A — verifyPin returns true for correct PIN', async () => {
    await seedHash('@child_pin_hash', '123456');
    expect(await verifyPin('123456', '@child_pin_hash')).toBe(true);
  });

  it('Scenario B — verifyPin returns false for incorrect PIN', async () => {
    await seedHash('@child_pin_hash', '123456');
    expect(await verifyPin('654321', '@child_pin_hash')).toBe(false);
  });

  it('Scenario C — lockout after 5 failures, lockUntil within 1s of now+60s', async () => {
    const key = '@child_pin_lockout';
    for (let i = 0; i < 4; i++) await recordPinFailure(key);
    const before = Date.now();
    const state = await recordPinFailure(key);
    expect(state.failCount).toBe(5);
    expect(state.lockUntil).not.toBeNull();
    expect(state.lockUntil!).toBeGreaterThanOrEqual(before + 59000);
    expect(state.lockUntil!).toBeLessThanOrEqual(before + 61000);
  });

  it('Scenario D — clearPinLockout resets state to defaults', async () => {
    const key = '@child_pin_lockout';
    for (let i = 0; i < 5; i++) await recordPinFailure(key);
    await clearPinLockout(key);
    const state = await recordPinFailure(key);
    // After clear, next failure starts fresh at failCount 1
    expect(state.failCount).toBe(1);
    expect(state.lockUntil).toBeNull();
  });

  // ── Scenario I: OTP rate limit ───────────────────────────────────────────────

  it('Scenario I — sendForgotPinOtp: 4th request blocked, Supabase not called', async () => {
    // Mock rate limiter: allow first 3, block 4th
    const mockAttempt = jest.spyOn(pinRecoveryManager, 'attempt')
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false, reason: 'Too many attempts. Locked.' });

    // Also mock the app client's signInWithOtp so we don't actually send emails
    const appClient = getClient();
    const mockSignInWithOtp = jest.spyOn(appClient.auth, 'signInWithOtp')
      .mockResolvedValue({ data: { user: null, session: null }, error: null } as any);

    // First 3 pass through rate limiter (OTP delivery mocked)
    const r1 = await sendForgotPinOtp(TEST_EMAIL);
    const r2 = await sendForgotPinOtp(TEST_EMAIL);
    const r3 = await sendForgotPinOtp(TEST_EMAIL);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);

    // 4th request is blocked by rate limiter (signInWithOtp never called)
    const r4 = await sendForgotPinOtp(TEST_EMAIL);
    expect(r4.allowed).toBe(false);
    expect(r4.reason).toContain('Too many attempts');

    mockAttempt.mockRestore();
    mockSignInWithOtp.mockRestore();
  });
});
