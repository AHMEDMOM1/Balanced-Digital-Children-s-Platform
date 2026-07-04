# Data Model: Realtime Channel Launch (Phase 4)

**Branch**: `019-realtime-channel-launch` | **Date**: 2026-06-13

## No New Database Tables

Phase 4 adds no new Supabase tables. The `realtime_commands` table (spec 018) and `profiles`/`category_preferences` tables (existing) are the only persisted data involved. This phase is primarily a TypeScript type extension and behavioural wiring exercise.

---

## TypeScript Type Extensions

### `CommandType` (extended)

| Value | Direction | Description |
|-------|-----------|-------------|
| `pause` | Parent → Child | Pause the child's current session |
| `resume` | Parent → Child | Resume the child's paused session |
| `time_update` | Parent → Child | Update remaining screen time minutes |
| `category_block` | Parent → Child | Block or unblock a content category |
| `force_end` | Parent → Child | Force-end the child's session immediately |
| `reset_child_pin` | Parent → Child | Trigger child PIN reset flow |
| `settings_sync` *(new)* | Parent → Child | Push full settings snapshot to child |

### `HeartbeatEvent` (extended)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `child_id` | string (UUID) | Yes | Child's profile identifier |
| `timestamp` | string (ISO 8601) | Yes | When this heartbeat was emitted |
| `session_active` | boolean | Yes | Whether a content session is running |
| `elapsed_seconds` | number | Yes | Total seconds elapsed in current session |
| `current_activity` | `'story' \| 'game' \| 'video' \| 'creative'` | No | Content type currently being viewed |
| `current_content_id` | string (UUID) | No | Identifier of the specific content item |

### `SettingsSyncPayload` (new)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `daily_limit_minutes` | number | No | Updated daily screen time limit |
| `stories_enabled` | boolean | No | Stories category access flag |
| `games_enabled` | boolean | No | Games category access flag |
| `creative_enabled` | boolean | No | Creative category access flag |
| `videos_enabled` | boolean | No | Videos category access flag |

### `LatestHeartbeatData` (new — store shape)

Stored in `useRealtimeStore` as `latestHeartbeat: HeartbeatEvent | null`.

| Field | Source | Used By |
|-------|--------|---------|
| `child_id` | HeartbeatEvent | Validation |
| `timestamp` | HeartbeatEvent | Offline detection |
| `session_active` | HeartbeatEvent | Parent dashboard status indicator |
| `elapsed_seconds` | HeartbeatEvent | Parent dashboard timer display |
| `current_activity` | HeartbeatEvent | Parent dashboard activity badge |
| `current_content_id` | HeartbeatEvent | Parent dashboard (future deep-link) |

---

## Existing Tables Used (no schema changes)

### `realtime_commands`

Used as-is from spec 018. Child fetches unacknowledged commands on reconnect; `commandProcessor` handles all types including the new `settings_sync`.

### `profiles`

The child device subscribes to CDC `UPDATE` events on `profiles` filtered by `id = childId`. When `daily_limit_minutes`, `timezone_offset_minutes`, or other settings fields change, the child reloads settings.

### `category_preferences`

The child device subscribes to CDC `*` events on `category_preferences` filtered by `family_id = familyId`. Changes propagate immediately to `useSettingsStore`.

---

## State Machines

### Channel Connection State

```
DISCONNECTED
  → (familyId + role available) → CONNECTING
  → (SUBSCRIBED status) → CONNECTED
  → (CLOSED / CHANNEL_ERROR) → RECONNECTING
  → (reconnect timeout fires) → CONNECTING  [loop]
```

### Child Online Status (parent-side)

```
UNKNOWN
  → (first heartbeat received) → ONLINE
  → (90s without heartbeat) → OFFLINE
  → (heartbeat received again) → ONLINE
```
