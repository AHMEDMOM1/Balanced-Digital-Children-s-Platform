# Contract: Admin API — Content & Category CRUD

**Feature**: `specs/014-admin-content-panel/`
**Date**: 2026-06-11
**Layer**: `services/api/admin.ts` hooks

All operations use the authenticated admin user's JWT (anon key + admin session). The RLS policies from spec 012 enforce server-side authorization — no service-role key in the app.

---

## Hook: `useAdminContentList(query: AdminListQuery)`

**Purpose**: Fetch a paginated, filterable, searchable list of content items.

**Returns**: `{ data: AdminContentListResponse | null, error: string | null, isLoading: boolean, refetch: () => Promise<void> }`

**Supabase Query** (executed with admin JWT via `getClient()`):
```
SELECT *, count() OVER ()
FROM content_items
[WHERE type = $typeFilter]          -- only if typeFilter set
[AND title ILIKE '%$titleSearch%']  -- only if titleSearch non-empty
ORDER BY created_at DESC
RANGE (page-1)*20 TO page*20-1
```

**Structured log on success**: `{ level: 'info', hook: 'useAdminContentList', page, total, duration_ms }`
**Structured log on error**: `{ level: 'error', hook: 'useAdminContentList', duration_ms, error }`

---

## Function: `createContentItem(input: AdminContentInput): Promise<{ data: ContentItemExtended | null, error: string | null }>`

**Purpose**: INSERT a new content item using the admin JWT.

**Supabase operation**: `client.from('content_items').insert([input]).select().single()`

**Pre-call validation** (client-side):
- `title` non-empty
- `type` in `['video', 'story', 'creative', 'game']`
- `category` non-empty
- `min_age` integer 0–17
- `max_age` integer 1–18, `>= min_age`
- `thumbnail_url` non-empty
- `config_json`: if `game` type and config string non-empty, must parse as valid JSON

**Success**: returns `{ data: inserted row, error: null }`
**Error** (auth / RLS): returns `{ data: null, error: 'Unauthorized — admin JWT required' }` for PGRST301/42501 codes; generic message for others

**Structured log**: `{ level: 'info'|'error', hook: 'createContentItem', type, duration_ms, error }`

---

## Function: `updateContentItem(id: string, updates: AdminContentUpdate): Promise<{ data: ContentItemExtended | null, error: string | null }>`

**Purpose**: UPDATE an existing content item. `type` is excluded from updates (immutable).

**Supabase operation**: `client.from('content_items').update(updates).eq('id', id).select().single()`

**Pre-call validation**: same as create minus `type`; `id` must be non-empty UUID

**Success**: returns `{ data: updated row, error: null }`
**Error**: RLS rejection returns `{ data: null, error: 'Unauthorized — admin JWT required' }`; not-found (0 rows) returns `{ data: null, error: 'Content item not found' }`

**Structured log**: `{ level: 'info'|'error', hook: 'updateContentItem', id, duration_ms, error }`

---

## Function: `deleteContentItem(id: string): Promise<{ error: string | null }>`

**Purpose**: DELETE a content item by ID.

**Supabase operation**: `client.from('content_items').delete().eq('id', id)`

**Success**: returns `{ error: null }`
**Error**: RLS rejection → `{ error: 'Unauthorized — admin JWT required' }`; not-found → `{ error: null }` (idempotent delete is acceptable)

**Structured log**: `{ level: 'info'|'error', hook: 'deleteContentItem', id, duration_ms, error }`

---

## Hook: `useAdminCategories()`

**Purpose**: Fetch all categories, ordered by name.

**Returns**: `{ data: Category[] | null, error: string | null, isLoading: boolean, refetch: () => Promise<void> }`

**Supabase query**: `client.from('categories').select('id, name, icon_url, created_at').order('name')`

**Structured log**: `{ level: 'info'|'error', hook: 'useAdminCategories', count, duration_ms, error }`

---

## Function: `createCategory(input: AdminCategoryInput): Promise<{ data: Category | null, error: string | null }>`

**Purpose**: INSERT a new category.

**Supabase operation**: `client.from('categories').insert([input]).select().single()`

**Pre-call validation**: `name` non-empty

**Success**: returns `{ data: inserted row, error: null }`
**Error**: duplicate name → Supabase unique violation → `{ data: null, error: 'A category with this name already exists' }`

**Structured log**: `{ level: 'info'|'error', hook: 'createCategory', duration_ms, error }`

---

## Function: `deleteCategory(id: string): Promise<{ error: string | null }>`

**Purpose**: DELETE a category by ID.

**Supabase operation**: `client.from('categories').delete().eq('id', id)`

**Success**: returns `{ error: null }`
**Warning logged**: existing content items retaining the deleted category name are unaffected (no cascade — by design per spec Edge Cases)

**Structured log**: `{ level: 'info'|'error', hook: 'deleteCategory', id, duration_ms, error }`

---

## Integration Test Expectations (TDD Gate)

File: `tests/integration/adminCrud.test.ts`

Tests MUST be written before any screen or hook implementation. Expected states:

| Test | Before Hooks Exist | After Hooks Implemented |
|------|--------------------|------------------------|
| `createContentItem` inserts a row | Import fails (module missing) | Passes — row in DB |
| `updateContentItem` updates title | Same | Passes — DB value changed |
| `deleteContentItem` removes row | Same | Passes — row gone |
| `createCategory` inserts category | Same | Passes — category in DB |
| `deleteCategory` removes category | Same | Passes — category gone |
| Unauthenticated INSERT rejected | N/A (RLS tested in spec 012) | Passes |
