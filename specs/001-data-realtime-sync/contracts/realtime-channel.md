# Contract: Realtime Family Channel (`services/realtime/familyChannel.ts`)

**Date**: 2026-06-09

---

## Channel Naming

```
family:<family_id>
```

One channel per family. Both parent and child devices subscribe to this channel. Commands are filtered client-side by `child_id` (or `null` = all children).

---

## Broadcast Events (Parent → Child)

All events carry the `RealtimeCommand` payload:

```typescript
interface RealtimeCommand {
  command_id: string;       // UUID — deduplication key
  command_type: CommandType;
  sender_id: string;        // parent profile UUID
  child_id: string | null;  // target child UUID; null = all children
  payload: Record<string, unknown>;
  created_at: string;       // ISO 8601
}

type CommandType = 'pause' | 'resume' | 'time_update' | 'category_block' | 'force_end';
```

**Payload shapes by command type**:

| `command_type` | `payload` shape |
|----------------|-----------------|
| `pause` | `{}` |
| `resume` | `{}` |
| `time_update` | `{ remaining_minutes: number }` |
| `category_block` | `{ category: string; is_allowed: boolean }` |
| `force_end` | `{}` |

**Category block behaviour**: On receiving `category_block`, the child app MUST stop current content **immediately** (not finish-current-item) and play the exit animation before navigating to home screen. Response within 2 seconds.

---

## Broadcast Events (Child → Parent)

### Heartbeat (every 30 seconds)

```typescript
interface HeartbeatEvent {
  child_id: string;
  timestamp: string;         // ISO 8601
  session_active: boolean;
  elapsed_seconds: number;
}
```

**Parent behaviour**: If no heartbeat received for 90 seconds → display "Child device offline" indicator.

### Command Acknowledgement

```typescript
interface CommandAckEvent {
  command_id: string;
  child_id: string;
  acknowledged_at: string;   // ISO 8601
}
```

Sent after `applyCommand()` succeeds. Also sets `realtime_commands.acknowledged_at` in the database.

---

## `familyChannel.ts` Public API

```typescript
// Subscribe to the family channel (called in RealtimeProvider useEffect)
subscribe(familyId: string, handlers: ChannelHandlers): () => void

// Send a command (parent app only)
sendCommand(familyId: string, cmd: Omit<RealtimeCommand, 'command_id' | 'created_at'>): Promise<void>

// Disconnect and clean up
disconnect(): void

interface ChannelHandlers {
  onCommand: (cmd: RealtimeCommand) => void;       // child device
  onHeartbeat: (hb: HeartbeatEvent) => void;       // parent device
  onAck: (ack: CommandAckEvent) => void;            // parent device
  onSubscribe: () => void;                          // connection established
  onDisconnect: () => void;                         // connection lost
  onReconnect: () => void;                          // reconnected
}
```

**Lifecycle logging** (Principle V): `subscribe`, `disconnect`, `reconnect` events MUST be logged at `info` level with `family_id` and timestamp.

---

## Idempotency & Offline Replay

### Child device — `useSessionStore.applyCommand(cmd)`

```typescript
applyCommand(cmd: RealtimeCommand): void
// 1. Check processedCommandIds Set — if already applied, return immediately
// 2. Apply state change based on cmd.command_type
// 3. Add cmd.command_id to processedCommandIds
// 4. Send CommandAckEvent via familyChannel
// 5. Append to activity_logs via services/api
```

### Reconnect sequence

```
1. Query realtime_commands WHERE acknowledged_at IS NULL
   AND created_at > (now() - interval '24 hours')
   AND (child_id = $myId OR child_id IS NULL)
   ORDER BY created_at ASC
   LIMIT 50
2. For each row: call applyCommand(row) — idempotent
3. Resume normal Broadcast subscription
```

### Command queue constraints (enforced in `services/resilience/`)

- **Max 50** commands in local queue; oldest evicted when cap reached (FIFO)
- **24-hour TTL**: commands older than 24 hours discarded without applying on reconnect
- Evicted/expired commands logged in `activity_logs` with `action = 'command_expired'`
