# Content Population Plan — Children's Digital Platform
> Supabase-backed | Phased Approach

---

## Overview

This plan covers how to add real content (videos, stories, activities, games) to the platform in a structured and scalable way using Supabase.

---

## Phase 1 — Database Schema Design

**Goal:** Define the right tables before adding any content.

### Tables to Create

| Table | Key Columns |
|---|---|
| `videos` | id, title, url, thumbnail_url, category, age_group, duration_seconds |
| `stories` | id, title, content_text, cover_image_url, category, age_group |
| `activities` | id, title, description, type (drawing/coloring/etc), assets_url, age_group |
| `games` | id, title, description, game_type (counting/puzzle/etc), config_json, age_group |
| `categories` | id, name, icon_url |

### Notes
- Use `age_group` on every content table (e.g., `"3-5"`, `"6-8"`)
- Store game logic config in a `jsonb` column — flexible and no extra tables needed
- Use UUIDs for all primary keys

---

## Phase 2 — Storage Setup (Supabase Storage)

**Goal:** Store media files properly before linking them in the database.

### Buckets to Create

| Bucket | What Goes In It |
|---|---|
| `videos` | Video files or keep URLs from YouTube/Vimeo |
| `thumbnails` | Cover images for videos and stories |
| `activity-assets` | Drawing templates, coloring pages (PNG/SVG) |
| `story-images` | Story illustrations |
| `game-assets` | Game images (apples, animals, etc.) |

### Recommendation
- For videos: **do not upload directly to Supabase** — use YouTube or Vimeo and store only the URL. Saves storage costs.
- For images and assets: upload directly to Supabase Storage buckets.

---

## Phase 3 — Seed Initial Content (Small Batch)

**Goal:** Add a small set of real content to test everything works end-to-end.

### Target per Content Type

| Type | Minimum to Start |
|---|---|
| Videos | 3–5 videos |
| Stories | 3–5 stories |
| Activities | 2–3 activities |
| Games | 2 games |

### How to Seed

**Option A — Supabase Dashboard (easiest)**
- Go to Table Editor → insert rows manually

**Option B — SQL Insert**
```sql
INSERT INTO videos (title, url, thumbnail_url, category, age_group, duration_seconds)
VALUES ('Count to 10', 'https://youtube.com/...', 'https://...', 'math', '3-5', 180);
```

**Option C — Script (recommended for bulk)**
```js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

await supabase.from('videos').insert([
  { title: 'Count to 10', url: '...', category: 'math', age_group: '3-5' }
]);
```

---

## Phase 4 — Content Structure for Games

**Goal:** Design games to be data-driven (no hardcoded content).

### Recommended Approach: Config JSON

Instead of hardcoding game logic, store the config in the `config_json` column.

**Example — Counting Game:**
```json
{
  "type": "counting",
  "question": "How many apples?",
  "image_url": "https://...apples.png",
  "correct_answer": 5,
  "choices": [3, 4, 5, 6]
}
```

**Example — Matching Game:**
```json
{
  "type": "matching",
  "pairs": [
    { "item": "cat", "image": "https://...cat.png" },
    { "item": "dog", "image": "https://...dog.png" }
  ]
}
```

This way, adding a new game = inserting a new row. No code changes needed.

---

## Phase 5 — Row Level Security (RLS)

**Goal:** Make sure only the right people can read/write content.

### Basic Rules

| Action | Who Can Do It |
|---|---|
| Read content | Any authenticated user (children/parents) |
| Insert/Update/Delete | Admin only |

### Example Policy
```sql
-- Allow all authenticated users to read videos
CREATE POLICY "Read videos" ON videos
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow only admin to insert
CREATE POLICY "Admin insert" ON videos
FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

---

## Phase 6 — Content Management (Admin Panel)

**Goal:** Make it easy to add new content without writing SQL every time.

### Options (pick one)

| Option | Effort | Best For |
|---|---|---|
| Supabase Dashboard | Zero setup | Small team, occasional updates |
| Simple custom admin page | Medium | Regular content updates |
| Directus / Payload CMS connected to Supabase | Higher setup | Large content volume |

### Recommendation
Start with the **Supabase Dashboard**. Build a custom admin panel only when content updates become frequent.

---

## Phase 7 — Content Validation & Quality

**Goal:** Keep content consistent and safe for children.

### Checklist Before Adding Any Content

- [ ] Video is age-appropriate and tested on slow connections
- [ ] Story text length fits the age group
- [ ] Activity assets are clear SVG/PNG (not blurry)
- [ ] Game config JSON is valid and tested
- [ ] All fields filled (no null titles or missing thumbnails)
- [ ] Age group is correctly assigned

---

## Summary — Phase Order

```
Phase 1 → Schema Design
Phase 2 → Storage Buckets
Phase 3 → Seed Small Batch
Phase 4 → Game Config Structure
Phase 5 → RLS Policies
Phase 6 → Admin Panel
Phase 7 → Quality Checklist
```

Each phase builds on the previous. Do not skip Phase 1 or Phase 5.

---

*Last updated: June 2026*