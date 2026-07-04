import { getDB } from './db';
import { getClient } from '../api/client';
import { generateCommandId } from '../utils/uuid';

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
  | 'battery_saver_exit'
  | 'session_end';

export interface ResilienceEvent {
  id: string;
  eventType: ResilienceEventType;
  timestamp: string;
  success: boolean;
  screen: string;
  details?: Record<string, unknown>;
  synced: boolean;
}

const FLUSH_INTERVAL_MS = 5 * 60 * 1000;
const FLUSH_BATCH_SIZE = 50;
const MAX_RECENT_EVENTS = 500;

class EventLogger {
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async log(event: Omit<ResilienceEvent, 'id' | 'timestamp' | 'synced'>): Promise<void> {
    const db = await getDB();
    const id = generateCommandId();
    const timestamp = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO resilience_logs (type, timestamp, context_json, reported)
       VALUES (?, ?, ?, 0)`,
      event.eventType,
      new Date(timestamp).getTime(),
      JSON.stringify({ success: event.success, screen: event.screen, details: event.details ?? null })
    );

    await this.enforceRetentionLimit(db);
  }

  async getPending(): Promise<ResilienceEvent[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<{
      id: number;
      type: string;
      timestamp: number;
      context_json: string | null;
    }>(
      'SELECT id, type, timestamp, context_json FROM resilience_logs WHERE reported = 0 ORDER BY timestamp ASC LIMIT ?',
      FLUSH_BATCH_SIZE
    );
    return rows.map((r) => {
      const ctx = r.context_json ? JSON.parse(r.context_json) : {};
      return {
        id: String(r.id),
        eventType: r.type as ResilienceEventType,
        timestamp: new Date(r.timestamp).toISOString(),
        success: ctx.success ?? true,
        screen: ctx.screen ?? '',
        details: ctx.details ?? undefined,
        synced: false,
      };
    });
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDB();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE resilience_logs SET reported = 1 WHERE id IN (${placeholders})`,
      ...ids.map(Number)
    );
  }

  async getRecent(limit: number = 20): Promise<ResilienceEvent[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<{
      id: number;
      type: string;
      timestamp: number;
      context_json: string | null;
      reported: number;
    }>(
      'SELECT id, type, timestamp, context_json, reported FROM resilience_logs ORDER BY timestamp DESC LIMIT ?',
      limit
    );
    return rows.map((r) => {
      const ctx = r.context_json ? JSON.parse(r.context_json) : {};
      return {
        id: String(r.id),
        eventType: r.type as ResilienceEventType,
        timestamp: new Date(r.timestamp).toISOString(),
        success: ctx.success ?? true,
        screen: ctx.screen ?? '',
        details: ctx.details ?? undefined,
        synced: r.reported === 1,
      };
    });
  }

  async flush(): Promise<void> {
    try {
      const pending = await this.getPending();
      if (pending.length === 0) return;

      const payload = pending.map((e) => ({
        event_type: e.eventType,
        timestamp: e.timestamp,
        success: e.success,
        screen: e.screen,
        details: e.details,
      }));

      try {
        const client = getClient();
        const { error } = await client.from('resilience_events').insert(payload);
        if (!error) {
          await this.markSynced(pending.map((e) => e.id));
        }
      } catch {
        // silently fail — will retry next flush cycle
      }
    } catch {
      // db error — skip this cycle
    }
  }

  private async enforceRetentionLimit(db: Awaited<ReturnType<typeof getDB>>): Promise<void> {
    await db.runAsync(
      `DELETE FROM resilience_logs WHERE id NOT IN (
        SELECT id FROM resilience_logs ORDER BY timestamp DESC LIMIT ?
      )`,
      MAX_RECENT_EVENTS
    );
  }
}

export const eventLogger = new EventLogger();
