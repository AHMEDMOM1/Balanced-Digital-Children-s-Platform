# Data Model: Content Schema & Storage Setup

**Feature**: `009-content-schema-storage`
**Date**: 2026-06-10

---

## Entities

### 1. `content_items` (existing — augmented)

All rows share a `type` discriminator column. New columns are nullable so existing rows are unaffected.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NOT NULL PK | `gen_random_uuid()` default |
| `title` | text | NOT NULL | Existing |
| `type` | text | NOT NULL | Existing: `'video' \| 'story' \| 'game' \| 'creative'` |
| `category` | text | nullable | Existing; soft FK to `categories.name` |
| `min_age` | integer | nullable | Existing; inclusive lower bound of age range |
| `max_age` | integer | nullable | Existing; inclusive upper bound of age range |
| `url` | text | nullable | Existing; video external URL |
| `thumbnail_url` | text | nullable | Existing; cover image URL |
| `created_at` | timestamptz | NOT NULL | Existing; `now()` default |
| **`duration_seconds`** | integer | nullable | **NEW** — video length in seconds |
| **`content_text`** | text | nullable | **NEW** — full story body text |
| **`assets_url`** | text | nullable | **NEW** — drawing template or coloring asset URL |
| **`game_type`** | text | nullable | **NEW** — game variant: `'counting'`, `'matching'`, etc. |
| **`config_json`** | jsonb | nullable | **NEW** — full game logic config (see Game Config section) |

**Age Group Mapping** (existing):
| Text Label | min_age | max_age |
|------------|---------|---------|
| `'2-4'` | 2 | 4 |
| `'5-7'` | 5 | 7 |
| `'8-10'` | 8 | 10 |

Query by age group: `.lte('min_age', childAge).gte('max_age', childAge)` (existing pattern, preserved).

---

### 2. `categories` (new)

Lookup table for named content categories with optional display icons.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NOT NULL PK | `gen_random_uuid()` default |
| `name` | text | NOT NULL UNIQUE | Display name, e.g. `'Math'`, `'Animals'` |
| `icon_url` | text | nullable | URL to category icon image |
| `created_at` | timestamptz | NOT NULL | `now()` default |

**Relationship to `content_items`**: Soft reference only — `content_items.category` is a free-text string that matches `categories.name`. No FK constraint (avoids migration friction with existing rows and the category_preferences system).

---

## TypeScript Interfaces

All added to `services/api/types.ts`:

```typescript
// New columns (all optional — not present on all rows)
export interface VideoItem extends ContentItem {
  type: 'video';
  duration_seconds?: number;
}

export interface StoryItem extends ContentItem {
  type: 'story';
  content_text?: string;
}

export interface ActivityItem extends ContentItem {
  type: 'creative';
  assets_url?: string;
}

export interface GameItem extends ContentItem {
  type: 'game';
  game_type?: string;
  config_json?: GameConfig;
}

export interface Category {
  id: string;
  name: string;
  icon_url?: string;
  created_at: string;
}

export type ContentItemExtended = VideoItem | StoryItem | ActivityItem | GameItem;
```

---

## Game Config JSON Schema (Phase 4 detail, Phase 1 shape)

The `config_json` column stores a jsonb object. The exact schema is defined in ContentPlan.md Phase 4, but the migration adds the column with no JSON schema constraint (flexibility principle).

Example (counting game):
```json
{
  "type": "counting",
  "question": "How many apples?",
  "image_url": "https://storage.supabase.co/.../apples.png",
  "correct_answer": 5,
  "choices": [3, 4, 5, 6]
}
```

Example (matching game):
```json
{
  "type": "matching",
  "pairs": [
    { "item": "cat", "image": "https://storage.supabase.co/.../cat.png" },
    { "item": "dog", "image": "https://storage.supabase.co/.../dog.png" }
  ]
}
```

---

## Storage Buckets

| Bucket Name | Public | Content | Referenced By |
|-------------|--------|---------|---------------|
| `thumbnails` | true | Cover images for videos and stories | `content_items.thumbnail_url` |
| `story-images` | true | Story illustrations | `content_items.assets_url` (for stories) |
| `activity-assets` | true | Drawing templates, coloring pages (PNG/SVG) | `content_items.assets_url` (for activities) |
| `game-assets` | true | Game images (objects, animals, etc.) | `config_json.image_url` (referenced inside game configs) |

**No `videos` bucket** — videos use external URLs (YouTube/Vimeo) stored in `content_items.url`.

---

## RLS Policies (included in migration)

### `content_items`
```sql
-- All authenticated users can read content
CREATE POLICY "authenticated_read_content_items"
  ON content_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role bypass for seed scripts — named service_write_* per constitution §Data
CREATE POLICY "service_write_content_items"
  ON content_items FOR ALL
  USING (auth.role() = 'service_role');
```

### `categories`
```sql
CREATE POLICY "authenticated_read_categories"
  ON categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- Named service_write_* per constitution §Data naming convention
CREATE POLICY "service_write_categories"
  ON categories FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Validation Rules

- `content_items.type` must be one of: `'video'`, `'story'`, `'game'`, `'creative'` (enforced at application layer; DB stores plain text)
- `content_items.min_age` ≤ `content_items.max_age` (enforced at application layer)
- `categories.name` must be unique (enforced by DB UNIQUE constraint)
- `config_json` accepts any valid JSON (no schema constraint in DB — validated by game engine at runtime)
