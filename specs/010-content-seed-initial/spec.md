# Feature Specification: Initial Content Seed

**Feature Branch**: `010-content-seed-initial`

**Created**: 2026-06-10

**Status**: Draft

**Input**: Phase 3 from ContentPlan.md — Seed Initial Content (Small Batch)

## Overview

Add a small but representative set of real content (videos, stories, activities, games) to the platform so the app can be demonstrated and tested end-to-end with real data. Content must be age-appropriate for children aged 2–10, correctly categorised, and immediately visible in the app without code changes.

## User Scenarios & Testing

### User Story 1 — Child Sees Real Content on Home Screen (Priority: P1)

A child opens the app and sees real videos, stories, activities, and games — not placeholder data. Each item has a title, thumbnail, and is appropriate for their age group.

**Why this priority**: Without real content the app cannot be demonstrated, tested, or used by real children. This is the single most blocking gap right now.

**Independent Test**: Open the app as a child profile in the 3–5 age group. The home screen must show at least one video, one story, one activity, and one game — all with real titles and thumbnails.

**Acceptance Scenarios**:

1. **Given** a child aged 3–5 is logged in, **When** they open the app, **Then** they see at least 3 videos, 3 stories, 2 activities, and 2 games matching their age group.
2. **Given** a child aged 6–8 is logged in, **When** they open the app, **Then** they see content appropriate for that age group (not the 3–5 batch).
3. **Given** content has a thumbnail URL, **When** the content card is displayed, **Then** the thumbnail image loads without a broken-image placeholder.

---

### User Story 2 — Content is Filterable by Category (Priority: P2)

A parent or child can filter content by category (e.g., Math, Animals, Nature). Each seeded content item belongs to a named category that already exists in the categories table.

**Why this priority**: Category filtering is a core UX feature. Without seeded categories linked to content, the filter UI has nothing to show.

**Independent Test**: From the content list, apply a category filter for "Math". Only math-labelled content items are returned.

**Acceptance Scenarios**:

1. **Given** content items with `category = 'math'` exist, **When** a category filter is applied for Math, **Then** only math items are returned and items from other categories are excluded.
2. **Given** a category row exists in the `categories` table, **When** the categories list is fetched, **Then** the seeded categories appear with correct names and icon URLs.
3. **Given** a content item has a category that does not match any row in `categories`, **When** a filter is applied, **Then** the item still appears (soft FK — no join required).

---

### User Story 3 — Games Have Working Config JSON (Priority: P3)

Each seeded game has a `config_json` column populated with valid structured data so the game engine can render it without hardcoded content.

**Why this priority**: Games are the most technically complex content type. Validating the config format with real seed data prevents silent failures when the game screen loads.

**Independent Test**: Fetch a seeded game row. Parse its `config_json`. Confirm it contains the expected keys (`type`, `question` or `pairs`, `correct_answer` or equivalent) and that no required key is null.

**Acceptance Scenarios**:

1. **Given** a counting game row is seeded, **When** its `config_json` is read, **Then** it contains `type`, `question`, `image_url`, `correct_answer`, and `choices` keys.
2. **Given** a matching game row is seeded, **When** its `config_json` is read, **Then** it contains `type` and a `pairs` array with at least 2 items, each having `item` and `image` keys.
3. **Given** any game row, **When** the config is parsed as JSON, **Then** it is valid JSON with no syntax errors.

---

### Edge Cases

- What happens when a thumbnail URL is unreachable? Content item still appears in the list; the broken image is handled by the UI (out of scope for this feature — seed data must use reachable URLs or a known placeholder).
- What happens when a content item's `age_group` range doesn't match any logged-in child? That item is excluded by the age filter — expected behaviour.
- What happens if a game's `config_json` is missing a required key? The game engine should show an error state — this seed must ensure all required keys are present.
- What if the same seed script is run twice? All inserts must be idempotent (upsert by title+type or skip if already exists).

## Requirements

### Functional Requirements

- **FR-001**: A seed script MUST insert at least 3 videos into `content_items` with `type='video'`, valid `title`, `url`, `thumbnail_url`, `category`, `min_age`, `max_age`, and `duration_seconds`.
- **FR-002**: A seed script MUST insert at least 3 stories into `content_items` with `type='story'`, valid `title`, `content_text`, `thumbnail_url`, `category`, `min_age`, and `max_age`.
- **FR-003**: A seed script MUST insert at least 2 activities into `content_items` with `type='creative'`, valid `title`, `assets_url`, `category`, `min_age`, and `max_age`.
- **FR-004**: A seed script MUST insert at least 2 games into `content_items` with `type='game'`, valid `title`, `game_type`, `config_json`, `category`, `min_age`, and `max_age`.
- **FR-005**: The seed script MUST insert at least 3 category rows into the `categories` table (e.g., Math, Animals, Nature) with a `name` and `icon_url`.
- **FR-006**: All seeded video URLs MUST be external links (YouTube or Vimeo) — no video files uploaded to Supabase Storage.
- **FR-007**: All seeded image URLs (thumbnails, story covers, activity assets, game images) MUST use free public CDN URLs (e.g., Unsplash, Pixabay) — no upload to Supabase Storage buckets required for the seed batch.
- **FR-008**: The seed script MUST be idempotent — if a row with the same `title` and `type` already exists, it MUST be skipped (not updated or duplicated) and counted in the "skipped" summary total.
- **FR-013**: If any individual insert fails, the seed script MUST continue processing remaining items, collect all errors, and print a combined failure report at the end. The script MUST exit with a non-zero code if any inserts failed.
- **FR-009**: Content items MUST be split across at least 2 age ranges (e.g., 2–5 and 6–10) so age filtering can be verified.
- **FR-010**: Each game's `config_json` MUST be valid JSON containing all keys required by its `game_type` (counting: `type`, `question`, `image_url`, `correct_answer`, `choices`; matching: `type`, `pairs`).
- **FR-011**: The seed script MUST be runnable via a single CLI command (e.g., `npm run seed:content`).
- **FR-012**: The seed script MUST print a summary on completion: how many rows were inserted vs skipped per content type.

### Key Entities

- **ContentItem**: A single piece of content in `content_items`. Has `type` (video/story/creative/game), `category` (text matching a category name), `min_age`/`max_age` (integer range), and type-specific extended columns (`duration_seconds`, `content_text`, `assets_url`, `game_type`, `config_json`).
- **Category**: A row in the `categories` table. Has `name` (unique text) and optional `icon_url`. Content items reference categories by matching the `category` text column — no foreign key constraint.
- **GameConfig**: The JSON object stored in `config_json`. Shape varies by `game_type`: counting games and matching games have different required keys.

## Success Criteria

### Measurable Outcomes

- **SC-001**: After running the seed script, at least 10 content items exist across all 4 types (3 videos + 3 stories + 2 activities + 2 games minimum).
- **SC-002**: After running the seed script, at least 3 category rows exist in the `categories` table.
- **SC-003**: Running the seed script a second time results in 0 new rows inserted and 0 errors — idempotency verified.
- **SC-004**: A child in the 3–5 age group sees at least 1 item from each content type on the home screen without any code change.
- **SC-005**: A category filter returns only items matching the selected category, with 0 false positives.
- **SC-006**: Every seeded game's `config_json` parses without error and contains all required keys for its `game_type`.

## Clarifications

### Session 2026-06-10

- Q: Where will seed image URLs come from? → A: Free public CDN URLs (Unsplash/Pixabay) — no Supabase Storage upload step required.
- Q: When an existing row is found (same title + type), should the script update it or skip it? → A: Skip and count as "skipped" — never overwrite existing rows.
- Q: If the script fails on one item mid-seed, should it abort or continue? → A: Continue remaining inserts, collect all errors, print a combined failure summary at the end.

## Assumptions

- Videos are hosted on YouTube or Vimeo; only the URL is stored (no video upload to Supabase).
- Thumbnail and asset images are sourced exclusively from free public CDNs (e.g., Unsplash, Pixabay). No upload to Supabase Storage is required for the seed batch.
- The `content_items` table and `categories` table already exist with the schema from feature 009-content-schema-storage (migration already applied).
- The seed script uses the service role key (already in `.env` as `SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS during seeding.
- Age ranges use integer `min_age`/`max_age` columns (not an `age_group` text enum), consistent with the schema from feature 009.
- Idempotency is achieved by checking for an existing row by `title` + `type` before inserting. Existing rows are skipped, never overwritten.
- If an individual insert fails, the script continues with remaining items and reports all failures at the end with a non-zero exit code.
- The seed script is a TypeScript file run via `ts-node`, consistent with existing scripts in the `scripts/` directory.
- Content is in English. Localisation is out of scope.
- A minimum viable seed batch (10 items) is the target — not a full content library.
