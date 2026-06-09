/**
 * Resilience DB — Local SQLite database client
 * Provides initialization, schema migration, and helper utilities
 * for offline caching, session persistence, and resilience logging.
 *
 * Data Model Reference: specs/006-resilience-testing/data-model.md
 */
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens (or returns existing) the resilience SQLite database.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('resilience.db');
    await migrate(db);
  }
  return db;
}

/**
 * Runs all migration statements to create / update tables.
 * Uses IF NOT EXISTS so it is safe to run repeatedly.
 */
async function migrate(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    -- Cached content for offline display (FR-001)
    CREATE TABLE IF NOT EXISTS cached_content (
      id            TEXT    PRIMARY KEY,
      type          TEXT    NOT NULL,   -- 'story' | 'game' | 'video' | 'creative'
      data_json     TEXT    NOT NULL,
      last_synced   INTEGER NOT NULL,   -- Unix epoch ms
      size_bytes    INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_cached_type ON cached_content(type);
    CREATE INDEX IF NOT EXISTS idx_cached_synced ON cached_content(last_synced);

    -- Session persistence for app-kill recovery (FR-003 / FR-004)
    CREATE TABLE IF NOT EXISTS session_persistence (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id        TEXT    NOT NULL,
      content_id      TEXT    NOT NULL,
      activity_type   TEXT    NOT NULL DEFAULT 'story',
      elapsed_seconds INTEGER NOT NULL DEFAULT 0,
      start_time      INTEGER NOT NULL,   -- server-authoritative Unix epoch ms
      limit_snapshot  INTEGER NOT NULL,   -- screen-time limit in seconds
      last_updated    INTEGER NOT NULL    -- Unix epoch ms of last heartbeat
    );

    -- Resilience event log for local + remote reporting (FR-010)
    CREATE TABLE IF NOT EXISTS resilience_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      type          TEXT    NOT NULL,   -- event type enum
      timestamp     INTEGER NOT NULL,   -- Unix epoch ms
      context_json  TEXT,               -- arbitrary JSON context
      reported      INTEGER NOT NULL DEFAULT 0  -- 0 = pending, 1 = synced
    );

    CREATE INDEX IF NOT EXISTS idx_logs_reported ON resilience_logs(reported);

    -- Offline command queue for parent commands received while child is offline (FR-011, FR-018)
    -- Max 50 commands queued; commands older than 24 hours are discarded on reconnect.
    CREATE TABLE IF NOT EXISTS queued_commands (
      command_id    TEXT    PRIMARY KEY,
      command_type  TEXT    NOT NULL,
      sender_id     TEXT    NOT NULL,
      child_id      TEXT,
      payload_json  TEXT    NOT NULL DEFAULT '{}',
      created_at    TEXT    NOT NULL,   -- ISO 8601 from server (authoritative timestamp)
      queued_at     INTEGER NOT NULL    -- local Unix epoch ms when queued
    );

    CREATE INDEX IF NOT EXISTS idx_queued_created ON queued_commands(created_at);
  `);

  // Additive column migrations — safe to run on existing databases
  // SQLite has no IF NOT EXISTS for ADD COLUMN; wrap each in try/catch
  const alterations = [
    `ALTER TABLE session_persistence ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'story'`,
  ];
  for (const sql of alterations) {
    try {
      await database.execAsync(sql);
    } catch {
      // Column already exists — expected on all but first install
    }
  }
}

// ── Helper Utilities ────────────────────────────────────

/**
 * Returns the total size (in bytes) of all cached content.
 */
export async function getTotalCacheSize(): Promise<number> {
  const database = await getDB();
  const result = await database.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(size_bytes), 0) AS total FROM cached_content'
  );
  return result?.total ?? 0;
}

/**
 * Returns the count of rows in a given table. Useful for diagnostics.
 */
const ALLOWED_TABLES = new Set([
  'cached_content',
  'session_persistence',
  'resilience_logs',
  'queued_commands',
]);

export async function getRowCount(table: string): Promise<number> {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`getRowCount: disallowed table "${table}"`);
  }
  const database = await getDB();
  const result = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM ${table}`
  );
  return result?.cnt ?? 0;
}

/**
 * Deletes the oldest cached items using LRU eviction until total size
 * drops below the given threshold.
 */
export async function evictLRU(maxBytes: number): Promise<number> {
  const database = await getDB();
  let currentSize = await getTotalCacheSize();
  let deletedCount = 0;

  while (currentSize > maxBytes) {
    const oldest = await database.getFirstAsync<{ id: string; size_bytes: number }>(
      'SELECT id, size_bytes FROM cached_content ORDER BY last_synced ASC LIMIT 1'
    );
    if (!oldest) break;

    await database.runAsync('DELETE FROM cached_content WHERE id = ?', oldest.id);
    currentSize -= oldest.size_bytes;
    deletedCount++;
  }
  return deletedCount;
}

/**
 * Removes cached items older than a given TTL (in milliseconds).
 */
export async function evictExpired(ttlMs: number): Promise<number> {
  const database = await getDB();
  const cutoff = Date.now() - ttlMs;
  const result = await database.runAsync(
    'DELETE FROM cached_content WHERE last_synced < ?',
    cutoff
  );
  return result.changes;
}

/**
 * Closes the database. Use during cleanup / testing.
 */
export async function closeDB(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export const ResilienceDB = {
  getDB,
  getTotalCacheSize,
  getRowCount,
  evictLRU,
  evictExpired,
  closeDB,
};
