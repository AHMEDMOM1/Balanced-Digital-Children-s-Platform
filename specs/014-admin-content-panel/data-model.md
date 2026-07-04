# Data Model: Content Management — Admin Panel

**Feature**: `specs/014-admin-content-panel/`
**Date**: 2026-06-11

---

## Existing Database Entities (No New Tables)

This feature adds no new database tables. All operations target the existing `content_items` and `categories` tables deployed in spec 009 and governed by spec 012 RLS policies.

### `content_items` table (existing)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NOT NULL | PK, server-generated — read-only in admin forms |
| `title` | `text` | NOT NULL | Required field in admin forms |
| `type` | `text` | NOT NULL | `'video' \| 'story' \| 'creative' \| 'game'` — set on create, read-only on edit |
| `category` | `text` | NOT NULL | FK by convention (not enforced at DB level) to `categories.name` |
| `min_age` | `integer` | NOT NULL | Required; admin form validation: 0–17 |
| `max_age` | `integer` | NOT NULL | Required; validation: `max_age >= min_age`, 1–18 |
| `thumbnail_url` | `text` | NOT NULL | Required URL field |
| `url` | `text` | nullable | Video URL (video type only) |
| `duration_seconds` | `integer` | nullable | Video duration (video type only) |
| `content_text` | `text` | nullable | Story body text (story type only) |
| `assets_url` | `text` | nullable | Creative assets URL (creative type only) |
| `game_type` | `text` | nullable | Game variant identifier (game type only) |
| `config_json` | `jsonb` | nullable | Game configuration — raw JSON in admin form; defaults to `{}` if blank |
| `created_at` | `timestamptz` | NOT NULL | Server-generated — read-only, displayed in admin list |

**RLS**: `admin_write_content_items` (FOR ALL — spec 012) applies to all admin CRUD operations.

---

### `categories` table (existing)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NOT NULL | PK, server-generated — read-only |
| `name` | `text` | NOT NULL | Required; unique by convention |
| `icon_url` | `text` | nullable | Optional icon URL |
| `created_at` | `timestamptz` | NOT NULL | Server-generated |

**RLS**: `admin_write_categories` (FOR ALL — spec 012) applies to all admin category CRUD.

---

## New TypeScript Types (additive)

These types live in `services/api/types.ts` as additive additions.

```typescript
// Extend UserRole to include admin
export type UserRole = 'parent' | 'child' | 'admin' | null;

// Input for creating a new content item (id and created_at are server-generated)
export interface AdminContentInput {
  title: string;
  type: ContentType;            // locked on edit
  category: string;
  min_age: number;
  max_age: number;
  thumbnail_url: string;
  url?: string;                 // video only
  duration_seconds?: number;    // video only
  content_text?: string;        // story only
  assets_url?: string;          // creative only
  game_type?: string;           // game only
  config_json?: GameConfig;     // game only (defaults to {} if blank)
}

// Input for updating content (type is excluded — immutable after creation)
export type AdminContentUpdate = Omit<AdminContentInput, 'type'>;

// Input for creating a category
export interface AdminCategoryInput {
  name: string;
  icon_url?: string;
}

// Query parameters for the paginated admin content list
export interface AdminListQuery {
  page: number;          // 1-indexed
  typeFilter?: ContentType;
  titleSearch?: string;  // ilike partial match
}

// Response from the paginated admin content list
export interface AdminContentListResponse {
  items: ContentItemExtended[];
  total: number;         // total matching rows (for page count)
  page: number;
  pageSize: number;      // always 20
}
```

---

## Entity Relationships

```text
categories
  └─── name (text) ←── content_items.category (text, by value — no FK constraint)

content_items
  ├─── type: 'video'    → url, duration_seconds populated
  ├─── type: 'story'    → content_text populated
  ├─── type: 'creative' → assets_url populated
  └─── type: 'game'     → game_type, config_json populated
```

**Note**: `content_items.category` stores the category name as a plain text value (no foreign key constraint at the DB level). If a category is deleted, existing content items retain the category name string. This is documented in US4 AS2 and the spec's Edge Cases section.

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| `title` | Required, non-empty string | "Title is required" |
| `type` | Required, one of: video/story/creative/game | "Type is required" |
| `category` | Required, non-empty | "Category is required" |
| `min_age` | Required, integer 0–17 | "Minimum age must be 0–17" |
| `max_age` | Required, integer 1–18, `>= min_age` | "Maximum age must be ≥ minimum age" |
| `thumbnail_url` | Required, non-empty | "Thumbnail URL is required" |
| `config_json` | If non-blank, must parse as valid JSON | "Config must be valid JSON" |
| `categories.name` | Required, non-empty | "Category name is required" |

---

## Pagination Model

- Page size: **20 items per page** (fixed)
- Supabase query: `.range((page-1)*20, page*20-1)` with `.count('exact')`
- Filters applied before pagination: type filter (`.eq('type', typeFilter)`) and title search (`.ilike('title', '%search%')`)
- Default sort: `created_at DESC`
- Page count: `Math.ceil(total / 20)`
