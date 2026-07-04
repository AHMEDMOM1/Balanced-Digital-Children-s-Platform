# Feature Specification: Data-Driven Games

**Feature Branch**: `011-data-driven-games`

**Created**: 2026-06-10

**Status**: Draft

**Input**: User description: "phase 4 from ContentPlan.md — Design games to be data-driven (no hardcoded content)"

## Overview

The current game screen renders a single hardcoded counting game (counting apples) regardless of which game the child taps. Game content (question text, answer choices, image) is baked into the component code.

This feature wires the game screen to read its content from the database. Each game row already stores a `config_json` field describing what to render. After this change, adding a new game requires only inserting a new database row — no code change is needed.

The `content_items` table, `config_json` schema, and seed data are already in place (features 009 and 010). The `useGame(id)` data hook also already exists. This feature is entirely a presentation layer change.

---

## Clarifications

### Session 2026-06-10

- Q: Does a counting game with one `config_json` represent a single-question game or a multi-level session? → A: Single question — a correct answer leads to the win screen after the correct-answer feedback animation, with 1 star earned.
- Q: Should the game screen call `logGameActivity` when the child wins? → A: Yes — call `logGameActivity` on win for parental usage tracking.

---

## User Scenarios & Testing

### User Story 1 — Child Plays a Counting Game from Database (Priority: P1)

A child taps "Count the Apples" on the games screen. The game screen loads the question, image, and answer choices from the database row rather than hardcoded values. The child sees the correct question text and the correct answer choices, taps the right answer, and wins immediately.

**Why this priority**: This is the core value of data-driven games. If counting games work from the DB, the pattern is proven and the visual design is validated.

**Independent Test**: Navigate to the game screen for the seeded counting game row. Confirm the question text matches `config_json.question` and the buttons match `config_json.choices`.

**Acceptance Scenarios**:

1. **Given** a counting game row exists in the database with `config_json.question = "How many apples are in the basket?"`, **When** a child opens that game, **Then** the game screen displays that exact question text.
2. **Given** the counting game config has `correct_answer: 5` and `choices: [3, 4, 5, 6]`, **When** the child taps "5", **Then** the button highlights as correct and the win screen appears with 1 star earned.
3. **Given** the counting game config has `choices: [3, 4, 5, 6]`, **When** the child taps any wrong choice, **Then** the button highlights as incorrect and the choice resets so the child can try again.
4. **Given** the counting game, **When** the child answers the single question correctly, **Then** the win screen appears with 1 star earned and a game activity is logged.

---

### User Story 2 — Child Plays a Matching Game from Database (Priority: P2)

A child taps "Match the Animals" on the games screen. The game screen detects the `matching` game type and renders a tap-to-match interaction using the `pairs` array from `config_json`. Each pair has an item label and an image. The child taps a label and its matching image to form pairs; when all pairs are matched, the win screen appears.

**Why this priority**: Matching is the second game type in the seed data. Both types must work to deliver the "no code changes for new games" promise.

**Independent Test**: Navigate to the game screen for the seeded matching game row. Confirm the screen renders pair items from `config_json.pairs` rather than any hardcoded content.

**Acceptance Scenarios**:

1. **Given** a matching game row with `config_json.pairs = [{item:"Dog", image:"..."}, {item:"Cat", image:"..."}, {item:"Rabbit", image:"..."}]`, **When** a child opens that game, **Then** the screen shows the three item labels and their corresponding images available to match.
2. **Given** the matching game is displayed, **When** the child taps a label then its correct image, **Then** that pair is marked as matched and removed from the available choices.
3. **Given** the matching game is displayed, **When** the child taps a label then a wrong image, **Then** the selection resets with a brief visual error indication.
4. **Given** all pairs have been correctly matched, **Then** the win screen appears and a game activity is logged.

---

### User Story 3 — New Game Requires Zero Code Changes (Priority: P3)

A developer inserts a new counting game row into the database with a valid `config_json`. No app code is modified. When a child with the correct age group opens the games screen and taps the new game, the game screen renders it correctly.

**Why this priority**: This is the architectural goal of the feature. It validates that the data-driven abstraction is complete.

**Independent Test**: Insert a new game row via SQL or the seed script, then navigate to `/(child)/game/{new-id}` and confirm it renders correctly without any code change.

**Acceptance Scenarios**:

1. **Given** a new counting game row is inserted with valid `config_json`, **When** a child navigates to that game's screen, **Then** the question, image, and choices from the new row are displayed correctly.
2. **Given** a new matching game row is inserted with valid `config_json`, **When** a child navigates to that game's screen, **Then** the pairs from the new row are displayed and matchable.

---

### Edge Cases

- What happens when the database row cannot be fetched (network error or missing ID)? The screen must show a non-crashing error state with a back button.
- What happens when `config_json` is `null` or has an unrecognised `game_type`? The screen must show a fallback error state rather than crashing.
- What happens while the database fetch is in progress? The screen must show a loading indicator.
- What happens when the `choices` array for a counting game contains only one item? The game should still render (degenerate case, not prevented at this layer).
- What happens when `choices` is an empty array or a required `config_json` key is missing? Treated as a structurally invalid config — the fallback error state is shown (FR-009).
- What happens when the child taps the back/home button mid-game before winning? All in-progress game state is silently discarded; no confirmation prompt is shown.
- What happens when a `config_json.image_url` or pair image URL fails to load? The `Image` component renders an empty space (standard React Native behaviour); no additional error state is required at this layer.
- What happens when `config_json.correct_answer` does not appear in the `choices` array? The game renders normally but no tap can produce a win — this is a data-integrity issue and is not guarded at the game screen layer.
- What happens with a very large number of matching pairs that exceed the viewport height? All pairs are rendered; the user may scroll. No maximum pair count or pagination is enforced at this layer.

---

## Requirements

### Functional Requirements

- **FR-001**: The game screen MUST fetch the `content_items` row matching the `id` route parameter on mount.
- **FR-002**: The game screen MUST display a loading indicator while the fetch is in progress.
- **FR-003**: The game screen MUST display a non-crashing error state (with a back button) if the fetch fails or the row is not found.
- **FR-004**: For `game_type = 'counting'`, the screen MUST render the question text from `config_json.question`, the image from `config_json.image_url`, and one button per entry in `config_json.choices`. The counting game is a single-question session.
- **FR-005**: For `game_type = 'counting'`, tapping the button whose value equals `config_json.correct_answer` MUST be treated as a correct answer and the screen MUST transition to the win screen after the correct-answer feedback animation, with 1 star earned; all other buttons MUST be treated as incorrect and reset for retry. While answer feedback is animating (correct or incorrect), additional choice taps MUST be ignored.
- **FR-006**: For `game_type = 'matching'`, the screen MUST render one selectable item per entry in `config_json.pairs`, each showing the `item` label and the `image` URL.
- **FR-007**: For `game_type = 'matching'`, tapping a label then its correct image MUST mark that pair as matched; tapping a wrong image MUST reset the selection with a 600 ms visual error indication. Tapping an image card when no label is currently selected MUST be a no-op.
- **FR-008**: For `game_type = 'matching'`, when all pairs have been matched, the win screen MUST appear with 1 star earned.
- **FR-009**: If `game_type` is absent or unrecognised, or if `config_json` is structurally invalid for its `game_type` (e.g., required keys are missing or `choices` is empty), the screen MUST show the fallback error state rather than a blank or crashed screen.
- **FR-010**: The existing visual design elements (soft pink background, 3D button style, star progress pill, win screen) MUST be preserved for the counting game. The matching game uses the same background and win screen; matching-specific interaction elements may use a consistent visual style.
- **FR-011**: No game content values (question text, answer numbers, pair labels, image URLs) may be hardcoded in the game screen component after this change.
- **FR-012**: The game screen MUST call the activity logger when a game session ends in a win — on correct answer for counting games, and on all-pairs-matched for matching games. The call is fire-and-forget (no error handling or retry is required). If `childData` is null at win time, the call is silently skipped.
- **FR-013**: Game images MUST carry an `accessibilityLabel` prop for screen reader compatibility: the counting game image uses the question text from `config_json.question`; matching game pair images use the pair's `item` value.

### Key Entities

- **Counting Game Config**: `{type: 'counting', question: string, image_url: string, correct_answer: number, choices: number[]}` — drives a single-question counting game session
- **Matching Game Config**: `{type: 'matching', pairs: [{item: string, image: string}]}` — drives a tap-to-match session
- **Game Screen Route**: `/(child)/game/[id]` — receives Supabase row UUID as `id` parameter

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: The counting game screen renders question text, image, and answer buttons sourced entirely from `config_json`; a single correct answer leads to the win screen (after the feedback animation) with 1 star — zero hardcoded game values remain in the component.
- **SC-002**: The matching game screen renders all pairs from `config_json.pairs` and correctly handles match/mismatch interactions, reaching the win screen when all pairs are matched.
- **SC-003**: Inserting a new game row with valid `config_json` (either type) and navigating to its screen produces a working game with no code changes.
- **SC-004**: The screen shows a loading indicator within 100 ms of mount (before the DB fetch resolves) and removes it when the fetch completes. Loading indicator *presence* is verified by unit test; the 100 ms timing threshold is verified manually on device.
- **SC-005**: An invalid or missing game row produces a visible, non-crashing error state — the screen does not throw an unhandled exception.
- **SC-006**: All existing counting game visual design elements (background colour, 3D buttons, star pill, win screen) are visually consistent with the existing counting game design (verified via code inspection and manual review).
- **SC-007**: A game completion event (win) is logged via the activity logger for both counting and matching games.

---

## Assumptions

- The `content_items` table with `game_type` and `config_json` columns is already deployed (feature 009).
- Both game rows (counting and matching) are already seeded (feature 010).
- The `useGame(id)` hook in `services/api/games.ts` is already implemented and returns the full row including `config_json`.
- The `GameItem` type in `services/api/types.ts` already models `game_type` and `config_json`.
- The `logGameActivity` function in `services/api/games.ts` is already implemented and accepts `childId`, `gameId`, and `durationSeconds`.
- The games list screen (`app/(child)/games.tsx`) already routes to `/(child)/game/{id}` using the correct Supabase UUID.
- The `id` route parameter is always a valid UUID string; format validation is out of scope.
- Offline caching of individual game rows is out of scope — the fetch requires network connectivity.
- Drag-and-drop matching is out of scope; tap-to-select is the interaction model for matching games.
- Animated image loading (progressive/blur-up) is out of scope; standard `Image` rendering is sufficient.
- Each counting game DB row represents a single-question session (one `correct_answer`, one `choices` array); multi-level progression within a single row is out of scope.
