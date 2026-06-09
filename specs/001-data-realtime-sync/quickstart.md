# Quickstart: Real Data Layer & Realtime Parent-Child Sync

**Date**: 2026-06-09

---

## Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project (local or remote)
- `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Apply database migrations

Run in order from the Supabase SQL editor or via `supabase db push`:

```bash
001_core_tables.sql
002_rls_policies.sql
003_reports_tables.sql
004_data_retention.sql
006_realtime_commands.sql
007_activity_logs.sql
```

---

## 3. Seed content

```bash
# Loads 20+ stories, 10+ games, 15+ videos, 8+ creative activities
server/seeds/001_initial_data.sql
server/seeds/002_reports_seed.sql
```

---

## 4. Run tests

```bash
npm run test                    # unit + integration
npm run test:e2e                # all E2E (requires Detox setup)
npm run test:e2e:offline        # offline fallback scenarios
npm run test:e2e:session        # session end scenarios
```

---

## 5. Start the app

```bash
npm start           # Expo dev server
npm run ios         # iOS simulator
npm run android     # Android emulator
```

---

## Key files for this feature

| File | Purpose |
|------|---------|
| [services/api/types.ts](../../services/api/types.ts) | All shared TypeScript types |
| [services/api/hooks.ts](../../services/api/hooks.ts) | Combined hook entry point for screens |
| [services/realtime/familyChannel.ts](../../services/realtime/familyChannel.ts) | Realtime channel subscribe/send/disconnect |
| [services/realtime/types.ts](../../services/realtime/types.ts) | RealtimeCommand, HeartbeatEvent, CommandAckEvent |
| [store/useSessionStore.ts](../../store/useSessionStore.ts) | Zustand session store with idempotent applyCommand |
| [components/RealtimeProvider.tsx](../../components/RealtimeProvider.tsx) | Root-level channel subscription |
| [server/migrations/](../../server/migrations/) | All SQL migration files |
| [server/seeds/](../../server/seeds/) | Seed data |

---

## Testing the realtime channel manually

1. Open parent app on Device A (or simulator), child app on Device B.
2. Ensure both are on the same Supabase project.
3. Tap **Pause Now** in the parent app.
4. Child screen should show pause overlay **within 2 seconds**.
5. Tap **Resume** — overlay dismisses.

**Offline test**:
1. Disconnect child device from network.
2. Issue a "Pause" command from parent app.
3. Reconnect child device.
4. Pause command should apply within 5 seconds of reconnection.

---

## Compliance reminders

- `activity_logs` auto-purges rows older than 90 days (see `004_data_retention.sql`)
- Never add behavioral profiling fields to `activity_logs` or `profiles`
- No third-party SDKs in `app/(child)/` screens
