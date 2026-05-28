import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContentItem, CategoryPreference, ApiResponse } from '../services/api/types';

interface DataCache {
  stories: ContentItem[];
  games: ContentItem[];
  videos: ContentItem[];
  creative: ContentItem[];
  categoryPreferences: CategoryPreference[];
  lastFetched: number | null;
}

interface DataStoreState {
  cache: DataCache;
  isHydrated: boolean;

  getStories: () => ApiResponse<ContentItem[]>;
  getGames: () => ApiResponse<ContentItem[]>;
  getVideos: () => ApiResponse<ContentItem[]>;
  getCreative: () => ApiResponse<ContentItem[]>;
  getCategoryPreferences: () => ApiResponse<CategoryPreference[]>;

  setStories: (stories: ContentItem[]) => void;
  setGames: (games: ContentItem[]) => void;
  setVideos: (videos: ContentItem[]) => void;
  setCreative: (creative: ContentItem[]) => void;
  setCategoryPreferences: (prefs: CategoryPreference[]) => void;

  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  clearCache: () => void;
}

const CACHE_KEY = '@data_cache';

function cacheToApiResponse<T>(data: T | null, isLoading: boolean, isOffline: boolean): ApiResponse<T> {
  return { data, error: null, isOffline, isLoading };
}

const defaultCache: DataCache = {
  stories: [],
  games: [],
  videos: [],
  creative: [],
  categoryPreferences: [],
  lastFetched: null,
};

const useDataStore = create<DataStoreState>((set, get) => ({
  cache: { ...defaultCache },
  isHydrated: false,

  getStories: () => cacheToApiResponse(get().cache.stories, !get().isHydrated, false),
  getGames: () => cacheToApiResponse(get().cache.games, !get().isHydrated, false),
  getVideos: () => cacheToApiResponse(get().cache.videos, !get().isHydrated, false),
  getCreative: () => cacheToApiResponse(get().cache.creative, !get().isHydrated, false),
  getCategoryPreferences: () => cacheToApiResponse(get().cache.categoryPreferences, !get().isHydrated, false),

  setStories: (stories) => {
    set((state) => ({ cache: { ...state.cache, stories, lastFetched: Date.now() } }));
    get().persist();
  },

  setGames: (games) => {
    set((state) => ({ cache: { ...state.cache, games, lastFetched: Date.now() } }));
    get().persist();
  },

  setVideos: (videos) => {
    set((state) => ({ cache: { ...state.cache, videos, lastFetched: Date.now() } }));
    get().persist();
  },

  setCreative: (creative) => {
    set((state) => ({ cache: { ...state.cache, creative, lastFetched: Date.now() } }));
    get().persist();
  },

  setCategoryPreferences: (prefs) => {
    set((state) => ({ cache: { ...state.cache, categoryPreferences: prefs, lastFetched: Date.now() } }));
    get().persist();
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: DataCache = JSON.parse(raw);
        set({ cache: { ...defaultCache, ...parsed }, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  persist: async () => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(get().cache));
    } catch {
      // Silently fail — cache is best-effort
    }
  },

  clearCache: () => {
    set({ cache: { ...defaultCache } });
    AsyncStorage.removeItem(CACHE_KEY);
  },
}));

export default useDataStore;
