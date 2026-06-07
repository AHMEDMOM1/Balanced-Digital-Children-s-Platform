import { useState, useEffect, useCallback } from 'react';
import { getClient } from './client';
import type { ContentItem, ApiResponse } from './types';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';

const AGE_GROUP_RANGES: Record<string, { min: number; max: number }> = {
  '2-4': { min: 2, max: 4 },
  '5-7': { min: 5, max: 7 },
  '8-10': { min: 8, max: 10 },
};

async function fetchChildAgeGroup(childId: string): Promise<{ min: number; max: number } | null> {
  const client = getClient();
  const { data, error } = await client
    .from('profiles')
    .select('age_group')
    .eq('id', childId)
    .single();
  if (error || !data?.age_group) return null;
  return AGE_GROUP_RANGES[data.age_group] || null;
}

async function fetchAllowedCategories(childId: string): Promise<string[]> {
  const client = getClient();
  const { data, error } = await client
    .from('category_preferences')
    .select('category')
    .eq('child_id', childId)
    .eq('is_allowed', true);
  if (error || !data) return [];
  return data.map((p: { category: string }) => p.category);
}

async function fetchStories(
  ageRange: { min: number; max: number } | null,
  allowedCategories: string[],
): Promise<ContentItem[]> {
  const client = getClient();
  let query = client
    .from('content_items')
    .select('*')
    .eq('type', 'story');

  if (ageRange) {
    query = query.lte('min_age', ageRange.max).gte('max_age', ageRange.min);
  }

  if (allowedCategories.length > 0) {
    query = query.in('category', allowedCategories);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ContentItem[];
}

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
    setIsLoading(true);
    setError(null);

    try {
      const ageRange = await fetchChildAgeGroup(childData.id);
      const allowedCategories = await fetchAllowedCategories(childData.id);
      const items = await fetchStories(ageRange, allowedCategories);
      setCache(items);
      setIsOffline(false);
    } catch (err: any) {
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
