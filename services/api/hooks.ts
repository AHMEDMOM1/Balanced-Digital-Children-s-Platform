import { useState, useEffect, useCallback } from 'react';
import { getClient } from './client';
import type { ContentItem, ApiResponse, ContentType, CategoryPreference, AgeGroup } from './types';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';
import { signInWithOtp, verifyOtp, logout as authLogout, generateFamilyCode, redeemFamilyCode, verifyParentPin, updateParentPin } from '../auth';

type AgeGroupMap = Record<string, { min: number; max: number }>;

const AGE_GROUP_RANGES: AgeGroupMap = {
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

async function fetchContentByType(
  type: ContentType,
  ageRange: { min: number; max: number } | null,
  allowedCategories: string[],
): Promise<ContentItem[]> {
  const client = getClient();
  let query = client
    .from('content_items')
    .select('*')
    .eq('type', type);

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

function useContent(type: ContentType) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const childData = useAuthStore((s) => s.childData);
  const role = useAuthStore((s) => s.role);

  const cache = useDataStore((s) => s.cache);
  const cacheSetters = useDataStore.getState();

  const cacheKey = `${type}s` as 'stories' | 'games' | 'videos' | 'creative';
  const cachedItems = cache[cacheKey] as ContentItem[];
  const setCache = cacheSetters[`set${type.charAt(0).toUpperCase() + type.slice(1)}s` as 'setStories' | 'setGames' | 'setVideos' | 'setCreative'];

  const fetch = useCallback(async () => {
    if (role !== 'child' || !childData?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const ageRange = await fetchChildAgeGroup(childData.id);
      const allowedCategories = await fetchAllowedCategories(childData.id);
      const items = await fetchContentByType(type, ageRange, allowedCategories);
      setCache(items as ContentItem[] & ContentItem[]);
      setIsOffline(false);
    } catch (err: any) {
      if (cachedItems.length > 0) {
        setIsOffline(true);
      } else {
        setError(err?.message || 'Failed to load content');
      }
    } finally {
      setIsLoading(false);
    }
  }, [type, role, childData?.id, cachedItems.length, setCache]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const data = cachedItems.length > 0 ? cachedItems : null;

  return { data, error, isOffline, isLoading, refetch: fetch } as ApiResponse<ContentItem[]> & { refetch: () => Promise<void> };
}

export function useStories() {
  return useContent('story');
}

export function useGames() {
  return useContent('game');
}

export function useVideos() {
  return useContent('video');
}

export function useCreative() {
  return useContent('creative');
}

async function fetchContentById(id: string): Promise<ContentItem | null> {
  const client = getClient();
  const { data, error } = await client
    .from('content_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as ContentItem;
}

export function useContentById(id: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ContentItem | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const item = await fetchContentById(id);
      setData(item);
    } catch (err: any) {
      setError(err?.message || 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const apiResponse: ApiResponse<ContentItem> = {
    data,
    error,
    isOffline: false,
    isLoading,
  };

  return { ...apiResponse, refetch: fetch };
}

async function fetchCategoriesForChild(childId: string): Promise<CategoryPreference[]> {
  const client = getClient();
  const { data, error } = await client
    .from('category_preferences')
    .select('*')
    .eq('child_id', childId);

  if (error || !data) return [];
  return data as CategoryPreference[];
}

async function upsertCategoryPreference(
  parentId: string,
  childId: string,
  category: string,
  isAllowed: boolean,
): Promise<boolean> {
  const client = getClient();
  const { error } = await client
    .from('category_preferences')
    .upsert(
      { parent_id: parentId, child_id: childId, category, is_allowed: isAllowed },
      { onConflict: 'parent_id, child_id, category' },
    );

  return !error;
}

export function useCategoryPreferences() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentData = useAuthStore((s) => s.parentData);
  const children = useAuthStore((s) => s.children);
  const cache = useDataStore((s) => s.cache);
  const setCategoryPreferences = useDataStore.getState().setCategoryPreferences;

  const fetch = useCallback(async () => {
    if (!parentData?.id || children.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const allPrefs: CategoryPreference[] = [];
      for (const child of children) {
        const prefs = await fetchCategoriesForChild(child.id);
        allPrefs.push(...prefs);
      }
      setCategoryPreferences(allPrefs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, [parentData?.id, children.length, setCategoryPreferences]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const toggleCategory = useCallback(
    async (childId: string, category: string, isAllowed: boolean): Promise<boolean> => {
      if (!parentData?.id) return false;
      const success = await upsertCategoryPreference(parentData.id, childId, category, isAllowed);
      if (success) {
        await fetch();
      }
      return success;
    },
    [parentData?.id, fetch],
  );

  return {
    preferences: cache.categoryPreferences,
    isLoading,
    error,
    refetch: fetch,
    toggleCategory,
  };
}

export function useAuth() {
  const store = useAuthStore();

  const sendOtp = async (email: string) => {
    store.clearError();
    const res = await signInWithOtp(email);
    if (!res.success) {
      useAuthStore.setState({ error: res.error || 'Failed to send OTP' });
      throw new Error(res.error);
    }
  };

  const verify = async (email: string, code: string) => {
    store.clearError();
    try {
      useAuthStore.setState({ isLoading: true });
      const authState = await verifyOtp(email, code);
      useAuthStore.setState({ ...authState, isLoading: false });
    } catch (err: any) {
      useAuthStore.setState({ isLoading: false, error: err.message });
      throw err;
    }
  };

  const logoutUser = async () => {
    await authLogout();
    await store.logout();
  };

  return {
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    role: store.role,
    parentData: store.parentData,
    childData: store.childData,
    children: store.children,
    sendOtp,
    verifyOtp: verify,
    logout: logoutUser,
    clearError: store.clearError,
  };
}

export function useFamilyCode() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateFamilyCode();
      setCode(data.code);
      setExpiresAt(data.expiresAt);
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const redeem = async (inputCode: string, name: string, age: AgeGroup) => {
    setError(null);
    try {
      useAuthStore.setState({ isLoading: true });
      const authState = await redeemFamilyCode(inputCode, name, age);
      useAuthStore.setState({ ...authState, isLoading: false });
    } catch (err: any) {
      useAuthStore.setState({ isLoading: false, error: err.message });
      throw err;
    }
  };

  return { code, expiresAt, isGenerating, error, generate, redeem };
}

export function useParentPin() {
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = async (pin: string): Promise<boolean> => {
    setIsVerifying(true);
    try {
      return await verifyParentPin(pin);
    } finally {
      setIsVerifying(false);
    }
  };

  const update = async (newPin: string) => {
    await updateParentPin(newPin);
  };

  return { verify, update, isVerifying };
}
