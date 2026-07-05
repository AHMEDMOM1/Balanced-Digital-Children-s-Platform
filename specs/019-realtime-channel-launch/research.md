# Research: Realtime Channel Launch (Phase 4)

**Branch**: `019-realtime-channel-launch` | **Date**: 2026-06-13

## Codebase Audit — Current State

### What Already Works

| Component | File | Status |
|-----------|------|--------|
| Channel subscription | `services/realtime/familyChannel.ts` | ✅ Implemented |
| Command processing | `services/realtime/commandProcessor.ts` | ✅ Implemented (pause, resume, time_update, category_block, force_end, reset_child_pin) |
| Heartbeat emission (child) | `components/RealtimeProvider.tsx` | ✅ Implemented (every 30s) |
| Offline detection (parent) | `components/RealtimeProvider.tsx` | ✅ Implemented (90s timeout) |
| Unacked command replay on reconnect | `components/RealtimeProvider.tsx` | ✅ Implemented |
| Channel placed in layout (post-PIN) | `app/(parent)/_layout.tsx`, `app/(child)/_layout.tsx` | ✅ Correct |
| Reconnect on disconnect | `components/RealtimeProvider.tsx` | ✅ Implemented with exponential backoff |
| Connection logging | `components/RealtimeProvider.tsx` | ✅ `eventLogger` used |
| Child identity in RealtimeProvider | `store/useAuthStore.ts` → anonymous Supabase session | ✅ Works — child uses `signInAnonymously()` during pairing, so `childData.familyId` is populated |

### Gaps Identified

| Gap | File to Modify | Details |
|-----|----------------|---------|
| `HeartbeatEvent` missing activity fields | `services/realtime/types.ts` | `current_activity` and `current_content_id` absent |
| `CommandType` missing `settings_sync` | `services/realtime/types.ts` | New command type needed |
| No `settings_sync` handler | `services/realtime/commandProcessor.ts` | Must update `useSettingsStore` with synced settings |
| Heartbeat doesn't send activity data | `components/RealtimeProvider.tsx` | Must read activity from session/navigation state |
| Parent receives heartbeat but doesn't store details | `components/RealtimeProvider.tsx` + `store/useRealtimeStore.ts` | Only `lastHeartbeatAt` stored; activity type and elapsed time discarded |
| No Postgres CDC subscription for settings | `components/RealtimeProvider.tsx` | Child needs to subscribe to `profiles` + `category_preferences` CDC |
| Parent dashboard lacks live child status | `app/(parent)/index.tsx` | Should show activity type, elapsed time from latest heartbeat |
| No integration tests | — | `tests/integration/realtimeChannel.test.ts` needed |

---

## Decision Log

### Decision 1: Child device identity source for RealtimeProvider

**Decision**: Use `useAuthStore` (not `usePairingStore`) as the identity source in `RealtimeProvider`.

**Rationale**: The child device calls `signInAnonymously()` during QR pairing (spec 017), which creates a real Supabase session. `loadAuthState()` in `services/auth.ts` reads this session and populates `childData.familyId = profile.parent_id`. Both parent and child end up with the same `familyId` value (the parent's profile UUID), which is the channel key. No refactoring of the identity flow is needed.

**Alternatives considered**: Reading from `usePairingStore.pairingState.family_id` — rejected because `useAuthStore` is already the canonical identity source used throughout the app; introducing a second path would create divergence.

---

### Decision 2: Activity data source for child heartbeat

**Decision**: Extend `useSessionStore` with `currentActivity: string | null` and `currentContentId: string | null` fields that content screens set when they begin playback. The heartbeat reads these from the store.

**Rationale**: The heartbeat interval lives in `RealtimeProvider`, which doesn't know which screen is active. The session store is already used for `isSessionActive` and `elapsedSeconds`, making it the natural location for activity context.

**Alternatives considered**: Reading from `expo-router`'s `usePathname` hook — rejected because `RealtimeProvider` is not a screen component; hooks that depend on routing context can't be called inside a plain context provider without additional wiring.

---

### Decision 3: Storing heartbeat details in `useRealtimeStore`

**Decision**: Add `latestHeartbeat: HeartbeatEvent | null` to `useRealtimeStore`. The parent's `onHeartbeat` handler stores the full event there. The parent dashboard reads `latestHeartbeat` to display child status.

**Rationale**: The store already manages realtime state including `lastHeartbeatAt` and `isChildOnline`. Colocating the full heartbeat event is consistent and avoids additional context threading.

---

### Decision 4: Settings sync via Postgres CDC

**Decision**: The settings sync subscription (`profiles` + `category_preferences` CDC) is added to `RealtimeProvider` for the child role only. On receiving an UPDATE to the child's profile row (screen time limit changes), the child calls `useSettingsStore.getState().loadSettings()` to pull the fresh values. On category_preferences changes, the child calls the existing category update logic.

**Rationale**: Postgres CDC (server-side change delivery) is more reliable than a broadcast-only approach because it works even when the child was offline at the time the parent made the change — the CDC event fires on reconnect.

**Alternatives considered**: Using a `settings_sync` broadcast command only — rejected because broadcasts are ephemeral and don't persist for offline clients. Using CDC as primary delivery with broadcast as an optional accelerator is the approach from TwoDevicePlan.md Phase 6.

**Scope note**: The `settings_sync` command type (broadcast-based) is still added to `CommandType` and `commandProcessor` for the case where the parent wants to push a full settings snapshot instantly (e.g., after a bulk change). CDC handles the reliable delivery; broadcast handles the instant delivery.

---

### Decision 5: Integration test approach

**Decision**: Integration tests use the existing service-role + anon-key pattern from spec 018 tests. A parent service client dispatches a command or settings change; an anon subscriber (simulating child) verifies delivery within a timeout. Tests run against the real Supabase instance.

**Rationale**: Consistent with the project's constitution (Principle IV: Integration Testing Required for inter-service communication) and the established test infrastructure from prior specs.

---

## TypeScript Type Changes Required

```typescript
// types.ts — additions

export type CommandType = 
  | 'pause' | 'resume' | 'time_update' | 'category_block' | 'force_end' 
  | 'reset_child_pin' 
  | 'settings_sync';  // NEW

export interface HeartbeatEvent {
  child_id: string;
  timestamp: string;
  session_active: boolean;
  elapsed_seconds: number;
  current_activity?: 'story' | 'game' | 'video' | 'creative';  // NEW
  current_content_id?: string;  // NEW
}

export interface SettingsSyncPayload {  // NEW
  daily_limit_minutes?: number;
  stories_enabled?: boolean;
  games_enabled?: boolean;
  creative_enabled?: boolean;
  videos_enabled?: boolean;
}
```
