# Resilience Verification Guide

Branch: `006-resilience-testing`
Spec: `specs/006-resilience-testing/plan.md`

---

## Performance Goals

| Goal | Target | How to verify |
|------|--------|--------------|
| Cold start | < 3s | Measure with `npx expo start --no-dev`, time to interactive |
| Session accuracy | ± 5s of server time | `scripts/realtime-latency-test.ts` |
| Offline detection | < 5s after disconnect | Toggle airplane mode, watch OfflineBadge |
| Animation degradation | < 500ms after threshold | `tests/unit/resilience/degradationTrigger.test.ts` |

---

## Automated Test Suite

Run all unit and integration tests:

```bash
npx jest --testPathPattern="tests/(unit|integration)"
```

Run a specific suite:

```bash
npx jest tests/unit/resilience/fpsMonitor.test.ts
npx jest tests/unit/resilience/serverTime.test.ts
npx jest tests/unit/resilience/sessionAutoSave.test.ts
npx jest tests/unit/resilience/degradationTrigger.test.ts
npx jest tests/unit/resilience/batterySaver.test.ts
npx jest tests/unit/resilience/pinRateLimit.test.ts
npx jest tests/integration/sessionRestore.test.ts
npx jest tests/integration/clockBypass.test.ts
npx jest tests/integration/pinRecovery.test.ts
npx jest tests/integration/batterySaverReconnect.test.ts
npx jest tests/integration/offlineFallback.test.ts
```

E2E tests (Detox — requires device):

```bash
npx detox test --configuration ios.sim.release
# E2E tests are marked xdescribe until Detox is provisioned
```

---

## Script Verification (SC criteria)

| Criterion | Script | Pass condition |
|-----------|--------|----------------|
| SC-001 — Dashboard load p95 < 1500ms | `npx ts-node scripts/perf-test-reports.ts` | All runs under threshold |
| SC-002 — Realtime latency p95 < 500ms | `npx ts-node scripts/realtime-latency-test.ts` | p95 < 500ms |
| SC-003 — Export PNG validity | `npx ts-node scripts/export-test.ts` | 0 failures; set `TEST_PNG_PATH` to an exported file |
| SC-004 — Comparison normalization | `npx ts-node scripts/comparison-normalization-test.ts` | Exact match |
| NFR-002 — Cache TTL | `SKIP_NATIVE=1 npx ts-node scripts/cache-ttl-test.ts` | All checks pass |

---

## Server-Side Setup (Supabase Studio)

These steps must be completed manually before running the app against a real Supabase project.

1. **Run migration 003** — `daily_stats` table + `aggregate_daily_stats()` function + RLS:
   ```
   SQL Editor → paste server/migrations/003_reports_tables.sql → Run
   ```

2. **Run seed 002** — 30 days of test data per seed child:
   ```
   SQL Editor → paste server/seeds/002_reports_seed.sql → Run
   ```

3. **Run migration 005** — `resilience_events` table, `reset_parent_pin` RPC, `security_question_answer_hash` column:
   ```
   SQL Editor → paste server/migrations/005_resilience_server.sql → Run
   ```

4. **Enable pg_cron** (Supabase Pro):
   ```
   Dashboard → Database → Extensions → enable pg_cron
   SQL Editor → paste the cron.schedule(...) block from migration 005 → Run
   ```

   On the Free tier, deploy the Edge Function instead:
   ```bash
   supabase functions deploy aggregate-daily-stats
   # Then configure cron trigger in Supabase Dashboard → Edge Functions → Schedules
   # Schedule: "5 21 * * *"  (00:05 Arabia Standard Time = 21:05 UTC)
   ```

---

## Manual Runtime Verification (T023)

1. `npx expo start`
2. Open app → parent account → Reports screen
3. Verify: loading spinner appears then real data loads
4. Verify: range picker (Today/Week/Month) changes the chart
5. Verify: "Live" badge appears on Today range when Realtime is connected
6. Verify: OfflineBadge shows when airplane mode is on; hides within 5s of reconnecting
7. Verify: Toggling low-power mode (iOS Battery Saver) shows/hides on OfflineBadge
8. Verify: Export button produces share sheet with a PNG

---

## Known Stubs / Future Work

| Item | Status | Blocker |
|------|--------|---------|
| `verifySecurityQuestion()` | Real hash comparison implemented; returns `false` until `security_question_answer_hash` is set during onboarding | PIN recovery onboarding flow not yet built |
| E2E tests | `xdescribe` (pending) | Detox infrastructure not yet provisioned |
| Data retention migration | `server/migrations/004_data_retention.sql` | Not yet created |

---

## Architecture Summary

```
App                          Supabase
 │                               │
 ├─ useSessionStore              │
 │   └─ sessionManager ──────────┼─► sessions table (INSERT/UPDATE)
 │   └─ timeSync ────────────────┼─► server_timestamp RPC
 │                               │
 ├─ useDailyStats                │
 │   └─ cacheManager (SQLite)    │
 │   └─ supabase.from('daily_stats') ─► daily_stats table
 │                               │
 ├─ useLiveTodayStats            │
 │   └─ Realtime subscription ───┼─► postgres_changes on sessions
 │                               │
 ├─ ConnectivityManager          │
 │   └─ NetInfo + Battery + AppState
 │                               │
 ├─ FpsMonitor                   │
 │   └─ DegradableAnimation ◄────┘
 │                               │
 └─ PinRecoveryManager           │
     └─ reset_parent_pin RPC ────┼─► profiles table (PIN hash update)
     └─ resilience_events ───────┘► resilience_events table
```
