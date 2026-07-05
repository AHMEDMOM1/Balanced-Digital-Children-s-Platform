# Research: Push Notifications — Background Alerts

**Feature**: 021-push-notifications-background-alerts
**Date**: 2026-06-13

---

## Decision 1: Push Notification Delivery Service

**Decision**: Expo Push Notifications service (`expo-notifications`)

**Rationale**: TwoDevicePlan.md Phase 8 explicitly names Expo Push Notifications. The project already uses Expo SDK 51 (managed workflow), so this is the natural fit. Expo's push service abstracts APNs (iOS) and FCM (Android) into a single API endpoint with `ExponentPushToken[...]` tokens, eliminating the need to manage platform credentials separately.

**Alternatives considered**:
- **Raw APNs + FCM direct**: Requires separate credential management, server-side SDKs for both platforms. Rejected — adds complexity without benefit in a managed Expo project.
- **OneSignal / Firebase Messaging wrapper**: Third-party cost and vendor lock-in. Rejected — Expo Push is free for the app's scale.

---

## Decision 2: Server-Side Trigger Mechanism

**Decision**: Supabase Edge Function (`dispatch-notification`) triggered by a Postgres Database Webhook on `INSERT` into `notification_triggers` table.

**Rationale**: The spec requires server-side evaluation (FR-011) so notifications fire even if the child app crashes. Supabase Database Webhooks fire an Edge Function on DB row changes using the same Deno runtime already used by `aggregate-daily-stats`. This keeps all backend logic in the existing Supabase project.

**Flow**:
```
Child app event fires
    → INSERT row to notification_triggers
    → Supabase DB Webhook triggers dispatch-notification Edge Function
    → Edge Function: check de-dup, fetch parent token, call Expo Push API
    → INSERT row to notification_events (status = dispatched/failed/suppressed_*)
```

**Alternatives considered**:
- **Postgres trigger + pg_net**: Call Expo API directly from SQL. Rejected — pg_net is not enabled by default, harder to test, no retry logic.
- **Client-side trigger (child app calls Expo directly)**: Simpler, but unreliable if child app crashes. Violates FR-011. Rejected.
- **Supabase scheduled cron (poll)**: Could poll sessions/events tables every 30s. Rejected — introduces up to 30s extra latency; webhook is instant.

---

## Decision 3: Notification Trigger Event Table

**Decision**: New `notification_triggers` table — single queue for all event types (time_limit_reached, blocked_content_attempted, session_ended). Client inserts rows; Edge Function processes them.

**Rationale**: Decouples event detection (client) from notification dispatch (server). Each trigger row has `processed_at` to prevent reprocessing. Separating from `sessions` keeps the sessions table clean.

**Event types**:
- `time_limit_reached` — metadata: `{ elapsed_seconds }`
- `blocked_content_attempted` — metadata: `{ category }` (e.g., "videos")
- `session_ended` — metadata: `{ elapsed_seconds }` (Edge Function skips if < 60s)

---

## Decision 4: De-duplication Strategy

**Decision**: Query `notification_events` for a matching `(parent_id, child_id, event_type, category_key)` row within the past 5 minutes before dispatching. Insert `notification_events` row with `suppressed_dedup` status if duplicate found.

**`category_key`** is extracted from trigger metadata for `blocked_content_attempted` events; NULL for other types.

**Rationale**: A simple DB query is sufficient at v1 scale (one family). An atomic check is achieved by using a partial unique index or conditional logic in the Edge Function. If two triggers fire within milliseconds, one will be a duplicate — acceptable.

**Alternatives considered**:
- **Redis/Upstash TTL cache**: True atomic de-duplication, but adds a third-party service. Rejected — overkill for v1.
- **Unique constraint on notification_events**: Hard to express the 5-minute window as a DB constraint. Rejected.

---

## Decision 5: Foreground Suppression (FR-006)

**Decision**: Client-side suppression via `Notifications.setNotificationHandler()` in parent `_layout.tsx`. Return `{ shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false }` when app is in foreground. The notification is still dispatched and recorded server-side as `dispatched`.

**Rationale**: The spec (FR-006) prohibits showing the notification when the parent app is in the foreground. Handling this client-side is the standard Expo pattern and avoids the latency of checking foreground state server-side (which would require a last-seen heartbeat within seconds). The parent already sees the live dashboard, so suppression is invisible to the user.

**Alternatives considered**:
- **Server-side foreground check via `device_registrations.last_seen_at`**: Requires sub-second accuracy on heartbeat. Unreliable. Rejected.

---

## Decision 6: Notification Token Refresh

**Decision**: Register/refresh the push token every time the parent app launches (`useEffect` in parent `_layout.tsx` after login). Upsert to `device_registrations` on `profile_id` conflict. This covers: first install, OS token rotation, app reinstall.

**Rationale**: Expo docs recommend re-requesting the token on each launch rather than caching, since the token can be silently rotated by the OS. An upsert prevents duplicate rows.

---

## Decision 7: Session-End Notification Preference

**Decision**: Store as `notification_session_end_enabled BOOLEAN DEFAULT TRUE` column on `profiles` table. The Edge Function checks this before dispatching session-end notifications.

**Rationale**: Simplest approach — no new table. One boolean per profile. The column is additive (no breaking change). `DEFAULT TRUE` means opt-in by default.

**Alternatives considered**:
- **JSONB `notification_preferences` column**: More extensible but premature. YAGNI — only one preference exists. Rejected.
- **Separate `notification_preferences` table**: Overkill for a single boolean. Rejected.

---

## Decision 8: Expo Push API Call Format

**Decision**: Call `https://exp.host/--/api/v2/push/send` from the Edge Function via `fetch()`. Batch if multiple notifications needed in one invocation (single trigger = single notification, so no batching needed in v1).

**Token validation**: Verify `token.startsWith('ExponentPushToken[')` before calling. If invalid/expired, mark `notification_events` as `failed` and log.

---

## Unresolved / Deferred to Tasks

- **Retry logic for failed dispatches**: If Expo Push API returns a non-2xx, current plan logs as `failed` and does not retry. Retry policy deferred to a future spec.
- **Notification badge count**: Not in scope for v1 (spec does not mention badge management).
- **Rich notifications (images, actions)**: Not in scope — text-only per spec.
