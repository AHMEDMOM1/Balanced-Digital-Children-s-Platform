# Feature Specification: Live Session Reports (Child → Parent Data)

**Feature Branch**: `020-live-session-reports`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "phase 7 from @TwoDevicePlan.md — Child sends activity data; parent sees live updates in the dashboard. Sessions written to sessions table; parent dashboard subscribes to live session inserts via Realtime CDC."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Child Session Tracking Written to DB (Priority: P1)

When a child starts playing content — a story, game, video, or creative activity — a session record is written to the database. When the child stops or finishes the content, the session is closed with an end time and total duration. Sessions are persisted regardless of whether the parent is currently connected.

**Why this priority**: Without accurate session records, there is no data for the parent dashboard to display and no basis for time-limit enforcement. This is the data-collection foundation for all reporting.

**Independent Test**: Can be fully tested by launching a content item on the child device and confirming a session row appears in the database with the correct `content_type`, `started_at`, and `child_id` — then closing the content and confirming `ended_at` and `duration_seconds` are set.

**Acceptance Scenarios**:

1. **Given** a paired child device, **When** the child opens a story, **Then** a session row is inserted with `content_type = 'story'`, `started_at = now()`, `child_id`, `family_id`, and `ended_at = null`
2. **Given** an open session, **When** the child closes the story, **Then** the session row is updated with `ended_at = now()` and `duration_seconds = end - start`
3. **Given** a session started but the app is force-closed, **When** the app relaunches, **Then** the incomplete session is detected and closed with the last known timestamp
4. **Given** a child switches from one content item to another, **When** the first item is left, **Then** the first session is closed before the second session is opened

---

### User Story 2 — Parent Dashboard Receives Live Session Updates (Priority: P2)

When the child starts a new session, the parent dashboard updates in real time — showing the content type currently being played and the time elapsed. The parent does not need to manually refresh to see what their child is doing.

**Why this priority**: Real-time visibility is the core value of the two-device architecture. Parents need to see activity as it happens, not after the fact.

**Independent Test**: Can be fully tested by starting content on the child device while the parent dashboard is open and confirming the parent screen shows the new session within 10 seconds, without any manual refresh.

**Acceptance Scenarios**:

1. **Given** the parent dashboard is open, **When** the child starts a game session, **Then** the parent dashboard displays a new session entry within 10 seconds
2. **Given** the parent is viewing the dashboard, **When** a session ends, **Then** the completed session shows a duration
3. **Given** the parent device was offline when a session started, **When** the parent reconnects, **Then** sessions created during the offline period are visible in the dashboard
4. **Given** multiple sessions today, **When** the parent opens the dashboard, **Then** all sessions are listed in chronological order

---

### User Story 3 — Daily Summary Visible to Parent (Priority: P3)

The parent dashboard shows a daily summary: total screen time for the day, and a breakdown by content type (stories, games, videos, creative). This gives parents an at-a-glance view of how their child has spent their screen time.

**Why this priority**: The per-session list is the foundation; the daily summary is a usability improvement that reduces cognitive load for parents reviewing usage.

**Independent Test**: Can be tested by seeding multiple completed sessions and confirming the dashboard displays the correct total duration and per-type breakdown.

**Acceptance Scenarios**:

1. **Given** 3 completed sessions today (2 stories × 10 min, 1 game × 20 min), **When** the parent opens the dashboard, **Then** the daily total shows 40 minutes and the breakdown shows 20 min stories, 20 min games
2. **Given** no sessions today, **When** the parent opens the dashboard, **Then** an empty state is shown (e.g., "No activity yet today")
3. **Given** sessions from previous days, **When** the parent views today's summary, **Then** only today's sessions contribute to the daily total

---

### Edge Cases

- What happens when the child force-closes the app mid-session (no explicit `ended_at` written)?
- How does the system handle a second session starting before the first is closed (e.g., rapid content switching)?
- What happens when the parent has been offline for several hours and opens the dashboard — are all historical sessions loaded?
- How is an empty day displayed (no sessions started)?
- What if `duration_seconds` is zero or negative due to clock skew between start and end writes? → Resolved: clamp to 0 (FR-002); zero-duration sessions are preserved and visible but contribute 0 minutes to the daily total
- What happens when the sessions table CDC is not yet enabled (migration not applied)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a child starts any content item (story, game, video, or creative activity), the system MUST create a session record containing: `child_id`, `family_id`, `content_type`, `content_id`, `started_at`
- **FR-002**: When a child stops or completes a content item, the system MUST update the session record with `ended_at` and `duration_seconds` (calculated as `ended_at - started_at` in whole seconds, clamped to a minimum of 0 — negative values from clock skew are stored as 0)
- **FR-003**: Session records MUST be written to persistent storage so they are available to the parent even when the child device is offline; if the initial write fails, the client MUST queue the session locally and retry when connectivity is restored (same pattern as offline command queue)
- **FR-004**: The parent dashboard MUST update to display new child sessions within 10 seconds of creation when the parent device is connected to the internet
- **FR-005**: The parent dashboard MUST display the full list of today's sessions in chronological order, showing content type and duration for each completed session
- **FR-010**: When the parent dashboard loads, it MUST fetch all of today's existing sessions from the data store before activating the live subscription — ensuring sessions created before the dashboard opened (including while the parent was offline) are immediately visible
- **FR-006**: The parent dashboard MUST display a daily total: sum of all `duration_seconds` for sessions with today's `started_at`, formatted as minutes
- **FR-007**: The system MUST detect sessions that were started but never closed (e.g., due to app crash) and close them on the child's next app launch using the last-known timestamp
- **FR-008**: Sessions MUST be scoped per family — a parent can only read sessions where `family_id` matches their own
- **FR-009**: Only one session per child may be active (open, with no `ended_at`) at any time; starting a new session MUST close any previously open session for that child

### Key Entities

- **Session**: A single period of content engagement. Key attributes: `child_id` (who), `family_id` (scope), `content_type` (story/game/video/creative), `content_id` (which item), `started_at` (when began), `ended_at` (when finished — null if active), `duration_seconds` (computed on close)
- **DailyStats** (derived view): Aggregated per-child per-day: total duration, per-content-type breakdown. Computed from sessions, not stored separately in this spec.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new session appears in the parent dashboard within 10 seconds — measured from when the child content screen mounts (`openSession()` is called) to when the CDC INSERT payload triggers a state update in the parent dashboard (when both devices are online)
- **SC-002**: 100% of completed sessions have both `started_at` and `ended_at` populated with no null `duration_seconds`
- **SC-003**: Session duration values are accurate to within 5 seconds of the actual elapsed time
- **SC-004**: The daily total displayed to the parent matches the arithmetic sum of all individual session durations for that day
- **SC-005**: Sessions created while the parent was offline are visible immediately upon the parent reconnecting, with no manual refresh required

## Assumptions

- The `sessions` table already exists in the production schema (created in the full-schema bootstrap migration); this spec adds `family_id` via an additive migration, updates RLS policies, and adds the table to the Supabase Realtime publication — no destructive renames to existing columns
- The `daily_stats` table referenced in the architecture diagram is out of scope for this spec; this spec tracks raw session records only
- Session tracking is triggered by existing navigation events in the child interface (opening and closing content screens)
- The `useSessionStore` fields `currentActivity` and `currentContentId` added in spec 019 are the source-of-truth signals for session start/end detection
- A child can have at most one active (unended) session at a time; starting a second session auto-closes the first
- The `sessions` table must be added to the Supabase Realtime publication for the parent CDC subscription to work (same pattern as `profiles` in spec 019)
- The parent's CDC subscription filters by `family_id` to avoid receiving sessions from other families
- Historical sessions (before this feature was deployed) are not backfilled — the daily total will only reflect sessions created after deployment
- The abandoned-session recovery on relaunch uses the `started_at` timestamp as the `ended_at` value when no better timestamp is available (duration = 0 in worst case)
- Row-level security ensures parents can only read sessions from their own family; child devices can only insert/update sessions for their own `child_id`
- Daily summaries are calculated client-side from the session list (no server-side aggregation endpoint required)
- The parent dashboard's existing session display (if any) from the Phase 3 "Live Reports" implementation will be extended, not replaced
- If a session-start write fails (network/auth error), the session is queued locally and replayed on reconnect; the child's play experience is not interrupted by write failures
- When the parent dashboard mounts, it performs an initial full fetch of today's sessions from the database, then activates the live subscription to receive subsequent inserts; this two-phase approach ensures no sessions are missed regardless of when the parent opened the dashboard

## Clarifications

### Session 2026-06-13

- Q: Does the parent dashboard need a date picker to view past days, or only today? → A: Today only — historical date navigation is out of scope for this spec
- Q: Should sessions be tracked at the content-item level (by `content_id`) or only at the content-type level? → A: Both — `content_type` and `content_id` are both recorded per session
- Q: What happens if the initial session write fails (network error)? → A: Queue locally and sync on reconnect — same offline-first pattern as command delivery in spec 019 (FR-003 updated)
- Q: How does the parent dashboard load today's sessions when it first opens? → A: Fetch all today's sessions from DB on mount, then subscribe for live inserts (FR-010 added)
- Q: What should `duration_seconds` be when `ended_at - started_at` is negative due to clock skew? → A: Clamp to 0 — store 0, never negative; session record is preserved (FR-002 updated)
