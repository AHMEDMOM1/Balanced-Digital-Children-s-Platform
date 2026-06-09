# Realtime Commands — Interface Contracts

## Broadcast Channel Contract

### Channel Name
```
family:<family_id>
```

### Event Types

All events are broadcast on the family channel as JSON payloads.

---

### `command` event (Parent → Child)

Sent when the parent issues a control command.

```typescript
interface RealtimeCommand {
  command_id: string;       // UUID — unique per command
  command_type: 'pause' | 'resume' | 'time_update' | 'category_block' | 'force_end';
  sender_id: string;        // UUID — parent profile ID
  child_id: string | null;  // UUID — target child (null = all)
  payload: Record<string, any>;
  created_at: string;       // ISO 8601 timestamp (server time)
}
```

**Payload shapes by `command_type`**:

| command_type | payload | Example |
|---|---|---|
| `pause` | `{}` | `{}` |
| `resume` | `{}` | `{}` |
| `time_update` | `{ remaining_minutes: number }` | `{ "remaining_minutes": 15 }` |
| `category_block` | `{ category: string, is_allowed: boolean }` | `{ "category": "Fantasy", "is_allowed": false }` |
| `force_end` | `{}` | `{}` |

---

### `heartbeat` event (Child → Parent)

Sent every 30 seconds by the child device.

```typescript
interface HeartbeatEvent {
  child_id: string;         // UUID — child profile ID
  timestamp: string;        // ISO 8601 timestamp
  session_active: boolean;  // Whether a session is currently active
  elapsed_seconds: number;  // Current session elapsed time
}
```

---

### `command_ack` event (Child → Parent)

Sent after the child successfully applies a command.

```typescript
interface CommandAckEvent {
  command_id: string;       // UUID — the command that was applied
  child_id: string;         // UUID — child who applied it
  acknowledged_at: string;  // ISO 8601 timestamp
}
```

---

## Database Contract

### `realtime_commands` table

```sql
CREATE TABLE IF NOT EXISTS realtime_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  child_id UUID,
  command_type TEXT NOT NULL CHECK (command_type IN ('pause', 'resume', 'time_update', 'category_block', 'force_end')),
  payload JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for child reconnection query
CREATE INDEX idx_realtime_commands_child_unacked
  ON realtime_commands (family_id, child_id, acknowledged_at)
  WHERE acknowledged_at IS NULL;
```

### Child Reconnection Query

```sql
SELECT * FROM realtime_commands
WHERE family_id = :family_id
  AND (child_id = :child_id OR child_id IS NULL)
  AND acknowledged_at IS NULL
ORDER BY created_at ASC;
```
