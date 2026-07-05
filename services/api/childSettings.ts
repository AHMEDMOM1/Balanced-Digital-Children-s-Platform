import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './client';

export interface ChildSettings {
  daily_time_limit_minutes: number;
  sessions_per_day: number;
  stories_enabled: boolean;
  games_enabled: boolean;
  videos_enabled: boolean;
  creative_enabled: boolean;
}

const DEFAULT_SETTINGS: ChildSettings = {
  daily_time_limit_minutes: 45,
  sessions_per_day: 3,
  stories_enabled: true,
  games_enabled: true,
  videos_enabled: true,
  creative_enabled: true,
};

export interface ChildSettingsResult {
  data: ChildSettings | null;
  error: string | null;
}

export interface SaveResult {
  success: boolean;
  error: string | null;
}

/** Parent-side read — parent has a real auth.uid(), parent_settings_select RLS already covers this. */
export async function getChildSettings(childId: string, supabase?: SupabaseClient): Promise<ChildSettingsResult> {
  const client = supabase ?? getClient();
  const { data, error } = await client
    .from('parent_settings')
    .select('daily_time_limit_minutes, sessions_per_day, stories_enabled, games_enabled, videos_enabled, creative_enabled')
    .eq('child_id', childId)
    .maybeSingle();

  if (error) {
    console.info(JSON.stringify({ level: 'error', hook: 'getChildSettings', child_id: childId, error: error.message }));
    return { data: null, error: error.message };
  }

  // No row yet for this child — first time touching it; caller should treat as defaults.
  return { data: (data as ChildSettings) ?? DEFAULT_SETTINGS, error: null };
}

/** Parent-side write — upsert keyed on (parent_id, child_id) per the table's UNIQUE constraint. */
export async function upsertChildSettings(
  parentId: string,
  childId: string,
  fields: Partial<ChildSettings>,
  supabase?: SupabaseClient,
): Promise<SaveResult> {
  const client = supabase ?? getClient();
  const { error } = await client
    .from('parent_settings')
    .upsert({ parent_id: parentId, child_id: childId, ...fields }, { onConflict: 'parent_id,child_id' });

  if (error) {
    console.info(JSON.stringify({ level: 'error', hook: 'upsertChildSettings', child_id: childId, error: error.message }));
    return { success: false, error: error.message };
  }

  console.info(JSON.stringify({ level: 'info', hook: 'upsertChildSettings', child_id: childId, fields }));
  return { success: true, error: null };
}

/** Child-side self-read — headless device, no auth.uid(), must go through the anon-callable RPC. */
export async function getChildSettingsForSelf(childId: string, supabase?: SupabaseClient): Promise<ChildSettings> {
  const client = supabase ?? getClient();
  const { data, error } = await client.rpc('get_child_settings', { p_child_id: childId });

  if (error || !data?.found) {
    if (error) console.warn('[childSettings] getChildSettingsForSelf error', error.message);
    return DEFAULT_SETTINGS;
  }

  return {
    daily_time_limit_minutes: data.daily_time_limit_minutes ?? DEFAULT_SETTINGS.daily_time_limit_minutes,
    sessions_per_day: data.sessions_per_day ?? DEFAULT_SETTINGS.sessions_per_day,
    stories_enabled: data.stories_enabled ?? DEFAULT_SETTINGS.stories_enabled,
    games_enabled: data.games_enabled ?? DEFAULT_SETTINGS.games_enabled,
    videos_enabled: data.videos_enabled ?? DEFAULT_SETTINGS.videos_enabled,
    creative_enabled: data.creative_enabled ?? DEFAULT_SETTINGS.creative_enabled,
  };
}

/** Child-side self-read of own profile (name/age) — same headless constraint as above. */
export async function getChildProfileForSelf(
  childId: string,
  supabase?: SupabaseClient,
): Promise<{ fullName: string; ageGroup: string | null; avatarColor: string | null } | null> {
  const client = supabase ?? getClient();
  const { data, error } = await client.rpc('get_child_profile', { p_child_id: childId });

  if (error || !data?.found) {
    if (error) console.warn('[childSettings] getChildProfileForSelf error', error.message);
    return null;
  }

  return {
    fullName: data.full_name ?? '',
    ageGroup: data.age_group ?? null,
    avatarColor: data.avatar_color ?? null,
  };
}
