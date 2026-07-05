# Channel Event Contracts: Realtime Channel Launch (Phase 4)

**Branch**: `019-realtime-channel-launch` | **Date**: 2026-06-13

All events flow through the Supabase Realtime broadcast channel `family:{familyId}`.

---

## Broadcast Events

### `command` (parent → child)

**Direction**: Parent device emits; child device receives and processes.

**Payload shape** (`RealtimeCommand`):

```typescript
{
  command_id:   string,        // UUID — used for deduplication
  command_type: CommandType,   // see types below
  sender_id:    string,        // parent profile UUID
  child_id:     string | null, // target child UUID; null = all children
  payload:      object,        // command-specific data
  created_at:   string,        // ISO 8601
}
```

**Valid `command_type` values and their `payload` shapes**:

| command_type | payload shape |
|---|---|
| `pause` | `{}` |
| `resume` | `{}` |
| `time_update` | `{ remaining_minutes: number }` |
| `category_block` | `{ category: string, is_allowed: boolean }` |
| `force_end` | `{}` |
| `reset_child_pin` | `{}` |
| `settings_sync` | `SettingsSyncPayload` (all fields optional) |

**Processing contract**:
- Child checks `command_id` against `appliedCommandIds` (idempotency guard)
- Child processes command synchronously (state update) then persists `command_id`
- Child writes `acknowledged_at` to `realtime_commands` row (fire-and-forget)
- Child MAY send a `command_ack` broadcast in response

---

### `heartbeat` (child → parent)

**Direction**: Child device emits every 30 seconds; parent device receives.

**Payload shape** (`HeartbeatEvent`):

```typescript
{
  child_id:             string,                                      // required
  timestamp:            string,                                      // ISO 8601, required
  session_active:       boolean,                                     // required
  elapsed_seconds:      number,                                      // required
  current_activity?:    'story' | 'game' | 'video' | 'creative',    // optional
  current_content_id?:  string,                                      // optional UUID
}
```

**Processing contract**:
- Parent calls `recordHeartbeat()` on `useRealtimeStore` — sets `lastHeartbeatAt` and `isChildOnline = true`
- Parent stores full event as `latestHeartbeat` on `useRealtimeStore`
- Parent offline detector: if no heartbeat for 90 seconds → `isChildOnline = false`

---

### `command_ack` (child → parent)

**Direction**: Child device emits after processing a command; parent device receives.

**Payload shape** (`CommandAckEvent`):

```typescript
{
  command_id:      string,  // UUID of the acknowledged command
  child_id:        string,  // child profile UUID
  acknowledged_at: string,  // ISO 8601
}
```

**Processing contract**:
- Parent MAY use this to update UI indicators (e.g., confirm pause took effect)
- Not required for correctness; DB `acknowledged_at` is the authoritative record

---

## Postgres CDC Subscriptions (child device only)

### `profiles` UPDATE on child row

**Filter**: `id=eq.{childId}`

**Handling**: On receipt, call `useSettingsStore.getState().loadSettings()` to pull the latest screen time limit and other profile-level settings.

---

### `category_preferences` ANY on family rows

**Filter**: `family_id=eq.{familyId}`

**Handling**: On INSERT or UPDATE, update `useSettingsStore` with the changed category's `is_allowed` value.

---

## Service Function Contracts

### `subscribeFamilyChannel(familyId, role, handlers) → RealtimeChannel`

No change to signature. `handlers.onHeartbeat` must now receive the full `HeartbeatEvent` (not just trigger a timestamp).

### `broadcastHeartbeat(channel, heartbeat: HeartbeatEvent) → void`

Signature unchanged. Callers must now populate `current_activity` and `current_content_id` when available.

### `subscribeSettingsChanges(childId, familyId, handlers) → () => void`

**New function** in `services/realtime/familyChannel.ts`.

```typescript
interface SettingsChangeHandlers {
  onProfileUpdate: (newProfile: Partial<ProfileSettings>) => void;
  onCategoryUpdate: (category: string, isAllowed: boolean) => void;
}

function subscribeSettingsChanges(
  childId: string,
  familyId: string,
  handlers: SettingsChangeHandlers
): () => void
```

Returns an unsubscribe function. Internally creates a single Supabase channel named `settings-sync:${childId}` with two postgres_changes listeners.
