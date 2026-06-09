# Feature Specification: Usage Tracking and Reports

**Feature Branch**: `[Skipped]`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "في ملف @[Plan.md] قمت ب phase 1,2,3 اريدك انت الان ان تنظر الى طريقة عملهم والدستور الذي كنت عليه. وان تبدا ب phase 4"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parent views detailed usage reports (Priority: P1)

As a parent, I want to view detailed usage reports for my child's activity, so I can understand how their screen time is distributed among different content types (stories, logic games).

**Why this priority**: Core value proposition of Phase 4; allows parents to monitor the quality and distribution of their child's screen time.

**Independent Test**: Can be tested by simulating child sessions with different content types and verifying the parent dashboard correctly visualizes the time spent in each category.

**Acceptance Scenarios**:

1. **Given** the child has completed a session of 15 minutes on stories and 10 minutes on games, **When** the parent opens the dashboard, **Then** a colorful chart should display the accurate breakdown of 60% stories and 40% games.
2. **Given** no activity has been recorded yet, **When** the parent opens the dashboard, **Then** an empty state should be shown, encouraging the parent to wait for the first session.

---

### User Story 2 - System tracks usage securely in background (Priority: P1)

As the system, I need to securely track the child's active screen time per activity type without noticeable performance degradation, so that the usage reports are accurate.

**Why this priority**: Without accurate background tracking, the parent reports would be useless or misleading.

**Independent Test**: Can be tested independently by logging events to the local storage/database and checking the records after a simulated session ends.

**Acceptance Scenarios**:

1. **Given** the child starts a logic game, **When** the game session begins, **Then** the timer starts accumulating usage data for the "logic games" category.
2. **Given** the child switches from a story to a game, **When** the transition happens, **Then** the story timer stops and records the duration, and the game timer starts.

---

### Edge Cases

- What happens when the device loses internet connection during a session? (Data should be cached locally and synced later).
- How does system handle sudden app closures or battery death? (Periodic local auto-save every minute).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST track time spent in each distinct content category (e.g., Stories, Logic Games).
- **FR-002**: System MUST sync usage data to the cloud database securely at the end of each session or periodically to ensure no data loss.
- **FR-003**: System MUST display usage data in the Parent Dashboard using intuitive, colorful charts (e.g., pie charts, bar charts).
- **FR-004**: System MUST summarize daily, weekly, and monthly usage trends per child profile.
- **FR-005**: System MUST run tracking mechanics without affecting the fluidity of child animations and interactive content.

### Key Entities *(include if feature involves data)*

- **UsageLog**: Represents a single tracked session fragment (ChildID, Category, StartTime, EndTime, Duration).
- **UsageSummary**: Aggregated data for charting (ChildID, Date, TotalTime, CategoryBreakdown).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usage data is accurate within a 5-second margin of error per session.
- **SC-002**: Charts in the parent dashboard render in under 1 second when the parent navigates to the reports section.
- **SC-003**: Background tracking logic consumes less than 2% additional battery/CPU overhead during active child sessions.
- **SC-004**: 100% of completed sessions successfully sync their usage logs to the cloud database (when online).

## Assumptions

- Tracking is done locally first and synced to the cloud database to handle offline scenarios.
- The charts will utilize standard visual charting libraries that are visually appealing and child-friendly.
- The existing child mode routing will be capable of emitting navigation events for tracking purposes.
