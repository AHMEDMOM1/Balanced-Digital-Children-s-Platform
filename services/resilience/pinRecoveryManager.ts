import { getDB } from './db';
import { getClient } from '../api/client';
import { generateCommandId } from '../utils/uuid';

interface RecoveryAttempt {
  email: string;
  attemptCount: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
  consecutiveLockedHours: number;
}

const MAX_ATTEMPTS_PER_HOUR = 3;
const COOLDOWN_HOURS = 24;
const CONSECUTIVE_LOCKOUT_TRIGGER = 3;
const EMAIL_LINK_TTL_MS = 15 * 60 * 1000;

// Token type stored in resilience_logs
const TOKEN_LOG_TYPE = 'pin_recovery_token';

export class PinRecoveryManager {
  // In-memory cache; loaded from DB on verifyEmail to survive app restarts
  private recoveryTokens = new Map<string, { token: string; expiresAt: number }>();
  // Track which email is in-progress so resetPin can look it up
  private pendingEmail: string | null = null;

  async attempt(email: string): Promise<{ allowed: boolean; reason?: string }> {
    const record = await this.getRecord(email);
    const now = Date.now();

    if (record.lockedUntil && now < record.lockedUntil) {
      const remaining = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, reason: `Locked out. Try again in ${remaining}s.` };
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
      record.attemptCount = 0;
      record.firstAttemptAt = 0;
      record.lockedUntil = null;
      record.consecutiveLockedHours = 0;
    }

    const hourWindow = record.firstAttemptAt > 0 && now - record.firstAttemptAt < 3600_000;

    if (hourWindow && record.attemptCount >= MAX_ATTEMPTS_PER_HOUR) {
      record.consecutiveLockedHours++;
      if (record.consecutiveLockedHours >= CONSECUTIVE_LOCKOUT_TRIGGER) {
        record.lockedUntil = now + COOLDOWN_HOURS * 3600_000;
        record.attemptCount = 0;
        record.firstAttemptAt = 0;
        record.consecutiveLockedHours = 0;
      } else {
        record.attemptCount = 0;
        record.firstAttemptAt = 0;
      }
      await this.saveRecord(record);
      const reason = record.lockedUntil
        ? `Too many attempts. Locked for ${COOLDOWN_HOURS}h.`
        : 'Too many attempts. Try again later.';
      return { allowed: false, reason };
    }

    if (!hourWindow) {
      record.attemptCount = 0;
      record.firstAttemptAt = now;
      record.consecutiveLockedHours = 0;
    }

    record.attemptCount++;
    await this.saveRecord(record);

    return { allowed: true };
  }

  generateToken(email: string): string {
    this.invalidateExistingTokens(email);
    const token = generateCommandId();
    const expiresAt = Date.now() + EMAIL_LINK_TTL_MS;
    this.recoveryTokens.set(email, { token, expiresAt });
    this.pendingEmail = email;
    // Persist to DB so the token survives an app restart within the TTL window
    this.persistToken(email, token, expiresAt).catch(() => {});
    return token;
  }

  async verifyEmail(token: string): Promise<boolean> {
    // First try in-memory cache, then fall back to DB (covers app-restart scenario)
    for (const [email, entry] of this.recoveryTokens.entries()) {
      if (entry.token === token) {
        if (Date.now() > entry.expiresAt) {
          this.recoveryTokens.delete(email);
          return false;
        }
        this.pendingEmail = email;
        return true;
      }
    }

    // DB fallback
    const row = await this.loadPersistedToken(token);
    if (!row) return false;
    if (Date.now() > row.expiresAt) return false;
    this.recoveryTokens.set(row.email, { token, expiresAt: row.expiresAt });
    this.pendingEmail = row.email;
    return true;
  }

  async verifySecurityQuestion(answer: string): Promise<boolean> {
    if (!answer || !this.pendingEmail) return false;
    try {
      const client = getClient();
      const { data, error } = await client
        .from('profiles')
        .select('security_question_answer_hash')
        .eq('email', this.pendingEmail)
        .eq('role', 'parent')
        .single();

      if (error || !data?.security_question_answer_hash) {
        // Column not yet populated (onboarding flow not built) — fail closed
        return false;
      }

      const hash = await this.hashSha256(answer.trim().toLowerCase());
      return hash === data.security_question_answer_hash;
    } catch {
      return false;
    }
  }

  private async hashSha256(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    const buffer = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async resetPin(newPin: string): Promise<boolean> {
    if (newPin.length < 4 || !this.pendingEmail) return false;
    try {
      const client = getClient();
      // Hash the PIN the same way the auth flow does: store as plain bcrypt would be ideal,
      // but since the app stores unlock_pin_hash we update it directly via Supabase RPC.
      const { error } = await client.rpc('reset_parent_pin', {
        p_email: this.pendingEmail,
        p_new_pin: newPin,
      });
      if (error) return false;
      // Invalidate the token after a successful reset
      this.invalidateExistingTokens(this.pendingEmail);
      this.pendingEmail = null;
      return true;
    } catch {
      return false;
    }
  }

  async getLockoutStatus(): Promise<{ locked: boolean; remainingMs: number }> {
    const email = this.pendingEmail ?? this.recoveryTokens.keys().next().value ?? null;
    if (!email) return { locked: false, remainingMs: 0 };
    const record = await this.getRecord(email);
    if (!record.lockedUntil) return { locked: false, remainingMs: 0 };
    const remaining = record.lockedUntil - Date.now();
    if (remaining <= 0) return { locked: false, remainingMs: 0 };
    return { locked: true, remainingMs: remaining };
  }

  private invalidateExistingTokens(email: string): void {
    this.recoveryTokens.delete(email);
  }

  private async persistToken(email: string, token: string, expiresAt: number): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO resilience_logs (type, timestamp, context_json, reported)
       VALUES (?, ?, ?, 1)`,
      TOKEN_LOG_TYPE,
      Date.now(),
      JSON.stringify({ email, token, expiresAt })
    );
  }

  private async loadPersistedToken(token: string): Promise<{ email: string; expiresAt: number } | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{ context_json: string }>(
      `SELECT context_json FROM resilience_logs
       WHERE type = ? ORDER BY timestamp DESC LIMIT 50`,
      TOKEN_LOG_TYPE
    );
    if (!row) return null;
    const ctx = JSON.parse(row.context_json);
    if (ctx.token !== token) return null;
    return { email: ctx.email, expiresAt: ctx.expiresAt };
  }

  private async getRecord(email: string): Promise<RecoveryAttempt> {
    const db = await getDB();
    const row = await db.getFirstAsync<{
      context_json: string;
    }>(
      `SELECT context_json FROM resilience_logs
       WHERE type = 'pin_recovery_lockout' AND context_json LIKE ?
       ORDER BY timestamp DESC LIMIT 1`,
      `%"email":"${email.replace(/[%_]/g, '\\\\$&')}"%`
    );

    if (!row) {
      return {
        email,
        attemptCount: 0,
        firstAttemptAt: 0,
        lockedUntil: null,
        consecutiveLockedHours: 0,
      };
    }

    const ctx = JSON.parse(row.context_json);
    return {
      email,
      attemptCount: ctx.attemptCount ?? 0,
      firstAttemptAt: ctx.firstAttemptAt ?? 0,
      lockedUntil: ctx.lockedUntil ?? null,
      consecutiveLockedHours: ctx.consecutiveLockedHours ?? 0,
    };
  }

  private async saveRecord(record: RecoveryAttempt): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO resilience_logs (type, timestamp, context_json, reported)
       VALUES (?, ?, ?, 0)`,
      'pin_recovery_lockout',
      Date.now(),
      JSON.stringify({
        email: record.email,
        attemptCount: record.attemptCount,
        firstAttemptAt: record.firstAttemptAt,
        lockedUntil: record.lockedUntil,
        consecutiveLockedHours: record.consecutiveLockedHours,
      })
    );
  }
}

export const pinRecoveryManager = new PinRecoveryManager();
