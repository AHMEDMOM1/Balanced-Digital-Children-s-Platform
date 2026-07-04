# Data Model: Initial Content Seed

**Feature**: 010-content-seed-initial
**Date**: 2026-06-10

---

## Existing Tables (no schema changes in this feature)

Both tables were created and migrated in feature 009-content-schema-storage. This feature only inserts rows.

### `content_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| title | text NOT NULL | Seed key: checked for existence with `type` |
| type | text NOT NULL | One of: `video`, `story`, `creative`, `game` |
| category | text | Matches a `categories.name` value (soft ref) |
| min_age | integer | Lower bound of age range (inclusive) |
| max_age | integer | Upper bound of age range (inclusive) |
| url | text | External video URL (YouTube/Vimeo) — videos only |
| thumbnail_url | text | Picsum CDN URL |
| is_active | boolean DEFAULT true | All seed items set active |
| created_at | timestamptz | Auto-set by DB |
| duration_seconds | integer | Videos only |
| content_text | text | Stories only — full story body |
| assets_url | text | Creative activities only — Picsum CDN URL |
| game_type | text | Games only — `counting` or `matching` |
| config_json | jsonb | Games only — structured config per game_type |

**Idempotency key**: `(title, type)` — seed script checks `SELECT id FROM content_items WHERE title = $1 AND type = $2` before inserting.

### `categories`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| name | text NOT NULL UNIQUE | Seed key: checked for existence by `name` |
| icon_url | text | Picsum CDN URL |
| created_at | timestamptz | Auto-set by DB |

**Idempotency key**: `name` — seed script checks `SELECT id FROM categories WHERE name = $1` before inserting.

---

## Seed Data Shapes

### SeedCategory

```
{
  name: string          // unique category name, lowercase
  icon_url: string      // Picsum URL
}
```

### SeedVideo

```
{
  title: string
  type: 'video'
  category: string      // must match a SeedCategory.name
  min_age: number
  max_age: number
  url: string           // YouTube or Vimeo URL
  thumbnail_url: string // Picsum URL
  duration_seconds: number
}
```

### SeedStory

```
{
  title: string
  type: 'story'
  category: string
  min_age: number
  max_age: number
  thumbnail_url: string // Picsum URL
  content_text: string  // full story body text (2–4 paragraphs)
}
```

### SeedActivity

```
{
  title: string
  type: 'creative'
  category: string
  min_age: number
  max_age: number
  thumbnail_url: string // Picsum URL
  assets_url: string    // Picsum URL for the activity asset image
}
```

### SeedGame (counting type)

```
{
  title: string
  type: 'game'
  game_type: 'counting'
  category: string
  min_age: number
  max_age: number
  thumbnail_url: string
  config_json: {
    type: 'counting'
    question: string
    image_url: string    // Picsum URL
    correct_answer: number
    choices: number[]    // 4 options including correct_answer
  }
}
```

### SeedGame (matching type)

```
{
  title: string
  type: 'game'
  game_type: 'matching'
  category: string
  min_age: number
  max_age: number
  thumbnail_url: string
  config_json: {
    type: 'matching'
    pairs: Array<{
      item: string       // label text
      image: string      // Picsum URL
    }>
  }
}
```

---

## RLS Behaviour During Seeding

The seed script uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. The `service_write_content_items` and `service_write_categories` policies (created in feature 009) allow `FOR ALL` with `auth.role() = 'service_role'`. No policy changes are needed.

---

## No Schema Changes

This feature adds zero new tables, columns, or migrations. All changes are data-only (INSERT operations).
