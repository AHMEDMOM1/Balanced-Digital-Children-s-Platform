import { getDB } from './db';

export interface SessionSnapshot {
  childId: string;
  contentItemId: string;
  activityType: 'story' | 'game' | 'video' | 'creative';
  elapsedSeconds: number;
  sessionStartedAt: string;
  lastSavedAt: string;
  dailyLimitSeconds: number;
}

export class SessionManager {
  async save(snapshot: SessionSnapshot): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO session_persistence
       (id, child_id, content_id, activity_type, elapsed_seconds, start_time, limit_snapshot, last_updated)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      snapshot.childId,
      snapshot.contentItemId,
      snapshot.activityType,
      snapshot.elapsedSeconds,
      new Date(snapshot.sessionStartedAt).getTime(),
      snapshot.dailyLimitSeconds,
      Date.now()
    );
  }

  async restore(): Promise<SessionSnapshot | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{
      child_id: string;
      content_id: string;
      activity_type: string;
      elapsed_seconds: number;
      start_time: number;
      limit_snapshot: number;
      last_updated: number;
    }>('SELECT * FROM session_persistence WHERE id = 1');

    if (!row) return null;

    // Add time elapsed since last save, capped at 30s (spec tolerance for app-kill)
    const gapSeconds = Math.floor((Date.now() - row.last_updated) / 1000);
    const compensatedElapsed = row.elapsed_seconds + Math.min(gapSeconds, 30);

    return {
      childId: row.child_id,
      contentItemId: row.content_id,
      activityType: (row.activity_type as SessionSnapshot['activityType']) ?? 'story',
      elapsedSeconds: compensatedElapsed,
      sessionStartedAt: new Date(row.start_time).toISOString(),
      lastSavedAt: new Date(row.last_updated).toISOString(),
      dailyLimitSeconds: row.limit_snapshot,
    };
  }

  async clear(): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM session_persistence WHERE id = 1');
  }
}

export const sessionManager = new SessionManager();
