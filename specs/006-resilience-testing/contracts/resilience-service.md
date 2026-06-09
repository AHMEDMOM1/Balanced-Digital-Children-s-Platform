# Resilience Service Contract

## API Hooks (`services/api/resilience.ts`)

### `useResilience()`
Centralized hook for application-wide resilience state.

**Returns**:
- `isOffline`: boolean - Current network connectivity status.
- `lowPerformanceMode`: boolean - True if FPS has been consistently low.
- `isBatterySaver`: boolean - True if device is in low power mode.
- `lastSyncTime`: number | null - Timestamp of last successful server sync.

## Cache Management (`services/resilience/CacheService.ts`)

### `getOfflineContent(type: string, id: string): Promise<any>`
Retrieves a cached item if offline.

### `saveContentForOffline(type: string, id: string, data: any): Promise<void>`
Saves/updates a content item in the SQLite cache.

### `enforceQuota(): Promise<void>`
Checks total cache size and deletes items based on LRU/7-day TTL.

## Session Persistence (`services/resilience/SessionPersister.ts`)

### `persistHeartbeat(session: SessionState): Promise<void>`
Saves the current session state to local storage (called every 30s).

### `recoverSession(): Promise<SessionState | null>`
Attempts to restore a session after app restart.

## Time Synchronization (`services/resilience/TimeSync.ts`)

### `getServerTime(): Promise<number>`
Returns the current time using `Date.now() + offset`.

### `syncOffset(): Promise<void>`
Fetches server time from `/api/time` and updates the stored offset.
