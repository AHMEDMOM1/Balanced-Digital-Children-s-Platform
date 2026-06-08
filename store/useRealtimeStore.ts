import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeCommand } from '../../services/realtime/types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeState {
  isConnected: boolean;
  isChildOnline: boolean;
  lastHeartbeatAt: number | null;
  appliedCommandIds: string[];
  pendingCommands: RealtimeCommand[];
  channel: RealtimeChannel | null;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setChildOnline: (online: boolean) => void;
  recordHeartbeat: () => void;
  addAppliedCommandId: (id: string) => void;
  isCommandApplied: (id: string) => boolean;
  loadAppliedCommandIds: () => Promise<void>;
  clearAll: () => void;
  setChannel: (channel: RealtimeChannel | null) => void;
}

const STORAGE_KEY = '@safeplay_applied_commands';

// Check if AsyncStorage native module is available
let storageAvailable = true;
try {
  AsyncStorage.getItem('__test__').catch(() => { storageAvailable = false; });
} catch {
  storageAvailable = false;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  isConnected: false,
  isChildOnline: false,
  lastHeartbeatAt: null,
  appliedCommandIds: [],
  pendingCommands: [],
  channel: null,

  setConnected: (connected) => set({ isConnected: connected }),
  
  setChildOnline: (online) => set({ isChildOnline: online }),
  
  recordHeartbeat: () => set({ 
    lastHeartbeatAt: Date.now(),
    isChildOnline: true 
  }),
  
  addAppliedCommandId: (id) => {
    const { appliedCommandIds } = get();
    let newIds = [...appliedCommandIds, id];
    if (newIds.length > 1000) {
      newIds.shift();
    }
    set({ appliedCommandIds: newIds });
    
    if (storageAvailable) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newIds)).catch(err => {
        console.warn('Failed to save applied commands to storage:', err);
      });
    }
  },
  
  isCommandApplied: (id) => {
    return get().appliedCommandIds.includes(id);
  },
  
  loadAppliedCommandIds: async () => {
    if (!storageAvailable) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set({ appliedCommandIds: parsed });
        }
      }
    } catch (err) {
      console.warn('Failed to load applied commands from storage:', err);
    }
  },
  
  clearAll: () => set({
    isConnected: false,
    isChildOnline: false,
    lastHeartbeatAt: null,
    appliedCommandIds: [],
    pendingCommands: [],
    channel: null
  }),

  setChannel: (channel) => set({ channel })
}));
