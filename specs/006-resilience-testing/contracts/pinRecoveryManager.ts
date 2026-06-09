/**
 * PIN Recovery Manager Contract
 *
 * Handles two-step PIN recovery with rate limiting.
 * Used by: services/resilience/pinRecoveryManager.ts
 * Spec ref: FR-005
 */

export interface RecoveryAttempt {
  email: string;
  attemptCount: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
  consecutiveLockedHours: number;
}

export interface PinRecoveryManager {
  attempt(email: string): Promise<{ allowed: boolean; reason?: string }>;
  verifyEmail(token: string): Promise<boolean>;
  verifySecurityQuestion(answer: string): Promise<boolean>;
  resetPin(newPin: string): Promise<boolean>;
  getLockoutStatus(): Promise<{ locked: boolean; remainingMs: number }>;
}
