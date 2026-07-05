import { useState, useEffect, useCallback } from 'react';
import { getClient } from './client';
import { fetchBlockedCategories, fetchChildAgeGroup, buildContentQuery, fetchDisabledContentIds, logActivity, selectExtendedColumns } from './contentHelpers';
import type { ContentItem, ActivityItem, ApiResponse } from './types';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';

export function useCreative() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const childData = useAuthStore((s) => s.childData);
  const role = useAuthStore((s) => s.role);
  const cachedItems = useDataStore((s) => s.cache.creative);
  const setCache = useDataStore((s) => s.setCreative);

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
      const query = buildContentQuery(client.from('content_items'), 'creative', ageRange, blockedCategories, disabledIds);
      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);
      const items = (data ?? []) as ContentItem[];
      setCache(items);
      setIsOffline(false);
      console.log(JSON.stringify({ level: 'info', hook: 'useCreative', duration_ms: Date.now() - start, cached: false, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useCreative', duration_ms: Date.now() - start, cached: cachedItems.length > 0, error: err?.message }));
      if (cachedItems.length > 0) {
        setIsOffline(true);
      } else {
        setError(err?.message || 'Failed to load activities');
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

export function useCreativeActivity(id: string) {
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
        .eq('type', 'creative')
        .single();
      if (fetchError) throw new Error(fetchError.message);
      setData(item as ContentItem);
      console.log(JSON.stringify({ level: 'info', hook: 'useCreativeActivity', duration_ms: Date.now() - start, cached: false, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useCreativeActivity', duration_ms: Date.now() - start, cached: false, error: err?.message }));
      setError(err?.message || 'Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, isOffline: false, isLoading, refetch: fetch } as ApiResponse<ContentItem> & { refetch: () => Promise<void> };
}

export function useCreativeExtended() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [data, setData] = useState<ActivityItem[] | null>(null);

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
        .eq('type', 'creative');
      if (ageRange) {
        query = query.lte('min_age', ageRange.max).gte('max_age', ageRange.min);
      }
      if (blockedCategories.length > 0) {
        query = query.not('category', 'in', `(${blockedCategories.join(',')})`);
      }
      const { data: items, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);
      setData((items ?? []) as ActivityItem[]);
      setIsOffline(false);
      console.log(JSON.stringify({ level: 'info', hook: 'useCreativeExtended', duration_ms: Date.now() - start, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useCreativeExtended', duration_ms: Date.now() - start, error: err?.message }));
      setError(err?.message || 'Failed to load activities');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [role, childData?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, isOffline, isLoading, refetch: fetch } as ApiResponse<ActivityItem[]> & { refetch: () => Promise<void> };
}

export async function logCreativeActivity(params: {
  childId: string;
  activityId: string;
  durationSeconds?: number;
  sessionId?: string;
}): Promise<void> {
  await logActivity({
    childId: params.childId,
    contentItemId: params.activityId,
    activityType: 'creative',
    sessionId: params.sessionId,
    durationSeconds: params.durationSeconds,
  });
}
