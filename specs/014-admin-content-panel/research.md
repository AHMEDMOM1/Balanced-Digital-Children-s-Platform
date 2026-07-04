# Research: Content Management — Admin Panel

**Phase**: 0 (Pre-Plan Research)
**Date**: 2026-06-11
**Feature**: `specs/014-admin-content-panel/`

---

## Decision 1: Admin Role Detection in the Client

**Decision**: Read `session.user.app_metadata.role` from the Supabase Auth session object after sign-in.

**Rationale**: Spec 012 stores the admin role in `app_metadata` (server-set, not user-settable). The Supabase JS client exposes `session.user.app_metadata` after sign-in. This is the same source that `auth.jwt() ->> 'role'` reads server-side — single source of truth. No separate `profiles` table entry needed for admin users.

**Alternatives considered**:
- Profile table `role` column: Rejected — admin users may not have a `profiles` row; admin is a platform operator, not a child/parent.
- Custom claim via Edge Function: Rejected — `app_metadata` already carries the role; adding another indirection increases complexity for no gain.

**Implementation note**: In `services/auth.ts`, after `getSession()`, check `session.user.app_metadata?.role === 'admin'`. If true, return `AuthState` with `role: 'admin'`. The `UserRole` type in `types.ts` must be extended: `'parent' | 'child' | 'admin' | null`.

---

## Decision 2: Admin Route Protection

**Decision**: Protect the `(admin)` route group via a `_layout.tsx` that reads `useAuthStore` role and redirects non-admin users to `/auth/login` using `expo-router`'s `<Redirect>` component.

**Rationale**: This is identical to how the existing `(parent)` and `(child)` layouts handle role-based routing. The layout runs before any child screen renders, so an admin screen never flashes for non-admin users.

**Alternatives considered**:
- Middleware: Expo Router does not support file-based middleware in managed workflow; layout guard is the canonical approach.
- Deep-link protection only: Insufficient — does not prevent in-app navigation to admin routes.

---

## Decision 3: Pagination Strategy

**Decision**: Supabase `range(from, to)` with offset-based pagination (20 items per page). `from = (page - 1) * 20`, `to = page * 20 - 1`. Include a `count: 'exact'` in the select to get total for page count display.

**Rationale**: Simple, deterministic, easy to test. Offset pagination is appropriate for admin catalogs (small-to-medium size, low write frequency during admin sessions). Cursor pagination is overkill for this scale.

**Alternatives considered**:
- Cursor/keyset pagination: Better for infinite scroll + high-write feeds; unnecessary here.
- Client-side pagination: Rejected — fetches all rows; degrades for 100+ items.

---

## Decision 4: Title Search Implementation

**Decision**: Supabase `.ilike('title', `%${query}%`)` — case-insensitive partial match. Applied server-side alongside the type filter. Debounce search input by 300ms on the client to avoid per-keystroke requests.

**Rationale**: `ilike` is available out of the box on PostgreSQL text columns; no full-text search configuration needed. Case-insensitive partial match is sufficient for admin title lookup (SC-003: find by title keyword). Full-text search (tsvector) would require a migration and is overkill for catalog sizes of 10–hundreds of items.

**Alternatives considered**:
- Full-text search (`to_tsvector` + `@@`): Rejected — requires DB migration; unnecessary for catalog scale.
- Client-side filter: Rejected — only searches the current page, not the full catalog.

---

## Decision 5: Form State Management

**Decision**: `useState` for form fields — no form library (react-hook-form, Formik). One `useState` per field or a single `useReducer` for complex forms (game config). Validation runs on submit (not on change) to avoid excessive re-renders.

**Rationale**: Constitution principle VII (YAGNI). The admin form has at most ~8 fields; a form library adds bundle weight and abstraction for no complexity gain. The existing app uses no form library. Inline validation matches the UX pattern in existing settings screens.

**Alternatives considered**:
- react-hook-form: Better for large/complex forms; overkill here.
- Formik: Larger bundle; same overkill argument.

---

## Decision 6: Type-Specific Form Fields (Content Type Branching)

**Decision**: Single form component with conditional field rendering based on `type` selection. Once `type` is set on a new item, it is locked (read-only on edit). Fields rendered conditionally:
- `video`: `url`, `duration_seconds`
- `story`: `content_text` (multiline TextInput)
- `creative`: `assets_url`
- `game`: `game_type`, `config_json` (raw JSON TextInput)

**Rationale**: Matches spec FR-004 and US1 AS3. Type lock on edit (FR-006) prevents data integrity issues (e.g., a video item losing its `url` if admin accidentally switches type). Raw JSON for `config_json` matches FR-004 and Assumption 6 (no visual game config builder).

---

## Decision 7: Integration Test Strategy (TDD Gate)

**Decision**: Write `tests/integration/adminCrud.test.ts` BEFORE any screen code. Tests create an anonymous admin JWT by authenticating with known admin credentials (or use service-role client to verify state). TDD gate: tests FAIL (screens/hooks don't exist yet) → implement screens/hooks → tests PASS.

**Rationale**: Constitution principle I (TDD mandatory) + principle IV (integration testing required for new Supabase contract). The integration tests exercise the real admin hooks against the live DB. Service-role client is used for pre-condition setup (seed test data) and post-condition verification (check row was inserted/updated/deleted).

**HAS_CREDENTIALS pattern**: Same `maybeDescribe` skip guard as existing integration tests — tests skip if `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set.

---

## Decision 8: No New Database Migration

**Decision**: This feature requires no new SQL migration. The `content_items` and `categories` tables (spec 009) and the admin RLS policies (spec 012) are already in place.

**Rationale**: The entire feature is a UI layer over existing infrastructure. Admin CRUD operations work via the existing `content_items` and `categories` tables with the `admin_write_content_items` and `admin_write_categories` RLS policies from spec 012.
