# Quickstart & Test Scenarios: Realtime Channel Launch (Phase 4)

**Branch**: `019-realtime-channel-launch` | **Date**: 2026-06-13

## Running Integration Tests

```bash
# Requires EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run test:realtime-channel

# Full integration suite
npm run test:integration
```

---

## Test Scenarios

### Scenario A — Pause command delivered to child within 2 seconds

**Setup**: Anon client subscribes to `family:{familyId}` channel.  
**Action**: Service client inserts a `pause` command and broadcasts it.  
**Assert**: Anon client receives the broadcast within 2000ms.

---

### Scenario B — Heartbeat received by parent within 35 seconds

**Setup**: Service client subscribes to `family:{familyId}` channel as parent.  
**Action**: Anon client broadcasts a heartbeat with `current_activity: 'game'`, `elapsed_seconds: 120`.  
**Assert**: Service client's `onHeartbeat` handler fires; `latestHeartbeat.current_activity === 'game'` and `elapsed_seconds === 120`.

---

### Scenario C — settings_sync command updates child settings

**Setup**: Anon client has `subscribeSettingsChanges` active; `useSettingsStore` in known state.  
**Action**: Service client updates child's `profiles` row with new `daily_limit_minutes`.  
**Assert**: Anon client's `onProfileUpdate` fires within 5000ms; `useSettingsStore.dailyLimitMinutes` reflects the new value.

---

### Scenario D — category_block command disables stories

**Setup**: Anon client subscribed to family channel; `useSettingsStore.storiesEnabled = true`.  
**Action**: Service client broadcasts `category_block` with `{ category: 'stories', is_allowed: false }`.  
**Assert**: Anon client processes command; `useSettingsStore.storiesEnabled === false` within 2000ms.

---

### Scenario E — Offline child receives command on reconnect

**Setup**: No anon subscriber active.  
**Action**: Service client inserts a `pause` command row (unacknowledged).  
**Action**: Anon client subscribes and fetches unacked commands.  
**Assert**: The `pause` command is in the fetched results; `acknowledged_at` is set after processing.

---

### Scenario F — Offline detection after 90 seconds without heartbeat

**Setup**: `useRealtimeStore.isChildOnline = true`, `lastHeartbeatAt = Date.now() - 91000`.  
**Action**: Parent's offline detector interval fires.  
**Assert**: `useRealtimeStore.isChildOnline === false`.

---

### Scenario G — Channel reconnects after disconnect

**Setup**: Channel subscribed.  
**Action**: Channel emits `CHANNEL_ERROR` status.  
**Assert**: Reconnect timer fires; a new subscription attempt is made; on SUBSCRIBED, `isConnected = true`.

---

### Scenario H — settings_sync broadcast updates settings store

**Setup**: Anon client subscribed to family channel.  
**Action**: Service client broadcasts `settings_sync` with `{ games_enabled: false }`.  
**Assert**: Anon client processes the command; `useSettingsStore.gamesEnabled === false`.

---

## Manual Smoke Test (Two Emulators)

1. Launch parent emulator → register → verify channel connected (check logs for `SUBSCRIBED`)
2. Launch child emulator → pair via QR → verify channel connected  
3. On parent: tap "Pause" → verify child shows pause overlay within 2s
4. On parent: change category setting → verify child's category is blocked within 10s
5. Kill child network → wait 90s → verify parent shows child as "offline"
6. Restore child network → verify parent shows child as "online" within 5s
7. Verify child's heartbeat timer badge on parent dashboard updates every 30s
