import * as FileSystem from 'expo-file-system';
import { getDB, getTotalCacheSize, evictLRU } from './db';

interface CacheEntry<T> {
  key: string;
  data: T;
  cachedAt: number;
  lastAccessedAt: number;
  sizeBytes: number;
}

const MAX_CACHE_BYTES = 100 * 1024 * 1024;
const REDUCED_CACHE_BYTES = 50 * 1024 * 1024;
// Default TTL: 7 days for general content.
// Historical (finalized) report data uses TTL_HISTORICAL_MS (24h).
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TTL_HISTORICAL_MS = 24 * 60 * 60 * 1000;
const LOW_STORAGE_THRESHOLD = 500 * 1024 * 1024;

class CacheManager {
  async get<T>(key: string, options?: { checksum?: string; ttlMs?: number }): Promise<T | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{
      data_json: string;
      last_synced: number;
      size_bytes: number;
    }>('SELECT data_json, last_synced, size_bytes FROM cached_content WHERE id = ?', key);

    if (!row) return null;

    const effectiveTtl = options?.ttlMs ?? TTL_MS;
    if (Date.now() - row.last_synced > effectiveTtl) {
      await db.runAsync('DELETE FROM cached_content WHERE id = ?', key);
      return null;
    }

    if (options?.checksum) {
      const actualChecksum = await this.checksum(row.data_json);
      if (actualChecksum !== options.checksum) {
        await db.runAsync('DELETE FROM cached_content WHERE id = ?', key);
        return null;
      }
    }

    await db.runAsync(
      'UPDATE cached_content SET last_synced = ? WHERE id = ?',
      Date.now(),
      key
    );

    return JSON.parse(row.data_json) as T;
  }

  async set<T>(key: string, data: T): Promise<void> {
    const db = await getDB();
    const dataJson = JSON.stringify(data);
    const sizeBytes = new TextEncoder().encode(dataJson).length;

    const maxBytes = await this.effectiveMaxBytes();
    const currentSize = await getTotalCacheSize();

    if (currentSize + sizeBytes > maxBytes) {
      await evictLRU(Math.max(0, maxBytes - sizeBytes));
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO cached_content (id, type, data_json, last_synced, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
      key,
      typeof data === 'object' && data !== null && 'type' in data
        ? String((data as any).type)
        : 'unknown',
      dataJson,
      Date.now(),
      sizeBytes
    );
  }

  async evict(): Promise<number> {
    const maxBytes = await this.effectiveMaxBytes();
    const freed = await evictLRU(maxBytes);
    await this.evictExpired();
    return freed;
  }

  async clear(): Promise<void> {
    const db = await getDB();
    await db.runAsync('DELETE FROM cached_content');
  }

  private async evictExpired(): Promise<number> {
    const db = await getDB();
    const cutoff = Date.now() - TTL_MS;
    const result = await db.runAsync(
      'DELETE FROM cached_content WHERE last_synced < ?',
      cutoff
    );
    return result.changes;
  }

  private async effectiveMaxBytes(): Promise<number> {
    try {
      const info = await this.getStorageInfo();
      if (info.free < LOW_STORAGE_THRESHOLD) {
        return REDUCED_CACHE_BYTES;
      }
    } catch {
      // ignore — default to max
    }
    return MAX_CACHE_BYTES;
  }

  private async getStorageInfo(): Promise<{ free: number; total: number }> {
    try {
      const [free, total] = await Promise.all([
        FileSystem.getFreeDiskStorageAsync(),
        FileSystem.getTotalDiskCapacityAsync(),
      ]);
      return { free, total };
    } catch {
      return { free: Number.MAX_SAFE_INTEGER, total: Number.MAX_SAFE_INTEGER };
    }
  }

  private async checksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

export const cacheManager = new CacheManager();
