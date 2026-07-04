# Tasks: Content Management — Admin Panel

**Input**: Design documents from `specs/014-admin-content-panel/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/admin-api.md ✅, quickstart.md ✅

**TDD Note**: Per constitution §I, the integration tests are written BEFORE admin.ts hooks are implemented. A skeleton `admin.ts` (stubs only) is created first so the test file compiles — but stubs return null, so tests FAIL (red). Implementation then makes tests PASS (green).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Wire up TypeScript types, auth detection, and CLI entry point before any implementation begins.

- [x] T001 [P] Add `'admin'` to the `UserRole` union type in `services/api/types.ts` (change `'parent' | 'child' | null` to `'parent' | 'child' | 'admin' | null`)

- [x] T002 [P] Add admin operation types to `services/api/types.ts` after the existing `ApiResponse` type:
  - `AdminContentInput` (all `content_items` fields except id/created_at)
  - `AdminContentUpdate` (same as AdminContentInput minus `type` — immutable after creation)
  - `AdminCategoryInput` (`name: string`, `icon_url?: string`)
  - `AdminListQuery` (`page: number`, `typeFilter?: ContentType`, `titleSearch?: string`)
  - `AdminContentListResponse` (`items: ContentItemExtended[]`, `total: number`, `page: number`, `pageSize: number`)

- [x] T003 [P] Update `services/auth.ts` `buildAuthStateFromSession()`: after reading the `profile`, check `if (session.user.app_metadata?.role === 'admin')` — if true, return `{ isAuthenticated: true, role: 'admin', token, parentData: null, childData: null, children: [] }` (admin users have no profiles row)

- [x] T004 [P] Add `"test:admin-crud": "jest tests/integration/adminCrud.test.ts --no-coverage"` to the `scripts` section of `package.json`

---

## Phase 2: Foundational — TDD Gate

**Purpose**: Write the integration tests and an admin.ts stub BEFORE any real implementation. Tests MUST FAIL after this phase.

**⚠️ CRITICAL**: Do not implement real hook logic in `admin.ts` until T008 confirms tests are FAILING.

- [x] T005 [P] Create `services/api/admin.ts` skeleton — export all hooks/functions with stub bodies that return `{ data: null, error: 'Not implemented' }` so the test file compiles:
  - `export function useAdminContentList(query: AdminListQuery): ...` → stub
  - `export function useAdminContentItem(id: string): ...` → stub returning `{ data: null, error: 'Not implemented', isLoading: false }` (needed by edit screen per constitution §API Hook Pattern)
  - `export async function createContentItem(input: AdminContentInput): Promise<{ data: ContentItemExtended | null; error: string | null }>` → stub returning `{ data: null, error: 'Not implemented' }`
  - `export async function updateContentItem(id: string, updates: AdminContentUpdate): Promise<{ data: ContentItemExtended | null; error: string | null }>` → stub
  - `export async function deleteContentItem(id: string): Promise<{ error: string | null }>` → stub returning `{ error: 'Not implemented' }`
  - `export function useAdminCategories(): ...` → stub
  - `export async function createCategory(input: AdminCategoryInput): Promise<{ data: Category | null; error: string | null }>` → stub
  - `export async function deleteCategory(id: string): Promise<{ error: string | null }>` → stub

- [x] T006 [P] Write `tests/integration/adminCrud.test.ts` using the `HAS_CREDENTIALS`/`maybeDescribe` skip pattern from existing integration tests; import `{ createContentItem, updateContentItem, deleteContentItem, createCategory, deleteCategory }` from `services/api/admin`; include these describe blocks:
  - `describe('Content CRUD (US1–US3)', () => { it('createContentItem inserts a video row', ...) /* insert test video row, expect data.id defined, cleanup via service-role client */; it('updateContentItem updates the title', ...) /* insert row via service-role, call update, expect new title */; it('deleteContentItem removes the row', ...) /* insert row via service-role, call delete, expect 0 rows on lookup */ })`
  - `describe('Category CRUD (US4)', () => { it('createCategory inserts a category', ...) /* call createCategory, expect data.id defined, cleanup */; it('deleteCategory removes the category', ...) /* insert via service-role, call delete, expect 0 rows */ })`
  - `describe('Unauthenticated write regression', () => { it('rejects anon INSERT to content_items', ...) /* use anon client, expect error not null — already covered by spec 012, but regression guard here */ })`
  - `describe('Non-admin authenticated user blocked (SC-006)', () => { it('parent-role user cannot INSERT to content_items', ...) /* sign in as a parent-role test user (SUPABASE_PARENT_TEST_EMAIL / SUPABASE_PARENT_TEST_PASSWORD), attempt INSERT, expect error not null (RLS blocks non-admin writes) */ })`
  - Use `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `process.env`; create service-role client for setup/teardown; create admin client via `createClient(url, anonKey)` then sign in with test admin credentials from `SUPABASE_ADMIN_TEST_EMAIL` / `SUPABASE_ADMIN_TEST_PASSWORD` env vars; create parent client via `createClient(url, anonKey)` then sign in with `SUPABASE_PARENT_TEST_EMAIL` / `SUPABASE_PARENT_TEST_PASSWORD`

- [x] T007 Run `npm run test:admin-crud` — confirm ALL content/category CRUD tests FAIL (`Not implemented` error or stub returns null); the unauthenticated regression test should PASS (spec 012 already enforces this)

**Checkpoint**: TDD gate met — admin CRUD tests fail because hooks are stubs. Implementation can begin.

---

## Phase 3: User Story 1 — Admin Can Add New Content (Priority: P1) 🎯 MVP

**Goal**: Admin can fill a form and create a new content item. The item appears in the paginated content list.

**Independent Test**: Run `npm run test:admin-crud` — the `createContentItem inserts a video row` test passes.

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement `useAdminContentList` in `services/api/admin.ts`: use `getClient()` (inherits session JWT); build query on `content_items`; apply `.eq('type', query.typeFilter)` if set; apply `.ilike('title', '%' + query.titleSearch + '%')` if non-empty; call `.order('created_at', { ascending: false })` then `.range((query.page-1)*20, query.page*20-1)`; use `{ count: 'exact' }` on the select; return `{ data: { items, total, page, pageSize: 20 }, error, isLoading }`; log `{ level: 'info'|'error', hook: 'useAdminContentList', page, total, duration_ms, error }`

- [x] T009 [P] [US1] Implement `createContentItem` in `services/api/admin.ts`: run client-side validation (title non-empty, type valid, category non-empty, min_age integer 0–17, max_age integer 1–18 AND ≥ min_age, thumbnail_url non-empty, url non-empty when type is video, config_json parseable as JSON if game type and non-empty); call `getClient().from('content_items').insert([input]).select().single()`; map PGRST301/42501 to "Unauthorized — admin JWT required"; log `{ level: 'info'|'error', hook: 'createContentItem', type, duration_ms, error }`

- [x] T010 [US1] Create `app/(admin)/_layout.tsx`: use `<Stack>` navigator; read `role` from `useAuthStore`; if `role !== 'admin'` render `<Redirect href="/auth/login" />`; add header with "Admin Panel" title; include hidden Screens for `content-edit/[id]` and `categories`

- [x] T011 [US1] Create `app/(admin)/index.tsx` — Content list screen:
  - Top bar with "Content" heading, "+ New" button (navigates to `/content-new`), "Categories" link button
  - `TextInput` search box (debounced 300ms via `useRef` + `setTimeout`/`clearTimeout`); `Picker`/segmented control for type filter (All / Video / Story / Creative / Game)
  - `FlatList` rendering content items — each row shows: title, type badge, category, age range, created date; tapping a row navigates to `/content-edit/[id]`
  - Prev/Next pagination buttons showing "Page N of M"; disabled when at first/last page
  - Loading indicator while `useAdminContentList` isLoading; error message if error

- [x] T012 [US1] Create `app/(admin)/content-new.tsx` — New content form:
  - `ScrollView` with fields: title (TextInput), type (Picker — locks on selection), category (Picker from `useAdminCategories`), min_age (numeric TextInput), max_age (numeric TextInput), thumbnail_url (TextInput)
  - Conditional type-specific fields shown after type is selected: video → url + duration_seconds; story → content_text (multiline); creative → assets_url; game → game_type + config_json (multiline)
  - "Save" button triggers validation → shows inline error messages next to each failing field → calls `createContentItem` → on success navigates back to `/` (admin index); on error shows top-level error banner
  - Loading state disables Save button during submit

- [x] T013 [US1] Run `npm run test:admin-crud` — confirm `createContentItem inserts a video row` test PASSES

**Checkpoint**: US1 complete — admin can create new content items of any type.

---

## Phase 4: User Story 2 — Admin Can Edit Existing Content (Priority: P2)

**Goal**: Admin taps a content item in the list, edits its fields (type read-only), and saves. Changes are immediately visible.

**Independent Test**: Run `npm run test:admin-crud` — the `updateContentItem updates the title` test passes.

### Implementation for User Story 2

- [x] T014 [P] [US2] Implement `useAdminContentItem` and `updateContentItem` in `services/api/admin.ts`:
  - `useAdminContentItem(id: string)`: call `getClient().from('content_items').select('*').eq('id', id).single()` inside `useEffect`; return `{ data: ContentItemExtended | null, error: string | null, isLoading: boolean, refetch }`; log `{ level: 'info'|'error', hook: 'useAdminContentItem', id, duration_ms, error }`
  - `updateContentItem(id, updates)`: same validation as create (minus type; max_age 1–18 AND ≥ min_age; url required for video); call `getClient().from('content_items').update(updates).eq('id', id).select().single()`; if 0 rows return `{ data: null, error: 'Content item not found' }`; map auth errors; log `{ level: 'info'|'error', hook: 'updateContentItem', id, duration_ms, error }`

- [x] T015 [US2] Create `app/(admin)/content-edit/[id].tsx` — Edit content screen:
  - On mount: call `useAdminContentItem(id)` from `services/api/admin` (do NOT call `getClient()` directly in the screen — constitution §API Hook Pattern); prefill all form fields from returned data
  - Same field layout as content-new.tsx but `type` shown as read-only text (not editable Picker)
  - "Save Changes" button → same validation → calls `updateContentItem` → on success shows "Saved" confirmation then navigates back; on error shows error banner (auth error vs network error distinguished per FR-010)
  - "Delete" button shown at bottom (leads to Phase 5 / T018)

- [x] T016 [US2] Run `npm run test:admin-crud` — confirm `updateContentItem updates the title` test PASSES

**Checkpoint**: US2 complete — admin can edit any content item (except type).

---

## Phase 5: User Story 3 — Admin Can Delete Content (Priority: P2)

**Goal**: Admin initiates delete from edit screen, confirms via dialog, item is removed.

**Independent Test**: Run `npm run test:admin-crud` — the `deleteContentItem removes the row` test passes.

### Implementation for User Story 3

- [x] T017 [P] [US3] Implement `deleteContentItem` in `services/api/admin.ts`: call `getClient().from('content_items').delete().eq('id', id)`; treat 0-rows-affected as success (idempotent); map auth errors; log `{ level: 'info'|'error', hook: 'deleteContentItem', id, duration_ms, error }`

- [x] T018 [US3] Wire up the "Delete" button in `app/(admin)/content-edit/[id].tsx`: on press call `Alert.alert('Delete Content', 'This action cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteContentItem(id).then(() => router.back()) } }])`; if `deleteContentItem` returns an error show an error banner instead of navigating back

- [x] T019 [US3] Run `npm run test:admin-crud` — confirm `deleteContentItem removes the row` test PASSES

**Checkpoint**: US3 complete — admin can delete content with a confirmation prompt.

---

## Phase 6: User Story 4 — Admin Can Manage Categories (Priority: P3)

**Goal**: Admin views all categories, creates new ones, deletes existing ones. New categories appear in the content-new category picker.

**Independent Test**: Run `npm run test:admin-crud` — `createCategory inserts` and `deleteCategory removes` tests pass.

### Implementation for User Story 4

- [x] T020 [P] [US4] Implement `useAdminCategories`, `createCategory`, `deleteCategory` in `services/api/admin.ts`:
  - `useAdminCategories`: `getClient().from('categories').select('id, name, icon_url, created_at').order('name')`; log hook
  - `createCategory(input)`: validate `name` non-empty; `getClient().from('categories').insert([input]).select().single()`; map unique-constraint error to "A category with this name already exists"; log hook
  - `deleteCategory(id)`: `getClient().from('categories').delete().eq('id', id)`; log hook; warn in log about orphaned content items

- [x] T021 [US4] Create `app/(admin)/categories.tsx` — Category management screen:
  - `FlatList` of all categories showing name, icon_url preview, created date
  - Each row has a delete icon; pressing triggers `Alert.alert` confirmation → calls `deleteCategory`; on success refreshes list
  - Bottom "Add Category" form section: name TextInput + optional icon_url TextInput + "Add" button → calls `createCategory` → on success clears form and refreshes list; inline error for duplicate name
  - Loading and error states handled

- [x] T022 [US4] Update `app/(admin)/content-new.tsx` category Picker: replace any hardcoded category list with live data from `useAdminCategories()`; show loading state while categories fetch; show first category as default selection

- [x] T023 [US4] Add Categories navigation: in `app/(admin)/index.tsx` add a "Manage Categories" button in the header or as a row at the bottom of the list that navigates to `/categories`

- [x] T024 [US4] Run `npm run test:admin-crud` — confirm `createCategory inserts` and `deleteCategory removes` tests PASS

**Checkpoint**: US4 complete — admin can create and delete categories.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: TypeScript hygiene, full test suite regression, quality gates per constitution.

- [x] T025 Run `npm run test:admin-crud` — confirm ALL 7 integration tests PASS (createContentItem, updateContentItem, deleteContentItem, createCategory, deleteCategory, unauthenticated rejection, non-admin authenticated blocked)
- [x] T026 [P] Run `npx tsc --noEmit` — confirm 0 TypeScript errors introduced by new files
- [x] T027 [P] Run `npm run lint` — confirm 0 ESLint errors in `app/(admin)/`, `services/api/admin.ts`, `services/auth.ts`, `services/api/types.ts`
- [x] T028 Run `npm run test` — confirm 0 regressions across all existing unit + integration tests
- [x] T029 [P] Add SC-002 timing assertions to `tests/integration/adminCrud.test.ts`: for each CRUD operation test, capture `const start = Date.now()` before the call and assert `Date.now() - start < 5000` after the call completes; this verifies SC-002 ("operations complete within 5 seconds") per constitution §V performance marks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (TDD Gate)**: Depends on Phase 1 (types must exist before tests can reference them)
- **Phase 3 (US1)**: Depends on Phase 2 — TDD gate (T007) must confirm FAIL before implementation
- **Phase 4 (US2)**: Depends on Phase 3 — edit screen builds on the list screen; updateContentItem can begin in parallel
- **Phase 5 (US3)**: Depends on Phase 4 — delete button lives in the edit screen (T015)
- **Phase 6 (US4)**: Depends on Phase 3 — categories screen is independent; category picker in content-new.tsx needs categories first
- **Phase 7 (Polish)**: Depends on Phases 3–6

### Within Phase 1

- T001, T002, T003 are independent — run in parallel (different sections of different files)
- T004 depends on T001+T002 (script references types)

### Within Phase 2

- T005 (skeleton) and T006 (tests) are independent — run in parallel
- T007 depends on T005+T006 (both files must exist before running)

### Within Phase 3

- T008 (useAdminContentList) and T009 (createContentItem) are independent — run in parallel
- T010 (_layout) and T012 (content-new) are independent of each other — run in parallel after T008+T009
- T011 (index screen) depends on T008 (needs hook)
- T013 (test run) depends on T009

### Within Phase 4

- T014 (updateContentItem) is independent of T015 (edit screen) — run in parallel
- T016 (test run) depends on T014

### Within Phase 5

- T017 (deleteContentItem) is independent of T018 (delete button wiring) — run in parallel after T015 exists
- T019 (test run) depends on T017

### Within Phase 6

- T020 (hook implementations) is independent of T021 (categories screen) — run in parallel
- T022 (content-new update) depends on T020 (needs useAdminCategories)
- T021+T022+T023 are independent of each other once T020 is done — run in parallel
- T024 (test run) depends on T020

### Within Phase 7

- T025, T026, T027 are independent — run in parallel
- T028 depends on T025 (full suite must run after admin-crud passes)

---

## Parallel Example: Phase 1 (Setup)

```bash
# Launch in parallel:
Task T001: Add 'admin' to UserRole in services/api/types.ts
Task T002: Add admin types to services/api/types.ts
Task T003: Update services/auth.ts admin role detection

# Then sequentially:
Task T004: Add test:admin-crud to package.json
```

## Parallel Example: Phase 2 (TDD Gate)

```bash
# Launch in parallel:
Task T005: Create services/api/admin.ts skeleton
Task T006: Write tests/integration/adminCrud.test.ts

# Then sequentially:
Task T007: npm run test:admin-crud (confirm FAIL)
```

## Parallel Example: Phase 3 (US1)

```bash
# Launch in parallel:
Task T008: Implement useAdminContentList in services/api/admin.ts
Task T009: Implement createContentItem in services/api/admin.ts
Task T010: Create app/(admin)/_layout.tsx

# Then:
Task T011: Create app/(admin)/index.tsx (needs T008)
Task T012: Create app/(admin)/content-new.tsx (needs T009, T010)

# Then:
Task T013: npm run test:admin-crud (confirm createContentItem passes)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: TDD Gate (T005–T007)
3. Complete Phase 3: US1 implementation (T008–T012)
4. **STOP and VALIDATE**: Run `npm run test:admin-crud` — createContentItem test passes
5. Manually verify: admin user can log in, see content list, create a new item
6. Admin content creation is live — MVP deliverable

### Incremental Delivery

1. Phase 1+2 → Types and TDD gate in place
2. Phase 3 (US1) → Create + list screens (MVP)
3. Phase 4 (US2) → Edit screen
4. Phase 5 (US3) → Delete with confirmation
5. Phase 6 (US4) → Category management
6. Phase 7 → Polish, TypeScript clean, full suite clean

---

## Notes

- [P] tasks touch different files or run independent commands — safe to run in parallel
- T007 (confirm FAIL) is the required TDD gate — do not implement real hook logic before this step
- Admin user must exist in Supabase Auth with `app_metadata: { role: 'admin' }` — see quickstart.md Step 0
- `SUPABASE_ADMIN_TEST_EMAIL` and `SUPABASE_ADMIN_TEST_PASSWORD` must be set in `.env` for integration tests to authenticate as admin
- All admin operations use `getClient()` (anon key) with the authenticated admin session — no service-role key in app code
- The `categories` Picker in content-new.tsx fetches live data — ensure `useAdminCategories` is implemented before T022
