# Feature Specification: Content Management — Admin Panel

**Feature Branch**: `014-admin-content-panel`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Phase 6 from ContentPlan.md — Content Management (Admin Panel). Make it easy to add new content without writing SQL every time."

## Clarifications

### Session 2026-06-11

- Q: Which option from ContentPlan.md Phase 6 are we building? → A: Option B — Simple custom admin page within the existing app (accessible only to admin-role users). The Supabase Dashboard is already usable as a fallback; a custom panel enables non-technical operators to manage content without database access.
- Q: Which app route/section hosts the admin panel? → A: A dedicated `(admin)` route group within the existing Expo Router app, protected by the admin JWT check already established in spec 012. Admin users reach it by logging in with admin credentials.
- Q: Which tables are in scope for CRUD? → A: `content_items` (all types: video, story, creative, game) and `categories`. No other tables.
- Q: Should content items have a draft/published state or be immediately visible? → A: Immediate publish — all saved content is instantly visible to authenticated users. No draft state in this spec; draft workflow is deferred to a future enhancement.
- Q: How should the content list handle 100+ items? → A: Paginated list, 20 items per page, with prev/next navigation. Filter by type and title search apply server-side per page.
- Q: Should a title search box be added to the content list (SC-003 requires finding by title)? → A: Yes — a title search input is added to FR-003. Without it, SC-003 is untestable.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Can Add New Content (Priority: P1)

A content administrator opens the admin panel, fills in a form for a new content item (choosing type — video, story, creative, or game — and filling the relevant fields), and submits it. The new item appears immediately in the content list and becomes visible to authenticated children and parents in the main app.

**Why this priority**: This is the core value of the feature. Without it, every content addition requires raw SQL or Supabase Dashboard access. Even a single working form for one content type delivers meaningful value.

**Independent Test**: Log in as an admin user, navigate to the admin panel, create one new content item of each type, and confirm each appears in the main content feed without any direct database access.

**Acceptance Scenarios**:

1. **Given** an admin is on the New Content form, **When** they fill all required fields and submit, **Then** the item is saved and appears in the content list within the admin panel.
2. **Given** an admin submits a form with missing required fields, **When** validation runs, **Then** clear inline error messages appear for each missing field and the item is not saved.
3. **Given** an admin selects type "game", **When** the form renders, **Then** a JSON config editor field appears; for "video", a URL field and duration field appear; for "story", a text area appears; for "creative", an assets URL field appears.
4. **Given** an admin is not authenticated or lacks admin role, **When** they attempt to access the admin panel, **Then** they are redirected to the login screen.

---

### User Story 2 - Admin Can Edit Existing Content (Priority: P2)

A content administrator views the list of existing content items, selects one to edit, modifies the fields, and saves. The updated content is immediately reflected for app users.

**Why this priority**: Content needs regular correction — fixing typos, updating URLs, adjusting age ranges. Without edit capability, every correction requires database access.

**Independent Test**: Select an existing content item, change its title and age range, save, and confirm the updated values appear in the admin list and in the child-facing content feed.

**Acceptance Scenarios**:

1. **Given** an admin opens an existing content item for editing, **When** they change a field and save, **Then** the updated value appears in the list immediately.
2. **Given** an admin clears a required field before saving, **When** validation runs, **Then** an error is shown and the save is blocked.
3. **Given** an admin opens an existing game item, **When** they edit the config JSON with invalid JSON syntax, **Then** a validation error is shown and the save is blocked.

---

### User Story 3 - Admin Can Delete Content (Priority: P2)

A content administrator removes an outdated or incorrect content item from the platform. The item is gone from both the admin list and the child-facing content feed.

**Why this priority**: Outdated or incorrect content (broken video URLs, superseded stories) must be removable without database access.

**Independent Test**: Select a test content item, confirm deletion, and verify it no longer appears in the admin list or the main app content feed.

**Acceptance Scenarios**:

1. **Given** an admin selects a content item and confirms deletion, **When** the delete is submitted, **Then** the item is removed from the list and the database.
2. **Given** an admin initiates deletion, **When** the confirmation dialog appears, **Then** cancelling the dialog leaves the item untouched.

---

### User Story 4 - Admin Can Manage Categories (Priority: P3)

A content administrator views, creates, and deletes categories. New categories appear in the category selector when creating content items.

**Why this priority**: Categories are the taxonomy layer — they must be manageable without SQL. Lower priority because a starter set of categories is already seeded.

**Independent Test**: Create a new category, confirm it appears in the category list and in the category picker on the content creation form.

**Acceptance Scenarios**:

1. **Given** an admin creates a new category with a name and optional icon URL, **When** saved, **Then** it appears in the categories list and in the content form's category selector.
2. **Given** an admin deletes a category, **When** confirmed, **Then** it is removed from the categories list (existing content items retaining that category value are unaffected).

---

### Edge Cases

- What if the admin's JWT expires while they are editing a form? The save attempt returns an auth error; the admin is prompted to re-authenticate without losing form data.
- What if a content item's `type` is changed during edit (e.g., video → story)? The type field is read-only in edit mode — only creation sets the type, preventing data integrity issues.
- What if the game `config_json` field is left blank? The save is allowed with `{}` as the default config (valid for game types that do not require configuration yet).
- What if a category is in use by content items and an admin tries to delete it? The deletion proceeds (the `category` column on content items is a plain text field, not a foreign key), and a warning is shown noting that existing items retain the category value.
- What if the admin panel is accessed on a device where the JWT has `role='admin'` in app_metadata but no admin screen exists yet? The app navigates to the admin home screen; if the Expo Router cannot resolve a route within the `(admin)` group (e.g., during partial implementation), a fallback "Under Construction" screen is shown rather than a crash. This fallback MUST NOT appear once all admin screens are fully implemented and deployed.
- What if an admin navigates away from a form with unsaved changes? The unsaved data is silently discarded — no confirmation dialog is shown. Admins are expected to submit or cancel explicitly before navigating away.
- What if there are zero categories in the `categories` table when an admin opens the New Content form? The category picker displays a disabled placeholder ("No categories available") rather than an empty or broken selector. The admin must create at least one category before they can create content.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin panel MUST be accessible only to authenticated users whose JWT contains `role = 'admin'` in app metadata. Any non-admin or unauthenticated access attempt MUST redirect to the login screen.
- **FR-002**: The admin panel MUST display content items from the `content_items` table in a paginated list (20 items per page, with prev/next navigation), showing at minimum: title, type, category, age range, and created date.
- **FR-003**: The content list MUST be filterable by type (video, story, creative, game), searchable by title (case-insensitive partial/contains match), and sortable by created date (newest first by default). Filters, search, and sort apply server-side per page.
- **FR-004**: The admin panel MUST provide a "New Content" form that accepts:
  - **Base required fields** (all types): title, type (selector — locks remaining fields on selection), category (selector populated from the live `categories` table), min_age, max_age, thumbnail_url.
  - **Type-specific fields shown after type is selected**:
    - video: url (required), duration_seconds (optional)
    - story: content_text (optional multiline text)
    - creative: assets_url (optional)
    - game: game_type (optional), config_json (optional raw JSON text; if left blank, saved as `{}`).
- **FR-005**: The "New Content" form MUST validate required fields before submission and display inline error messages next to each failing field. Required fields and rules: title (non-empty), type (must be one of video/story/creative/game), category (non-empty), min_age (integer 0–17), max_age (integer 1–18, must be ≥ min_age), thumbnail_url (non-empty), url (non-empty when type is video), config_json (must be valid JSON if non-blank, for game type). No save occurs while any validation error is present. The submit button MUST be disabled and display a loading indicator for the duration of an in-flight save request, preventing duplicate submissions.
- **FR-006**: The admin panel MUST allow editing any existing content item's fields (except `type`, which is read-only after creation, and `id`/`created_at` which are system-managed).
- **FR-007**: The admin panel MUST allow deleting any content item, with a confirmation prompt before the delete is executed.
- **FR-008**: The admin panel MUST display a list of all categories and allow creating new categories (name + optional icon_url) and deleting existing ones.
- **FR-009**: All admin write operations (create, update, delete) MUST use the authenticated admin user's JWT — service role credentials MUST NOT be embedded in the app. Compliance is verifiable by confirming that no reference to the Supabase service-role key (e.g., `SUPABASE_SERVICE_ROLE_KEY` or equivalent) appears in any source file under `app/` or `services/`.
- **FR-010**: All admin write operations MUST handle network or auth errors by displaying a user-facing error message (identifying whether the failure was an authentication error or a network error) without crashing or silently discarding the admin's input. The failed operation's form data MUST remain accessible so the admin can retry.
- **FR-011**: The admin panel MUST be reachable via a dedicated navigation route that appears only when the authenticated user's role is `admin`.

### Key Entities

- **Content Item** (existing `content_items` table): The core unit of platform content. Fields: id, title, type (video/story/creative/game), category, min_age, max_age, thumbnail_url, url (video — required), duration_seconds (video — optional), content_text (story — optional), assets_url (creative — optional), game_type (game — optional), config_json (game — optional, defaults to `{}`), created_at.
- **Category** (existing `categories` table): A named grouping for content items. Fields: id, name, icon_url, created_at.
- **Admin User**: An authenticated platform user whose JWT `app_metadata` contains `role = 'admin'`. Exists in Supabase Auth; no separate admin entity in the database.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin user can create a new content item of any type (video, story, creative, game) in under 3 minutes with no database access.
- **SC-002**: All admin create/edit/delete operations complete within 5 seconds on a standard mobile connection.
- **SC-003**: An admin user can locate a specific content item by title keyword or type within 30 seconds on a list of 100+ items (via title search, type filter, or sort, with 20-item pagination).
- **SC-004**: 100% of admin write operations use the admin user's JWT — no service-role credentials exposed in client code.
- **SC-005**: All form validation errors are displayed inline (next to the relevant field) with actionable messages — 0% of invalid submissions silently fail.
- **SC-006**: The admin panel is unreachable by non-admin users — 0% of unauthenticated or non-admin requests reach admin screens.

---

## Assumptions

- The admin panel is built as a screen/route group within the existing React Native / Expo app, reusing the existing authentication flow (Supabase Auth JWT).
- Spec 012's RLS policies are already applied — admin write operations succeed when the admin JWT is present; no additional database setup is required. If spec 012 has not been applied, all admin write operations will be rejected by the database with a permission-denied error (RLS will block them).
- At least one admin user account exists (created manually via Supabase Dashboard as documented in spec 012's quickstart.md) before the admin panel is used. Admin user management (creating admin accounts) is out of scope.
- The content types are fixed at four: video, story, creative, game. No dynamic type registration is needed.
- The config_json field for games is edited as raw JSON text (no visual form builder for game logic). A future spec may add a visual game config editor.
- Image/media file upload (to Supabase Storage) is out of scope — admins provide direct URLs (e.g., external hosting or pre-uploaded Supabase Storage URLs). Spec 013 (if applicable) may cover file uploads.
- The admin panel does not require offline support — all operations require a live network connection.
- The admin panel is mobile-first (React Native screens) and does not need a separate web-only dashboard.
- Existing seeded content (from spec 010) must remain intact — the admin panel adds to and manages it, not replaces it.
- All saved content items are immediately visible to authenticated users — there is no draft or published status. Content becomes live the moment it is created or updated. Draft workflow is deferred to a future spec.
- Duplicate content item titles are permitted — there is no unique constraint on the `title` column. The admin panel does not validate or warn on duplicate titles.
- Accessibility requirements (screen reader labels, keyboard navigation, color contrast) are out of scope for this spec. The admin panel is intended for use by a small number of technical operators; accessibility may be addressed in a future enhancement.
