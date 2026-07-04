import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './client';
import { AgeGroup } from './types';

export interface SaveChildInfoResult {
  success: boolean;
  error: string | null;
}

/**
 * Fills in the child's name/age/avatar after pairing. consume_pairing_token
 * creates a minimal placeholder profile (full_name='', no age_group) — this
 * is the follow-up write that completes it.
 *
 * Goes through update_child_profile (SECURITY DEFINER) rather than a direct
 * .update(), which relied on profiles_parent_update's family_id-matching RLS
 * predicate — that kept failing in practice for reasons not worth chasing
 * further. The RPC validates ownership directly via the child's parent_id
 * column instead, set unambiguously by consume_pairing_token at pairing time.
 */
export async function saveChildInfo(
  childId: string,
  fullName: string,
  ageGroup: AgeGroup,
  avatarColor: string | null,
  supabase?: SupabaseClient,
): Promise<SaveChildInfoResult> {
  const client = supabase ?? getClient();
  const start = Date.now();

  const { data, error } = await client.rpc('update_child_profile', {
    p_child_id: childId,
    p_full_name: fullName,
    p_age_group: ageGroup,
    p_avatar_color: avatarColor,
  });

  const duration_ms = Date.now() - start;

  if (error || !data?.success) {
    const message = error?.message ?? data?.error ?? 'Could not save child info';
    console.info(JSON.stringify({
      level: 'error', hook: 'saveChildInfo', child_id: childId, duration_ms, error: message,
    }));
    return { success: false, error: message };
  }

  console.info(JSON.stringify({ level: 'info', hook: 'saveChildInfo', child_id: childId, duration_ms, error: null }));
  return { success: true, error: null };
}
