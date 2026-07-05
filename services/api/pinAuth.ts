import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getClient } from './client';
import { pinRecoveryManager } from '../resilience/pinRecoveryManager';
import type { PinLockoutState } from './types';

// ── Core PIN verification ────────────────────────────────────────────────────

export async function verifyPin(
  pin: string,
  storedHashKey: '@child_pin_hash' | '@parent_pin_hash',
): Promise<boolean> {
  try {
    const storedHash = await AsyncStorage.getItem(storedHashKey);
    if (!storedHash) return false;
    const inputHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
    return inputHash === storedHash;
  } catch (e) {
    console.debug('[pinAuth] verifyPin error', e);
    return false;
  }
}

// ── Lockout management ───────────────────────────────────────────────────────

export async function recordPinFailure(
  lockoutKey: '@child_pin_lockout' | '@parent_pin_lockout',
): Promise<PinLockoutState> {
  const current = await _readLockout(lockoutKey);
  const newFailCount = current.failCount + 1;
  const lockUntil = newFailCount >= 5 ? Date.now() + 60_000 : null;
  const updated: PinLockoutState = { failCount: newFailCount, lockUntil };
  await AsyncStorage.setItem(lockoutKey, JSON.stringify(updated));
  console.debug('[pinAuth] recordPinFailure', { lockoutKey, failCount: newFailCount, locked: lockUntil !== null });
  return updated;
}

export async function getPinLockoutState(lockoutKey: string): Promise<PinLockoutState> {
  return _readLockout(lockoutKey);
}

export async function clearPinLockout(lockoutKey: string): Promise<void> {
  await AsyncStorage.removeItem(lockoutKey);
  console.debug('[pinAuth] clearPinLockout', { lockoutKey });
}

async function _readLockout(key: string): Promise<PinLockoutState> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { failCount: 0, lockUntil: null };
    const parsed: PinLockoutState = JSON.parse(raw);
    // Treat expired lockUntil as null
    if (parsed.lockUntil && parsed.lockUntil <= Date.now()) {
      return { failCount: parsed.failCount, lockUntil: null };
    }
    return parsed;
  } catch {
    return { failCount: 0, lockUntil: null };
  }
}

// ── Forgot PIN OTP flow ──────────────────────────────────────────────────────

export async function sendForgotPinOtp(
  email: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const gate = await pinRecoveryManager.attempt(email);
  if (!gate.allowed) {
    console.debug('[pinAuth] sendForgotPinOtp rate-limited', { email, reason: gate.reason });
    return { allowed: false, reason: gate.reason };
  }
  try {
    const { error } = await getClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      console.warn('[pinAuth] sendForgotPinOtp delivery error', error.message);
      return { allowed: false, reason: 'delivery_error' };
    }
    console.debug('[pinAuth] sendForgotPinOtp sent', { email });
    return { allowed: true };
  } catch (e: any) {
    console.warn('[pinAuth] sendForgotPinOtp exception', e?.message);
    return { allowed: false, reason: 'delivery_error' };
  }
}

export async function verifyForgotPinOtp(
  email: string,
  token: string,
): Promise<{ valid: boolean; session?: any }> {
  try {
    const { data, error } = await getClient().auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error || !data.session) {
      console.debug('[pinAuth] verifyForgotPinOtp invalid', error?.message);
      return { valid: false };
    }
    console.debug('[pinAuth] verifyForgotPinOtp valid');
    return { valid: true, session: data.session };
  } catch (e: any) {
    console.warn('[pinAuth] verifyForgotPinOtp exception', e?.message);
    return { valid: false };
  }
}

export async function updateParentPinHash(newPin: string, email: string): Promise<boolean> {
  try {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPin);
    await AsyncStorage.setItem('@parent_pin_hash', hash);
    // Fire-and-forget cloud sync — failure is non-fatal (warn only)
    getClient()
      .rpc('update_parent_pin_hash', { p_email: email, p_new_hash: hash })
      .then(({ error }) => {
        if (error) console.warn('[pinAuth] updateParentPinHash cloud sync failed', error.message);
      });
    console.debug('[pinAuth] updateParentPinHash stored locally');
    return true;
  } catch (e: any) {
    console.warn('[pinAuth] updateParentPinHash exception', e?.message);
    return false;
  }
}
