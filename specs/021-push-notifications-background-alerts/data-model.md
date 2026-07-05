# Data Model: Push Notifications — Background Alerts

**Feature**: 021-push-notifications-background-alerts
**Date**: 2026-06-13

---

## New Tables

### `notification_triggers`

Event queue written by the child app; consumed by the Edge Function.

```sql
CREATE TABLE notification_triggers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type   TEXT NOT NULL CHECK (event_type IN (
                     'time_limit_reached',
                     'blocked_content_attempted',
                     'session_ended'
                 )),
    metadata     JSONB NOT NULL DEFAULT '{}',
    -- time_limit_reached:        { "elapsed_seconds": 1800 }
    -- blocked_content_attempted: { "category": "videos" }
    -- session_ended:             { "elapsed_seconds": 620 }
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ          -- set by Edge Function when processing completes
);

CREATE INDEX idx_notification_triggers_family  ON notification_triggers(family_id);
CREATE INDEX idx_notification_triggers_child   ON notification_triggers(child_id);
CREATE INDEX idx_notification_triggers_unproc  ON notification_triggers(processed_at) WHERE processed_at IS NULL;
```

**RLS**:
- Child can INSERT own triggers (`child_id = auth.uid()`)
- Service role reads and updates `processed_at` (Edge Function uses service role)
- Parent can SELECT triggers for their family (dashboard history)

---

### `notification_events`

Audit trail of every notification dispatch attempt. Enables de-duplication checks, dashboard history, and delivery status visibility.

```sql
CREATE TABLE notification_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id         UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trigger_id        UUID REFERENCES notification_triggers(id) ON DELETE SET NULL,
    event_type        TEXT NOT NULL CHECK (event_type IN (
                          'time_limit_reached',
                          'blocked_content_attempted',
                          'session_ended'
                      )),
    category_key      TEXT,     -- populated for blocked_content_attempted (e.g. 'videos')
    status            TEXT NOT NULL CHECK (status IN (
                          'dispatched',
                          'failed',
                          'suppressed_dedup',
                          'suppressed_duration',
                          'suppressed_no_token',
                          'suppressed_pref'
                      )),
    notification_text TEXT,     -- actual text sent (or would-have-been-sent for suppressed)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_events_family     ON notification_events(family_id);
CREATE INDEX idx_notification_events_parent     ON notification_events(parent_id, event_type, created_at);
CREATE INDEX idx_notification_events_dedup      ON notification_events(parent_id, child_id, event_type, category_key, created_at);
```

**RLS**:
- Parent can SELECT events for their family
- Service role ONLY for INSERT/UPDATE (Edge Function)
- Child has no access

---

## Existing Table Modifications

### `profiles` — add notification preference column

```sql
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS notification_session_end_enabled BOOLEAN NOT NULL DEFAULT TRUE;
```

No migration to existing rows needed (`DEFAULT TRUE` backfills implicitly).

### `device_registrations` — already exists (spec 013)

The `device_token` column already exists. No schema changes required. The client upserts on each parent launch to keep the token fresh.

---

## Entity Relationships

```
families (1) ──────────────────────────── (N) notification_triggers
families (1) ──────────────────────────── (N) notification_events

profiles [parent] (1) ──────────────────── (N) notification_events
profiles [parent] (1) ──────────────────── (1) device_registrations (device_token)
profiles [parent] (1) ──────────────────── (1) notification_session_end_enabled

profiles [child]  (1) ──────────────────── (N) notification_triggers
profiles [child]  (1) ──────────────────── (N) notification_events

notification_triggers (1) ──────────────── (1) notification_events (trigger_id)
```

---

## Status State Machine: `notification_events.status`

```
trigger row inserted
    │
    ├── no parent device token?                       → suppressed_no_token
    ├── time_limit_reached?                           → (de-dup SKIPPED — always dispatch)
    ├── blocked_content/session_ended + dedup match?  → suppressed_dedup
    ├── session_ended + elapsed < 60s?                → suppressed_duration
    ├── session_ended + pref disabled?                → suppressed_pref
    ├── Expo Push API call succeeds?                  → dispatched
    └── Expo Push API call fails?                     → failed
```

**Note**: `time_limit_reached` is explicitly exempt from de-duplication (see spec FR-002/FR-007). Foreground suppression is handled client-side via Expo's `setNotificationHandler` and does not produce a `notification_events` row.

---

## Migration File

`supabase/migrations/20260613021001_push_notifications.sql`

Contains:
1. CREATE TABLE notification_triggers + indexes + RLS
2. CREATE TABLE notification_events + indexes + RLS
3. ALTER TABLE profiles ADD COLUMN notification_session_end_enabled

---

## TypeScript Types (source of truth in `services/api/types.ts`)

```typescript
export type NotificationEventType =
  | 'time_limit_reached'
  | 'blocked_content_attempted'
  | 'session_ended';

export type NotificationEventStatus =
  | 'dispatched'
  | 'failed'
  | 'suppressed_dedup'
  | 'suppressed_duration'
  | 'suppressed_no_token'
  | 'suppressed_pref';

export interface NotificationTriggerRow {
  id: string;
  family_id: string;
  child_id: string;
  parent_id: string;
  event_type: NotificationEventType;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
}

export interface NotificationEventRow {
  id: string;
  family_id: string;
  child_id: string;
  parent_id: string;
  trigger_id: string | null;
  event_type: NotificationEventType;
  category_key: string | null;
  status: NotificationEventStatus;
  notification_text: string | null;
  created_at: string;
}
```
