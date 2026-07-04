# Contract: Notifications API

**Feature**: 021-push-notifications-background-alerts
**Date**: 2026-06-13

---

## Client-Side Service: `services/api/notifications.ts`

### Types (also exported from `services/api/types.ts`)

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

export interface NotificationTriggerInput {
  family_id: string;
  child_id: string;
  parent_id: string;
  event_type: NotificationEventType;
  metadata: Record<string, unknown>;
  // time_limit_reached:        { elapsed_seconds: number }
  // blocked_content_attempted: { category: string }
  // session_ended:             { elapsed_seconds: number }
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

export interface NotificationApiResult<T = void> {
  data: T | null;
  error: string | null;
}
```

---

### Hook: `useNotificationSetup()`

**Purpose**: Registers the parent device for push notifications after login. Handles permission request, token retrieval, and DB upsert. Suppresses visual alerts when app is in foreground.

**Called in**: `app/(parent)/_layout.tsx` (inside `useEffect` watching `parentData?.id`)

```typescript
export function useNotificationSetup(parentData: { id: string; familyId: string } | null): {
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
  token: string | null;
}
```

**Behaviour**:
1. If `parentData` is null → do nothing
2. Request push notification permission via OS prompt (first time only; subsequent calls check status)
3. On `'granted'`: retrieve `ExponentPushToken[...]` via platform API
4. Upsert token to `device_registrations` on `(profile_id, family_id)` conflict
5. Set foreground notification handler to suppress visual alert (`shouldShowAlert: false`)
6. Return `{ permissionStatus, token }`

**Error handling**: Log `console.warn('[notifications] permission denied')` if denied; no crash.

---

### Function: `writeNotificationTrigger(input)`

**Purpose**: Child app (or parent app for time-limit) writes a trigger event to the DB. The Edge Function handles actual dispatch.

**Called from**:
- Child app `app/(child)/_layout.tsx` — on time limit reached event
- Child app `app/(child)/_layout.tsx` — on blocked category navigation attempt
- `services/api/sessions.ts` — `closeSession()` on completion (if elapsed ≥ 60s)

```typescript
export async function writeNotificationTrigger(
  input: NotificationTriggerInput
): Promise<NotificationApiResult<{ triggerId: string }>>
```

**Behaviour**:
1. INSERT row to `notification_triggers` with provided fields
2. On success: return `{ data: { triggerId }, error: null }`
3. On failure: log `console.warn('[notifications] failed to write trigger', error)` and return `{ data: null, error }`
4. Does NOT wait for Edge Function to process (fire-and-forget)

---

### Hook: `useNotificationEvents(parentId, familyId)`

**Purpose**: Parent dashboard reads notification history (dispatched + suppressed events).

**Called in**: `app/(parent)/index.tsx` (optional — for notification history section)

```typescript
export function useNotificationEvents(
  parentId: string,
  familyId: string
): {
  events: NotificationEventRow[];
  isLoading: boolean;
  error: string | null;
}
```

**Behaviour**:
1. SELECT from `notification_events` WHERE `family_id = familyId` ORDER BY `created_at DESC` LIMIT 50
2. Returns last 50 notification events for dashboard display

---

### Function: `updateNotificationPreference(parentId, sessionEndEnabled)`

**Purpose**: Parent toggles session-end notification preference.

```typescript
export async function updateNotificationPreference(
  parentId: string,
  sessionEndEnabled: boolean
): Promise<NotificationApiResult>
```

**Behaviour**:
1. UPDATE `profiles` SET `notification_session_end_enabled = sessionEndEnabled` WHERE `id = parentId`
2. Log `console.debug('[notifications] preference updated', { sessionEndEnabled })`

---

## Server-Side: Edge Function `dispatch-notification`

**File**: `supabase/functions/dispatch-notification/index.ts`

**Trigger**: Supabase Database Webhook on `INSERT` to `notification_triggers`

**Input** (Supabase webhook payload):
```typescript
{
  type: 'INSERT';
  table: 'notification_triggers';
  record: NotificationTriggerRow;
  old_record: null;
}
```

**Processing steps**:
1. Extract `parent_id`, `child_id`, `family_id`, `event_type`, `metadata` from `record`
2. Fetch parent device token from `device_registrations WHERE profile_id = parent_id`
3. If no token → INSERT `notification_events` with `status = 'suppressed_no_token'`; mark trigger `processed_at`; return 200
4. For `session_ended`: if `metadata.elapsed_seconds < 60` → INSERT `notification_events` with `status = 'suppressed_duration'`; mark trigger; return 200
5. Check `notification_session_end_enabled` from `profiles` for `session_ended` type; if false → INSERT suppressed; return
6. De-duplication check: SELECT from `notification_events` WHERE `parent_id`, `child_id`, `event_type`, `category_key` match AND `created_at > now() - interval '5 minutes'` → if found → `suppressed_dedup`
7. Build notification text (see text templates below)
8. POST to `https://exp.host/--/api/v2/push/send` with token + title + body
9. On success → INSERT `notification_events` with `status = 'dispatched'`
10. On Expo API error → INSERT `notification_events` with `status = 'failed'`; log error
11. UPDATE `notification_triggers.processed_at = now()`
12. Return 200

**Notification text templates**:
- `time_limit_reached`: title = "Screen Time Alert", body = "[Child Name] has reached their daily screen time limit"
- `blocked_content_attempted`: title = "Blocked Content Attempted", body = "[Child Name] tried to access [Category]"
- `session_ended`: title = "Session Ended", body = "[Child Name] played for [X] minutes"

**Environment variables required**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_ACCESS_TOKEN` (optional — for enhanced Expo Push API auth)

---

## npm Scripts

```json
"test:notifications": "jest --testPathPattern=tests/integration/notifications --runInBand --forceExit"
```

---

## Test Scenarios (see quickstart.md for full details)

| Scenario | Description |
|----------|-------------|
| A | Token registration: parent launches → permission granted → token stored |
| B | Time limit alert: trigger row inserted → Edge Function → notification dispatched |
| C | Blocked content alert: trigger row inserted → notification dispatched |
| D | Session end alert (≥1 min): trigger → dispatched |
| E | Session end suppressed (<1 min): trigger → suppressed_duration |
| F | De-duplication: second same-type trigger within 5 min → suppressed_dedup |
| G | No token: trigger with no device_registrations row → suppressed_no_token |
| H | Session-end opt-out: preference = false → suppressed_no_token (actually new status?) |
| I | Foreground suppression: visual alert suppressed by client handler (unit test) |
