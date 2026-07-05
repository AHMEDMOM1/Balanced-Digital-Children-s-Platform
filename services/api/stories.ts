import { useState, useEffect, useCallback } from 'react';
import { getClient } from './client';
import { fetchBlockedCategories, fetchChildAgeGroup, buildContentQuery, fetchDisabledContentIds, logActivity, selectExtendedColumns } from './contentHelpers';
import type { ContentItem, StoryItem, ApiResponse } from './types';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';

export function useStories() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const childData = useAuthStore((s) => s.childData);
  const role = useAuthStore((s) => s.role);
  const cachedItems = useDataStore((s) => s.cache.stories);
  const setCache = useDataStore((s) => s.setStories);

  const fetch = useCallback(async () => {
    if (role !== 'child' || !childData?.id) return;
    const start = Date.now();
    setIsLoading(true);
    setError(null);

    try {
      const [ageRange, blockedCategories, disabledIds] = await Promise.all([
        fetchChildAgeGroup(childData.id),
        fetchBlockedCategories(childData.id),
        fetchDisabledContentIds(childData.id),
      ]);
      const client = getClient();
      const query = buildContentQuery(client.from('content_items'), 'story', ageRange, blockedCategories, disabledIds);
      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);
      const items = (data ?? []) as ContentItem[];
      setCache(items);
      setIsOffline(false);
      console.log(JSON.stringify({ level: 'info', hook: 'useStories', duration_ms: Date.now() - start, cached: false, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useStories', duration_ms: Date.now() - start, cached: cachedItems.length > 0, error: err?.message }));
      if (cachedItems.length > 0) {
        setIsOffline(true);
      } else {
        setError(err?.message || 'Failed to load stories');
      }
    } finally {
      setIsLoading(false);
    }
  }, [role, childData?.id, cachedItems.length, setCache]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const data = cachedItems.length > 0 ? cachedItems : null;
  return { data, error, isOffline, isLoading, refetch: fetch } as ApiResponse<ContentItem[]> & { refetch: () => Promise<void> };
}

export function useStory(id: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ContentItem | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    const start = Date.now();
    setIsLoading(true);
    setError(null);
    try {
      const client = getClient();
      const { data: item, error: fetchError } = await client
        .from('content_items')
        .select('*')
        .eq('id', id)
        .eq('type', 'story')
        .single();
      if (fetchError) throw new Error(fetchError.message);
      setData(item as ContentItem);
      console.log(JSON.stringify({ level: 'info', hook: 'useStory', duration_ms: Date.now() - start, cached: false, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useStory', duration_ms: Date.now() - start, cached: false, error: err?.message }));
      setError(err?.message || 'Failed to load story');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, isOffline: false, isLoading, refetch: fetch } as ApiResponse<ContentItem> & { refetch: () => Promise<void> };
}

export function useStoryExtended() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [data, setData] = useState<StoryItem[] | null>(null);

  const childData = useAuthStore((s) => s.childData);
  const role = useAuthStore((s) => s.role);

  const fetch = useCallback(async () => {
    if (role !== 'child' || !childData?.id) return;
    const start = Date.now();
    setIsLoading(true);
    setError(null);

    try {
      const [ageRange, blockedCategories] = await Promise.all([
        fetchChildAgeGroup(childData.id),
        fetchBlockedCategories(childData.id),
      ]);
      const client = getClient();
      let query: any = client
        .from('content_items')
        .select(selectExtendedColumns)
        .eq('type', 'story');
      if (ageRange) {
        query = query.lte('min_age', ageRange.max).gte('max_age', ageRange.min);
      }
      if (blockedCategories.length > 0) {
        query = query.not('category', 'in', `(${blockedCategories.join(',')})`);
      }
      const { data: items, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);
      setData((items ?? []) as StoryItem[]);
      setIsOffline(false);
      console.log(JSON.stringify({ level: 'info', hook: 'useStoryExtended', duration_ms: Date.now() - start, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useStoryExtended', duration_ms: Date.now() - start, error: err?.message }));
      setError(err?.message || 'Failed to load stories');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [role, childData?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, isOffline, isLoading, refetch: fetch } as ApiResponse<StoryItem[]> & { refetch: () => Promise<void> };
}

export async function logStoryActivity(params: {
  childId: string;
  storyId: string;
  durationSeconds?: number;
  sessionId?: string;
}): Promise<void> {
  await logActivity({
    childId: params.childId,
    contentItemId: params.storyId,
    activityType: 'story',
    sessionId: params.sessionId,
    durationSeconds: params.durationSeconds,
  });
}
