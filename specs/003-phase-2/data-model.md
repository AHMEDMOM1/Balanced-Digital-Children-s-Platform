# Phase 2: Data Model — Realtime Commands

## New Entities

### `realtime_commands`

Persists all parent commands for audit and offline replay.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique command identifier (used for idempotency) |
| `family_id` | UUID | NOT NULL, FK → `profiles.id` (parent) | Family scope |
| `sender_id` | UUID | NOT NULL, FK → `auth.users.id` | Parent who issued the command |
| `child_id` | UUID | NULL, FK → `profiles.id` | Target child (NULL = all children in family) |
| `command_type` | TEXT | NOT NULL, CHECK IN ('pause', 'resume', 'time_update', 'category_block', 'force_end') | Command type |
| `payload` | JSONB | DEFAULT '{}' | Command-specific data |
| `acknowledged_at` | TIMESTAMPTZ | NULL | Set when child applies the command |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` | Server timestamp (source of truth) |

**Payload examples by command_type**:
- `pause`: `{}` (no payload needed)
- `resume`: `{}`
- `time_update`: `{ "remaining_minutes": 15 }`
- `category_block`: `{ "category": "Fantasy", "is_allowed": false }`
- `force_end`: `{}`

### `activity_logs` (extension)

The existing `activity_logs` table (from Phase 1) is reused to log realtime events. No schema change needed — log entries use the existing `activity_type` column with new values like `realtime_pause`, `realtime_resume`, etc.

## Entity Relationships

```
profiles (parent)
  └─── realtime_commands (one-to-many via family_id)
         └─── profiles (child) via child_id (optional)
```

## Row-Level Security (RLS) Policies

### `realtime_commands`

1. **Parent INSERT**: Parents can insert commands where `family_id` matches their own `auth.uid()`.
   ```sql
   CREATE POLICY "Parents can create commands"
     ON realtime_commands FOR INSERT
     WITH CHECK (sender_id = auth.uid());
   ```

2. **Child SELECT**: Children can read commands targeted at them (or at all children in their family).
   ```sql
   CREATE POLICY "Children can read their commands"
     ON realtime_commands FOR SELECT
     USING (
       child_id = auth.uid()
       OR (child_id IS NULL AND family_id IN (
         SELECT parent_id FROM profiles WHERE id = auth.uid()
       ))
     );
   ```

3. **Child UPDATE**: Children can update `acknowledged_at` on their own commands.
   ```sql
   CREATE POLICY "Children can acknowledge commands"
     ON realtime_commands FOR UPDATE
     USING (
       child_id = auth.uid()
       OR (child_id IS NULL AND family_id IN (
         SELECT parent_id FROM profiles WHERE id = auth.uid()
       ))
     )
     WITH CHECK (
       child_id = auth.uid()
       OR (child_id IS NULL AND family_id IN (
         SELECT parent_id FROM profiles WHERE id = auth.uid()
       ))
     );
   ```

## State Transitions

### Child Session State Machine

```
┌──────────┐  startSession   ┌──────────┐
│  IDLE    │ ───────────────→ │  ACTIVE  │
└──────────┘                  └────┬─────┘
      ↑                            │
      │  endSession / force_end    │  pause
      │                            ↓
      │                       ┌──────────┐
      │←───── resume ─────────│  PAUSED  │
      │                       └──────────┘
      │                            │
      └────── time_expired ────────┘
```

### Command Processing Flow

```
Command arrives (broadcast or DB fetch)
  → Check command_id in rolling window
    → Already seen? SKIP
    → New?
      → Apply command (update Zustand store)
      → Add command_id to rolling window
      → Update acknowledged_at in DB
      → Log to activity_logs
```
