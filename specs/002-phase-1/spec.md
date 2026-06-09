# Feature Specification: Phase 1 Real Data Layer

**Feature Branch**: `[002-phase-1]`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "phase 1"

## Clarifications

### Session 2026-06-08
- Q: What happens when the child's device is offline while attempting to fetch the content list? → A: Show a friendly message to the child and allow access to locally cached content.
- Q: How does the system handle an empty state if a parent blocks all categories? → A: Show a friendly encouraging message advising the child to play outside or do a physical activity.
- Q: What happens if the backend database is unreachable or returns a timeout error? → A: Silently retry in the background and rely on temporarily cached data to ensure uninterrupted app operation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Child Content Access (Priority: P1)

As a child, when I open Stories, Games, Videos, or Creative Activities, I see a curated list of actual content fetched from the platform's database, which is filtered by my age group and the categories my parents have approved.

**Why this priority**: It is the core functionality of the platform to deliver appropriate real content to the child instead of placeholder data.

**Independent Test**: Can be fully tested by logging in as a child and verifying the content list matches the central database records and filters out unapproved categories.

**Acceptance Scenarios**:

1. **Given** a child with an active session, **When** they navigate to a content screen, **Then** they see a list of actual content items.
2. **Given** a parent has blocked the "Action" category, **When** the child views their content, **Then** no items from the "Action" category are displayed.

---

### User Story 2 - Parent Category Management (Priority: P2)

As a parent, when I add or remove an allowed category, the child's available content updates accordingly on the next session start.

**Why this priority**: Parents need control over what their children can access, which is fundamental to the "Balanced" aspect of the platform.

**Independent Test**: Can be tested by logging in as a parent, modifying allowed categories, and starting a new child session to see the changes reflected.

**Acceptance Scenarios**:

1. **Given** a parent is on the settings screen, **When** they toggle off a category and save, **Then** the central database updates the allowed categories for that child.
2. **Given** a child starts a new session after a parent update, **When** they load their content, **Then** the content strictly adheres to the newly updated categories.

---

### User Story 3 - Centralized Data Access Layer (Priority: P3)

As a developer, I want every data read/write operation to go through a unified data access layer so that no direct database queries are scattered across user interface screens.

**Why this priority**: This ensures maintainability, clean architecture, and easier debugging or future backend migrations.

**Independent Test**: Can be tested by reviewing the codebase to ensure all UI components request data through the unified data module.

**Acceptance Scenarios**:

1. **Given** a UI screen needing data, **When** it fetches data, **Then** it uses the unified data access module.
2. **Given** an existing screen using placeholder data, **When** the feature is complete, **Then** the screen uses the live data service and placeholder code is removed.

### Edge Cases

- **Offline Behavior**: If the child's device is offline, show a friendly offline message and allow access to locally cached content.
- **Empty State (All Categories Blocked)**: Show an encouraging message to the child advising them to play outside or engage in a physical activity.
- **Database Timeout/Error**: Silently retry in the background while relying on temporarily cached data to ensure the child's experience is uninterrupted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch stories, games, videos, and creative activities from a central live database.
- **FR-002**: System MUST apply strict data access policies so that parents only read their own children's data, and children only read allowed content.
- **FR-003**: System MUST provide a unified data service client for all database interactions.
- **FR-004**: System MUST include a mechanism to populate the database with initial baseline data (e.g., 20 stories, 10 games, 15 videos, 8 activities).
- **FR-005**: System MUST replace all existing placeholder content in screens with live data fetching operations.

### Key Entities

- **Profiles**: Child profiles and parent profiles representing the users.
- **Content**: Stories, games, videos, creative activities representing the playable/viewable items.
- **Access Control**: Category permissions linking children to what they are permitted to see.
- **Tracking**: Sessions and activity logs to record usage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of placeholder data references across all user interface screens are replaced with live data access.
- **SC-002**: Data access policies correctly apply security boundaries, passing automated security tests preventing unauthorized cross-family access.
- **SC-003**: Content fetch operations complete in under 500ms on a standard network connection.
- **SC-004**: The system successfully populates the required minimum baseline data upon initialization.

## Assumptions

- We assume the backend infrastructure is provisioned and connection credentials are available to the environment.
- We assume the existing UI structure supports asynchronous data loading states (e.g., loading spinners) as it transitions from synchronous placeholder data to async live data.
