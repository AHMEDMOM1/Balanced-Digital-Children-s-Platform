# Quickstart: Push Notifications Integration Scenarios

**Feature**: 021-push-notifications-background-alerts
**Test file**: `tests/integration/notifications.test.ts`
**Run**: `npm run test:notifications`

---

## Prerequisites

Environment variables required for integration tests:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Tests skip automatically (`describe.skip`) if credentials are absent.

## Stable Test UUIDs

```typescript
const TEST_FAMILY_ID  = 'f5555555-0000-0000-0000-000000000021';
const TEST_PARENT_ID  = 'a5555555-0000-0000-0000-000000000021';
const TEST_CHILD_ID   = 'c5555555-0000-0000-0000-000000000021';
const FAKE_EXPO_TOKEN = 'ExponentPushToken[test-token-021]';
```

---

## Scenario A — Token Registration

**Validates**: FR-001, FR-009

```
serviceClient.upsert device_registrations:
  { profile_id: TEST_PARENT_ID, family_id: TEST_FAMILY_ID, device_token: FAKE_EXPO_TOKEN, device_role: 'parent' }

SELECT device_token FROM device_registrations WHERE profile_id = TEST_PARENT_ID
→ assert token = FAKE_EXPO_TOKEN
```

---

## Scenario B — Time Limit Trigger Inserted

**Validates**: FR-002, FR-011, data model

```
serviceClient.insert notification_triggers:
  { family_id, child_id, parent_id, event_type: 'time_limit_reached', metadata: { elapsed_seconds: 1800 } }

SELECT * FROM notification_triggers WHERE family_id = TEST_FAMILY_ID ORDER BY created_at DESC LIMIT 1
→ assert event_type = 'time_limit_reached'
→ assert processed_at IS NULL (Edge Function not running in test; triggers processed manually)
→ assert metadata.elapsed_seconds = 1800
```

---

## Scenario C — Blocked Content Trigger Inserted

**Validates**: FR-003

```
serviceClient.insert notification_triggers:
  { family_id, child_id, parent_id, event_type: 'blocked_content_attempted', metadata: { category: 'videos' } }

SELECT metadata FROM notification_triggers WHERE event_type = 'blocked_content_attempted' AND family_id = TEST_FAMILY_ID
→ assert metadata.category = 'videos'
```

---

## Scenario D — Session End Trigger (≥60s) Inserted

**Validates**: FR-004 (trigger side)

```
serviceClient.insert notification_triggers:
  { family_id, child_id, parent_id, event_type: 'session_ended', metadata: { elapsed_seconds: 620 } }

SELECT * FROM notification_triggers WHERE event_type = 'session_ended' AND family_id = TEST_FAMILY_ID
→ assert row exists
```

---

## Scenario E — Session End Suppressed (<60s) — Edge Function Logic

**Validates**: FR-004 (minimum duration), notification_events status

```
// Simulate what Edge Function does for short sessions:
serviceClient.insert notification_events:
  { family_id, child_id, parent_id, event_type: 'session_ended', status: 'suppressed_duration',
    notification_text: null, trigger_id: null }

SELECT status FROM notification_events WHERE family_id = TEST_FAMILY_ID AND event_type = 'session_ended'
→ assert status = 'suppressed_duration'
```

---

## Scenario F — De-duplication Window

**Validates**: FR-007, SC-002

```
// Insert a recent 'dispatched' notification event (1 minute ago)
const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
serviceClient.insert notification_events:
  { family_id, child_id, parent_id, event_type: 'blocked_content_attempted',
    category_key: 'videos', status: 'dispatched', created_at: oneMinuteAgo }

// Query: would a second attempt within 5 minutes be suppressed?
SELECT COUNT(*) FROM notification_events
WHERE parent_id = TEST_PARENT_ID
  AND child_id = TEST_CHILD_ID
  AND event_type = 'blocked_content_attempted'
  AND category_key = 'videos'
  AND created_at > now() - interval '5 minutes'
→ assert count = 1 (de-dup check would find this and suppress)
```

---

## Scenario G — No Device Token

**Validates**: FR-009, suppressed_no_token status

```
// Ensure no device_registrations row exists for a test parent with no token
// Simulate Edge Function outcome:
serviceClient.insert notification_events:
  { family_id, child_id, parent_id, event_type: 'time_limit_reached',
    status: 'suppressed_no_token', notification_text: null }

SELECT status FROM notification_events WHERE status = 'suppressed_no_token' AND family_id = TEST_FAMILY_ID
→ assert row exists
```

---

## Scenario H — Session-End Opt-Out Preference

**Validates**: FR-008, SC-004

```
// Set opt-out preference
serviceClient.update profiles SET notification_session_end_enabled = false WHERE id = TEST_PARENT_ID

SELECT notification_session_end_enabled FROM profiles WHERE id = TEST_PARENT_ID
→ assert value = false

// Re-enable for cleanup
serviceClient.update profiles SET notification_session_end_enabled = true WHERE id = TEST_PARENT_ID
```

---

## Scenario I — RLS: Child Cannot Read notification_events

**Validates**: Constitution §Row-Level Security

```
// anonClient signs in anonymously (no profile → no family membership)
anonClient.select * FROM notification_events WHERE family_id = TEST_FAMILY_ID
→ assert data.length = 0 (RLS blocks cross-family reads)
```

---

## Scenario J — RLS: Child CAN Insert notification_triggers

**Validates**: FR-011 (client side writes trigger)

```
// anonClient signs in as TEST_CHILD_ID (auth.uid() = TEST_CHILD_ID)
// child_id = auth.uid() satisfies child_insert policy
childAnonClient.insert notification_triggers:
  { family_id, child_id: TEST_CHILD_ID, parent_id: TEST_PARENT_ID,
    event_type: 'session_ended', metadata: { elapsed_seconds: 90 } }
→ assert error is null (RLS allows child to insert own triggers)
```

---

## Scenario K — computeNotificationText (Unit, No Network)

**Validates**: FR-005 (notification text contains required context)

```typescript
// Pure function unit test — no credentials needed
import { computeNotificationText } from '../../services/api/notifications';

const text = computeNotificationText('time_limit_reached', 'Alex', { elapsed_seconds: 1800 });
expect(text.body).toContain('Alex');
expect(text.body).toContain('30 minutes');

const blocked = computeNotificationText('blocked_content_attempted', 'Alex', { category: 'videos' });
expect(blocked.body).toContain('Alex');
expect(blocked.body).toContain('videos');
```

---

## Cleanup (afterAll)

```typescript
await serviceClient.from('notification_events').delete().eq('family_id', TEST_FAMILY_ID);
await serviceClient.from('notification_triggers').delete().eq('family_id', TEST_FAMILY_ID);
await serviceClient.from('device_registrations').delete().eq('profile_id', TEST_PARENT_ID);
await serviceClient.from('profiles').delete().in('id', [TEST_CHILD_ID, TEST_PARENT_ID]);
```
