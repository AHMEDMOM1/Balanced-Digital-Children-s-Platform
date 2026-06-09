# Tasks: Realtime Sync & Parent Commands

**Input**: Design documents from `specs/003-phase-2/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/realtime-channel.md, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths included in every description

---

## Phase 1: Setup

**Purpose**: Create new directories and files needed for the realtime feature. No logic yet — just empty scaffolding.

- [X] T001 Create directory `services/realtime/` at project root. Create three empty files inside it: `services/realtime/types.ts`, `services/realtime/familyChannel.ts`, `services/realtime/commandProcessor.ts`. Each file should contain only a single comment: `// Phase 2: Realtime Sync — implementation pending`.

- [X] T002 Create file `store/useRealtimeStore.ts` with a single comment: `// Phase 2: Realtime store — implementation pending`.

- [X] T003 Create file `components/ui/PauseOverlay.tsx` with a single comment: `// Phase 2: Pause overlay — implementation pending`.

- [X] T004 Create file `components/RealtimeProvider.tsx` with a single comment: `// Phase 2: Realtime provider — implementation pending`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration + shared TypeScript types. ALL user stories depend on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Create the database migration file `server/migrations/006_realtime_commands.sql`. This file must contain EXACTLY this SQL:

```sql
-- Create realtime_commands table
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

-- Enable RLS
ALTER TABLE realtime_commands ENABLE ROW LEVEL SECURITY;

-- Index for fast child reconnection query
CREATE INDEX idx_realtime_commands_child_unacked
  ON realtime_commands (family_id, child_id, acknowledged_at)
  WHERE acknowledged_at IS NULL;

-- Policy: Parents can insert commands they send
CREATE POLICY "Parents can create commands"
  ON realtime_commands FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Policy: Children can read commands targeted at them
CREATE POLICY "Children can read their commands"
  ON realtime_commands FOR SELECT
  USING (
    child_id = auth.uid()
    OR (child_id IS NULL AND family_id IN (
      SELECT parent_id FROM profiles WHERE id = auth.uid()
    ))
  );

-- Policy: Parents can read commands they sent
CREATE POLICY "Parents can read own commands"
  ON realtime_commands FOR SELECT
  USING (sender_id = auth.uid());

-- Policy: Children can acknowledge commands
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

- [X] T005b Create the database migration file `server/migrations/007_activity_logs.sql` لتلبية المتطلب FR-005. This file must contain EXACTLY this SQL:

```sql
-- Create activity_logs table (FR-005: audit trail for all commands and state changes)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id),  -- who triggered the event
  target_child_id UUID,                               -- which child was affected (null = all)
  event_type TEXT NOT NULL,                           -- e.g. 'command_sent', 'command_applied', 'session_paused'
  command_id UUID,                                    -- references realtime_commands.id (nullable)
  payload JSONB DEFAULT '{}',                         -- additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Index for fast family audit queries
CREATE INDEX idx_activity_logs_family
  ON activity_logs (family_id, created_at DESC);

-- Policy: Parents can read their family's activity logs
CREATE POLICY "Parents can read family activity logs"
  ON activity_logs FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM families WHERE parent_id = auth.uid()
    )
  );

-- Policy: System (service role) inserts logs — app inserts via supabase client
CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());
```

بعد إنشاء هذا الملف: تحقق أيضاً من أن `services/realtime/commandProcessor.ts` (المهمة T009) تُدرج سجلاً في جدول `activity_logs` بعد تطبيق كل أمر بنجاح. أضف هذا الاستدعاء مباشرةً قبل `return true`:
```typescript
// Log to activity_logs (FR-005)
getClient().from('activity_logs').insert({
  family_id: command.payload?.family_id ?? '',  // pass family_id in command payload
  actor_id: command.sender_id,
  target_child_id: command.child_id,
  event_type: 'command_applied',
  command_id: command.command_id,
  payload: { command_type: command.command_type, ...command.payload },
}); // fire and forget
```

- [X] T006 Replace the placeholder comment in `services/realtime/types.ts` with the following TypeScript type definitions. These are the ONLY types needed for the entire realtime feature. Every other file will import from this file:

```typescript
// Command types that can be sent from parent to child
export type CommandType = 'pause' | 'resume' | 'time_update' | 'category_block' | 'force_end';

// The command payload sent via Supabase Broadcast AND stored in realtime_commands table
export interface RealtimeCommand {
  command_id: string;       // UUID
  command_type: CommandType;
  sender_id: string;        // parent profile UUID
  child_id: string | null;  // target child UUID, null = all children
  payload: Record<string, any>;
  created_at: string;       // ISO 8601 timestamp
}

// Heartbeat sent from child to parent every 30 seconds
export interface HeartbeatEvent {
  child_id: string;
  timestamp: string;        // ISO 8601
  session_active: boolean;
  elapsed_seconds: number;
}

// Acknowledgement sent from child to parent after applying a command
export interface CommandAckEvent {
  command_id: string;
  child_id: string;
  acknowledged_at: string;  // ISO 8601
}

// Payload shapes for specific command types
export interface TimeUpdatePayload {
  remaining_minutes: number;
}

export interface CategoryBlockPayload {
  category: string;
  is_allowed: boolean;
}
```

- [X] T007 Replace the placeholder comment in `store/useRealtimeStore.ts` with a Zustand store. The store must have the following state and actions:

**State fields:**
- `isConnected: boolean` — initially `false`. Whether the Supabase Realtime channel is active.
- `isChildOnline: boolean` — initially `false`. Whether the parent sees the child as online.
- `lastHeartbeatAt: number | null` — initially `null`. Timestamp (ms) of last received heartbeat.
- `appliedCommandIds: string[]` — initially `[]`. Rolling window of last 1000 applied command UUIDs for idempotency.
- `pendingCommands: RealtimeCommand[]` — initially `[]`. Commands queued while offline.

**Actions:**
- `setConnected(connected: boolean): void` — sets `isConnected`.
- `setChildOnline(online: boolean): void` — sets `isChildOnline`.
- `recordHeartbeat(): void` — sets `lastHeartbeatAt` to `Date.now()` and `isChildOnline` to `true`.
- `addAppliedCommandId(id: string): void` — pushes `id` to `appliedCommandIds`. If array length > 1000, remove the oldest entry (shift). Persist array to AsyncStorage under key `@safeplay_applied_commands`.
- `isCommandApplied(id: string): boolean` — returns `true` if `id` is in `appliedCommandIds`.
- `loadAppliedCommandIds(): Promise<void>` — reads `@safeplay_applied_commands` from AsyncStorage, parses JSON array, sets `appliedCommandIds`.
- `clearAll(): void` — resets all state to initial values.

Import `RealtimeCommand` from `../../services/realtime/types`. Import `create` from `zustand`. Import `AsyncStorage` from `@react-native-async-storage/async-storage` with the same `storageAvailable` check pattern used in `store/useSettingsStore.ts`.

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Instant Pause/Resume (Priority: P1) 🎯 MVP

**Goal**: Parent taps "Pause Now" → child screen shows friendly mascot overlay within 2 seconds. Parent taps "Resume" → overlay disappears.

**Independent Test**: Log in as parent on Device A, child on Device B. Tap "Pause Now" on A. Verify B shows pause overlay within 2 seconds. Tap "Resume" on A. Verify B's overlay disappears.

### Implementation for User Story 1

- [X] T008 [P] [US1] Replace the placeholder comment in `services/realtime/familyChannel.ts` with a module that exports the following functions. Use the Supabase client from `services/api/client.ts` (import `getClient`). Import types from `./types`.

**Function 1: `subscribeFamilyChannel(familyId: string, role: 'parent' | 'child', handlers: ChannelHandlers): RealtimeChannel`**
- Call `getClient().channel('family:' + familyId)`.
- Call `.on('broadcast', { event: 'command' }, (payload) => handlers.onCommand?.(payload.payload as RealtimeCommand))`.
- Call `.on('broadcast', { event: 'heartbeat' }, (payload) => handlers.onHeartbeat?.(payload.payload as HeartbeatEvent))`.
- Call `.on('broadcast', { event: 'command_ack' }, (payload) => handlers.onAck?.(payload.payload as CommandAckEvent))`.
- Call `.subscribe()`.
- Return the channel instance.
- Define `ChannelHandlers` interface: `{ onCommand?: (cmd: RealtimeCommand) => void; onHeartbeat?: (hb: HeartbeatEvent) => void; onAck?: (ack: CommandAckEvent) => void; }`.

**Function 2: `broadcastCommand(channel: RealtimeChannel, command: RealtimeCommand): void`**
- Call `channel.send({ type: 'broadcast', event: 'command', payload: command })`.

**Function 3: `broadcastHeartbeat(channel: RealtimeChannel, heartbeat: HeartbeatEvent): void`**
- Call `channel.send({ type: 'broadcast', event: 'heartbeat', payload: heartbeat })`.

**Function 4: `broadcastAck(channel: RealtimeChannel, ack: CommandAckEvent): void`**
- Call `channel.send({ type: 'broadcast', event: 'command_ack', payload: ack })`.

**Function 5: `unsubscribeFamilyChannel(channel: RealtimeChannel): void`**
- Call `getClient().removeChannel(channel)`.

Import `RealtimeChannel` from `@supabase/supabase-js`. Export the `ChannelHandlers` type.

- [X] T009 [P] [US1] Replace the placeholder comment in `services/realtime/commandProcessor.ts` with a module that exports ONE function:

**Function: `processCommand(command: RealtimeCommand, realtimeStore: any, sessionStore: any): boolean`**

Steps (in exact order):
1. Check `realtimeStore.getState().isCommandApplied(command.command_id)`. If `true`, return `false` (skip duplicate).
2. Switch on `command.command_type`:
   - `'pause'`: Call `sessionStore.getState().setPaused(true)`.
   - `'resume'`: Call `sessionStore.getState().setPaused(false)`.
   - `'time_update'`: Call `sessionStore.getState().updateRemainingMinutes(command.payload.remaining_minutes)`. (This action will be added to useSessionStore in T010.)
   - `'category_block'`: Import `useSettingsStore` from `store/useSettingsStore` and call the appropriate toggle based on `command.payload.category` and `command.payload.is_allowed`.
   - `'force_end'`: Call `sessionStore.getState().endSession()`.
3. Call `realtimeStore.getState().addAppliedCommandId(command.command_id)`.
4. Acknowledge in DB: Call `getClient().from('realtime_commands').update({ acknowledged_at: new Date().toISOString() }).eq('id', command.command_id)`. Do NOT await — fire and forget.
5. Return `true`.

Import `getClient` from `services/api/client`. Import `RealtimeCommand` from `./types`.

- [X] T010 [US1] Modify `store/useSessionStore.ts`. Add TWO new fields and ONE new action to the existing store. Do NOT change any existing fields or actions.

**New state fields:**
- `remainingMinutes: number` — initially `0`. The child's remaining session time in minutes.
- `isPauseOverlayVisible: boolean` — initially `false`. Controls the pause overlay.

**Modify existing `setPaused` action:** In addition to setting `isPaused`, also set `isPauseOverlayVisible` to the same value. So `setPaused(true)` sets both `isPaused: true` and `isPauseOverlayVisible: true`.

**New action:**
- `updateRemainingMinutes(minutes: number): void` — sets `remainingMinutes` to `minutes`. If `minutes <= 0`, call `endSession()` from within the store.

- [X] T011 [US1] Replace the placeholder comment in `components/ui/PauseOverlay.tsx` with a React Native component.

**Component: `PauseOverlay`** (default export, no props)

Behavior:
- Import `useSessionStore` from `store/useSessionStore`.
- Read `isPauseOverlayVisible` from the store.
- If `isPauseOverlayVisible` is `false`, return `null`.
- If `true`, render a full-screen overlay with:
  - `position: 'absolute'`, `top: 0`, `left: 0`, `right: 0`, `bottom: 0`, `zIndex: 9999`
  - Background color: `'rgba(0, 0, 0, 0.85)'`
  - Centered content:
    - A large emoji `🐻` (Text, fontSize 80)
    - Text `"وقت الراحة!"` (fontSize 28, color white, fontWeight bold, textAlign center, writingDirection 'rtl')
    - Text `"Time for a break!"` (fontSize 20, color `'#aaa'`, marginTop 8, textAlign center)
    - Text `"طلب منك أحد الوالدين التوقف مؤقتاً"` (fontSize 14, color `'#888'`, marginTop 16, textAlign center, writingDirection 'rtl')
- The overlay must intercept all touch events (add `pointerEvents="auto"` on the outer View and a `TouchableWithoutFeedback` wrapper with an empty `onPress`).

Import from `react-native`: `View`, `Text`, `StyleSheet`, `TouchableWithoutFeedback`.

- [X] T012 [US1] Replace the placeholder comment in `components/RealtimeProvider.tsx` with a React context provider component.

**Component: `RealtimeProvider`** (named export, props: `{ children: React.ReactNode }`)

Behavior:
1. Import `useAuthStore` from `store/useAuthStore` — read `role`, `parentData`, `childData`.
2. Import `useRealtimeStore` — read `setConnected`, `recordHeartbeat`, `loadAppliedCommandIds`.
3. Import `useSessionStore` (default import).
4. Import `subscribeFamilyChannel`, `unsubscribeFamilyChannel`, `broadcastHeartbeat` from `services/realtime/familyChannel`.
5. Import `processCommand` from `services/realtime/commandProcessor`.
6. Import `RealtimeChannel` from `@supabase/supabase-js`.
7. Use a `useRef<RealtimeChannel | null>(null)` to hold the channel.
8. Use a `useRef<NodeJS.Timeout | null>(null)` to hold the heartbeat interval.
9. Determine `familyId`: If `role === 'parent'`, use `parentData?.familyId`. If `role === 'child'`, use `childData?.familyId`. If no familyId, don't subscribe.
10. `useEffect` (depends on `familyId`, `role`):
    - Call `loadAppliedCommandIds()`.
    - Call `subscribeFamilyChannel(familyId, role, handlers)` where:
      - If `role === 'child'`: `onCommand` calls `processCommand(cmd, useRealtimeStore, useSessionStore)`.
      - If `role === 'parent'`: `onHeartbeat` calls `recordHeartbeat()`.
    - Store returned channel in ref.
    - Call `setConnected(true)`.
    - If `role === 'child'`: Start a `setInterval` every 30000ms that calls `broadcastHeartbeat(channelRef.current, { child_id: childData.id, timestamp: new Date().toISOString(), session_active: useSessionStore.getState().isSessionActive, elapsed_seconds: useSessionStore.getState().elapsedSeconds })`. Also fetch unapplied commands from DB on mount: `getClient().from('realtime_commands').select('*').eq('family_id', familyId).is('acknowledged_at', null).order('created_at', { ascending: true })`. For each row, call `processCommand(row, useRealtimeStore, useSessionStore)`.
    - If `role === 'parent'`: Start a `setInterval` every 1000ms that checks `Date.now() - useRealtimeStore.getState().lastHeartbeatAt > 90000`. If true, call `setChildOnline(false)`.
    - Cleanup: clear intervals, call `unsubscribeFamilyChannel`, call `setConnected(false)`.
11. Return `<>{children}</>`.

- [X] T013 [US1] Modify `app/(parent)/control.tsx`. Add a "Pause / Resume" button and a "Child Online/Offline" indicator. Do NOT remove any existing UI.

**Changes:**
1. Import `useRealtimeStore` from `store/useRealtimeStore`.
2. Import `useSessionStore` from `store/useSessionStore`.
3. Import `broadcastCommand` from `services/realtime/familyChannel`.
4. Import `getClient` from `services/api/client`.
5. Import `{ v4 as uuidv4 }` from `uuid`. NOTE: If `uuid` is not installed, use `crypto.randomUUID()` or a manual UUID generator: `'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ...)`.
6. Read `isChildOnline` from `useRealtimeStore`.
7. Read `isPaused` from `useSessionStore`.
8. Add a status badge at the top of the ScrollView (before the first `<View style={styles.section}>`):
   - Green dot + "Child Online" text if `isChildOnline` is true.
   - Red dot + "Child Offline" text if `isChildOnline` is false.
   - Green dot: `{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' }`.
   - Red dot: same but `backgroundColor: '#F44336'`.
9. Add a new section after the status badge with a single button:
   - If `isPaused` is `false`: Show a button labeled "⏸️ Pause Now" with `backgroundColor: '#FF6B6B'`.
   - If `isPaused` is `true`: Show a button labeled "▶️ Resume" with `backgroundColor: '#4CAF50'`.
   - `onPress`: Create a `RealtimeCommand` object with `command_id` = new UUID, `command_type` = `isPaused ? 'resume' : 'pause'`, `sender_id` = `parentData.id`, `child_id` = `activeChild?.id || null`, `payload` = `{}`, `created_at` = `new Date().toISOString()`. Then: (a) broadcast it via `broadcastCommand(channel, command)` — get channel from a ref or context, (b) insert it into the DB: `getClient().from('realtime_commands').insert({ id: command.command_id, family_id: parentData.familyId, sender_id: parentData.id, child_id: activeChild?.id, command_type: command.command_type, payload: command.payload })`.
   - NOTE: For the channel reference, the simplest approach is to store the channel in `useRealtimeStore` (add a `channel` field to the store in T007 — `channel: RealtimeChannel | null`, initially `null`, with `setChannel(ch)` action). Then read `channel` from the store here.

- [X] T014 [US1] Modify `app/(child)/_layout.tsx`. Wrap the existing layout content with `RealtimeProvider` and add `PauseOverlay`.

**Changes:**
1. Import `RealtimeProvider` from `components/RealtimeProvider`.
2. Import `PauseOverlay` from `components/ui/PauseOverlay`.
3. Wrap the existing return value with `<RealtimeProvider>...</RealtimeProvider>`.
4. Add `<PauseOverlay />` as the last child inside the RealtimeProvider (after the existing content), so it renders on top.

- [X] T015 [US1] Modify `app/(parent)/_layout.tsx`. Wrap the existing layout content with `RealtimeProvider`.

**Changes:**
1. Import `RealtimeProvider` from `components/RealtimeProvider`.
2. Wrap the existing return value with `<RealtimeProvider>...</RealtimeProvider>`.

**Checkpoint**: User Story 1 (Pause/Resume) should be fully functional. Test by opening parent and child on two devices.

---

## Phase 4: User Story 2 — Mid-Session Time Limit Update (Priority: P1)

**Goal**: Parent adjusts remaining time → child's countdown updates instantly, session ends if time reaches zero.

**Independent Test**: Start child session with 30 min. On parent, reduce time by 15 min. Verify child shows 15 min. Reduce to 0. Verify session ends.

### Implementation for User Story 2

- [X] T016 [US2] Modify `app/(parent)/control.tsx`. In the existing "Time & Sessions" section, add a new control for "Update Remaining Time Now".

**Changes:**
1. Add a new `ControlItem` with `type="stepper"` after the existing "Daily Time Limit" item, inside the same card.
2. Label: "Remaining Minutes (Live)". Subtitle: "Instantly update child's remaining time".
3. Icon: `"hourglass-outline"`.
4. The stepper value should be bound to a local `useState<number>` initialized to the current `dailyTimeLimitMinutes`.
5. Add a "Send Update" `TouchableOpacity` button below the stepper.
6. `onPress`: Create a `RealtimeCommand` with `command_type: 'time_update'`, `payload: { remaining_minutes: localValue }`. Broadcast it AND insert into DB (same pattern as T013's pause button).

- [X] T017 [US2] The `processCommand` function in `services/realtime/commandProcessor.ts` already handles `'time_update'` (from T009). Verify that `store/useSessionStore.ts` has `updateRemainingMinutes` (from T010). No additional code needed — this task is a verification checkpoint.

**Verification**: Call `processCommand` with a `time_update` command → `useSessionStore.getState().remainingMinutes` should update. If `remaining_minutes <= 0`, `endSession()` should be called.

**Checkpoint**: User Story 2 should work. Test by changing time on parent and observing child timer.

---

## Phase 5: User Story 3 — Instant Category Blocking (Priority: P2)

**Goal**: Parent blocks a category → child is gracefully exited from active content in that category.

**Independent Test**: Child reads a "Fantasy" story. Parent blocks "Fantasy". Verify child exits story gracefully to home screen.

### Implementation for User Story 3

- [X] T018 [US3] Modify `app/(parent)/control.tsx`. In the existing Category Preferences section, update the `toggleCategory` handler to ALSO broadcast a `category_block` realtime command.

**Changes:**
1. Find the `onValueChange` handler inside the KNOWN_CATEGORIES map (line ~174).
2. After calling the existing `toggleCategory(activeChild.id, category, val)`, ALSO create and broadcast+insert a `RealtimeCommand` with:
   - `command_type: 'category_block'`
   - `payload: { category: category, is_allowed: val }`
   - Same sender/child/family fields as T013.

- [X] T019 [US3] Modify `services/realtime/commandProcessor.ts`. The `'category_block'` case needs refinement.

**Current behavior** (from T009): It calls a toggle on `useSettingsStore`.

**Updated behavior**: Instead of toggling, directly set the specific category:
1. Read `command.payload.category` (string like `'Stories'`, `'Games'`, `'Creative'`, `'Videos'`).
2. Read `command.payload.is_allowed` (boolean).
3. Map category name to store action:
   - If category matches stories (case-insensitive contains 'stor'): call `useSettingsStore.getState()` and set `storiesEnabled` to `is_allowed` via `set({ storiesEnabled: is_allowed })`.
   - Same for games/creative/videos.
4. For Supabase category_preferences (Adventure, Educational, Fantasy, etc.): call `getClient().from('category_preferences').upsert({ child_id: command.child_id, category: command.payload.category, is_allowed: command.payload.is_allowed }, { onConflict: 'child_id, category' })`. Fire and forget.

- [X] T020 [US3] Modify `app/(child)/index.tsx`. Add a check: when an active category is blocked, navigate the child to the dedicated "go play outside" screen instead of the plain home tab.

**Changes:**
1. Import `useSettingsStore` from `store/useSettingsStore`.
2. Import `router` from `expo-router`.
3. In a `useEffect` that depends on `storiesEnabled`, `gamesEnabled`, `creativeEnabled`, `videosEnabled`:
   - Determine which category corresponds to the current screen the child is viewing.
   - If that category becomes `false` (disabled), call `router.replace('/(child)/blocked')` to navigate to the blocked/Lottie animation screen.
   - This triggers the "اذهب العب في الخارج" Lottie animation defined in `app/(child)/blocked.tsx`.
4. Create file `app/(child)/blocked.tsx` if it does not already exist. It should:
   - Be a full-screen React Native screen (default export).
   - Import and render the Lottie animation asset (look for an existing Lottie file under `assets/animations/` — use `go-outside.json` or similar; if not found, use a placeholder emoji `🌳` with large text).
   - Display RTL text: `"اذهب العب في الخارج!"` (fontSize 28, fontWeight bold, textAlign center, writingDirection 'rtl').
   - Display a sub-label: `"تم إيقاف هذا القسم من قِبَل أحد الوالدين"` (fontSize 16, color '#888', marginTop 8, writingDirection 'rtl').
   - Add a `TouchableOpacity` button labeled `"العودة للرئيسية"` that calls `router.replace('/(child)/')` to let the child go back to the home tab manually.
   - Background color: `'#FFF8E1'` (warm light yellow — child-friendly).

**Checkpoint**: User Story 3 should work. Test by blocking a category while child is viewing content.

---

## Phase 6: User Story 4 — Offline Resilience & Replay (Priority: P2)

**Goal**: Child goes offline → session continues with last-known limits. On reconnect → missed commands apply in order, no duplicates.

**Independent Test**: Disconnect child WiFi. Send parent commands. Reconnect. Verify commands apply once, in order.

### Implementation for User Story 4

- [X] T021 [US4] The offline replay logic is already implemented in `components/RealtimeProvider.tsx` (T012) — on mount, the child fetches unacknowledged commands from the DB and processes them via `processCommand`. The rolling window deduplication in `store/useRealtimeStore.ts` (T007) prevents duplicates.

**This task is a verification + edge case hardening task.** Modify `components/RealtimeProvider.tsx`:

1. Add reconnection handling: Listen for the channel's `'CHANNEL_ERROR'` and `'CLOSED'` system events. On these events, set `setConnected(false)`. After a 5-second delay, attempt to re-subscribe by calling `subscribeFamilyChannel` again. On successful re-subscribe, re-fetch unacknowledged commands from the DB.

2. Add connection state listener: In the `useEffect`, after `subscribe()`, add a listener for the Supabase channel status changes. When status becomes `'SUBSCRIBED'`, call `setConnected(true)`. When status becomes `'CLOSED'` or `'CHANNEL_ERROR'`, call `setConnected(false)`.

- [X] T022 [US4] Modify `store/useSessionStore.ts`. Add offline continuity: the session timer should continue counting even when the Realtime channel is disconnected.

**Changes:**
1. The existing `tick()` action already increments `elapsedSeconds` every second. This works offline because it's driven by a local `setInterval` — NOT by the server.
2. Add a new field `lastTickAt: number | null` (initially `null`). In `tick()`, set `lastTickAt` to `Date.now()`.
3. Add a new field `wasOffline: boolean` (initially `false`).
4. Add a new action `handleReconnect(): void`:
   - Sets `wasOffline` to `false`.
   - If `lastTickAt` is not null and `isSessionActive` is true, calculate `missedSeconds = Math.floor((Date.now() - lastTickAt) / 1000)`. Add `missedSeconds` to `elapsedSeconds` (in case the timer was paused by OS).

**Checkpoint**: User Story 4 complete. Test by turning WiFi off/on and verifying commands replay.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories.

- [X] T023 [P] Add `uuid` generation utility. Create file `services/utils/uuid.ts` with a single exported function:

```typescript
export function generateCommandId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

Update all files that generate UUIDs (T013, T016, T018) to import `generateCommandId` from `services/utils/uuid` instead of inline UUID generation.

- [X] T024 [P] Update `services/socket.ts` — add a deprecation notice at the top of the file:

```typescript
/**
 * @deprecated This socket stub is superseded by services/realtime/familyChannel.ts
 * which uses Supabase Realtime Channels. This file is kept for backward
 * compatibility but will be removed in a future release.
 */
```

Do NOT delete the file — existing imports may still reference it.

- [X] T025 Run the quickstart.md validation flow from `specs/003-phase-2/quickstart.md`. Manually test: (1) Pause/Resume, (2) Time Update, (3) Category Block, (4) Offline Replay. Document any issues found.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (reuses channel + command processor).
- **User Story 3 (Phase 5)**: Depends on Phase 3 (reuses channel + command processor).
- **User Story 4 (Phase 6)**: Depends on Phase 3 (hardens the existing reconnection logic).
- **Polish (Phase 7)**: Depends on all user stories.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2. Independent.
- **US2 (P1)**: Depends on US1 (uses the channel and commandProcessor created in US1).
- **US3 (P2)**: Depends on US1 (uses the channel and commandProcessor created in US1).
- **US4 (P2)**: Depends on US1 (hardens the RealtimeProvider created in US1).

### Within Each User Story

- Channel + Processor (T008, T009) can run in parallel [P].
- Store updates (T010) before UI components (T011, T012).
- UI components (T011, T012) before screen modifications (T013, T014, T015).

### Parallel Opportunities

- T001, T002, T003, T004 can all run in parallel (Phase 1 — empty files).
- T005, T006, T007 can all run in parallel (Phase 2 — independent files).
- T008, T009 can run in parallel (Phase 3 — different files).
- T023, T024 can run in parallel (Phase 7 — different files).

---

## Parallel Example: User Story 1

```bash
# Phase 3: Launch parallel tasks
Task T008: "services/realtime/familyChannel.ts"
Task T009: "services/realtime/commandProcessor.ts"

# Then sequential:
Task T010: "store/useSessionStore.ts" (adds state needed by T011, T012)
Task T011: "components/ui/PauseOverlay.tsx" (uses T010's state)
Task T012: "components/RealtimeProvider.tsx" (uses T008, T009, T010)
Task T013: "app/(parent)/control.tsx" (uses T008, T012)
Task T014: "app/(child)/_layout.tsx" (uses T011, T012)
Task T015: "app/(parent)/_layout.tsx" (uses T012)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T007)
3. Complete Phase 3: User Story 1 (T008–T015)
4. **STOP and VALIDATE**: Test Pause/Resume on two devices
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Pause/Resume) → Test → MVP! ✅
3. Add US2 (Time Update) → Test → Deploy
4. Add US3 (Category Block) → Test → Deploy
5. Add US4 (Offline Hardening) → Test → Deploy
6. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after completion
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- Every task includes exact file paths and exact code patterns — designed for execution by any AI model
