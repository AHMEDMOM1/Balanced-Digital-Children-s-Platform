import { create } from 'zustand';

/**
 * Ephemeral "unlocked this app session" flag for the parent PIN gate.
 * Deliberately NOT persisted — a fresh cold start must always require PIN
 * re-entry. This is separate from useAuthStore (Supabase session) because it
 * tracks a different lifecycle: "has the PIN been re-entered since the last
 * lock", not "is there a valid auth session".
 */
interface ParentLockState {
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

const useParentLockStore = create<ParentLockState>((set) => ({
  isUnlocked: false,
  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}));

export default useParentLockStore;
