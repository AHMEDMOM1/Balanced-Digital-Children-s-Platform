# Research: Content Schema & Storage Setup

**Feature**: `009-content-schema-storage`
**Date**: 2026-06-10 (updated post-clarify 2026-06-10)

---

## Decision 1 — Single Table vs Per-Type Tables

### Decision
Augment the **existing `content_items` table** by adding nullable columns for type-specific fields. Do **not** create separate `videos`, `stories`, `activities`, `games` tables as ContentPlan.md Phase 1 initially suggested.

### Rationale
The codebase already has a working `content_items` single-table architecture:
- `services/api/videos.ts`, `stories.ts`, `games.ts`, `creative.ts` all query `client.from('content_items')` filtered by the `type` column
- `services/api/contentHelpers.ts` has `buildContentQuery(from, type, ageRange, ...)` — all hooks share this helper
- `services/api/types.ts` defines `ContentItem` with `type: ContentType` discriminator
- Breaking this into separate tables requires rewriting every API hook (violates YAGNI/Simplicity principle, Constitution §VII)

New columns added to `content_items` (all nullable so existing rows are unaffected):
- `config_json` (jsonb) — game logic config (games only)
- `game_type` (text) — game variant identifier, e.g. `'counting'`, `'matching'` (games only)
- `content_text` (text) — full story body text (stories only)
- `assets_url` (text) — URL to drawing template or coloring asset (activities/creative only)
- `duration_seconds` (integer) — video length in seconds (videos only)

### Alternatives Considered
- **Separate tables per type**: Rejected. Breaks all existing API hooks, requires full rewrite of `useVideos`, `useStories`, `useGames`, `useCreative`. No benefit for the current scale.
- **JSON column for all extras**: Rejected. Already have `config_json` for games. Adding a generic `extras` blob would hide filterable data (e.g., `duration_seconds` for video filtering).

---

## Decision 2 — Categories Table (New)

### Decision
Create a **new `categories` lookup table** with `id` (UUID), `name` (text, unique), `icon_url` (text, nullable), `created_at` (timestamptz).

### Rationale
The existing `content_items.category` column already stores category name strings. A separate `categories` table provides:
- Canonical list for the admin UI / control panel dropdowns
- Icon URLs for display in the categories grid
- Named foreign key if stricter referential integrity is ever needed

The new table does **not** add a FK constraint on `content_items.category` — this keeps existing inserts simple and avoids breaking the current opt-out `category_preferences` system.

### Alternatives Considered
- **Enum column**: Rejected. Hard to extend without migrations; no icon storage.
- **No categories table**: Rejected. Leaves icon_urls with no home; makes category management harder.

---

## Decision 3 — UUID Strategy

### Decision
Use PostgreSQL built-in `gen_random_uuid()` as the default for all UUID primary keys.

### Rationale
`gen_random_uuid()` is built into PostgreSQL 13+ (which Supabase uses). No extension needed (`uuid-ossp` extension required by the older `uuid_generate_v4()`). Supabase already uses this as its standard default.

### Alternatives Considered
- `uuid_generate_v4()`: Requires `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` — unnecessary overhead.
- Application-side UUID: Rejected. Server-side generation is simpler and consistent.

---

## Decision 4 — Age Group Storage Alignment

### Decision
Store age group in `content_items` using the existing integer-pair columns (`min_age`, `max_age`) — NOT a text `age_group` column.

### Rationale
The existing `ContentItem` type already uses `min_age: number` and `max_age: number`. The `buildContentQuery` helper already filters with `.lte('min_age', ...).gte('max_age', ...)`. The `AGE_GROUP_RANGES` constant maps text groups (`'2-4'`, `'5-7'`, `'8-10'`) to numeric pairs. Using integer columns preserves this working system. The ContentPlan.md examples used `"3-5"` and `"6-8"` — these were illustrative; the platform's actual age ranges are `2-4`, `5-7`, `8-10`.

---

## Decision 5 — RLS Strategy (Constitution-Required)

### Decision
Enable RLS on both `content_items` and `categories` immediately in the migration. Add one permissive **SELECT** policy for authenticated users. Defer INSERT/UPDATE/DELETE admin policies to Phase 5, but add a **service_role bypass** so seeding scripts can insert content.

### Rationale
Constitution §Data — RLS is mandatory: "Every new table MUST enable RLS in its creation migration." The spec said RLS policies are Phase 5, but the constitution overrides. Minimum viable RLS:
1. `ALTER TABLE content_items ENABLE ROW LEVEL SECURITY`
2. `ALTER TABLE categories ENABLE ROW LEVEL SECURITY`
3. Policy: `SELECT` allowed for all `auth.role() = 'authenticated'`
4. Service role bypass for seed scripts: `auth.role() = 'service_role'` gets full access

### Alternatives Considered
- **No RLS on content tables**: Rejected — direct constitution violation.
- **Full admin write policies now**: Deferred — admin role system is Phase 5 scope; adding it prematurely creates dependency.

---

## Decision 6 — Storage Bucket Creation Method

### Decision
Create storage buckets via **Supabase Dashboard** (manual) and document in `quickstart.md`. Do not attempt to create buckets inside SQL migrations (storage schema is internal to Supabase).

### Rationale
Supabase storage buckets cannot be reliably created via SQL migration files. The recommended approaches are:
1. Dashboard: Settings → Storage → New Bucket (zero code, immediate)
2. `supabase-js` admin client: `supabase.storage.createBucket(name, { public: false })`
3. Supabase CLI: `supabase storage create-bucket`

Since the project does not have a Supabase CLI setup (`supabase/` folder has only `functions/`), the dashboard approach is documented. An optional seed script step using `supabase-js` is also provided.

### Buckets to create
| Bucket | Public | Purpose |
|--------|--------|---------|
| `thumbnails` | true | Cover images for videos and stories |
| `story-images` | true | Story illustrations |
| `activity-assets` | true | Drawing templates, coloring pages (PNG/SVG) |
| `game-assets` | true | Game images (animals, counting objects, etc.) |

Videos use external URLs (YouTube/Vimeo) — no `videos` bucket needed.

---

## Decision 7 — TypeScript Type Extensions

### Decision
Extend `services/api/types.ts` to add new interfaces: `VideoItem`, `StoryItem`, `ActivityItem`, `GameItem`, `Category` — all extending the base `ContentItem`. Keep `ContentItem` as the shared base. Add a `ContentItemExtended` union type for screens that need type-specific fields.

### Rationale
The existing `ContentItem` interface is used everywhere. Adding new per-type interfaces via extension keeps backward compatibility. Screens that only need title/thumbnail/category use `ContentItem` as before.

---

## Decision 8 — Migration File Location

### Decision
Place SQL migration as `supabase/migrations/<timestamp>_content_schema_v1.sql`. Create the `supabase/migrations/` directory if it doesn't exist.

### Rationale
Standard Supabase migration convention. Aligns with Constitution §VI (schema changes as migration scripts). The `supabase/` directory already exists (contains `functions/`).
