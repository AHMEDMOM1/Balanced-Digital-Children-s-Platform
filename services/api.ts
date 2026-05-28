/**
 * API Service — HTTP client for SafePlay Timer backend.
 * Centralizes all REST API calls with auth headers and error handling.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Auto-detect server URL:
// - Web browser → localhost works fine
// - Native (Expo) → use the dev machine's IP from debuggerHost
function getApiBase(): string {
    const PORT = 3001;
    if (Platform.OS === 'web') {
        return `http://localhost:${PORT}/api`;
    }
    // Expo provides the dev machine IP via debuggerHost (e.g. "192.168.5.11:8081")
    const debuggerHost = Constants.expoConfig?.hostUri
        || Constants.manifest2?.extra?.expoGo?.debuggerHost
        || Constants.manifest?.debuggerHost;
    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:${PORT}/api`;
    }
    // Fallback
    return `http://localhost:${PORT}/api`;
}

const API_BASE = getApiBase();

// Export for use in login/register screens
export { API_BASE };

// ── Cross-platform storage (localStorage on web, AsyncStorage on native) ──
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            try { return window.localStorage.getItem(key); } catch { return null; }
        }
        try {
            const AS = require('@react-native-async-storage/async-storage').default;
            return await AS.getItem(key);
        } catch { return null; }
    },
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            try { window.localStorage.setItem(key, value); } catch {}
            return;
        }
        try {
            const AS = require('@react-native-async-storage/async-storage').default;
            await AS.setItem(key, value);
        } catch {}
    },
    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            try { window.localStorage.removeItem(key); } catch {}
            return;
        }
        try {
            const AS = require('@react-native-async-storage/async-storage').default;
            await AS.removeItem(key);
        } catch {}
    },
};

export { storage };

// ── Token management ────────────────────────────────
let authToken: string | null = null;

export async function setToken(token: string) {
    authToken = token;
    await storage.setItem('@safeplay_token', token);
}

export async function getToken(): Promise<string | null> {
    if (authToken) return authToken;
    authToken = await storage.getItem('@safeplay_token');
    return authToken;
}

export async function clearToken() {
    authToken = null;
    await storage.removeItem('@safeplay_token');
}

// ── HTTP helpers ────────────────────────────────────
async function request<T = any>(
    method: string,
    path: string,
    body?: Record<string, any>,
): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(data.error || 'Request failed', response.status);
    }

    return data as T;
}

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

// ── Auth API ────────────────────────────────────────
export const authAPI = {
    register: (name: string, email: string, pin: string) =>
        request<{
            token: string;
            family_code: string;
            parent: { id: string; name: string; email: string; family_id: string };
        }>('POST', '/auth/register', { name, email, pin }),

    login: (email: string, pin: string) =>
        request<{
            token: string;
            parent: { id: string; name: string; email: string; family_id: string; language: string };
            family_code: string;
            children: Array<{ id: string; name: string; age: number; avatar_color: string; is_active: boolean }>;
        }>('POST', '/auth/login', { email, pin }),

    joinFamily: (familyCode: string, childName: string) =>
        request<{
            token: string;
            child: { id: string; name: string; family_id: string };
            family_id: string;
        }>('POST', '/auth/join-family', { family_code: familyCode, child_name: childName }),

    verifyPin: (pin: string) =>
        request<{ valid: boolean }>('POST', '/auth/verify-pin', { pin }),
};

// ── Children API ────────────────────────────────────
export const childrenAPI = {
    list: () =>
        request<{ children: any[] }>('GET', '/children'),

    get: (id: string) =>
        request<{ child: any }>('GET', `/children/${id}`),

    create: (data: { name: string; age?: number; birthday?: string; avatar_color?: string }) =>
        request<{ child: any }>('POST', '/children', data),

    update: (id: string, data: Partial<{ name: string; age: number; birthday: string; avatar_color: string }>) =>
        request<{ child: any }>('PUT', `/children/${id}`, data),

    delete: (id: string) =>
        request<{ deleted: boolean }>('DELETE', `/children/${id}`),
};

// ── Settings API ────────────────────────────────────
export const settingsAPI = {
    get: (childId: string) =>
        request<{ settings: any }>('GET', `/settings/${childId}`),

    update: (childId: string, data: Partial<{
        daily_time_limit_minutes: number;
        sessions_per_day: number;
        stories_enabled: boolean;
        games_enabled: boolean;
        creative_enabled: boolean;
        videos_enabled: boolean;
    }>) =>
        request<{ settings: any }>('PUT', `/settings/${childId}`, data),

    pause: (childId: string, paused: boolean) =>
        request<{ childId: string; paused: boolean }>('PUT', `/settings/${childId}/pause`, { paused }),
};

// ── Sessions API ────────────────────────────────────
export const sessionsAPI = {
    start: (activityType: string, childId?: string) =>
        request<{ session: any }>('POST', '/sessions/start', {
            activity_type: activityType,
            ...(childId ? { child_id: childId } : {}),
        }),

    end: (sessionId: string) =>
        request<{ session: any; daily: any }>('PUT', `/sessions/${sessionId}/end`),

    heartbeat: (sessionId: string, elapsedSeconds: number) =>
        request<{ ok: boolean }>('PUT', `/sessions/${sessionId}/heartbeat`, {
            elapsed_seconds: elapsedSeconds,
        }),

    getActive: (childId: string) =>
        request<{ session: any | null }>('GET', `/sessions/${childId}/active`),

    getHistory: (childId: string, limit = 20) =>
        request<{ sessions: any[] }>('GET', `/sessions/${childId}/history?limit=${limit}`),
};

// ── Reports API ─────────────────────────────────────
export const reportsAPI = {
    daily: (childId: string, date?: string) =>
        request<{ date: string; usage: any; sessions: any[] }>(
            'GET', `/reports/${childId}/daily${date ? `?date=${date}` : ''}`
        ),

    weekly: (childId: string, start?: string) =>
        request<{
            start: string; end: string;
            total_seconds: number; total_sessions: number;
            daily_avg_seconds: number;
            activity_breakdown: Record<string, number>;
            days: any[];
        }>('GET', `/reports/${childId}/weekly${start ? `?start=${start}` : ''}`),

    activityBreakdown: (childId: string, days = 7) =>
        request<{
            period_days: number; total_seconds: number;
            activities: Array<{ name: string; seconds: number; formatted: string; percent: number }>;
        }>('GET', `/reports/${childId}/activity-breakdown?days=${days}`),
};

// ── Health check ────────────────────────────────────
export const healthCheck = () =>
    request<{ status: string; mode: string; connections: number }>('GET', '/health');
