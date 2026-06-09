/**
 * Cache Manager Contract
 *
 * Local cache with 7-day/100MB retention, LRU eviction.
 * Used by: services/resilience/cacheManager.ts
 * Spec ref: FR-001
 */

export interface CacheEntry<T> {
  key: string;
  data: T;
  cachedAt: number;       // epoch ms
  lastAccessedAt: number;  // epoch ms
  sizeBytes: number;
}

export interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttlMs?: number): Promise<void>;
  evict(): Promise<number>;         // LRU eviction, returns bytes freed
  getTotalSize(): Promise<number>;
  clear(): Promise<void>;
}
