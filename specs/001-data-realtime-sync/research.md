# Research: Real Data Layer & Realtime Parent-Child Sync

**Date**: 2026-06-09 | **Branch**: `006-resilience-testing`

All decisions below were resolved through the existing implementation (Phases 1–2 are already committed) and the clarification session on 2026-06-09.

---

## Decision 1: Unified vs Separate Content Tables

**Decision**: Single `content_items` table with a `type` discriminator column (`story | game | video | creative`).

**Rationale**: Age-range filtering (`min_age`, `max_age`) and category filtering are identical across all content types. A unified table means one RLS policy, one API hook pattern, and consistent seed/migration files. Type-specific rendering is handled client-side.

**Alternatives considered**:
- Separate tables per type (`stories`, `games`, `videos`, `creative_activities`) — rejected because it quadruples migration files, RLS policies, and API surface for no query benefit.
- JSONB-only content store — rejected because structured columns (`min_age`, `max_age`, `type`) are needed for indexed queries.

---

## Decision 2: Realtime Transport — Broadcast + Durable Table

**Decision**: Supabase Realtime **Broadcast** channel (`family:<family_id>`) for low-latency delivery, backed by a durable `realtime_commands` table for offline replay.

**Rationale**: Broadcast delivers sub-second messages without writing to the database on the happy path. The `realtime_commands` table (with `acknowledged_at` nullable index) provides the offline replay guarantee: on reconnect, the child queries `WHERE acknowledged_at IS NULL AND created_at > (now() - interval '24 hours')` ordered by `created_at ASC`, applies each command once via UUID deduplication, then marks as acknowledged.

**Alternatives considered**:
- Postgres Changes only — rejected because Postgres replication lag (100–500ms) + no broadcast = higher command latency.
- WebSocket directly (non-Supabase) — rejected because it requires a separate server and breaks the YAGNI principle.
- Broadcast only (no durable table) — rejected because missed commands while offline are irrecoverable.

---

## Decision 3: Offline Storage Backend — expo-sqlite

**Decision**: `expo-sqlite` for the local offline cache and command queue.

**Rationale**: expo-sqlite supports structured SQL queries needed to implement the 24-hour TTL purge (`DELETE FROM queued_commands WHERE created_at < datetime('now', '-24 hours')`) and FIFO eviction of the 50-command queue cap. AsyncStorage is key-value only and would require manual JSON serialization + linear scans.

**Alternatives considered**:
- `@react-native-async-storage/async-storage` — used for lightweight auth tokens and simple flags; insufficient for command queue management.
- WatermelonDB / Realm — rejected as too heavy for the queue size and contrary to YAGNI principle.

---

## Decision 4: Category Access Model — Opt-Out

**Decision**: All content categories are **available by default**. `category_preferences` records only blocked entries (`is_allowed = false`). New child profiles inherit full access without any setup by the parent.

**Rationale**: Reduces onboarding friction; matches the target audience's expectation that a child can start using the app immediately. Parents only act when they need to restrict. The `parent_settings` table also has boolean columns (`stories_enabled`, `games_enabled`, etc.) as a coarser override.

**Alternatives considered**:
- Opt-in model (whitelist) — rejected per clarification Q3: creates a poor first-run experience and requires mandatory setup before the app is usable.

---

## Decision 5: Session State Machine

**Decision**: Four states — `active`, `paused`, `ended` (terminal), plus `expired` (timeout by server). Transitions: `active ↔ paused` (parent commands), `active/paused → ended` (parent `force_end` or time limit), `active → expired` (server-side cron).

**Rationale**: Matches clarification Q1 (bidirectional pause). The `expired` state covers server-side timeout (daily limit reached without explicit `force_end`) and is distinct from `ended` (explicit parent or limit action) for audit purposes.

**Alternatives considered**:
- Three-state model (no `expired`) — rejected because audit log needs to distinguish "parent ended this" from "server expired this" for COPPA compliance reporting.

---

## Decision 6: Compliance — COPPA + GDPR-K

**Decision**: Activity logs retained for max 90 days (automated purge via Supabase scheduled function in migration `004_data_retention.sql`). No behavioral profiling fields. No third-party SDKs in child screens.

**Rationale**: Per clarification Q2; COPPA (US) and GDPR-K (EU) are the applicable frameworks for a children's app targeting a global Arabic-speaking audience. The 90-day retention satisfies both frameworks' "minimum necessary" principle. Automated purge removes manual intervention risk.

**Alternatives considered**:
- Deferred to Phase 5 — rejected because compliance constraints affect the `activity_logs` schema NOW (no profiling columns to add/remove later).

---

## Decision 7: Category Block Exit — Immediate Stop

**Decision**: When a `category_block` command arrives, the active content item stops immediately (not finish-current-item). The exit animation plays, then the child is navigated to the home screen.

**Rationale**: Per clarification Q5 and the 2-second response target (FR-009). Allowing the current item to finish could mean minutes of delay on a long video, undermining parental authority. The animation preserves a positive child experience.

**Alternatives considered**:
- Finish current item — rejected because a 20-minute video would not stop for 20 minutes, defeating the purpose of the control.
- Countdown (30s warning) — rejected because it adds complexity and parents who block a category want immediate effect.
