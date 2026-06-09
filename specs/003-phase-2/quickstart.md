# Quickstart: Realtime Sync & Parent Commands

## Prerequisites

- Supabase project with Realtime enabled (default for new projects)
- `.env` configured with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Phase 1 complete (profiles, content, auth working)

## Setup Steps

### 1. Run Database Migration

Apply the `realtime_commands` table migration:

```bash
# Via Supabase Dashboard → SQL Editor, paste:
# server/migrations/006_realtime_commands.sql
```

### 2. Verify Supabase Realtime

In Supabase Dashboard → Database → Replication, ensure Realtime is enabled.
No additional table replication needed — we use Broadcast channels, not Postgres Changes.

### 3. Test Parent → Child Flow

1. Open two devices/emulators (or two browser tabs in web mode)
2. Log in as **parent** on Device A
3. Log in as **child** on Device B (via family code)
4. On Device A (parent): Navigate to Control Center → tap "Pause Now"
5. On Device B (child): Verify the pause overlay appears within 2 seconds
6. On Device A (parent): Tap "Resume"
7. On Device B (child): Verify the overlay disappears

### 4. Test Offline Replay

1. On Device B (child): Turn off WiFi/data
2. On Device A (parent): Send a "Pause" command
3. On Device B (child): Turn WiFi back on
4. Verify: The pause command is applied after reconnection

## Key Files

| File | Purpose |
|------|---------|
| `services/realtime/familyChannel.ts` | Channel lifecycle, subscribe, broadcast |
| `services/realtime/commandProcessor.ts` | Idempotent command application |
| `store/useRealtimeStore.ts` | Connection state, heartbeat tracking |
| `store/useSessionStore.ts` | Extended with `applyCommand()` |
| `components/RealtimeProvider.tsx` | React context for channel lifecycle |
| `components/ui/PauseOverlay.tsx` | Full-screen pause mascot overlay |
| `server/migrations/006_realtime_commands.sql` | DB table + RLS policies |

## Architecture Overview

```
Parent Device                    Supabase                     Child Device
─────────────                    ────────                     ────────────
Control.tsx                                                   RealtimeProvider
  │                                                               │
  ├─ tap "Pause" ──────────────→ Broadcast ──────────────────→ familyChannel.ts
  │                              channel                          │
  ├─ INSERT command ───────────→ realtime_commands table          ├─ commandProcessor
  │                                                               │   (dedup + apply)
  │                                                               │
  │                              ←────────── heartbeat ──────── useRealtimeStore
  │                              (every 30s)                      │
  ├─ "Child Online" indicator                                     │
  │  (useRealtimeStore)                                           │
  │                                                               │
  │  [child goes offline]                                         │
  │                                                               │
  ├─ INSERT command ───────────→ realtime_commands table          │
  │                                                               │
  │  [child reconnects]                                           │
  │                              ←── SELECT unacked cmds ───────  │
  │                                                            apply in order
```
