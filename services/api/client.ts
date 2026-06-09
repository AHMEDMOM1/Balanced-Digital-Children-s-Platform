import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let supabaseInstance: SupabaseClient | null = null;

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return window.localStorage.getItem(key); } catch { return null; }
    }
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      return await AS.getItem(key);
    } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { window.localStorage.setItem(key, value); } catch {}
      return;
    }
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      await AS.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { window.localStorage.removeItem(key); } catch {}
      return;
    }
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      await AS.removeItem(key);
    } catch {}
  }
};

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase configurations are missing in .env');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      }
    });
  }
  return supabaseInstance;
}

export function getClient(): SupabaseClient {
  return getSupabaseClient();
}

export const supabase = getSupabaseClient();
