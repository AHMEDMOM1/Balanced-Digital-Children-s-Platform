---

description: "Task list template for feature implementation"
---

# Tasks: Content Population

**Input**: Design documents from `/specs/022-content-population/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Generate Arabic titles and structure for 33 seeded content items
- [x] T002 Rewrite `scripts/generate-sql.js` to create idempotent content insertions
- [x] T003 Execute the sql generator to produce `supabase/migrations/20260705000001_seed_all_content.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Run the generated `.sql` file in the Supabase database to seed all content.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Enjoying Interactive Stories (Priority: P1) 🎯 MVP

**Goal**: Children can open and read bilingual (Arabic/English) stories that display properly with right-to-left layout and pagination.

**Independent Test**: Can be fully tested by opening the Story Viewer, navigating through the pages, and verifying the layout and text format.

### Implementation for User Story 1

- [x] T005 [US1] Remove hardcoded `storyTemplates` from `app/(child)/story/[id].tsx`
- [x] T006 [US1] Implement `splitContentToPages()` using `content_text` in `app/(child)/story/[id].tsx`
- [x] T007 [US1] Ensure the page text utilizes the `formatBiDiText` or is styled for RTL/LTR mix in `app/(child)/story/[id].tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Watching Educational Videos (Priority: P1)

**Goal**: Children can watch curated educational videos directly within the app without navigating to external apps.

**Independent Test**: Can be fully tested by playing a video in the Video Player and verifying the YouTube iframe player functions correctly.

### Implementation for User Story 2

- [x] T008 [P] [US2] Import `react-native-youtube-iframe` in `app/(child)/video/[id].tsx`
- [x] T009 [P] [US2] Create a regex utility `extractYouTubeId()` to extract YouTube video IDs in `app/(child)/video/[id].tsx`
- [x] T010 [US2] Replace dummy video emoji player area with the `<YoutubePlayer />` component in `app/(child)/video/[id].tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Playing New Educational Games (Priority: P2)

**Goal**: Children have access to a wider variety of educational games, specifically sorting and quiz games.

**Independent Test**: Can be fully tested by playing the new "Sorting" and "Quiz" game types and completing their flows successfully.

### Implementation for User Story 3

- [x] T011 [P] [US3] Define `SortingConfig` and `QuizConfig` types matching the JSON structure in `app/(child)/game/[id].tsx`
- [x] T012 [P] [US3] Scaffold state variables for quiz (current question, selected answer) and sorting (current ordered items) in `app/(child)/game/[id].tsx`
- [x] T013 [US3] Build the conditional renderer view for `game_type === 'sorting'` in `app/(child)/game/[id].tsx`
- [x] T014 [US3] Build the conditional renderer view for `game_type === 'quiz'` in `app/(child)/game/[id].tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Exploring Creative Activities (Priority: P2)

**Goal**: Children can browse and view detailed instructions for various creative activities, encouraging offline engagement.

**Independent Test**: Can be fully tested by navigating to a creative activity and viewing the detail screen with its instructions and assets.

### Implementation for User Story 4

- [x] T015 [P] [US4] Create a new screen `app/(child)/creative-detail.tsx` that fetches content by id
- [x] T016 [P] [US4] Update `app/(child)/creative.tsx` to route to the new detail screen passing the `id`
- [x] T017 [US4] Display the instructions (`content_text`) and the image (`assets_url`) inside the detail screen

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T018 Run `npx tsc --noEmit` to verify type safety across the application
- [x] T019 Run the test suite (if tests added)
- [x] T020 Run `quickstart.md` validation by manually checking the App in Expo Dev Client

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Parallel Opportunities

- All User Stories can be executed in parallel as they each touch entirely disjoint screen files.
- US1 edits `story/[id].tsx`
- US2 edits `video/[id].tsx`
- US3 edits `game/[id].tsx`
- US4 adds `creative-detail.tsx`

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories
