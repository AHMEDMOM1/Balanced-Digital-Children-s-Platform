# Data Model: Real Data Layer & Realtime Parent-Child Sync

**Date**: 2026-06-09 | **Source**: `server/migrations/001–007`

---

## Entity Map

```
profiles (parent)
  └── profiles (child) [parent_id FK]
  └── family_codes
  └── parent_settings [per child]
  └── category_preferences [per child, opt-out blocks only]
  └── realtime_commands [sent to child]

profiles (child)
  └── sessions
        └── activity_logs
  └── realtime_commands [targeted at child]

content_items (global catalogue)
  └── sessions [content_item_id FK]

daily_stats (Phase 3, pre-aggregated from activity_logs)
```

---

## Entities

### `profiles`

Unified table for both parent and child users.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID PK | NOT NULL | gen_random_uuid() |
| `role` | TEXT | CHECK (`parent` \| `child`) | Discriminates profile type |
| `parent_id` | UUID FK → profiles.id | ON DELETE CASCADE, nullable | NULL for parent rows |
| `family_id` | UUID | NOT NULL | Shared across family; set at parent creation |
| `email` | TEXT | nullable | Parents only |
| `full_name` | TEXT | NOT NULL | |
| `age_group` | TEXT | CHECK (`2-4` \| `5-7` \| `8-10`), nullable | Children only |
| `unlock_pin_hash` | TEXT | nullable | SHA-256 of PIN |
| `is_active` | BOOLEAN | DEFAULT true | Soft delete |
| `avatar_color` | TEXT | nullable | UI personalization |
| `timezone_offset_minutes` | INTEGER | DEFAULT 0 | UTC offset for daily boundary calculations |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**RLS policies**: `parent_read_profiles`, `child_own_profile`, `service_write_profiles`

**Validation rules**:
- `role = 'child'` REQUIRES `parent_id NOT NULL` and `age_group NOT NULL`
- `role = 'parent'` REQUIRES `email NOT NULL`
- `family_id` is immutable after creation

---

### `content_items`

Global content catalogue (stories, games, videos, creative activities).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID PK | NOT NULL | |
| `title` | TEXT | NOT NULL | |
| `type` | TEXT | CHECK (`story` \| `game` \| `video` \| `creative`) | |
| `category` | TEXT | NOT NULL | e.g. `animals`, `numbers`, `art` |
| `description` | TEXT | nullable | |
| `min_age` | INTEGER | DEFAULT 0 | Inclusive age range lower bound |
| `max_age` | INTEGER | DEFAULT 99 | Inclusive age range upper bound |
| `url` | TEXT | nullable | Media URL |
| `thumbnail_url` | TEXT | nullable | |
| `content_data` | JSONB | nullable | Type-specific structured data |
| `is_active` | BOOLEAN | DEFAULT true | Admin soft delete |
| `sort_order` | INTEGER | DEFAULT 0 | Display ordering |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Indexes**: `type`, `category`, `(min_age, max_age)`, `is_active`

**RLS policies**: Authenticated read (no child-specific filtering — age/category filter applied in API hook layer)

**Validation rules**:
- Age range query: `min_age <= child_age AND max_age >= child_age`
- Category availability: `NOT EXISTS (SELECT 1 FROM category_preferences WHERE child_id = $child AND category = content_items.category AND is_allowed = false)`

**Seed requirement**: ≥20 stories, ≥10 games, ≥15 videos, ≥8 creative activities

---

### `category_preferences`

Opt-out category blocks. Only rows with `is_allowed = false` are meaningful; absence of a row means the category is accessible.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID PK | NOT NULL | |
| `parent_id` | UUID FK → profiles.id | ON DELETE CASCADE | |
| `child_id` | UUID FK → profiles.id | ON DELETE CASCADE | |
| `category` | TEXT | NOT NULL | Matches `content_items.category` |
| `is_allowed` | BOOLEAN | DEFAULT true | `false` = blocked |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint**: `(parent_id, child_id, category)`

**RLS policies**: `parent_read_own_prefs`, `parent_write_own_prefs`

**Business rule**: Blocking is idempotent — upsert on `(parent_id, child_id, category)` setting `is_allowed = false`. Unblocking sets `is_allowed = true` (or deletes the row).

---

### `sessions`

Tracks a single contiguous period of child app usage.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID PK | NOT NULL | |
| `child_id` | UUID FK → profiles.id | ON DELETE CASCADE | |
| `parent_id` | UUID FK → profiles.id | nullable | Denormalized for audit |
| `activity_type` | TEXT | NOT NULL | e.g. `story`, `game` |
| `content_item_id` | UUID FK → content_items.id | ON DELETE SET NULL, nullable | |
| `started_at` | TIMESTAMPTZ | DEFAULT now() | |
| `ended_at` | TIMESTAMPTZ | nullable | NULL while active/paused |
| `elapsed_seconds` | INTEGER | DEFAULT 0 | Updated incrementally |
| `status` | TEXT | CHECK (`active` \| `paused` \| `completed` \| `expired`) | See state machine |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**State machine**:
```
active ──(pause command)──► paused
paused ──(resume command)──► active
active  ──(force_end / time limit)──► completed
paused  ──(force_end)──────────────► completed
active  ──(server cron / daily limit)──► expired
```
`completed` and `expired` are terminal. `ended_at` is SET when transitioning to either terminal state.

**RLS policies**: `parent_read_own_children_sessions`, `child_own_sessions`, `service_write_sessions`

---

### `activity_logs`

Audit log of content consumed and parent commands received. COPPA/GDPR-K compliant — no behavioral profiling fields.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID PK | NOT NULL | |
| `child_id` | UUID FK → profiles.id | ON DELETE CASCADE | |
| `session_id` | UUID FK → sessions.id | ON DELETE CASCADE, nullable | |
| `activity_type` | TEXT | NOT NULL | `story`, `game`, `video`, `creative`, `command_received` |
| `action` | TEXT | NOT NULL | e.g. `start`, `complete`, `pause_applied`, `category_blocked` |
| `metadata` | JSONB | nullable | Minimal: `{content_id, duration_seconds, command_type}` — no PII |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Retention**: Automated purge via scheduled function — rows older than 90 days deleted daily. Defined in `004_data_retention.sql`.

**RLS policies**: `parent_read_own_children_logs`, `child_own_logs`, `service_write_logs`

**Prohibited fields** (COPPA/GDPR-K): No names, emails, device IDs, inferred interests, click-stream data.

---

### `realtime_commands`

Durable store for parent-to-child commands. Enables offline replay.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID PK | NOT NULL | Internal row ID |
| `family_id` | UUID | NOT NULL | Channel scoping |
| `sender_id` | UUID FK → auth.users | NOT NULL | Parent user ID |
| `child_id` | UUID | nullable | NULL = broadcast to all children in family |
| `command_type` | TEXT | CHECK (`pause` \| `resume` \| `time_update` \| `category_block` \| `force_end`) | |
| `payload` | JSONB | DEFAULT `{}` | Type-specific data (see Payload Shapes below) |
| `acknowledged_at` | TIMESTAMPTZ | nullable | NULL = unacknowledged / not yet applied by child |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes**: Partial index on `(family_id, child_id, acknowledged_at) WHERE acknowledged_at IS NULL` — fast unacked query on reconnect.

**Idempotency**: The command's `id` (UUID) is the deduplication key. `useSessionStore.applyCommand(cmd)` checks processed command IDs before applying.

**Queue constraints** (enforced client-side in `services/resilience/`):
- Max 50 commands in local queue; oldest dropped when cap reached
- Commands with `created_at < now() - 24h` discarded on reconnect without applying

**Payload shapes**:
```typescript
// time_update
{ remaining_minutes: number }

// category_block
{ category: string; is_allowed: boolean }

// pause, resume, force_end
{} // empty payload
```

**RLS policies**: `parent_insert_commands`, `child_read_own_commands`, `parent_read_own_sent`, `child_acknowledge_commands`

---

### `parent_settings`

Per-child coarse controls (daily time limit, session count, content type toggles).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID PK | NOT NULL | |
| `parent_id` | UUID FK → profiles.id | ON DELETE CASCADE | |
| `child_id` | UUID FK → profiles.id | ON DELETE CASCADE | |
| `daily_time_limit_minutes` | INTEGER | DEFAULT 60 | |
| `sessions_per_day` | INTEGER | DEFAULT 3 | |
| `stories_enabled` | BOOLEAN | DEFAULT true | Coarse toggle (complements category_preferences) |
| `games_enabled` | BOOLEAN | DEFAULT true | |
| `videos_enabled` | BOOLEAN | DEFAULT true | |
| `creative_enabled` | BOOLEAN | DEFAULT true | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint**: `(parent_id, child_id)`

---

### `family_codes`

One-time codes used during child device onboarding to link the device to a family.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID PK | NOT NULL | |
| `family_id` | UUID | NOT NULL | |
| `code` | TEXT | UNIQUE | 6-character alphanumeric |
| `created_by` | UUID FK → profiles.id | ON DELETE CASCADE | Parent profile |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Short-lived (24 hours) |
| `is_used` | BOOLEAN | DEFAULT false | Single-use |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

---

## TypeScript Type Mapping

All entities map to types in `services/api/types.ts`:

| DB Table | TypeScript Interface |
|----------|---------------------|
| `profiles` | `Profile`, `AuthState` |
| `content_items` | `ContentItem` |
| `category_preferences` | `CategoryPreference` |
| `sessions` | *(inline in session store)* |
| `activity_logs` | *(write-only from API hooks)* |
| `realtime_commands` | `RealtimeCommand` (in `services/realtime/types.ts`) |
| `parent_settings` | *(inline in hooks)* |

Channel events: `HeartbeatEvent`, `CommandAckEvent` — defined in `services/realtime/types.ts`.
