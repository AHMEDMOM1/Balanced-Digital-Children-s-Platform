# Feature Specification: Content Database Schema & Storage Setup

**Feature Branch**: `009-content-schema-storage`

**Created**: 2026-06-10

**Status**: Clarified

**Input**: ContentPlan.md — Phase 1 (Database Schema Design) and Phase 2 (Storage Setup)

---

## Overview

This feature establishes the foundational data structures and media storage infrastructure required to serve real content (videos, stories, activities, games) to children on the platform. Without this foundation, no content can be stored, retrieved, or displayed to users. Phase 1 augments the existing `content_items` table with new type-specific nullable columns and creates a new `categories` lookup table; Phase 2 creates the storage buckets for media files.

---

## Clarifications

### Session 2026-06-10

- Q: Should the spec describe augmenting the existing `content_items` table instead of creating separate per-type tables? → A: Yes — augment existing `content_items` table with nullable type-specific columns; create only the new `categories` lookup table.
- Q: Should `age_group` text column be replaced with `min_age`/`max_age` integer pair to match existing codebase? → A: Yes — use `min_age` and `max_age` integer columns, consistent with existing API hooks and `AGE_GROUP_RANGES` mapping.
- Q: Should the RLS "out of scope" assumption be removed since the constitution mandates RLS on every new table? → A: Yes — RLS is enabled and a basic authenticated-read SELECT policy is included in the migration; admin write policies remain deferred to Phase 5.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Content Database Structure (Priority: P1)

A content administrator needs the existing `content_items` database table extended with type-specific columns (for video duration, story text, activity assets, game configuration), and a new `categories` lookup table created, so that real content of every type can be stored with full metadata and served to children at the correct age range.

**Why this priority**: Without the schema changes, no type-specific content metadata can be stored or retrieved. Everything else — storage, seeding, the admin panel — depends on this foundation being in place first.

**Independent Test**: Can be fully tested by inserting one sample row per content type (using the new columns) and reading it back with an age-range filter. Delivers the value of a ready-to-populate content database.

**Acceptance Scenarios**:

1. **Given** the database schema has not been updated, **When** an administrator applies the migration, **Then** the `content_items` table has 5 new nullable columns (`duration_seconds`, `content_text`, `assets_url`, `game_type`, `config_json`) AND the new `categories` table exists with columns `id`, `name`, `icon_url`, `created_at`.
2. **Given** the schema migration has been applied, **When** a video content item is inserted with `min_age = 2` and `max_age = 4`, **Then** querying with child age 3 (where `min_age <= 3 AND max_age >= 3`) returns that item, and querying for child age 6 does not.
3. **Given** the schema migration has been applied, **When** a game row is inserted with a JSON `config_json` value describing a counting game, **Then** the full config is retrievable unchanged.
4. **Given** the schema migration has been applied, **When** a row is inserted with `type = 'creative'` and an `assets_url`, **Then** filtering by `type = 'creative'` returns only creative/activity rows.

---

### User Story 2 — Media Storage Buckets (Priority: P2)

A content administrator needs separate, purpose-named storage buckets for thumbnails, story images, activity assets, and game assets, so that media files can be uploaded, organized, and referenced from database rows.

**Why this priority**: The database schema (P1) is the prerequisite, but storage buckets are needed immediately after so that real content items can be linked to actual media. Without buckets, all image/asset URLs in the database remain empty.

**Independent Test**: Can be fully tested by uploading one file to each bucket and verifying the public URL is reachable. Delivers the value of a ready-to-use media storage layer.

**Acceptance Scenarios**:

1. **Given** storage is not yet configured, **When** the bucket setup is complete, **Then** four buckets exist: `thumbnails`, `activity-assets`, `story-images`, `game-assets`.
2. **Given** the `thumbnails` bucket exists, **When** a PNG cover image is uploaded, **Then** its storage URL can be written into the `content_items.thumbnail_url` column and loaded by the app.
3. **Given** a video is added to the `content_items` table with `type = 'video'`, **When** the `url` field contains an external link (e.g., YouTube), **Then** no video file upload to Supabase Storage is required.
4. **Given** the `activity-assets` bucket exists, **When** an SVG coloring template is uploaded, **Then** the file is accessible via its URL for rendering in the activity screen.

---

### User Story 3 — Category Organisation (Priority: P3)

A parent or child browsing the platform needs content to be grouped by named categories (each with a display icon), so that navigation feels intuitive and consistent across all content types.

**Why this priority**: Categories enhance discoverability and organisation, but the platform can function without them initially — videos, stories, activities, and games can still be displayed ungrouped. Categories become important once content volume grows.

**Independent Test**: Can be tested by inserting two categories, assigning them to content rows, and verifying that filtering videos or stories by category returns the correct subset.

**Acceptance Scenarios**:

1. **Given** the `categories` table exists, **When** a category named "Math" with an icon URL is inserted, **Then** it can be referenced by any content row's `category` column.
2. **Given** three content rows all have `category = 'math'`, **When** a filter for `category = 'math'` is applied, **Then** exactly those three rows are returned.
3. **Given** no category icon is provided for a new category, **Then** the system accepts null for `icon_url` without error.

---

### Edge Cases

- **Out-of-range age values** (e.g., `min_age = 99`): No database constraint enforces valid age ranges. Application-layer validation is required before insert; this is enforced by the future admin panel (ContentPlan.md Phase 6).
- **Null `thumbnail_url`**: Null is permitted by the schema. Fallback display behavior (e.g., placeholder image) is a UI concern delegated to the rendering layer and is out of scope for this schema feature.
- **`config_json` malformed or empty**: PostgreSQL accepts any valid JSON without schema-level validation; an empty object `{}` is stored without error. Runtime validation of the JSON shape is delegated to the game engine (ContentPlan.md Phase 4).
- **Duplicate content entries** (same title + same age range): Duplicates are permitted at the schema level — no unique constraint covers title + age range. Deduplication is enforced at the application layer.
- **Storage upload exceeds file-size limit**: Supabase Storage enforces a platform-level file-size limit. The application MUST handle upload errors and display an appropriate error message; this is a UI-layer concern.
- **Storage URL becomes unavailable**: The application MUST handle missing image URLs gracefully (broken URL fallback); this is a UI-layer concern for the rendering layer.
- **`assets_url` bucket disambiguation**: The bucket source of an `assets_url` value is determinable from the URL path itself, which includes the bucket name (`story-images` vs `activity-assets`). No additional column is needed to distinguish the two.

---

## Requirements *(mandatory)*

### Functional Requirements

**Phase 1 — Database Schema**

- **FR-001**: System MUST add a nullable `duration_seconds` (integer, no default) column to the existing `content_items` table, used by rows where `type = 'video'`.
- **FR-002**: System MUST add a nullable `content_text` (text, no default) column to the existing `content_items` table, used by rows where `type = 'story'`.
- **FR-003**: System MUST add a nullable `assets_url` (text, no default) column to the existing `content_items` table, used by rows where `type = 'creative'` (activities).
- **FR-004**: System MUST add nullable `game_type` (text, no default) and `config_json` (jsonb, no default) columns to the existing `content_items` table, used by rows where `type = 'game'`.
- **FR-005**: System MUST create a new `categories` table with columns: `id` (UUID, primary key), `name` (text, unique), `icon_url` (text, nullable), `created_at` (timestamptz, database-level default: `now()`).
- **FR-006**: The `categories` table's primary key MUST be a UUID auto-generated by the database.
- **FR-007**: Content items MUST be filterable by child age range using the existing `min_age` and `max_age` integer columns — returning only items where `min_age <= childAge AND max_age >= childAge`.
- **FR-008**: The `config_json` column MUST store game logic and content as a flexible JSON structure, so that adding a new game requires only inserting a new row — no code changes. Note: the exact `config_json` shape is defined in ContentPlan.md Phase 4 and is out of scope for this feature.
- **FR-009**: Content items MUST be queryable by `category` (text), returning only items belonging to the requested category name.
- **FR-010**: RLS MUST be enabled on `content_items` with policy `authenticated_read_content_items` (SELECT for all authenticated users) and `service_write_content_items` (ALL for service role, used by seed scripts). Admin INSERT/UPDATE/DELETE policies for non-service roles are deferred to Phase 5.
- **FR-011**: RLS MUST be enabled on the new `categories` table with policy `authenticated_read_categories` (SELECT for all authenticated users) and `service_write_categories` (ALL for service role, used by seed scripts).

**Phase 2 — Storage Buckets**

- **FR-012**: System MUST create a `thumbnails` storage bucket, with public (CDN-level unauthenticated read access) enabled, for cover images used by videos and stories.
- **FR-013**: System MUST create an `activity-assets` storage bucket, with public (CDN-level unauthenticated read access) enabled, for drawing templates and coloring pages (PNG/SVG).
- **FR-014**: System MUST create a `story-images` storage bucket, with public (CDN-level unauthenticated read access) enabled, for story illustrations.
- **FR-015**: System MUST create a `game-assets` storage bucket, with public (CDN-level unauthenticated read access) enabled, for game images (animals, objects, etc.).
- **FR-016**: Video content MUST be stored as external URL references (e.g., YouTube or Vimeo links) in `content_items.url` rather than uploaded files, in order to avoid large storage costs.
- **FR-017**: Image and asset content (thumbnails, story images, activity assets, game assets) MUST be uploaded directly to the corresponding Supabase Storage bucket.
- **FR-018**: Each storage bucket URL MUST be linkable from the corresponding database column: `content_items.thumbnail_url` → `thumbnails`; `content_items.assets_url` → `story-images` (for stories) or `activity-assets` (for activities); game asset URLs referenced inside `config_json` → `game-assets`.
- **FR-019**: All existing API hooks (`useVideos`, `useStories`, `useGames`, `useCreative`) MUST continue to work unchanged after the migration is applied — no existing `content_items` columns are modified or dropped; only new nullable columns are added.
- **FR-020**: The migration SQL MUST be idempotent — applying it a second time MUST NOT cause errors. This is achieved via `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` guards as defined in `contracts/content-schema.sql`.

### Key Entities *(include if feature involves data)*

- **ContentItem** (existing, augmented): Represents any content item on the platform. Discriminated by `type` (`'video'`, `'story'`, `'game'`, `'creative'`). Age range stored as `min_age` and `max_age` integers. New nullable columns: `duration_seconds`, `content_text`, `assets_url`, `game_type`, `config_json`. The `category` column is a free-text soft reference to `categories.name` — no foreign key constraint is enforced, to avoid migration friction with existing rows that predate the `categories` table.
- **Category**: Represents a named content grouping shared across all content types. Key attributes: display name (unique), icon image URL (optional).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The `content_items` table has all 5 new columns and the `categories` table is created — verified by successfully inserting and reading back one sample row per content type using the new columns.
- **SC-002**: Content filtered by age range (`min_age`/`max_age`) returns only matching items within 1 second for a dataset of up to 500 content rows.
- **SC-003**: All 4 storage buckets (`thumbnails`, `activity-assets`, `story-images`, `game-assets`) are accessible and accept file uploads within 5 seconds per file (measured for files up to 5 MB in size).
- **SC-004**: A new game can be added by inserting a single row containing valid JSON config — no code changes or schema migrations required.
- **SC-005**: A content administrator can successfully add a new story (text + cover image) end-to-end — from uploading the image to the bucket to inserting the database row — in under 3 minutes.
- **SC-006**: All database columns referenced in Phase 3 (seed data) match the schema defined here — zero migration conflicts when seeding begins.

---

## Assumptions

- The database backend is Supabase (PostgreSQL). All schema definitions target PostgreSQL column types.
- The `content_items` table already exists in the database with columns: `id`, `title`, `type`, `category`, `min_age`, `max_age`, `url`, `thumbnail_url`, `created_at`. No existing columns are modified — only new nullable columns are added.
- Age group ranges use `min_age` and `max_age` integer columns. The application maps text labels (`'2-4'`, `'5-7'`, `'8-10'`) to integer pairs via `AGE_GROUP_RANGES` (existing constant in `services/api/contentHelpers.ts`).
- Row Level Security (RLS) IS enabled on both `content_items` and `categories` as part of this migration. An authenticated-read SELECT policy is applied immediately. Admin INSERT/UPDATE/DELETE policies are deferred to Phase 5 of ContentPlan.md.
- UUIDs are auto-generated by the database using `gen_random_uuid()` — no application-side UUID generation is required for inserts.
- The `videos` bucket from ContentPlan.md Phase 2 is intentionally excluded — video files are stored as external URLs only, not uploaded to Supabase Storage.
- The `categories` table uses free-text names; no predefined list is enforced at the schema level.
- This specification covers Phases 1 and 2 only. Seed data (Phase 3), game config structure examples (Phase 4), admin write RLS (Phase 5), and the admin panel (Phase 6) are separate work items.
- The platform's existing `profiles` and `auth` tables are already in place and will not be modified by this feature.
- All existing API hooks (`useVideos`, `useStories`, `useGames`, `useCreative`) continue to work unchanged — the augmentation approach adds only nullable columns.
- Supabase Dashboard access (with admin rights) is a required prerequisite for: (a) applying the schema migration via the SQL Editor, and (b) creating the four Storage buckets. No Supabase CLI setup is required.
- Rollback procedure: to reverse this migration, run the following in the Supabase Dashboard SQL Editor: `ALTER TABLE content_items DROP COLUMN IF EXISTS duration_seconds, DROP COLUMN IF EXISTS content_text, DROP COLUMN IF EXISTS assets_url, DROP COLUMN IF EXISTS game_type, DROP COLUMN IF EXISTS config_json; DROP TABLE IF EXISTS categories;`
