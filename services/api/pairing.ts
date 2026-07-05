import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './client';
import { PairingToken, PairingResult } from './types';

export function formatDisplayCode(rawCode: string): string {
  const code = rawCode.toUpperCase();
  if (code.length <= 3) return code;
  return code.slice(0, 3) + '-' + code.slice(3, 6);
}

export async function generatePairingToken(
  familyId: string,
  supabase?: SupabaseClient
): Promise<PairingResult> {
  const client = supabase ?? getClient();
  const start = Date.now();
  let level = 'info';
  let errorMsg: string | null = null;

  try {
    const { data, error } = await client
      .from('pairing_tokens')
      .insert({ family_id: familyId })
      .select()
      .single();

    if (error) {
      level = 'error';
      if (error.code === '42501') {
        errorMsg = 'Unauthorized — parent session required';
      } else {
        errorMsg = 'A network error occurred. Please try again.';
      }
      console.info(
        JSON.stringify({ level, hook: 'generatePairingToken', family_id: familyId, duration_ms: Date.now() - start, error: errorMsg })
      );
      return { token: null, displayCode: null, error: errorMsg };
    }

    const token = data as PairingToken;
    console.info(
      JSON.stringify({ level, hook: 'generatePairingToken', family_id: familyId, duration_ms: Date.now() - start, error: null })
    );
    return {
      token,
      displayCode: formatDisplayCode(token.manual_code),
      error: null,
    };
  } catch (err: any) {
    level = 'error';
    errorMsg = 'A network error occurred. Please try again.';
    console.info(
      JSON.stringify({ level, hook: 'generatePairingToken', family_id: familyId, duration_ms: Date.now() - start, error: errorMsg })
    );
    return { token: null, displayCode: null, error: errorMsg };
  }
}

export function watchForChildPaired(
  familyId: string,
  onPaired: (childId: string) => void,
  supabase?: SupabaseClient
): () => void {
  const client = supabase ?? getClient();

  let hasSubscribed = false;

  const channel = client
    .channel(`pairing-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pairing_tokens',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        const row = payload.new as PairingToken;
        if (row.used_at !== null && row.child_id !== null) {
          console.info(
            JSON.stringify({ level: 'info', hook: 'watchForChildPaired:paired', family_id: familyId, child_id: row.child_id })
          );
          onPaired(row.child_id);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (hasSubscribed) {
          console.info(
            JSON.stringify({ level: 'info', hook: 'watchForChildPaired:reconnected', family_id: familyId })
          );
        } else {
          hasSubscribed = true;
          console.info(
            JSON.stringify({ level: 'info', hook: 'watchForChildPaired:subscribed', family_id: familyId })
          );
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn(
          JSON.stringify({ level: 'warn', hook: 'watchForChildPaired:closed', family_id: familyId })
        );
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}
