import { useState, useEffect, useCallback } from 'react';
import { getClient } from './client';
import {
  AdminContentInput,
  AdminContentUpdate,
  AdminCategoryInput,
  AdminListQuery,
  AdminContentListResponse,
  ContentItemExtended,
  Category,
  ContentType,
} from './types';

const PAGE_SIZE = 20;

function validateContentInput(
  input: AdminContentInput | AdminContentUpdate,
  isCreate: boolean
): string | null {
  if (!input.title?.trim()) return 'Title is required';
  if (isCreate && !('type' in input && (input as AdminContentInput).type)) return 'Type is required';
  if (isCreate) {
    const type = (input as AdminContentInput).type;
    if (!['video', 'story', 'creative', 'game'].includes(type)) return 'Type is required';
  }
  if (!input.category?.trim()) return 'Category is required';
  const minAge = Number(input.min_age);
  const maxAge = Number(input.max_age);
  if (!Number.isInteger(minAge) || minAge < 0 || minAge > 17) return 'Minimum age must be 0–17';
  if (!Number.isInteger(maxAge) || maxAge < 1 || maxAge > 18) return 'Maximum age must be 1–18';
  if (maxAge < minAge) return 'Maximum age must be ≥ minimum age';
  if (!input.thumbnail_url?.trim()) return 'Thumbnail URL is required';

  const type = isCreate ? (input as AdminContentInput).type : undefined;
  if (type === 'video' && !input.url?.trim()) return 'URL is required for video';

  const configStr = input.config_json as unknown as string;
  if (
    (isCreate ? type === 'game' : true) &&
    typeof configStr === 'string' &&
    configStr.trim()
  ) {
    try {
      JSON.parse(configStr);
    } catch {
      return 'Config must be valid JSON';
    }
  }

  return null;
}

function mapAuthError(code: string | undefined): string {
  if (code === 'PGRST301' || code === '42501') return 'Unauthorized — admin JWT required';
  return 'A network error occurred. Please try again.';
}

// ── Content List ─────────────────────────────────────────────────────────────

export function useAdminContentList(query: AdminListQuery): {
  data: AdminContentListResponse | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<AdminContentListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = Date.now();
    try {
      const client = getClient();
      let q = client
        .from('content_items')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE - 1);

      if (query.typeFilter) q = q.eq('type', query.typeFilter as string);
      if (query.titleSearch?.trim()) {
        q = q.ilike('title', `%${query.titleSearch.trim()}%`);
      }

      const { data: items, error: err, count } = await q;
      const duration_ms = Date.now() - start;

      if (err) {
        console.log(JSON.stringify({ level: 'error', hook: 'useAdminContentList', duration_ms, error: err.message }));
        setError(mapAuthError(err.code));
      } else {
        console.log(JSON.stringify({ level: 'info', hook: 'useAdminContentList', page: query.page, total: count, duration_ms }));
        setData({
          items: (items ?? []) as ContentItemExtended[],
          total: count ?? 0,
          page: query.page,
          pageSize: PAGE_SIZE,
        });
      }
    } catch (e: any) {
      const duration_ms = Date.now() - start;
      console.log(JSON.stringify({ level: 'error', hook: 'useAdminContentList', duration_ms, error: e.message }));
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [query.page, query.typeFilter, query.titleSearch]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, error, isLoading, refetch: fetch };
}

// ── Single Content Item ───────────────────────────────────────────────────────

export function useAdminContentItem(id: string): {
  data: ContentItemExtended | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<ContentItemExtended | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = Date.now();
    try {
      const { data: item, error: err } = await getClient()
        .from('content_items')
        .select('*')
        .eq('id', id)
        .single();
      const duration_ms = Date.now() - start;

      if (err) {
        console.log(JSON.stringify({ level: 'error', hook: 'useAdminContentItem', id, duration_ms, error: err.message }));
        setError(mapAuthError(err.code));
      } else {
        console.log(JSON.stringify({ level: 'info', hook: 'useAdminContentItem', id, duration_ms }));
        setData(item as ContentItemExtended);
      }
    } catch (e: any) {
      const duration_ms = Date.now() - start;
      console.log(JSON.stringify({ level: 'error', hook: 'useAdminContentItem', id, duration_ms, error: e.message }));
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, error, isLoading, refetch: fetch };
}

// ── Create Content Item ───────────────────────────────────────────────────────

export async function createContentItem(
  input: AdminContentInput
): Promise<{ data: ContentItemExtended | null; error: string | null }> {
  const validationError = validateContentInput(input, true);
  if (validationError) return { data: null, error: validationError };

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    type: input.type,
    category: input.category.trim(),
    min_age: Number(input.min_age),
    max_age: Number(input.max_age),
    thumbnail_url: input.thumbnail_url.trim(),
  };

  if (input.type === 'video') {
    if (input.url) payload.url = input.url.trim();
    if (input.duration_seconds !== undefined) payload.duration_seconds = Number(input.duration_seconds);
  }
  if (input.type === 'story' && input.content_text) payload.content_text = input.content_text;
  if (input.type === 'creative' && input.assets_url) payload.assets_url = input.assets_url.trim();
  if (input.type === 'game') {
    if (input.game_type) payload.game_type = input.game_type;
    const configStr = input.config_json as unknown as string;
    payload.config_json = configStr?.trim() ? JSON.parse(configStr) : {};
  }

  const start = Date.now();
  try {
    const { data, error: err } = await getClient()
      .from('content_items')
      .insert([payload])
      .select()
      .single();
    const duration_ms = Date.now() - start;

    if (err) {
      console.log(JSON.stringify({ level: 'error', hook: 'createContentItem', type: input.type, duration_ms, error: err.message }));
      return { data: null, error: mapAuthError(err.code) };
    }
    console.log(JSON.stringify({ level: 'info', hook: 'createContentItem', type: input.type, duration_ms }));
    return { data: data as ContentItemExtended, error: null };
  } catch (e: any) {
    const duration_ms = Date.now() - start;
    console.log(JSON.stringify({ level: 'error', hook: 'createContentItem', type: input.type, duration_ms, error: e.message }));
    return { data: null, error: 'A network error occurred. Please try again.' };
  }
}

// ── Update Content Item ───────────────────────────────────────────────────────

export async function updateContentItem(
  id: string,
  updates: AdminContentUpdate
): Promise<{ data: ContentItemExtended | null; error: string | null }> {
  const validationError = validateContentInput(updates, false);
  if (validationError) return { data: null, error: validationError };

  const payload: Record<string, unknown> = {
    title: (updates.title as string).trim(),
    category: (updates.category as string).trim(),
    min_age: Number(updates.min_age),
    max_age: Number(updates.max_age),
    thumbnail_url: (updates.thumbnail_url as string).trim(),
  };

  if (updates.url !== undefined) payload.url = updates.url?.trim() || null;
  if (updates.duration_seconds !== undefined) payload.duration_seconds = updates.duration_seconds ? Number(updates.duration_seconds) : null;
  if (updates.content_text !== undefined) payload.content_text = updates.content_text || null;
  if (updates.assets_url !== undefined) payload.assets_url = updates.assets_url?.trim() || null;
  if (updates.game_type !== undefined) payload.game_type = updates.game_type || null;
  if (updates.config_json !== undefined) {
    const configStr = updates.config_json as unknown as string;
    payload.config_json = configStr?.trim() ? JSON.parse(configStr) : {};
  }

  const start = Date.now();
  try {
    const { data, error: err } = await getClient()
      .from('content_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    const duration_ms = Date.now() - start;

    if (err) {
      console.log(JSON.stringify({ level: 'error', hook: 'updateContentItem', id, duration_ms, error: err.message }));
      if (err.code === 'PGRST116') return { data: null, error: 'Content item not found' };
      return { data: null, error: mapAuthError(err.code) };
    }
    if (!data) return { data: null, error: 'Content item not found' };
    console.log(JSON.stringify({ level: 'info', hook: 'updateContentItem', id, duration_ms }));
    return { data: data as ContentItemExtended, error: null };
  } catch (e: any) {
    const duration_ms = Date.now() - start;
    console.log(JSON.stringify({ level: 'error', hook: 'updateContentItem', id, duration_ms, error: e.message }));
    return { data: null, error: 'A network error occurred. Please try again.' };
  }
}

// ── Delete Content Item ───────────────────────────────────────────────────────

export async function deleteContentItem(
  id: string
): Promise<{ error: string | null }> {
  const start = Date.now();
  try {
    const { error: err } = await getClient()
      .from('content_items')
      .delete()
      .eq('id', id);
    const duration_ms = Date.now() - start;

    if (err) {
      console.log(JSON.stringify({ level: 'error', hook: 'deleteContentItem', id, duration_ms, error: err.message }));
      return { error: mapAuthError(err.code) };
    }
    console.log(JSON.stringify({ level: 'info', hook: 'deleteContentItem', id, duration_ms }));
    return { error: null };
  } catch (e: any) {
    const duration_ms = Date.now() - start;
    console.log(JSON.stringify({ level: 'error', hook: 'deleteContentItem', id, duration_ms, error: e.message }));
    return { error: 'A network error occurred. Please try again.' };
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

export function useAdminCategories(): {
  data: Category[] | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = Date.now();
    try {
      const { data: cats, error: err } = await getClient()
        .from('categories')
        .select('id, name, icon_url, created_at')
        .order('name');
      const duration_ms = Date.now() - start;

      if (err) {
        console.log(JSON.stringify({ level: 'error', hook: 'useAdminCategories', duration_ms, error: err.message }));
        setError(mapAuthError(err.code));
      } else {
        console.log(JSON.stringify({ level: 'info', hook: 'useAdminCategories', count: cats?.length ?? 0, duration_ms }));
        setData(cats as Category[]);
      }
    } catch (e: any) {
      const duration_ms = Date.now() - start;
      console.log(JSON.stringify({ level: 'error', hook: 'useAdminCategories', duration_ms, error: e.message }));
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, error, isLoading, refetch: fetch };
}

export async function createCategory(
  input: AdminCategoryInput
): Promise<{ data: Category | null; error: string | null }> {
  if (!input.name?.trim()) return { data: null, error: 'Category name is required' };

  const start = Date.now();
  try {
    const payload: Record<string, unknown> = { name: input.name.trim() };
    if (input.icon_url) payload.icon_url = input.icon_url.trim();

    const { data, error: err } = await getClient()
      .from('categories')
      .insert([payload])
      .select()
      .single();
    const duration_ms = Date.now() - start;

    if (err) {
      console.log(JSON.stringify({ level: 'error', hook: 'createCategory', duration_ms, error: err.message }));
      if (err.code === '23505') return { data: null, error: 'A category with this name already exists' };
      return { data: null, error: mapAuthError(err.code) };
    }
    console.log(JSON.stringify({ level: 'info', hook: 'createCategory', duration_ms }));
    return { data: data as Category, error: null };
  } catch (e: any) {
    const duration_ms = Date.now() - start;
    console.log(JSON.stringify({ level: 'error', hook: 'createCategory', duration_ms, error: e.message }));
    return { data: null, error: 'A network error occurred. Please try again.' };
  }
}

export async function deleteCategory(
  id: string
): Promise<{ error: string | null }> {
  const start = Date.now();
  try {
    const { error: err } = await getClient()
      .from('categories')
      .delete()
      .eq('id', id);
    const duration_ms = Date.now() - start;

    if (err) {
      console.log(JSON.stringify({ level: 'error', hook: 'deleteCategory', id, duration_ms, error: err.message }));
      return { error: mapAuthError(err.code) };
    }
    console.log(JSON.stringify({ level: 'info', hook: 'deleteCategory', id, duration_ms }));
    return { error: null };
  } catch (e: any) {
    const duration_ms = Date.now() - start;
    console.log(JSON.stringify({ level: 'error', hook: 'deleteCategory', id, duration_ms, error: e.message }));
    return { error: 'A network error occurred. Please try again.' };
  }
}
