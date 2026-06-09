# Tasks: Phase 1 Real Data Layer

**Input**: Design documents from `/specs/002-phase-1/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Configure Supabase client instance using environment variables in `services/api/client.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Write SQL migration script for creating tables (`child_profiles`, `content`, `allowed_categories`) in `server/migrations/001_core_tables.sql`
- [X] T003 Write SQL migration script for Row-Level Security (RLS) policies in `server/migrations/002_rls_policies.sql`
- [X] T004 Write SQL seed script with initial baseline data (20 stories, 10 games, etc.) in `server/seeds/001_initial_data.sql`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 3 - Centralized Data Access Layer (Priority: P3)

**Goal**: Every data read/write operation goes through a unified data access layer.

**Independent Test**: Review the codebase to ensure all UI components request data through the unified data module.

### Implementation for User Story 3

- [X] T005 [P] [US3] Implement data fetching and offline caching logic for Stories in `services/api/stories.ts`
- [X] T006 [P] [US3] Implement data fetching and offline caching logic for Games in `services/api/games.ts`
- [X] T007 [P] [US3] Implement data fetching and offline caching logic for Videos in `services/api/videos.ts`
- [X] T008 [P] [US3] Implement data fetching and offline caching logic for Creative Activities in `services/api/creative.ts`

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently

---

## Phase 4: User Story 1 - Child Content Access (Priority: P1) 🎯 MVP

**Goal**: Child sees a curated list of actual content fetched from the platform's database.

**Independent Test**: Log in as a child and verify the content list matches the central database records and filters out unapproved categories.

### Implementation for User Story 1

- [X] T009 [P] [US1] Refactor the Stories UI screen to use the new hook from `services/api/stories.ts` and remove mock data
- [X] T010 [P] [US1] Refactor the Games UI screen to use the new hook from `services/api/games.ts` and remove mock data
- [X] T011 [P] [US1] Refactor the Videos UI screen to use the new hook from `services/api/videos.ts` and remove mock data
- [X] T012 [P] [US1] Refactor the Creative UI screen to use the new hook from `services/api/creative.ts` and remove mock data
- [X] T013 [US1] Implement the Empty State UI component (e.g., "Time to play outside!") for when all categories are blocked

**Checkpoint**: At this point, User Stories 3 AND 1 should both work independently

---

## Phase 5: User Story 2 - Parent Category Management (Priority: P2)

**Goal**: Parent adds or removes an allowed category, child's available content updates accordingly.

**Independent Test**: Log in as a parent, modify allowed categories, and start a new child session to see the changes reflected.

### Implementation for User Story 2

- [X] T014 [US2] Update the parent settings screen to perform live database mutations for updating `allowed_categories`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T015 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion

### User Story Dependencies

- **User Story 3 (P3)**: Can start after Foundational (Phase 2). Provides data hooks for US1.
- **User Story 1 (P1)**: Depends on US3 for data hooks.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2).

### Parallel Opportunities

- All Foundational tasks can be written in parallel.
- All tasks in Phase 3 (US3 API hooks) can run in parallel.
- All refactoring tasks in Phase 4 (US1 screen updates) can run in parallel.

---

## Parallel Example: User Story 3

```bash
# Launch all API hooks for User Story 3 together:
Task: "Implement data fetching and offline caching logic for Stories in services/api/stories.ts"
Task: "Implement data fetching and offline caching logic for Games in services/api/games.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 3
4. Complete Phase 4: User Story 1
5. **STOP and VALIDATE**: Test User Story 1 independently
6. Deploy/demo if ready
