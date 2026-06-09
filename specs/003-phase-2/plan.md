# Implementation Plan: Realtime Sync & Parent Commands

**Branch**: `004-realtime-control` | **Date**: 2026-06-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-phase-2/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement a bi-directional real-time control channel between parent and child devices using Supabase Realtime Channels. Parent actions (pause, resume, time update, category block, force end) are broadcast via the `family:<family_id>` channel and persisted in a `realtime_commands` database table for offline resilience. The child device subscribes to the channel, applies commands idempotently using a rolling-window deduplication queue (1000 IDs), and sends heartbeats every 30 seconds. On reconnect, the child fetches unapplied commands from the DB table. Conflicts are resolved by Last-Write-Wins using server timestamps.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, React Native 0.83.6

**Primary Dependencies**: `@supabase/supabase-js` v2.106+ (includes Realtime), Zustand 5.x, Expo 55, expo-router 55

**Storage**: Supabase (Postgres + RLS) for commands table and activity logs; AsyncStorage for local idempotency queue

**Testing**: Manual device testing (parent ↔ child flow); Expo Go for rapid iteration

**Target Platform**: iOS 15+ / Android 8+ via React Native (Expo managed workflow)

**Project Type**: Mobile app (React Native / Expo)

**Performance Goals**: Commands delivered < 2 seconds on good network; heartbeat every 30s; offline command replay on reconnect

**Constraints**: < 5% extra battery drain per hour from realtime; offline-capable with local session continuity; rolling window of 1000 command IDs for idempotency

**Scale/Scope**: Single family per channel; 1-2 parent devices, 1-3 child devices per family

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is in template form (not yet configured for this project). No blocking violations. Proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/003-phase-2/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
services/
├── api/
│   ├── client.ts            # Existing Supabase client singleton
│   ├── types.ts             # Extended with Realtime types
│   └── hooks.ts             # Extended with realtime hooks
├── realtime/
│   ├── familyChannel.ts     # [NEW] Channel setup, subscribe, broadcast, heartbeat
│   ├── commandProcessor.ts  # [NEW] Idempotent command application logic
│   └── types.ts             # [NEW] Realtime-specific type definitions
├── api.ts                   # Existing REST API (unchanged)
├── auth.ts                  # Existing auth service (unchanged)
└── socket.ts                # Existing stub → will be replaced by familyChannel

store/
├── useSessionStore.ts       # Extended with applyCommand(), pause overlay state
├── useRealtimeStore.ts      # [NEW] Connection status, heartbeat tracking, command queue
├── useSettingsStore.ts      # Existing (unchanged, read by realtime handlers)
├── useAuthStore.ts          # Existing (provides familyId)
└── useDataStore.ts          # Existing (unchanged)

components/
├── ui/
│   └── PauseOverlay.tsx     # [NEW] Full-screen friendly mascot overlay
└── RealtimeProvider.tsx     # [NEW] Context provider wrapping app with channel lifecycle

app/
├── (parent)/
│   ├── control.tsx          # Extended with Pause/Resume button + offline indicator
│   └── _layout.tsx          # Wrap with RealtimeProvider
├── (child)/
│   ├── _layout.tsx          # Wrap with RealtimeProvider + PauseOverlay
│   └── index.tsx            # Reads isPaused from store
└── _layout.tsx              # Root layout (unchanged)

server/
└── migrations/
    └── 006_realtime_commands.sql  # [NEW] realtime_commands table + RLS policies
```

**Structure Decision**: Single React Native app with role-based routing (parent/child). Realtime logic lives in `services/realtime/` with a dedicated Zustand store (`useRealtimeStore`). The existing `services/socket.ts` stub will be superseded by the new Supabase Realtime implementation.
