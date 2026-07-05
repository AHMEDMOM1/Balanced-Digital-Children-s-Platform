# Pairing & Communication Plan
> Children's Digital Platform — Parent ↔ Child Architecture
> **Spec**: 013 | **Date**: 2026-06-11 | **Branch**: `013-two-device-architecture`

---

## Overview

The app currently runs both Parent and Child interfaces on a **single device**, separated only by a 4-digit PIN in local `AsyncStorage`. This plan upgrades to **two separate physical devices**:

- **Parent Device** — manages settings, views reports, sends commands.
- **Child Device** — runs the play interface, receives commands, sends usage data back.

The Supabase Realtime channel `family:{familyId}` and the `realtime_commands` table already exist in the codebase — they just need both devices connected to them.

---

## Part A — Device Pairing

### Pairing Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  PARENT DEVICE                          CHILD DEVICE            │
│                                                                  │
│  1. Open app (first time)                                        │
│     → "Register Family" screen                                   │
│  2. Enter name + email                                           │
│  3. Receive 6-digit OTP via email                                │
│  4. Verify OTP                                                   │
│     → Supabase creates profiles row (role=parent)                │
│     → Supabase creates families row → family_id                  │
│  5. Server generates pairing_token (UUID, 10-min TTL)            │
│     stored in pairing_tokens table                               │
│  6. QR screen displayed                                          │
│     QR payload: { token, family_id, expires_at }                 │
│     + manual code shown below QR (e.g. 482-931)                  │
│                          │                                        │
│                          │  ← child scans QR or types code       │
│                          │                                        │
│                          │         7. "Start Playing" (first)    │
│                          │            → "Link to Parent" prompt  │
│                          │         8. Scan QR / enter code       │
│                          │         9. POST /pair with token      │
│                          │            Server validates:          │
│                          │            - exists + not used        │
│                          │            - not expired              │
│                          │            Creates child profile row  │
│                          │            Marks token as consumed    │
│                          │            Returns: child_id,         │
│                          │                     family_id, JWT    │
│                          │        10. Create 6-digit child PIN   │
│                          │            (hashed locally + in DB)   │
│                          │        11. Child device paired ✓      │
│  7. QR screen detects    │                                        │
│     child_id appear      │                                        │
│     (Realtime event)     │                                        │
│  8. Parent dashboard     │                                        │
│     loads ✓              │                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 0 — Database Schema

**Goal**: Add all required tables before writing any app code.

**Migration file**: `supabase/migrations/20260611000001_two_device_schema.sql`

```sql
-- One-time pairing tokens (separate table, not stored in families)
CREATE TABLE pairing_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  token        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  manual_code  TEXT NOT NULL,         -- 6-digit human-readable (e.g. "482931")
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  used_at      TIMESTAMPTZ,           -- NULL = available, non-NULL = consumed
  child_id     UUID REFERENCES profiles(id)
);

-- Device registration (one row per physical device)
CREATE TABLE device_registrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  device_role  TEXT NOT NULL CHECK (device_role IN ('parent', 'child')),
  device_token TEXT,                  -- push notification token
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add PIN columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_length INT DEFAULT 6;
```

> **Note**: Child profiles use the existing `profiles` table (role=child) — no separate `children` table needed.

---

### Phase 1 — Parent Registration & QR Generation

**Goal**: Parent registers and sees a QR code waiting for the child to scan.

**Files to create/modify:**

| File | Change |
|------|--------|
| `app/auth/register.tsx` | After OTP verify → redirect to `QRPairingScreen` |
| `app/auth/qr-pairing.tsx` | **NEW** — QR display + manual code + timer + "Regenerate" button |
| `services/api/pairing.ts` | **NEW** — `generatePairingToken()`, `watchForChildPaired()` |

**Steps:**
1. Parent opens app → enters name + email
2. Supabase sends 6-digit OTP → parent verifies
3. `profiles` row created (role=parent), `families` row created
4. Parent creates 6-digit PIN → stored as bcrypt hash locally + in `profiles.pin_hash`
5. `generatePairingToken(family_id)` → inserts row into `pairing_tokens` → returns `token`, `manual_code`, `expires_at`
6. QR screen shows:
   - QR code encoding `{ token, family_id, expires_at }`
   - Manual code below in `XXX-XXX` format
   - Countdown timer to expiry → auto-regenerates on expiry
7. Subscribe to Postgres Changes on `pairing_tokens WHERE family_id = X` → when `used_at` is set, navigate to parent dashboard

**QR generation:**
```bash
npm install react-native-qrcode-svg
```

```jsx
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={JSON.stringify({ token, family_id, expires_at })}
  size={200}
/>
<Text>{manualCode.slice(0,3)}-{manualCode.slice(3)}</Text>
```

---

### Phase 2 — Child Device Pairing

**Goal**: Child device scans QR (or types code) → validates → creates profile → sets PIN.

**Files to create/modify:**

| File | Change |
|------|--------|
| `app/index.tsx` | On "Start Playing", check `isPaired` in `usePairingStore`. If false → `QRScanScreen` |
| `app/auth/qr-scan.tsx` | **NEW** — camera scanner + manual code entry fallback |
| `app/auth/setup-child-pin.tsx` | **NEW** — 6-digit PIN creation for child device |
| `services/api/pairing.ts` | Add `consumePairingToken(token, manualCode?)` |
| `store/usePairingStore.ts` | **NEW** — stores `{ isPaired, family_id, child_id, device_role }` in AsyncStorage |

**Steps:**
1. Child opens app → "Start Playing" → check `isPaired` flag
2. If not paired → open camera to scan QR
3. Parse QR JSON payload → validate `expires_at` locally (quick check before network call)
4. Call `consumePairingToken(token)` on server:
   - Verifies `used_at IS NULL` and `expires_at > now()`
   - Creates `profiles` row (role=child)
   - Sets `pairing_tokens.used_at = now()` and `child_id = new profile id`
   - Returns `{ child_id, family_id, jwt }`
5. Save `{ family_id, child_id, device_role: 'child' }` to `usePairingStore`
6. Navigate to `setup-child-pin.tsx` → child creates 6-digit PIN → hashed + stored locally and in DB

**Manual code fallback:**
```jsx
// Button below scanner
<TouchableOpacity onPress={() => setShowManualEntry(true)}>
  <Text>Enter code manually</Text>
</TouchableOpacity>

// Same consumePairingToken path, just pass manual_code instead of token
await consumePairingToken(null, manualCode);
```

**Library needed:**
```bash
npx expo install expo-camera
# or
npx expo install expo-barcode-scanner
```

---

### Phase 3 — PIN Authentication (Both Devices)

**Goal**: All subsequent logins use PIN only — fast, works offline.

**Key decisions:**
- Parent PIN (6-digit) and Child PIN (6-digit) are stored and validated **independently per device**
- PIN hash stored in `AsyncStorage` locally → login works with no internet
- Supabase connectivity attempted first; local hash is the fallback

**Files to modify:**

| File | Change |
|------|--------|
| `app/index.tsx` | Replace single-device logic with `usePairingStore` device role check |
| `app/auth/setup-pin.tsx` | Update from 4-digit to 6-digit PIN |
| `store/useSettingsStore.ts` | Move PIN from 4-digit plain string to 6-digit bcrypt hash |
| `components/ui/PinModal.tsx` | Update to 6-digit input |

**Subsequent login flows:**

| Device | Flow |
|--------|------|
| Parent | Open app → read `device_role=parent` → 6-digit PIN → parent dashboard |
| Child | Open app → read `device_role=child` → 6-digit PIN → child interface |
| Forgot PIN (Parent) | Tap "Forgot PIN" → email OTP → reset locally + in DB |
| Forgot PIN (Child) | Parent sends `reset_pin` command → child shows PIN creation screen |

**PIN library (no native modules):**
```bash
npm install bcryptjs
```

```js
import bcrypt from 'bcryptjs';

// Store
const hash = await bcrypt.hash(pin, 10);

// Verify
const isValid = await bcrypt.compare(enteredPin, storedHash);
```

---

## Part B — Communication Layer

### Architecture Diagram

```
                         ┌─────────────────────┐
                         │    SUPABASE CLOUD    │
                         │                      │
                         │  ┌────────────────┐  │
                         │  │   PostgreSQL    │  │
                         │  │  - families    │  │
                         │  │  - profiles    │  │
                         │  │  - realtime_   │  │
                         │  │    commands    │  │
                         │  │  - daily_stats │  │
                         │  │  - settings    │  │
                         │  └───────┬────────┘  │
                         │          │ CDC        │
                         │  ┌───────▼────────┐  │
                         │  │ Realtime Engine │  │
                         │  │  Broadcast +   │  │
                         │  │  Postgres CDC  │  │
                         │  └───────┬────────┘  │
                         └──────────┼────────────┘
                  WebSocket         │         WebSocket
          ┌───────────────┘                   └────────────────┐
          ▼                                                     ▼
┌──────────────────┐   channel: family:{id}        ┌──────────────────┐
│  PARENT DEVICE   │ ◄─────────────────────────── │  CHILD DEVICE    │
│                  │ ──────────────────────────── ►│                  │
│  Sends:          │                               │  Sends:          │
│  - pause/resume  │                               │  - heartbeat     │
│  - time_update   │                               │  - session_start │
│  - category_block│                               │  - session_end   │
│  - force_end     │                               │  - command_ack   │
│  - reset_pin     │                               │                  │
│  - settings_sync │                               │  Receives:       │
│                  │                               │  - all commands  │
│  Receives:       │                               │    from parent   │
│  - heartbeat     │                               │                  │
│  - session events│                               │                  │
│  - acks          │                               │                  │
└──────────────────┘                               └──────────────────┘
          │                                                     │
          └──────────────── Push Notifications ─────────────────┘
                         (when app is closed)
```

---

### Phase 4 — Realtime Channel (Both Devices)

**Goal**: Both devices connect to `family:{family_id}` at launch and exchange messages reliably.

> The channel already exists in `services/realtime/familyChannel.ts` — it just needs to connect at app launch on both devices, not only when the parent opens the control screen.

**Files to modify:**

| File | Change |
|------|--------|
| `app/_layout.tsx` | Subscribe to family channel after PIN verification |
| `services/realtime/familyChannel.ts` | Add `subscribeToSettingsChanges()`, offline queue fetch |
| `services/realtime/commandProcessor.ts` | Handle `reset_pin`, `settings_sync` |
| `services/realtime/types.ts` | Add new event types |

**Updated event types:**
```typescript
export type CommandType =
  | 'pause' | 'resume' | 'time_update' | 'category_block' | 'force_end'
  | 'reset_pin'       // parent → child: trigger child PIN reset flow
  | 'settings_sync';  // parent → child: push full settings snapshot

export interface HeartbeatEvent {
  child_id:            string;
  timestamp:           string;
  session_active:      boolean;
  elapsed_seconds:     number;
  current_activity?:   'story' | 'game' | 'video' | 'creative';
  current_content_id?: string;   // content item UUID
}
```

**Heartbeat — child emits every 30 seconds:**
```js
setInterval(() => {
  channel.send({
    type: 'broadcast',
    event: 'heartbeat',
    payload: {
      child_id,
      timestamp: new Date().toISOString(),
      session_active: true,
      elapsed_seconds: sessionTimer,
      current_activity: activeContentType,
      current_content_id: activeContentId
    }
  });
}, 30_000);
```

---

### Phase 5 — Offline Command Queue

**Goal**: Commands are never lost even if the child device is offline.

> The `realtime_commands` table already exists in the project. This phase makes it the **primary path**, not the fallback.

**Flow:**
```
Parent sends command
    │
    ├─► INSERT into realtime_commands (ALWAYS — before broadcast)
    └─► Supabase Broadcast (instant delivery if child is online)
              │
              └─► On child reconnect:
                  SELECT * FROM realtime_commands
                  WHERE child_id = X AND acknowledged_at IS NULL
                  ORDER BY created_at ASC
                  → apply each command in order
                  → UPDATE acknowledged_at = now()
```

**Parent sends a command:**
```js
// 1. Always write to DB first
await supabase.from('realtime_commands').insert({
  family_id, child_id,
  command: 'pause',
  payload: {},
});

// 2. Also broadcast for instant delivery
await channel.send({
  type: 'broadcast',
  event: 'parent_command',
  payload: { command: 'pause' }
});
```

**Child reconnects and fetches missed commands:**
```js
const { data: pending } = await supabase
  .from('realtime_commands')
  .select('*')
  .eq('child_id', childId)
  .is('acknowledged_at', null)
  .order('created_at', { ascending: true });

for (const cmd of pending) {
  applyCommand(cmd);
  await supabase.from('realtime_commands')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', cmd.id);
}
```

---

### Phase 6 — Settings Sync via Postgres CDC

**Goal**: When parent changes settings in the DB, child receives them automatically — even after being offline.

> This uses Supabase Postgres Changes (CDC) — no extra broadcast command needed.

```js
// Child subscribes on app launch
supabase
  .channel('settings-sync')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${childId}`
  }, (payload) => {
    updateLocalSettings(payload.new);
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'category_preferences',
    filter: `family_id=eq.${familyId}`
  }, (payload) => {
    updateCategoryPreferences(payload.new);
  })
  .subscribe();
```

---

### Phase 7 — Child → Parent Data (Live Reports)

**Goal**: Child sends activity data; parent sees live updates in the dashboard.

**Sessions table** (uses existing schema — references `profiles` not a separate `children` table):
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id         UUID REFERENCES profiles(id),
  family_id        UUID REFERENCES families(id),
  content_type     TEXT,      -- 'video', 'story', 'game', 'activity'
  content_id       UUID,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_seconds INT
);
```

**Parent dashboard subscribes to live session inserts:**
```js
supabase
  .channel('child-activity')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sessions',
    filter: `family_id=eq.${familyId}`
  }, (payload) => {
    updateDashboard(payload.new);
  })
  .subscribe();
```

---

### Phase 8 — Push Notifications (Background Alerts)

**Goal**: Alert the parent when the app is closed or the child's device is in the background.

> Push token columns are reserved in `device_registrations` — this phase implements the full flow.

**Setup:**
```bash
npx expo install expo-notifications
```

**Register device token on app launch:**
```js
import * as Notifications from 'expo-notifications';

const { data: token } = await Notifications.getExpoPushTokenAsync();

await supabase.from('device_registrations')
  .update({ device_token: token })
  .eq('profile_id', profileId);
```

**Send alert from a Supabase Edge Function:**
```js
// triggers on: time limit reached, restricted content attempt, session end
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: parentDeviceToken,
    title: 'Screen Time Alert',
    body: 'Your child has been playing for 30 minutes.',
    data: { family_id, child_id }
  })
});
```

**Trigger examples:**

| Trigger | Notification |
|---------|-------------|
| Playing > 30 min | "Screen time alert: 30 minutes reached" |
| Restricted content attempted | "Your child tried to access blocked content" |
| Session ended | "Playing session ended — view report" |

---

## Summary

### Pairing Flow
```
Parent: email + OTP → creates 6-digit PIN
    → pairing_token generated (10-min TTL)
    → QR + manual code (XXX-XXX) displayed

Child: "Start Playing" → scan QR (or type code)
    → token validated server-side (one-time use)
    → child profile created in profiles table
    → child creates 6-digit PIN (hashed locally + DB)
    → devices linked ✓

Both devices: PIN login only from here on
    → works offline (local hash fallback)
    → forgot PIN: email OTP (parent) / remote reset (child)
```

### Communication Flow
```
Parent sends command
    → Written to realtime_commands (persistent, always)
    → Broadcast via Realtime (instant if child online)
    → Fetched on reconnect if child was offline
    → Push Notification if app is closed

Child plays content
    → Sessions written to sessions table
    → Heartbeat every 30s (with current content info)
    → Parent dashboard updates via Realtime CDC
    → Time limit alerts via Push Notification ✓
```

---

## Technology Stack

| Purpose | Tool |
|---------|------|
| Auth & Database | Supabase |
| Realtime (live commands) | Supabase Realtime — Broadcast |
| Realtime (settings sync) | Supabase Realtime — Postgres CDC |
| Offline command delivery | `realtime_commands` table (already exists) |
| QR Code display | `react-native-qrcode-svg` |
| QR Code scanner | `expo-camera` or `expo-barcode-scanner` |
| PIN hashing | `bcryptjs` (no native modules) |
| Push notifications | Expo Push Notifications + Supabase Edge Functions |

---

## Phase Summary

| Phase | Area | Deliverable | Effort |
|-------|------|-------------|--------|
| 0 | Database | `pairing_tokens`, `device_registrations`, `pin_hash` column | Small |
| 1 | Parent pairing | `QRPairingScreen` + `generatePairingToken` service | Medium |
| 2 | Child pairing | `QRScanScreen` + `consumePairingToken` + `usePairingStore` | Medium |
| 3 | PIN auth | 6-digit PIN on both devices, forgot-PIN flows, remote reset | Medium |
| 4 | Realtime channel | Connect at launch, new command types, heartbeat | Small |
| 5 | Offline queue | Make `realtime_commands` the default path | Small |
| 6 | Settings sync | Postgres CDC subscription on child device | Small |
| 7 | Child → Parent data | Session tracking, live dashboard updates | Small |
| 8 | Push notifications | Expo Push + Edge Function triggers | Medium |

---

## What Does NOT Change

- The Supabase backend (same project, same URL)
- The `family:{family_id}` channel name
- All existing command types (`pause`, `resume`, `time_update`, `category_block`, `force_end`)
- The parent dashboard UI and child content UI
- The reporting and daily stats system

All changes are **additive** — new screens and services without breaking existing ones.

---

*Last updated: June 2026*