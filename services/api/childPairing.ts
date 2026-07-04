import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './client';
import { ConsumePairingTokenResult, QrPayload } from './types';

export function parseQrPayload(rawStr: string): QrPayload | null {
  try {
    const parsed = JSON.parse(rawStr);
    if (
      typeof parsed.token !== 'string' || parsed.token === '' ||
      typeof parsed.family_id !== 'string' || parsed.family_id === '' ||
      typeof parsed.expires_at !== 'string' || parsed.expires_at === ''
    ) {
      return null;
    }
    return {
      token: parsed.token,
      family_id: parsed.family_id,
      expires_at: parsed.expires_at,
    };
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: QrPayload): boolean {
  return new Date(payload.expires_at).getTime() <= Date.now();
}

export function parseManualCode(input: string): string | null {
  const stripped = input.replace(/[-\s]/g, '').toUpperCase();
  if (stripped.length !== 6) return null;
  return stripped;
}

export async function consumePairingToken(
  tokenUuid: string,
  familyId: string,
  supabase?: SupabaseClient
): Promise<ConsumePairingTokenResult> {
  const client = supabase ?? getClient();
  const start = Date.now();

  const { data, error } = await client.rpc('consume_pairing_token', {
    p_token: tokenUuid,
    p_family_id: familyId,
  });

  const duration_ms = Date.now() - start;

  if (error) {
    console.info(JSON.stringify({
      level: 'error',
      hook: 'consumePairingToken',
      family_id: familyId,
      duration_ms,
      success: false,
      error: 'rpc_error',
    }));
    return { success: false, child_id: null, family_id: null, error: 'rpc_error' };
  }

  const result = data as { success: boolean; child_id?: string; family_id?: string; error?: string };

  console.info(JSON.stringify({
    level: result.success ? 'info' : 'warn',
    hook: 'consumePairingToken',
    family_id: familyId,
    duration_ms,
    success: result.success,
    error: result.error ?? null,
  }));

  return {
    success: result.success,
    child_id: result.child_id ?? null,
    family_id: result.family_id ?? null,
    error: result.success ? null : ((result.error as ConsumePairingTokenResult['error']) ?? 'rpc_error'),
  };
}

export async function consumePairingTokenByCode(
  manualCode: string,
  supabase?: SupabaseClient
): Promise<ConsumePairingTokenResult> {
  const stripped = parseManualCode(manualCode);
  if (!stripped) {
    return { success: false, child_id: null, family_id: null, error: 'invalid_token' };
  }

  const client = supabase ?? getClient();
  const start = Date.now();

  const { data, error } = await client.rpc('consume_pairing_token_by_code', {
    p_manual_code: stripped,
  });

  const duration_ms = Date.now() - start;

  if (error) {
    console.info(JSON.stringify({
      level: 'error',
      hook: 'consumePairingTokenByCode',
      duration_ms,
      success: false,
      error: 'rpc_error',
    }));
    return { success: false, child_id: null, family_id: null, error: 'rpc_error' };
  }

  const result = data as { success: boolean; child_id?: string; family_id?: string; error?: string };

  console.info(JSON.stringify({
    level: result.success ? 'info' : 'warn',
    hook: 'consumePairingTokenByCode',
    duration_ms,
    success: result.success,
    error: result.error ?? null,
  }));

  return {
    success: result.success,
    child_id: result.child_id ?? null,
    family_id: result.family_id ?? null,
    error: result.success ? null : ((result.error as ConsumePairingTokenResult['error']) ?? 'rpc_error'),
  };
}
