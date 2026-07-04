import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChildPairingState } from '../services/api/types';

const PAIRING_STATE_KEY = '@child_pairing_state';
const DEVICE_ROLE_KEY = '@device_role';

export type DeviceRole = 'parent' | 'child';

interface PairingStoreState {
  pairingState: ChildPairingState | null;
  deviceRole: DeviceRole | null;
  isLoading: boolean;
  loadPairingState: () => Promise<void>;
  loadDeviceRole: () => Promise<void>;
  saveDeviceRole: (role: DeviceRole) => Promise<void>;
  savePairingState: (state: ChildPairingState) => Promise<void>;
  clearPairingState: () => Promise<void>;
}

const usePairingStore = create<PairingStoreState>((set) => ({
  pairingState: null,
  deviceRole: null,
  isLoading: false,

  loadDeviceRole: async () => {
    try {
      const role = await AsyncStorage.getItem(DEVICE_ROLE_KEY);
      if (role === 'parent' || role === 'child') {
        set({ deviceRole: role });
      }
    } catch {
      // ignore — deviceRole stays null
    }
  },

  saveDeviceRole: async (role: DeviceRole) => {
    await AsyncStorage.setItem(DEVICE_ROLE_KEY, role);
    set({ deviceRole: role });
  },

  loadPairingState: async () => {
    set({ isLoading: true });
    try {
      const [stateJson, role] = await Promise.all([
        AsyncStorage.getItem(PAIRING_STATE_KEY),
        AsyncStorage.getItem(DEVICE_ROLE_KEY),
      ]);
      const pairingState = stateJson ? (JSON.parse(stateJson) as ChildPairingState) : null;
      const deviceRole = (role === 'parent' || role === 'child') ? role : null;
      set({ pairingState, deviceRole, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  savePairingState: async (state: ChildPairingState) => {
    await AsyncStorage.setItem(PAIRING_STATE_KEY, JSON.stringify(state));
    set({ pairingState: state });
  },

  clearPairingState: async () => {
    await AsyncStorage.removeItem(PAIRING_STATE_KEY);
    set({ pairingState: null });
  },
}));

export default usePairingStore;
