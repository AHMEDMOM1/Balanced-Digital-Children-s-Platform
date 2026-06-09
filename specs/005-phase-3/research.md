# Phase 3: Research — Live Reports & Charts

## Technology Decisions

---

### Decision 1: Chart Library

**Decision**: Use `victory-native` (Victory Native XL / `@shopify/react-native-skia` based) for rendering charts.

**Rationale**:
- Renders with Skia directly on the GPU → smooth 60fps animations on mid-tier Android/iOS.
- Provides `CartesianChart`, `Bar`, `Line`, `Pie` components that compose naturally.
- Works without bridging overhead — all rendering is on the JS/Skia thread.

**Alternatives considered**:
- `react-native-svg-charts` — Older, less maintained, no Skia backend.
- `recharts` — Web-only, no React Native support.
- Custom SVG bars — Too much effort to maintain, no interactivity built-in.

---

### Decision 2: Daily Rollup Computation Strategy

**Decision**: Postgres function `aggregate_daily_stats(child_id UUID, day DATE)` triggered by Supabase Scheduled Functions (pg_cron) at midnight UTC+3 (Arabia Standard Time).

**Rationale**:
- Pre-aggregating into `daily_stats` table means dashboard queries JOIN at most 30 rows per child — O(30) not O(N activity logs).
- pg_cron is built into Supabase Pro; for lower tiers, a Supabase Edge Function on a cron schedule is the fallback.
- Writing to a separate `daily_stats` table keeps `activity_logs` immutable and append-only.

**Alternatives considered**:
- Aggregate on-the-fly at query time — Works for small data sets but degrades quickly at scale; daily_stats is clearly faster.
- Client-side aggregation — Can't be trusted (offline state, incorrect device time).

---

### Decision 3: "Today" Realtime Subscription Strategy

**Decision**: Subscribe to Supabase Realtime `postgres_changes` on `sessions` and `activity_logs` tables filtered by `child_id`. On INSERT or UPDATE, re-compute today's partial stats in the client and merge with cached historical rollups.

**Rationale**:
- Avoids a full re-fetch on every change.
- `postgres_changes` subscriptions are already battle-tested in the project (Phase 2 realtime channel reuses same infra).
- The subscription is limited to the parent's children only (secured by RLS on the channel).

**Alternatives considered**:
- Server-Sent Events (SSE) — Not natively supported by Supabase client.
- Polling every 60s — Accepted by FR-007 only as last-resort fallback, not primary mechanism.

---

### Decision 4: Export Format (PDF vs Image)

**Decision**: Export as a **PNG image** (screenshot of report card view) shared via `expo-sharing` + `react-native-view-shot`.

**Rationale**:
- PDF generation in React Native requires heavy native modules (e.g., `react-native-pdf-lib`) and adds ~2 MB to bundle size.
- A high-res PNG of the report card is universally openable, printable, and shareable via all system share sheets.
- `react-native-view-shot` captures any React Native View into a PNG without extra processing.

**Alternatives considered**:
- `react-native-html-to-pdf` — Needs WebView bridge, adds 4–6 MB to bundle.
- Custom PDF — Excessive complexity for the value delivered in Phase 3.

---

### Decision 5: 60-Second Cache TTL for Historical Data

**Decision**: Historical day rollups are cached in Zustand + AsyncStorage with a 24-hour TTL. "Today" stats have a 60-second stale-while-revalidate window before the Realtime subscription takes over.

**Rationale**:
- Historical rollups are immutable once finalized, so 24h cache is perfectly safe.
- 60s stale window for "Today" is consistent with SC-002 (live push takes over immediately after initial load).

---

### Decision 6: New Database Table Required — `daily_stats`

A new migration is required. The existing `activity_logs` table provides raw events; `daily_stats` stores the pre-computed summary per child per day.

```sql
-- Columns:
-- child_id UUID FK → profiles.id
-- stat_date DATE  (the day, in UTC — client converts to local tz for display bucketing)
-- total_seconds INTEGER (total active screen time)
-- stories_seconds INTEGER
-- games_seconds INTEGER
-- videos_seconds INTEGER
-- creative_seconds INTEGER
-- session_count INTEGER
-- top_activity TEXT  (title of most-used content item)
-- timezone_offset INTEGER (child device UTC offset at time of snapshot, in minutes)
```

**RLS**: Parent can only SELECT `daily_stats` for children where `family_id` matches.

---

### Decision 7: Side-by-Side Comparison Scope

**Decision**: Comparison view is limited to **max 2 children** for the same parent account. If a parent has only 1 child, the comparison view is hidden. Charts use normalized percentage axes (not absolute), so different usage levels are visually comparable.

**Alternatives considered**:
- Allow 3+ children — Overly complex layout on mobile screens; P3 scope.
- Absolute axes — Misleading when one child uses 2h and another uses 30m.
