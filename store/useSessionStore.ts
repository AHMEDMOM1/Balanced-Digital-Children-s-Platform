/**
 * Zustand Store — Child Session State
 * Tracks active session time, completion, and session count for the day.
 */
import { create } from 'zustand';
import { sessionManager } from '../services/resilience/sessionManager';
import { eventLogger } from '../services/resilience/eventLogger';
import { timeSync } from '../services/resilience/timeSync';
import useAuthStore from './useAuthStore';
import type { RealtimeCommand } from '../services/realtime/types';

export type SessionStatus = 'active' | 'paused' | 'ended';
export type ActivityType = 'story' | 'game' | 'video' | 'creative';

export interface SessionState {
    isSessionActive: boolean;
    sessionStartTime: number | null;
    elapsedSeconds: number;
    sessionsUsedToday: number;
    isPaused: boolean;
    remainingMinutes: number;
    isPauseOverlayVisible: boolean;
    lastTickAt: number | null;
    wasOffline: boolean;
    serverTimeOffset: number;

    // Realtime command state (FR-007, FR-008, FR-011)
    status: SessionStatus;
    blockedCategories: string[];
    processedCommandIds: Set<string>;

    // Activity tracking for heartbeat enrichment (US2)
    currentActivity: ActivityType | null;
    currentContentId: string | null;

    startSession: () => void;
    endSession: () => void;
    updateElapsed: (seconds: number) => void;
    tick: () => void;
    resetDaily: () => void;
    setPaused: (paused: boolean) => void;
    updateRemainingMinutes: (minutes: number) => void;
    handleReconnect: () => void;
    setWasOffline: (offline: boolean) => void;
    restoreFromSnapshot: () => Promise<void>;
    applyServerTime: (serverTimestampMs: number) => void;
    applyCommand: (cmd: RealtimeCommand) => void;
    setCurrentActivity: (activity: ActivityType | null, contentId?: string) => void;
}

const useSessionStore = create<SessionState>((set, get) => ({
    isSessionActive: false,
    sessionStartTime: null,
    elapsedSeconds: 0,
    sessionsUsedToday: 0,
    isPaused: false,
    remainingMinutes: 0,
    isPauseOverlayVisible: false,
    lastTickAt: null,
    wasOffline: false,
    serverTimeOffset: 0,

    status: 'active' as SessionStatus,
    blockedCategories: [],
    processedCommandIds: new Set<string>(),

    currentActivity: null,
    currentContentId: null,

    startSession: () => {
        const now = Date.now();
        timeSync.sync().then((serverMs) => {
            set({ serverTimeOffset: serverMs - Date.now() });
        }).catch(() => {});
        set({
            isSessionActive: true,
            sessionStartTime: now,
            elapsedSeconds: 0,
            lastTickAt: now,
        });
    },

    endSession: () => {
        const state = get();
        sessionManager.clear();
        eventLogger.log({
            eventType: 'session_end',
            success: true,
            screen: 'session',
            details: { action: 'end', total: state.elapsedSeconds },
        });
        set((state) => ({
            isSessionActive: false,
            sessionStartTime: null,
            elapsedSeconds: 0,
            sessionsUsedToday: state.sessionsUsedToday + 1,
            lastTickAt: null,
        }));
    },

    updateElapsed: (seconds: number) =>
        set({ elapsedSeconds: seconds }),

    tick: () =>
        set((state) => {
            const updated = {
                elapsedSeconds: state.elapsedSeconds + 1,
                lastTickAt: Date.now(),
            };

            if (updated.elapsedSeconds % 30 === 0) {
                const childId = useAuthStore.getState().childData?.id ?? 'unknown';
                sessionManager.save({
                    childId,
                    contentItemId: state.currentContentId ?? 'active',
                    activityType: state.currentActivity ?? 'story',
                    elapsedSeconds: updated.elapsedSeconds,
                    sessionStartedAt: new Date(state.sessionStartTime ?? Date.now()).toISOString(),
                    lastSavedAt: new Date().toISOString(),
                    dailyLimitSeconds: state.remainingMinutes * 60,
                });
            }

            return updated;
        }),

    resetDaily: () =>
        set({
            sessionsUsedToday: 0,
            isSessionActive: false,
            sessionStartTime: null,
            elapsedSeconds: 0,
            isPaused: false,
            remainingMinutes: 0,
            isPauseOverlayVisible: false,
            lastTickAt: null,
            wasOffline: false,
        }),

    setPaused: (paused: boolean) =>
        set({ 
            isPaused: paused,
            isPauseOverlayVisible: paused,
        }),

    updateRemainingMinutes: (minutes: number) => {
        set({ remainingMinutes: minutes });
        if (minutes <= 0) {
            get().endSession();
        }
    },

    setWasOffline: (offline: boolean) => set({ wasOffline: offline }),

    handleReconnect: () => {
        const { lastTickAt, isSessionActive, elapsedSeconds } = get();
        set({ wasOffline: false });
        
        if (lastTickAt && isSessionActive) {
            const missedSeconds = Math.floor((Date.now() - lastTickAt) / 1000);
            if (missedSeconds > 0) {
                set({ elapsedSeconds: elapsedSeconds + missedSeconds });
            }
        }
    },

    restoreFromSnapshot: async () => {
        const snapshot = await sessionManager.restore();
        if (!snapshot) return;

        set({
            isSessionActive: true,
            sessionStartTime: new Date(snapshot.sessionStartedAt).getTime(),
            elapsedSeconds: snapshot.elapsedSeconds,
            lastTickAt: Date.now(),
            remainingMinutes: Math.ceil(snapshot.dailyLimitSeconds / 60),
        });

        eventLogger.log({
            eventType: 'session_restore',
            success: true,
            screen: 'session',
            details: { restoredElapsed: snapshot.elapsedSeconds },
        });
    },

    applyServerTime: (serverTimestampMs: number) => {
        const offset = serverTimestampMs - Date.now();
        set({ serverTimeOffset: offset });
    },

    setCurrentActivity: (activity, contentId) => set({
        currentActivity: activity,
        currentContentId: contentId ?? null,
    }),

    applyCommand: (cmd: RealtimeCommand) => {
        const state = get();

        // Idempotency: skip if already processed (FR-008)
        if (state.processedCommandIds.has(cmd.command_id)) return;

        const newIds = new Set(state.processedCommandIds);
        newIds.add(cmd.command_id);

        switch (cmd.command_type) {
            case 'pause':
                set({ status: 'paused', isPaused: true, isPauseOverlayVisible: true, processedCommandIds: newIds });
                break;

            case 'resume':
                set({ status: 'active', isPaused: false, isPauseOverlayVisible: false, processedCommandIds: newIds });
                break;

            case 'force_end':
                set({ status: 'ended', isSessionActive: false, processedCommandIds: newIds });
                sessionManager.clear();
                eventLogger.log({ eventType: 'session_end', success: true, screen: 'session', details: { action: 'force_end', command_id: cmd.command_id } });
                break;

            case 'time_update': {
                const minutes: number = cmd.payload?.remaining_minutes ?? 0;
                set({ remainingMinutes: minutes, processedCommandIds: newIds });
                if (minutes <= 0) {
                    set({ status: 'ended', isSessionActive: false });
                    sessionManager.clear();
                }
                break;
            }

            case 'category_block': {
                const category: string = cmd.payload?.category;
                const isAllowed: boolean = cmd.payload?.is_allowed !== false;
                const current = state.blockedCategories;
                const updated = isAllowed
                    ? current.filter((c) => c !== category)
                    : current.includes(category) ? current : [...current, category];
                set({ blockedCategories: updated, processedCommandIds: newIds });
                break;
            }

            default:
                set({ processedCommandIds: newIds });
        }
    },
}));

export default useSessionStore;
