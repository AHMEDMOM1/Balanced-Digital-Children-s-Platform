import { useState, useEffect, useCallback } from 'react';
import { getClient } from './client';
import { fetchBlockedCategories, fetchChildAgeGroup, buildContentQuery, fetchDisabledContentIds, logActivity, selectExtendedColumns } from './contentHelpers';
import type { ContentItem, VideoItem, ApiResponse } from './types';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';

export function useVideos() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const childData = useAuthStore((s) => s.childData);
  const role = useAuthStore((s) => s.role);
  const cachedItems = useDataStore((s) => s.cache.videos);
  const setCache = useDataStore((s) => s.setVideos);

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
      const query = buildContentQuery(client.from('content_items'), 'video', ageRange, blockedCategories, disabledIds);
      const { data, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);
      const items = (data ?? []) as ContentItem[];
      setCache(items);
      setIsOffline(false);
      console.log(JSON.stringify({ level: 'info', hook: 'useVideos', duration_ms: Date.now() - start, cached: false, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useVideos', duration_ms: Date.now() - start, cached: cachedItems.length > 0, error: err?.message }));
      if (cachedItems.length > 0) {
        setIsOffline(true);
      } else {
        setError(err?.message || 'Failed to load videos');
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

export function useVideo(id: string) {
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
        .eq('type', 'video')
        .single();
      if (fetchError) throw new Error(fetchError.message);
      setData(item as ContentItem);
      console.log(JSON.stringify({ level: 'info', hook: 'useVideo', duration_ms: Date.now() - start, cached: false, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useVideo', duration_ms: Date.now() - start, cached: false, error: err?.message }));
      setError(err?.message || 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, isOffline: false, isLoading, refetch: fetch } as ApiResponse<ContentItem> & { refetch: () => Promise<void> };
}

export function useVideoExtended() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [data, setData] = useState<VideoItem[] | null>(null);

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
        .eq('type', 'video');
      if (ageRange) {
        query = query.lte('min_age', ageRange.max).gte('max_age', ageRange.min);
      }
      if (blockedCategories.length > 0) {
        query = query.not('category', 'in', `(${blockedCategories.join(',')})`);
      }
      const { data: items, error: fetchError } = await query;
      if (fetchError) throw new Error(fetchError.message);
      setData((items ?? []) as VideoItem[]);
      setIsOffline(false);
      console.log(JSON.stringify({ level: 'info', hook: 'useVideoExtended', duration_ms: Date.now() - start, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useVideoExtended', duration_ms: Date.now() - start, error: err?.message }));
      setError(err?.message || 'Failed to load videos');
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [role, childData?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, isOffline, isLoading, refetch: fetch } as ApiResponse<VideoItem[]> & { refetch: () => Promise<void> };
}

export async function logVideoActivity(params: {
  childId: string;
  videoId: string;
  durationSeconds?: number;
  sessionId?: string;
}): Promise<void> {
  await logActivity({
    childId: params.childId,
    contentItemId: params.videoId,
    activityType: 'video',
    sessionId: params.sessionId,
    durationSeconds: params.durationSeconds,
  });
}
