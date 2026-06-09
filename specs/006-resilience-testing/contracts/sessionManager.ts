/**
 * Session Manager Contract
 *
 * Persists and restores active child session across app restarts.
 * Used by: services/resilience/sessionManager.ts
 * Spec ref: FR-003, FR-004
 */

export interface SessionSnapshot {
  childId: string;
  contentItemId: string;
  activityType: 'story' | 'game' | 'video' | 'creative';
  elapsedSeconds: number;
  sessionStartedAt: string;   // ISO 8601
  lastSavedAt: string;        // ISO 8601
  dailyLimitSeconds: number;
}

export interface SessionManager {
  save(snapshot: SessionSnapshot): Promise<void>;
  restore(): Promise<SessionSnapshot | null>;
  clear(): Promise<void>;
}
