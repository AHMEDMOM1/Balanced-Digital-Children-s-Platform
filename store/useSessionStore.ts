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

    // ── Actions ────────────────────────────────
    startSession: () => void;
    endSession: () => void;
    updateElapsed: (seconds: number) => void;
    tick: () => void;
    resetDaily: () => void;
    setPaused: (paused: boolean) => void;
}

const useSessionStore = create<SessionState>((set) => ({
    isSessionActive: false,
    sessionStartTime: null,
    elapsedSeconds: 0,
    sessionsUsedToday: 0,
    isPaused: false,

    startSession: () =>
        set({
            isSessionActive: true,
            sessionStartTime: Date.now(),
            elapsedSeconds: 0,
        }),

    endSession: () =>
        set((state) => ({
            isSessionActive: false,
            sessionStartTime: null,
            elapsedSeconds: 0,
            sessionsUsedToday: state.sessionsUsedToday + 1,
        })),

    updateElapsed: (seconds: number) =>
        set({ elapsedSeconds: seconds }),

    tick: () =>
        set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

    resetDaily: () =>
        set({
            sessionsUsedToday: 0,
            isSessionActive: false,
            sessionStartTime: null,
            elapsedSeconds: 0,
            isPaused: false,
        }),

    setPaused: (paused: boolean) =>
        set({ isPaused: paused }),
}));

export default useSessionStore;
