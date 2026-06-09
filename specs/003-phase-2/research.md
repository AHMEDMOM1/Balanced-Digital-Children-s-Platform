# Research: Realtime Sync & Parent Commands

## R1: Supabase Realtime Channels — Best Practices

**Decision**: Use Supabase Realtime Broadcast Channels (not Postgres Changes) for parent-to-child commands.

**Rationale**:
- Broadcast channels are designed for low-latency pub/sub between connected clients — exactly the use case for sending pause/resume/time-update commands.
- Postgres Changes listeners would add unnecessary DB round-trips for ephemeral control signals.
- Broadcast messages are fire-and-forget, which is acceptable because we **also** persist commands to a `realtime_commands` table for offline replay (clarified requirement).

**Alternatives Considered**:
- **Postgres Changes (Realtime subscriptions on table inserts)**: Higher latency (~500ms vs ~100ms for broadcast). Would work but adds overhead for time-sensitive commands.
- **Custom WebSocket server**: Too complex for MVP. Supabase already bundles Phoenix channels.
- **Firebase Realtime Database**: External dependency; project already uses Supabase.

**Key Implementation Details**:
- Channel name: `family:<family_id>` — scoped to one family.
- Each client subscribes with presence enabled (for online/offline detection).
- The `@supabase/supabase-js` v2 client already includes Realtime support via `supabase.channel()`.

---

## R2: Command Persistence & Offline Replay Strategy

**Decision**: Parent writes every command to a `realtime_commands` table in Supabase. The child fetches unapplied commands upon reconnect.

**Rationale**:
- Broadcast messages are ephemeral — if the child is offline when the parent sends a command, it is lost.
- By persisting commands in a DB table, the child can always query for commands it hasn't processed yet, using `command_id` and `acknowledged_at` columns.
- This also provides the audit trail required by FR-005.

**Alternatives Considered**:
- **Parent-side local queue with retry**: Requires parent to stay online and active until child reconnects. Unreliable.
- **Supabase Realtime Presence recovery**: Presence tracks who is online but does not replay missed messages.

**Key Implementation Details**:
- On reconnect, child queries: `SELECT * FROM realtime_commands WHERE family_id = :fid AND acknowledged_at IS NULL ORDER BY created_at ASC`.
- After applying each command, child updates `acknowledged_at` to current timestamp.
- Old acknowledged commands can be cleaned up by a scheduled job (future optimization, not in scope).

---

## R3: Idempotency — Rolling Window Deduplication

**Decision**: Child maintains a local rolling window of the last 1000 applied `command_id` UUIDs stored in AsyncStorage.

**Rationale**:
- Commands may arrive via both broadcast (live) and DB fetch (on reconnect). Without deduplication, a command could be applied twice.
- A rolling window of 1000 IDs provides a strict memory bound while covering realistic reconnection scenarios (a family is unlikely to issue 1000 commands between child reconnections).

**Alternatives Considered**:
- **Server-side `acknowledged_at` only**: Would require network round-trip before applying each command. Too slow for real-time.
- **Time-based TTL**: Harder to reason about; a rolling count is simpler.

**Key Implementation Details**:
- Store as a JSON array in AsyncStorage under key `@safeplay_applied_commands`.
- On each command: check if `command_id` is in array → skip if found → push to array → trim to 1000 → persist.
- Load from AsyncStorage at app startup.

---

## R4: Conflict Resolution — Last-Write-Wins

**Decision**: When multiple commands arrive (including from different parent devices), process them in server timestamp order. The last command's state wins.

**Rationale**:
- Simple to implement and reason about. The parent's latest intent is always the one that takes effect.
- Server timestamps avoid device clock issues (clarified assumption: server time is source of truth).

**Alternatives Considered**:
- **Command versioning / vector clocks**: Over-engineered for a family app with 1-2 parents.
- **Reject conflicting commands within time window**: May silently discard valid parent commands.

---

## R5: Heartbeat & Offline Detection

**Decision**: Child sends a heartbeat broadcast event every 30 seconds. Parent shows "Child Offline" if no heartbeat received for 90 seconds.

**Rationale**:
- 30s is a good balance between battery consumption and responsiveness.
- 90s threshold (3 missed heartbeats) reduces false positives from network blips.

**Key Implementation Details**:
- Heartbeat is a lightweight broadcast on the family channel: `{ type: 'heartbeat', child_id, timestamp }`.
- Parent stores `lastHeartbeatAt` per child in `useRealtimeStore`. A 1-second interval timer compares current time to `lastHeartbeatAt`.
- On iOS/Android, background execution may pause heartbeats. This is acceptable — the parent correctly sees "offline" when the child app is backgrounded.

---

## R6: Supabase Realtime + React Native Compatibility

**Decision**: Use `@supabase/supabase-js` v2's built-in Realtime client. No additional WebSocket library needed.

**Rationale**:
- `@supabase/supabase-js` v2 bundles the Realtime client. It works with React Native's built-in WebSocket implementation.
- Expo 55 / React Native 0.83.6 provide native WebSocket support out of the box.

**Key Implementation Details**:
- No polyfills needed for WebSocket on React Native.
- Supabase client is already configured in `services/api/client.ts` — reuse the same instance for Realtime channels.
- Channel lifecycle: subscribe on mount (via `RealtimeProvider`), unsubscribe on unmount.
