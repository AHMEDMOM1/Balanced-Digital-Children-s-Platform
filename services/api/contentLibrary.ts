/**
 * services/api/contentLibrary.ts
 * API hooks for the Content Library feature.
 * Manages the curated content library and per-child content preferences.
 */
import { useState, useEffect, useCallback } from 'react';
import { getClient } from './client';
import type { ContentItem, ChildContentPreference, ContentType } from './types';
import useAuthStore from '../../store/useAuthStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContentLibraryItem extends ContentItem {
  preference?: ChildContentPreference;
}

export interface ContentLibraryFilter {
  category?: string;
  type?: ContentType;
  searchQuery?: string;
}

// ─── Hook: useContentLibrary ─────────────────────────────────────────────────
// Fetches all published content items with per-child preference state.
// Used by the Parent Dashboard "Content Library" screen.

export function useContentLibrary(childId: string | null, filter?: ContentLibraryFilter) {
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!childId) return;
    setIsLoading(true);
    setError(null);

    try {
      const client = getClient();

      // Fetch all published content items
      let contentQuery = client
        .from('content_items')
        .select('*')
        .eq('is_active', true)
        .in('status', ['published', 'draft'])
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (filter?.category) {
        contentQuery = contentQuery.eq('category', filter.category);
      }
      if (filter?.type) {
        contentQuery = contentQuery.eq('type', filter.type);
      }
      if (filter?.searchQuery) {
        contentQuery = contentQuery.ilike('title', `%${filter.searchQuery}%`);
      }

      const { data: contentItems, error: contentError } = await contentQuery;
      if (contentError) throw new Error(contentError.message);

      // Fetch child's content preferences
      const { data: preferences, error: prefError } = await client
        .from('child_content_preferences')
        .select('*')
        .eq('child_id', childId);
      if (prefError) throw new Error(prefError.message);

      // Merge content items with preferences
      const prefMap = new Map<string, ChildContentPreference>();
      (preferences ?? []).forEach((p: ChildContentPreference) => {
        prefMap.set(p.content_id, p);
      });

      const merged: ContentLibraryItem[] = (contentItems ?? []).map((item: ContentItem) => ({
        ...item,
        preference: prefMap.get(item.id) ?? undefined,
      }));

      setItems(merged);
    } catch (err: any) {
      setError(err?.message || 'Failed to load content library');
    } finally {
      setIsLoading(false);
    }
  }, [childId, filter?.category, filter?.type, filter?.searchQuery]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, isLoading, error, refetch: fetch };
}

// ─── Hook: useContentCategories ──────────────────────────────────────────────
// Returns distinct categories from the content library for tab rendering.

export function useContentCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const client = getClient();
        const { data, error } = await client
          .from('content_items')
          .select('category')
          .eq('is_active', true)
          .eq('status', 'published');

        if (error) throw new Error(error.message);

        const unique = [...new Set((data ?? []).map((d: { category: string }) => d.category))];
        setCategories(unique.sort());
      } catch {
        // Fallback to known categories
        setCategories(['story', 'game', 'video', 'creative']);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { categories, isLoading };
}

// ─── Mutation: toggleContentPreference ───────────────────────────────────────
// Toggles a single content item on/off for a specific child.

export async function toggleContentPreference(
  childId: string,
  contentId: string,
  enabled: boolean,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const client = getClient();
    const { error } = await client
      .from('child_content_preferences')
      .upsert(
        {
          child_id: childId,
          content_id: contentId,
          enabled,
          added_by: 'parent',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'child_id,content_id' },
      );

    if (error) throw new Error(error.message);
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update preference' };
  }
}

// ─── Mutation: bulkToggleCategory ────────────────────────────────────────────
// Enable or disable all content items in a category for a specific child.

export async function bulkToggleCategory(
  childId: string,
  category: string,
  enabled: boolean,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const client = getClient();

    // Get all content items in this category
    const { data: items, error: fetchError } = await client
      .from('content_items')
      .select('id')
      .eq('category', category)
      .eq('is_active', true)
      .eq('status', 'published');

    if (fetchError) throw new Error(fetchError.message);
    if (!items || items.length === 0) return { success: true, error: null };

    // Upsert preferences for all items
    const records = items.map((item: { id: string }) => ({
      child_id: childId,
      content_id: item.id,
      enabled,
      added_by: 'parent' as const,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await client
      .from('child_content_preferences')
      .upsert(records, { onConflict: 'child_id,content_id' });

    if (upsertError) throw new Error(upsertError.message);
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update category preferences' };
  }
}

// ─── Mutation: seedPreferencesForChild ───────────────────────────────────────
// Call the DB function to auto-create preferences for a newly paired child.

export async function seedPreferencesForChild(
  childId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const client = getClient();
    const { error } = await client.rpc('seed_child_content_preferences', {
      p_child_id: childId,
    });
    if (error) throw new Error(error.message);
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to seed preferences' };
  }
}
