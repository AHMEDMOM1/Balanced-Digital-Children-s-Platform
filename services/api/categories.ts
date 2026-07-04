import { useState, useEffect, useCallback } from 'react';
import { getClient } from './client';
import type { Category, ApiResponse } from './types';

export function useCategories() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Category[] | null>(null);

  const fetch = useCallback(async () => {
    const start = Date.now();
    setIsLoading(true);
    setError(null);
    try {
      const client = getClient();
      const { data: items, error: fetchError } = await client
        .from('categories')
        .select('id, name, icon_url, created_at')
        .order('name');
      if (fetchError) throw new Error(fetchError.message);
      setData((items ?? []) as Category[]);
      console.log(JSON.stringify({ level: 'info', hook: 'useCategories', duration_ms: Date.now() - start, error: null }));
    } catch (err: any) {
      console.log(JSON.stringify({ level: 'error', hook: 'useCategories', duration_ms: Date.now() - start, error: err?.message }));
      setError(err?.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, isOffline: false, isLoading, refetch: fetch } as ApiResponse<Category[]> & { refetch: () => Promise<void> };
}
