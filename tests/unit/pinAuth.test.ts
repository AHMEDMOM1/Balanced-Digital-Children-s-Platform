/**
 * tests/unit/pinAuth.test.ts
 * T007: Unit tests for services/api/pinAuth.ts — TDD RED gate (must FAIL before T010)
 * Run: npm run test:pin-auth-unit
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Supabase client — unit tests don't need network
jest.mock('../../services/api/client', () => ({
  getClient: jest.fn(() => ({
    auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() },
    rpc: jest.fn(async () => ({ error: null })),
  })),
}));

// Mock pinRecoveryManager — unit tests don't need SQLite
jest.mock('../../services/resilience/pinRecoveryManager', () => ({
  pinRecoveryManager: { attempt: jest.fn(async () => ({ allowed: true })) },
}));

import { verifyPin, recordPinFailure, getPinLockoutState, clearPinLockout } from '../../services/api/pinAuth';

// expo-crypto is mocked via tests/__mocks__/expo-crypto.ts (uses Node crypto)
import * as Crypto from 'expo-crypto';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

// Helper: store a known SHA-256 hash for a given PIN
async function seedPinHash(storageKey: string, pin: string) {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  await AsyncStorage.setItem(storageKey, hash);
}

describe('verifyPin', () => {
  it('Scenario A — returns true for correct PIN', async () => {
    await seedPinHash('@child_pin_hash', '123456');
    const result = await verifyPin('123456', '@child_pin_hash');
    expect(result).toBe(true);
  });

  it('Scenario B — returns false for incorrect PIN', async () => {
    await seedPinHash('@child_pin_hash', '123456');
    const result = await verifyPin('654321', '@child_pin_hash');
    expect(result).toBe(false);
  });

  it('returns false when storage key is absent', async () => {
    const result = await verifyPin('123456', '@child_pin_hash');
    expect(result).toBe(false);
  });
});

describe('recordPinFailure + getPinLockoutState', () => {
  it('Scenario C — lockout after 5 failures', async () => {
    const key = '@child_pin_lockout';
    for (let i = 0; i < 4; i++) {
      const state = await recordPinFailure(key);
      expect(state.lockUntil).toBeNull();
    }
    const before = Date.now();
    const state = await recordPinFailure(key); // 5th call
    expect(state.failCount).toBe(5);
    expect(state.lockUntil).not.toBeNull();
    // lockUntil should be approximately now + 60s (within 1s tolerance)
    expect(state.lockUntil!).toBeGreaterThanOrEqual(before + 59000);
    expect(state.lockUntil!).toBeLessThanOrEqual(before + 61000);
  });

  it('returns failCount 0 and lockUntil null when no key exists', async () => {
    const state = await getPinLockoutState('@no_such_key');
    expect(state.failCount).toBe(0);
    expect(state.lockUntil).toBeNull();
  });

  it('treats expired lockUntil as null', async () => {
    const key = '@test_lockout_expired';
    await AsyncStorage.setItem(key, JSON.stringify({ failCount: 5, lockUntil: Date.now() - 1000 }));
    const state = await getPinLockoutState(key);
    expect(state.lockUntil).toBeNull();
  });
});

describe('clearPinLockout', () => {
  it('Scenario D — clears lockout state', async () => {
    const key = '@child_pin_lockout';
    for (let i = 0; i < 5; i++) await recordPinFailure(key);
    let state = await getPinLockoutState(key);
    expect(state.failCount).toBe(5);

    await clearPinLockout(key);

    state = await getPinLockoutState(key);
    expect(state.failCount).toBe(0);
    expect(state.lockUntil).toBeNull();
  });
});
