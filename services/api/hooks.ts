import { useState, useCallback, useEffect } from 'react';
import type { ContentItem, ContentType, CategoryPreference, AgeGroup, ApiResponse } from './types';
import { getClient } from './client';
import { signInWithOtp, verifyOtp, logout as authLogout, generateFamilyCode, redeemFamilyCode, verifyParentPin, updateParentPin } from '../auth';
import useAuthStore from '../../store/useAuthStore';
import useDataStore from '../../store/useDataStore';

export { useStories, useStory, logStoryActivity } from './stories';
export { useGames, useGame, logGameActivity } from './games';
export { useVideos, useVideo, logVideoActivity } from './videos';
export { useCreative, useCreativeActivity, logCreativeActivity } from './creative';

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
