import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as Battery from 'expo-battery';
import { AppState, AppStateStatus } from 'react-native';
import type { EventSubscription } from 'expo-modules-core';

export type ConnectivityState = 'online' | 'offline' | 'poor';

type ConnectivityListener = (state: ConnectivityState) => void;
type BatterySaverListener = (enabled: boolean) => void;

const FLAP_THRESHOLD_MS = 30_000;
const FLAP_COUNT_TRIGGER = 3;
const DEBOUNCE_MS = 3_000;

export class ConnectivityManager {
  private currentState: ConnectivityState = 'online';
  private batterySaver: boolean = false;
  private connListeners = new Set<ConnectivityListener>();
  private batteryListeners = new Set<BatterySaverListener>();
  private flapTimestamps: number[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubNetInfo: (() => void) | null = null;
  private unsubBattery: EventSubscription | null = null;
  private unsubAppState: { remove: () => void } | null = null;
  private lastAppState: AppStateStatus = 'active';

  async start(): Promise<void> {
    this.unsubNetInfo = NetInfo.addEventListener(this.onNetInfoChange);
    const batterySaver = await Battery.isLowPowerModeEnabledAsync();
    this.batterySaver = batterySaver;
    this.unsubBattery = Battery.addLowPowerModeListener(({ lowPowerMode }) => {
      this.batterySaver = lowPowerMode;
      this.batteryListeners.forEach((cb) => cb(lowPowerMode));
    });

    this.unsubAppState = AppState.addEventListener('change', (nextState) => {
      if (this.lastAppState === 'background' && nextState === 'active') {
        Battery.isLowPowerModeEnabledAsync().then((enabled) => {
          if (enabled !== this.batterySaver) {
            this.batterySaver = enabled;
            this.batteryListeners.forEach((cb) => cb(enabled));
          }
        });
      }
      this.lastAppState = nextState;
    });
  }

  stop(): void {
    this.unsubNetInfo?.();
    this.unsubBattery?.remove();
    this.unsubAppState?.remove();
    this.connListeners.clear();
    this.batteryListeners.clear();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  getState(): ConnectivityState {
    return this.currentState;
  }

  isBatterySaver(): boolean {
    return this.batterySaver;
  }

  getReconnectionInterval(): number {
    return this.batterySaver ? 15_000 : 1_000;
  }

  subscribe(callback: ConnectivityListener): () => void {
    callback(this.currentState); // emit current state immediately so new subscribers don't miss offline
    this.connListeners.add(callback);
    return () => this.connListeners.delete(callback);
  }

  onBatterySaverChange(callback: BatterySaverListener): () => void {
    this.batteryListeners.add(callback);
    return () => this.batteryListeners.delete(callback);
  }

  private onNetInfoChange = (state: NetInfoState): void => {
    const raw: ConnectivityState =
      !state.isConnected || state.isInternetReachable === false
        ? 'offline'
        : 'online';

    this.trackFlap(raw);

    const isFlapping = this.isFlapping();
    if (isFlapping) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.applyState(raw);
        this.debounceTimer = null;
      }, DEBOUNCE_MS);
      return;
    }

    this.applyState(raw);
  };

  private trackFlap(newState: ConnectivityState): void {
    const now = Date.now();
    this.flapTimestamps = this.flapTimestamps.filter((t) => now - t < FLAP_THRESHOLD_MS);
    this.flapTimestamps.push(now);
  }

  private isFlapping(): boolean {
    return this.flapTimestamps.length > FLAP_COUNT_TRIGGER;
  }

  private applyState(state: ConnectivityState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.connListeners.forEach((cb) => cb(state));
  }
}

export const connectivityManager = new ConnectivityManager();
