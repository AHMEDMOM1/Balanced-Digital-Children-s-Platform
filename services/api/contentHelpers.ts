import { getClient } from './client';
import type { ContentItem, ContentType } from './types';

export const AGE_GROUP_RANGES: Record<string, { min: number; max: number }> = {
  '2-4': { min: 2, max: 4 },
  '5-7': { min: 5, max: 7 },
  '8-10': { min: 8, max: 10 },
};

// Opt-out model (FR-001): fetch categories explicitly blocked (is_allowed=false).
// Absence of a row means the category is accessible by default.
export async function fetchBlockedCategories(childId: string): Promise<string[]> {
  const client = getClient();
  const { data, error } = await client
    .from('category_preferences')
    .select('category')
    .eq('child_id', childId)
    .eq('is_allowed', false);
  if (error || !data) return [];
  return data.map((p: { category: string }) => p.category);
}

export async function fetchChildAgeGroup(
  childId: string,
): Promise<{ min: number; max: number } | null> {
  const client = getClient();
  const { data, error } = await client
    .from('profiles')
    .select('age_group')
    .eq('id', childId)
    .single();
  if (error || !data?.age_group) return null;
  return AGE_GROUP_RANGES[data.age_group] || null;
}

// Build content query with opt-out category exclusion (NOT IN blocked) and age filter.
export function buildContentQuery(
  from: ReturnType<ReturnType<typeof getClient>['from']>,
  type: ContentType,
  ageRange: { min: number; max: number } | null,
  blockedCategories: string[],
): any {
  let query: any = (from as any).select('*').eq('type', type);

  if (ageRange) {
    query = query.lte('min_age', ageRange.max).gte('max_age', ageRange.min);
  }

  if (blockedCategories.length > 0) {
    query = query.not('category', 'in', `(${blockedCategories.join(',')})`);
  }

  return query;
}

export async function logActivity(params: {
  childId: string;
  contentItemId: string;
  activityType: ContentType;
  sessionId?: string;
  durationSeconds?: number;
}): Promise<void> {
  const client = getClient();
  await client.from('activity_logs').insert({
    child_id: params.childId,
    content_item_id: params.contentItemId,
    activity_type: params.activityType,
    session_id: params.sessionId ?? null,
    duration_seconds: params.durationSeconds ?? 0,
    created_at: new Date().toISOString(),
  });
}
