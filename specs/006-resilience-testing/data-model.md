# Phase 4: Data Model — Resilience & Real-Device Testing

## New Entities

---

### `resilience_event_log` *(New — Local Only)*

Records each resilience mechanism activation (cache fallback, session restore, animation degradation, etc.). Stored locally and batched for remote reporting.

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Auto-generated |
| `event_type` | enum | `'offline_transition'`, `'cache_fallback'`, `'session_restore'`, `'animation_degraded'`, `'animation_restored'`, `'pin_recovery_attempt'`, `'pin_recovery_success'`, `'pin_recovery_lockout'`, `'battery_saver_enter'`, `'battery_saver_exit'` |
| `timestamp` | ISO 8601 string | When the event occurred |
| `success` | boolean | Whether the resilience mechanism succeeded |
| `screen` | string | Screen context where event occurred (e.g., `'child/story/[id]'`, `'parent/reports'`) |
| `details` | object | Optional: elapsed ms, error message, FPS readings, etc. |
| `synced` | boolean | Whether this event has been forwarded to remote crash reporting |

**Retention**: Keep last 500 events locally; oldest evicted on new insert.

---

### `session_state_snapshot` *(New — Local Only)*

Persisted snapshot of an active child session for recovery across app restarts.

| Field | Type | Notes |
|---|---|---|
| `child_id` | string (UUID) | The child whose session is active |
| `content_item_id` | string (UUID) | The content item being viewed |
| `activity_type` | string | Story, game, video, creative |
| `elapsed_seconds` | number | Elapsed time before interruption |
| `session_started_at` | ISO 8601 string | When the session originally started |
| `last_saved_at` | ISO 8601 string | When this snapshot was last persisted |
| `daily_limit_seconds` | number | Screen-time limit at snapshot time |

**Lifecycle**:
- Created: When a session starts and every 30s during the session
- Read: On app relaunch to restore the session
- Deleted: When the session ends normally or a new session starts

---

### `parent_recovery_request` *(New — Local + Remote)*

Tracks in-flight PIN recovery attempts for rate limiting and audit.

**Local** (ephemeral counter):
| Field | Type | Notes |
|---|---|---|
| `email` | string | Parent's registered email |
| `attempt_count` | number | Failed attempts this hour |
| `first_attempt_at` | ISO 8601 string | Start of the rate-limit window |
| `locked_until` | ISO 8601 string | Null unless in 24h cooldown |
| `consecutive_locked_hours` | number | Count of locked hours in a row |

**Remote** (server-side, sent via email):
- Recovery token (UUID, expires 15 minutes)
- Email address
- Security question hash
- Lockout timestamp (if applicable)

---

### `content_cache_metadata` *(New — Local Only)*

Tracks cached content items for offline display.

| Field | Type | Notes |
|---|---|---|
| `content_type` | string | `'story'`, `'game'`, `'video'`, `'creative'` |
| `content_id` | string (UUID) | Original content item ID |
| `cached_at` | ISO 8601 string | When item was cached |
| `last_accessed_at` | ISO 8601 string | When item was last viewed |
| `size_bytes` | number | Estimated storage size |

**Retention**: Evicted by LRU when total cache exceeds 100MB or any item is older than 7 days.

---

## Modified Entities

### Existing Local Storage Mechanisms

The following existing mechanisms are extended or reused:

| Mechanism | New Responsibility | Resilience Feature |
|---|---|---|
| AsyncStorage / expo-sqlite | `resilience_event_log` storage + batch queue | Observability (FR-010) |
| Zustand session store | `session_state_snapshot` persistence | Session persistence (FR-003, FR-004) |
| In-memory FPS monitor | FPS tracking + degradation trigger | Performance adaptation (FR-007) |
| React Native `AppState` | Detect background/foreground for session save | Session persistence (FR-003) |

---

## Interface Contracts

### `services/resilience/cacheManager.ts`

```typescript
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
```

### `services/resilience/sessionManager.ts`

```typescript
export interface SessionSnapshot {
  childId: string;
  contentItemId: string;
  activityType: 'story' | 'game' | 'video' | 'creative';
  elapsedSeconds: number;
  sessionStartedAt: string;
  lastSavedAt: string;
  dailyLimitSeconds: number;
}

export interface SessionManager {
  save(snapshot: SessionSnapshot): Promise<void>;
  restore(): Promise<SessionSnapshot | null>;
  clear(): Promise<void>;
}
```

### `services/resilience/fpsMonitor.ts`

```typescript
export interface FpsMonitor {
  start(): void;
  stop(): void;
  onDegrade(callback: () => void): void;
  onRestore(callback: () => void): void;
  getCurrentFps(): number;
}

export interface DegradationConfig {
  threshold: number;      // FPS below which to degrade (default: 30)
  durationMs: number;     // consecutive ms below threshold (default: 2000)
  checkIntervalMs: number; // how often to evaluate (default: 500)
}
```

### `services/resilience/connectivityManager.ts`

```typescript
export type ConnectivityState = 'online' | 'offline' | 'poor';

export interface ConnectivityManager {
  getState(): ConnectivityState;
  subscribe(callback: (state: ConnectivityState) => void): () => void;
  isBatterySaver(): boolean;
  onBatterySaverChange(callback: (enabled: boolean) => void): () => void;
}
```

### `services/resilience/pinRecoveryManager.ts`

```typescript
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
```

### `services/resilience/eventLogger.ts`

```typescript
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
```

---

## Entity Relationships

```
profiles (parent)
  └── profiles (child)
        ├── sessions (elapsed_seconds, activity_type)
        └── [session_state_snapshot] (local — restored on relaunch)

[cache] (local)
  ├── content_cache_metadata
  ├── session_state_snapshot
  └── resilience_event_log

[resilience services] (local)
  ├── cacheManager → content_cache_metadata
  ├── sessionManager → session_state_snapshot
  ├── eventLogger → resilience_event_log
  ├── fpsMonitor → in-memory FPS readings
  ├── connectivityManager → @react-native-community/netinfo + expo-battery
  └── pinRecoveryManager → parent_recovery_request (local + remote email)
```

---

## Database Changes

No new Supabase migrations required for Phase 4. All resilience data is local (device-side). The only remote interaction is:
- Email delivery for PIN recovery links (existing infrastructure)
- Remote crash reporting service (infrastructure to be set up in Phase 5; Phase 4 implements the logging and batching)
