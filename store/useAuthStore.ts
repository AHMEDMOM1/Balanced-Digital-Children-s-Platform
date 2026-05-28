import { create } from 'zustand';
import {
  AuthState,
  loadAuthState,
  logout as logoutService,
} from '../services/auth';

interface AuthStoreState extends AuthState {
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const useAuthStore = create<AuthStoreState>((set) => ({
  isAuthenticated: false,
  role: null,
  token: null,
  parentData: null,
  childData: null,
  children: [],
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      const state = await loadAuthState();
      set({ ...state, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  logout: async () => {
    await logoutService();
    set({
      isAuthenticated: false,
      role: null,
      token: null,
      parentData: null,
      childData: null,
      children: [],
      isLoading: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
