/**
 * Event Logger Contract
 *
 * Logs resilience events locally and batches for remote reporting.
 * Used by: services/resilience/eventLogger.ts
 * Spec ref: FR-010
 */

export type ResilienceEventType =
  | 'offline_transition'
  | 'cache_fallback'
  | 'session_restore'
  | 'animation_degraded'
  | 'animation_restored'
  | 'pin_recovery_attempt'
  | 'pin_recovery_success'
  | 'pin_recovery_lockout'
  | 'battery_saver_enter'
  | 'battery_saver_exit';

export interface ResilienceEvent {
  id: string;
  eventType: ResilienceEventType;
  timestamp: string;
  success: boolean;
  screen: string;
  details?: Record<string, unknown>;
  synced: boolean;
}

export interface EventLogger {
  log(event: Omit<ResilienceEvent, 'id' | 'timestamp' | 'synced'>): Promise<void>;
  getPending(): Promise<ResilienceEvent[]>;   // unsynced events
  markSynced(ids: string[]): Promise<void>;
  getRecent(limit?: number): Promise<ResilienceEvent[]>;
}
