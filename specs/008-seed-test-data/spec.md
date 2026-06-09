# Feature Specification: Seed & Test Data

**Feature Branch**: `008-seed-test-data`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "phase 5 from Plan.md"

## Overview

Provide a deterministic, idempotent database seed that populates 30 days of realistic usage statistics for all seed child profiles immediately after migrations are applied. This enables developers and QA engineers to verify the parent reports screen, comparison view, and chart rendering without manually generating activity sessions.

## Clarifications

### Session 2026-06-09

- Q: How should `top_activity` values be populated in seed rows? → A: Hardcoded list of titles matching `001_initial_data.sql` — simpler, no DB dependency, matches current implementation

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer Seeds Reports Data (Priority: P1)

A developer applies the database migrations and then runs the reports seed to populate 30 days of `daily_stats` for every seed child. The parent reports screen immediately shows a bar chart with varied daily values, a category breakdown with non-zero values in all four activity types, and a summary with a realistic total screen time.

**Why this priority**: Without seed data the reports screen shows only empty states, which prevents any visual or functional verification of the entire Phase 3 feature set.

**Independent Test**: Apply the `003_reports_tables.sql` migration, then run `002_reports_seed.sql`. Open the parent reports screen and confirm the 30-day bar chart contains non-zero bars and all four activity-type progress bars are visible.

**Acceptance Scenarios**:

1. **Given** migrations 001–003 are applied and no `daily_stats` rows exist, **When** the seed script runs, **Then** at least 30 rows per seed child appear in `daily_stats`
2. **Given** `daily_stats` rows already exist for a seed child, **When** the seed script runs again, **Then** no duplicate rows are created and the existing rows are unchanged
3. **Given** the seed has been applied, **When** a parent opens the reports screen on the "Month" range, **Then** the chart displays daily bars for all 30 days with non-zero heights
4. **Given** the seed has been applied, **When** a parent selects "Today" range, **Then** today's row is present and `is_finalized = false`

---

### User Story 2 — QA Tests Multi-Child Comparison (Priority: P2)

A QA engineer uses the seeded data to verify the comparison view with two or more seed children. Each child has independently varied usage patterns so the comparison bars show meaningful relative differences.

**Why this priority**: The comparison view is a distinct feature surface; it needs at least two children with differing data to verify normalization logic.

**Independent Test**: With two or more seed children having different seeded totals, open the comparison view and confirm Child A's bar appears at a different relative height than Child B's.

**Acceptance Scenarios**:

1. **Given** at least two seed children exist with seeded data, **When** the comparison view renders, **Then** each child's bars have different heights reflecting their respective total seconds
2. **Given** Child A has twice the total seconds of Child B on a given day, **When** the comparison bar chart renders, **Then** Child B's bar is approximately 50% the height of Child A's bar

---

### User Story 3 — Seed Covers All Activity Categories (Priority: P3)

Each seeded daily record has non-zero values for all four activity types (stories, games, videos, creative) so every category progress bar in the reports screen is visible and testable.

**Why this priority**: If any category is always zero in seed data, the corresponding UI element cannot be verified during development.

**Independent Test**: After seeding, query `daily_stats` and confirm every row has `stories_seconds > 0`, `games_seconds > 0`, `videos_seconds > 0`, and `creative_seconds > 0`.

**Acceptance Scenarios**:

1. **Given** the seed is applied, **When** any row in `daily_stats` is inspected, **Then** all four category columns contain a positive integer
2. **Given** the seed is applied, **When** the reports screen category breakdown renders, **Then** all four activity-type progress bars show a non-zero fill

---

### Edge Cases

- What happens when no child profiles exist (e.g., content seed not applied)? Seed script runs without error but inserts zero rows.
- What happens if `daily_stats` table does not exist? Script exits with a clear database error; no partial inserts occur.
- What happens when the seed is run twice in quick succession? The `ON CONFLICT DO NOTHING` guard ensures idempotency; row count stays the same.
- What happens on a leap day or month boundary? `CURRENT_DATE - N` arithmetic handles these correctly across any calendar date.
- What happens with more than 5 seed children? Seed limits to 5 children via `LIMIT 5`; additional profiles receive no seed rows and trigger an empty state in the UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The seed script MUST generate one `daily_stats` row per seed child per calendar day for the 30 days ending on the current date (inclusive)
- **FR-002**: Each generated row MUST contain positive, non-zero values for `stories_seconds`, `games_seconds`, `videos_seconds`, and `creative_seconds`
- **FR-003**: The `total_seconds` value in each row MUST be at least 1200 seconds (20 minutes) so charts render visible bars
- **FR-004**: The seed script MUST be idempotent — re-running it on a database that already contains seeded rows MUST NOT create duplicate rows or overwrite existing data
- **FR-005**: The seed script MUST derive child profile IDs dynamically by querying existing profiles with `role = 'child'` rather than using hardcoded UUIDs
- **FR-006**: Daily values MUST vary between rows so that a 30-day bar chart shows a visually varied pattern rather than a flat line
- **FR-007**: Rows for dates before today MUST have `is_finalized = true`; rows for today MUST have `is_finalized = false`
- **FR-008**: Each row MUST include a `top_activity` value chosen from a hardcoded list of content titles that matches those created by `001_initial_data.sql` (e.g., 'The Brave Knight', 'Puzzle Palace', 'Animal Kingdom', 'Magic Canvas', 'Space Explorer') — no live database query is required
- **FR-009**: The seed script MUST complete execution in under 60 seconds on a standard Supabase project
- **FR-010**: The seed script MUST apply ONLY to seed environments; it MUST NOT run automatically in production (manual execution only)

### Key Entities

- **DailyStats**: Aggregated usage record for one child on one calendar day. Key attributes: `child_id` (FK to profiles), `stat_date` (date), `total_seconds`, `stories_seconds`, `games_seconds`, `videos_seconds`, `creative_seconds`, `session_count`, `top_activity` (title string), `is_finalized` (boolean).
- **SeedChild**: A child profile row created by `001_initial_data.sql` with `role = 'child'`. The seed targets up to 5 such profiles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After running the seed, the parent reports screen shows a 30-day bar chart with at least 28 out of 30 bars having a non-zero height (allowing for real-world calendar edge cases)
- **SC-002**: The seed script completes in under 60 seconds when run against a remote Supabase project
- **SC-003**: Running the seed script a second time produces zero additional rows (complete idempotency)
- **SC-004**: After seeding, all four activity-category progress bars on the reports screen display a non-zero fill for any selected date range containing seeded data
- **SC-005**: The comparison view correctly shows relative bar differences when two seed children have different total seconds on the same day

## Assumptions

- `001_initial_data.sql` has been applied before this seed, so at least one child profile with `role = 'child'` exists
- `003_reports_tables.sql` migration has been applied so the `daily_stats` table and `aggregate_daily_stats()` function exist
- The seed targets development and staging environments only; production environments are seeded exclusively by real user activity
- Up to 5 seed children is sufficient for all testing scenarios; additional children beyond 5 are out of scope for this seed
- Random number generation within the seed produces sufficiently varied values that the bar chart does not appear flat; no additional controls for distribution shape are required
- The `top_activity` values reference content titles already present in the database via `001_initial_data.sql`
