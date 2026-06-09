# Feature Specification: Live Reports & Charts

**Feature Branch**: `005-phase-3`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "phase 3"

## Clarifications

### Session 2026-06-08
- Q: How should we define the "Today" midnight boundary for reports? → A: Option A - Time boundaries and "Today" calculations are strictly based on the child device's local timezone.
- Q: How should the parent's dashboard get "real-time" data for Today while they are actively viewing the screen? → A: Option B - Supabase Realtime subscriptions (live push) for the "Today" stats.


## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Filterable Activity Dashboard (Priority: P1)

As a parent, I select Today, Week, or Month and see total screen time, category distribution (stories, games, videos, creative), and most-used activities for a specific child.

**Why this priority**: This is the core value proposition of the reports feature, giving parents immediate insight into how screen time is being spent.

**Independent Test**: Can be fully tested by selecting a child, changing the date range, and verifying that the charts and data values update accurately to match the selected time period.

**Acceptance Scenarios**:

1. **Given** a child with activity history, **When** the parent selects "Week", **Then** the dashboard displays the total time and category distribution for the last 7 days.
2. **Given** a child with active current-day activity, **When** the parent selects "Today", **Then** the dashboard displays up-to-date metrics including recent sessions.

---

### User Story 2 - Side-by-Side Child Comparison (Priority: P2)

As a parent with multiple child profiles, I can compare two children side-by-side.

**Why this priority**: Helps parents ensure balanced screen time across children or understand differing sibling preferences.

**Independent Test**: Can be fully tested by selecting two children and a time range, and verifying the dashboard displays comparative metrics for both simultaneously.

**Acceptance Scenarios**:

1. **Given** a parent with two children, **When** the parent selects the comparison view, **Then** the screen time and category distribution for both children are shown side-by-side for the chosen date range.

---

### User Story 3 - Export Weekly Summary (Priority: P3)

As a parent, I can export a weekly summary as a PDF or share it via the system share sheet.

**Why this priority**: Allows parents to keep offline records, print reports, or share insights with another guardian or teacher.

**Independent Test**: Can be fully tested by tapping the export button on a weekly view and verifying the OS share sheet opens with a correctly formatted document.

**Acceptance Scenarios**:

1. **Given** a generated weekly report, **When** the user taps "Export", **Then** the system share sheet opens with a shareable PDF or image file containing the summary.

### Edge Cases

- What happens when a child has zero activity for the selected time range? (Should show an empty state indicating no data)
- How does the system handle a timezone change on the child's device mid-day? (Since we use the child's local timezone, reports should gracefully handle the shifted midnight boundary without duplicating data).
- What happens if the scheduled daily rollup generation fails? (Should fallback to calculating from raw activity logs for the missing day)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST aggregate child activity data into total screen time, category distribution (mapped from `activity_type` enum: `'story'` → StoryTime, `'game'` → Brain Games, `'video'` → Videos, `'creative'` → Creative Zone), and top activities.
- **FR-002**: System MUST allow filtering reports by standard time ranges: `today`, `week`, `month` (displayed as "Today", "Week", "Month" in the UI).
- **FR-003**: System MUST pre-compute historical daily rollups for fast querying of past data.
- **FR-004**: System MUST serve historical daily rollups (pre-computed) for past days and merge the current day's partial rollup (refreshed via realtime subscription on session changes) for "Today", calculating all day boundaries strictly based on the child's local timezone.
- **FR-005**: System MUST support side-by-side visualization of data for up to two children, including total time and category breakdown.
- **FR-006**: System MUST provide an export function to generate a shareable image file (PNG) of the current report view via the OS share sheet. Export MUST capture the currently visible view (single child dashboard or comparison view — exports whichever is displayed).
- **FR-007**: System MUST utilize Supabase Realtime `postgres_changes` subscriptions on the `sessions` table to detect current-day activity changes and trigger an immediate refresh of the "Today" partial rollup from `daily_stats`. If the subscription disconnects, the UI MUST fall back to a 60-second polling interval and display a "live disconnected" indicator.

### Key Entities

- **Daily Stats Rollup** (`daily_stats` table): Pre-computed aggregation of a child's screen time and category breakdown for a specific historical date. Stored in the `daily_stats` database table.
- **Activity Log** (`activity_logs` table): Raw, immutable events generated by the child's device (session start, content open, session end).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The reports dashboard fully loads with aggregated data for a 30-day period in under 1.5 seconds.
- **SC-002**: The reports dashboard receives live push updates for "Today" data and reflects child activity changes instantly without requiring a page reload.
- **SC-003**: 100% of generated PNG exports successfully open in standard OS image viewers without corruption.
- **SC-004**: Side-by-side comparison correctly normalizes and scales chart axes when children have vastly different total usage times.

### Non-Functional Requirements

- **NFR-001 (Data Retention)**: When a child profile is deleted, `daily_stats` rows cascade (ON DELETE CASCADE). Aggregated (anonymized) stats for the deleted child must be retained for 90 days before purging, for historical reporting integrity.
- **NFR-002 (Cache Strategy)**: Historical `daily_stats` (is_finalized = true) cached with 24-hour TTL. "Today" partial rollup cached with 60-second stale-while-revalidate window. Cache behavior must be verified by automated tests.
- **NFR-003 (Accessibility)**: All charts and comparison views must provide screen-reader labels (contentDescription) for data points. Category colors must maintain WCAG AA contrast ratio (≥4.5:1) against their background.

## Assumptions

- Only completed or paused activity logs are fully aggregated; ongoing active seconds might not be accurately reflected until the session syncs.
- The parent device has basic OS sharing capabilities (iOS Share Sheet / Android Intent) available.
- Historical days are immutable; their daily rollups are never recalculated once successfully finalized by the nightly job.
- User devices have mostly accurate clocks, though the server is the ultimate source of truth for time aggregation.
