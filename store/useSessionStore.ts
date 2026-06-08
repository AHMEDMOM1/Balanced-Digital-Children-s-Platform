/**
 * Zustand Store — Child Session State
 * Tracks active session time, completion, and session count for the day.
 */
import { create } from 'zustand';

export interface SessionState {
    // ── Session Tracking ───────────────────────
    isSessionActive: boolean;
    sessionStartTime: number | null;       // timestamp
    elapsedSeconds: number;
    sessionsUsedToday: number;
    isPaused: boolean;                     // parent can pause remotely
    remainingMinutes: number;              // child's remaining session time
    isPauseOverlayVisible: boolean;        // controls the pause overlay
    lastTickAt: number | null;             // timestamp of last received heartbeat/tick
    wasOffline: boolean;                   // flag for reconnection logic

    // ── Actions ────────────────────────────────
    startSession: () => void;
    endSession: () => void;
    updateElapsed: (seconds: number) => void;
    tick: () => void;
    resetDaily: () => void;
    setPaused: (paused: boolean) => void;
    updateRemainingMinutes: (minutes: number) => void;
    handleReconnect: () => void;
    setWasOffline: (offline: boolean) => void;
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

    startSession: () =>
        set({
            isSessionActive: true,
            sessionStartTime: Date.now(),
            elapsedSeconds: 0,
            lastTickAt: Date.now(),
        }),

    endSession: () =>
        set((state) => ({
            isSessionActive: false,
            sessionStartTime: null,
            elapsedSeconds: 0,
            sessionsUsedToday: state.sessionsUsedToday + 1,
            lastTickAt: null,
        })),

    updateElapsed: (seconds: number) =>
        set({ elapsedSeconds: seconds }),

    tick: () =>
        set((state) => ({ 
            elapsedSeconds: state.elapsedSeconds + 1,
            lastTickAt: Date.now()
        })),

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
            isPauseOverlayVisible: paused
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
    }
}));

export default useSessionStore;
