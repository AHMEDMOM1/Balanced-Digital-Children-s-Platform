/**
 * Connectivity Manager Contract
 *
 * Monitors network state and battery saver mode.
 * Used by: services/resilience/connectivityManager.ts
 * Spec ref: FR-002, FR-008, FR-009
 */

export type ConnectivityState = 'online' | 'offline' | 'poor';

export interface ConnectivityManager {
  getState(): ConnectivityState;
  subscribe(callback: (state: ConnectivityState) => void): () => void;
  isBatterySaver(): boolean;
  onBatterySaverChange(callback: (enabled: boolean) => void): () => void;
}
