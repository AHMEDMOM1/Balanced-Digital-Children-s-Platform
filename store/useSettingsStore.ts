/**
 * Zustand Store — Parent Settings
 * Manages screen time limits, session config, content filters, and PIN code.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ParentSettings {
    // ── Time Controls ──────────────────────────
    dailyTimeLimitMinutes: number;    // 15–120
    sessionsPerDay: number;           // 1–5

    // ── Content Filters ────────────────────────
    storiesEnabled: boolean;
    gamesEnabled: boolean;
    creativeEnabled: boolean;
    videosEnabled: boolean;

    // ── PIN Lock ───────────────────────────────
    pinCode: string;                  // 4-digit string
    isPinSetup: boolean;

    // ── Actions ────────────────────────────────
    setDailyTimeLimit: (minutes: number) => void;
    setSessionsPerDay: (count: number) => void;
    toggleStories: () => void;
    toggleGames: () => void;
    toggleCreative: () => void;
    toggleVideos: () => void;
    setPinCode: (pin: string) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}

const STORAGE_KEY = '@parent_settings';

// Check if AsyncStorage native module is available
let storageAvailable = true;
try {
    AsyncStorage.getItem('__test__').catch(() => { storageAvailable = false; });
} catch {
    storageAvailable = false;
}

const useSettingsStore = create<ParentSettings>((set, get) => ({
    dailyTimeLimitMinutes: 45,
    sessionsPerDay: 3,
    storiesEnabled: true,
    gamesEnabled: true,
    creativeEnabled: true,
    videosEnabled: true,
    pinCode: '1234',
    isPinSetup: false,

    setDailyTimeLimit: (minutes: number) => {
        set({ dailyTimeLimitMinutes: Math.max(15, Math.min(120, minutes)) });
        get().saveSettings();
    },

    setSessionsPerDay: (count: number) => {
        set({ sessionsPerDay: Math.max(1, Math.min(5, count)) });
        get().saveSettings();
    },

    toggleStories: () => {
        set((state) => ({ storiesEnabled: !state.storiesEnabled }));
        get().saveSettings();
    },

    toggleGames: () => {
        set((state) => ({ gamesEnabled: !state.gamesEnabled }));
        get().saveSettings();
    },

    toggleCreative: () => {
        set((state) => ({ creativeEnabled: !state.creativeEnabled }));
        get().saveSettings();
    },

    toggleVideos: () => {
        set((state) => ({ videosEnabled: !state.videosEnabled }));
        get().saveSettings();
    },

    setPinCode: (pin: string) => {
        set({ pinCode: pin, isPinSetup: true });
        get().saveSettings();
    },

    loadSettings: async () => {
        if (!storageAvailable) return;
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                set({
                    dailyTimeLimitMinutes: parsed.dailyTimeLimitMinutes ?? 45,
                    sessionsPerDay: parsed.sessionsPerDay ?? 3,
                    storiesEnabled: parsed.storiesEnabled ?? true,
                    gamesEnabled: parsed.gamesEnabled ?? true,
                    creativeEnabled: parsed.creativeEnabled ?? true,
                    videosEnabled: parsed.videosEnabled ?? true,
                    pinCode: parsed.pinCode ?? '1234',
                    isPinSetup: parsed.isPinSetup ?? false,
                });
            }
        } catch (e) {
            storageAvailable = false;
        }
    },

    saveSettings: async () => {
        if (!storageAvailable) return;
        try {
            const state = get();
            const data = JSON.stringify({
                dailyTimeLimitMinutes: state.dailyTimeLimitMinutes,
                sessionsPerDay: state.sessionsPerDay,
                storiesEnabled: state.storiesEnabled,
                gamesEnabled: state.gamesEnabled,
                creativeEnabled: state.creativeEnabled,
                videosEnabled: state.videosEnabled,
                pinCode: state.pinCode,
                isPinSetup: state.isPinSetup,
            });
            await AsyncStorage.setItem(STORAGE_KEY, data);
        } catch (e) {
            storageAvailable = false;
        }
    },
}));

export default useSettingsStore;
