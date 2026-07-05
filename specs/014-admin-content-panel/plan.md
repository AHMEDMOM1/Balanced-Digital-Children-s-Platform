# Implementation Plan: Content Management — Admin Panel

**Branch**: `010-content-seed-initial` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-admin-content-panel/spec.md`

## Summary

Build a custom in-app admin panel within the existing React Native / Expo app that lets admin-role users create, edit, and delete `content_items` and `categories` via a dedicated `(admin)` route group. All writes use the admin user's JWT (no service-role key in the app); spec 012 RLS policies enforce write authorization server-side. The content list is paginated (20 items/page) and supports title search and type filter.

## Technical Context

**Language/Version**: TypeScript 5.x (existing project standard)

**Primary Dependencies**:
- `expo-router` v3 — route groups + navigation (existing)
- `@supabase/supabase-js` — data layer (existing)
- `react-native` + `expo` — UI framework (existing)
- `@expo/vector-icons` — icons (existing, `Ionicons`)
- `zustand` — auth state (existing, `useAuthStore`)
- `react-native-safe-area-context` — layout (existing)

**Storage**: Supabase PostgreSQL — `content_items` table + `categories` table (spec 009 schema, spec 012 RLS admin policies)

**Testing**: Jest + `@testing-library/react-native` (existing); integration tests via `@supabase/supabase-js` service-role client (existing pattern)

**Target Platform**: iOS + Android (React Native); web (Expo Web — same codebase)

**Project Type**: Mobile app (Expo managed workflow)

**Performance Goals**: Admin CRUD operations complete within 5 seconds on standard mobile connection (SC-002); content list of 100+ items findable within 30 seconds (SC-003)

**Constraints**: No service-role key in app; JWT-only writes; offline support is out of scope for admin panel; all writes are immediate (no draft state)

**Scale/Scope**: Single admin user, small catalog (10s–hundreds of items), mobile-first, no web-only dashboard

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First (TDD) | REQUIRED | Integration tests for admin CRUD written BEFORE screen implementation; tests must fail (red) before any screen code runs |
| II. Library-First | PASS | `services/api/admin.ts` is the standalone module for all admin operations; screens only call hooks from this module |
| III. CLI & Script Interface | N/A | No migration scripts — spec 012 migration already applied; no new tables |
| IV. Integration Testing | REQUIRED | New Supabase CRUD contract tests required in `tests/integration/adminCrud.test.ts`; unit tests alone are insufficient |
| V. Observability | REQUIRED | All hooks in `services/api/admin.ts` must emit structured JSON logs (level, hook name, duration_ms, error) |
| VI. No Breaking Changes | PASS | Additive only: new `'admin'` value added to `UserRole` union; `ContentItem` extended types unchanged; no existing hooks modified |
| VII. YAGNI | PASS | No premature abstraction — inline `useState` forms, no form library; no draft/publish workflow; no pagination library |

**All gates pass.** No complexity justification required.

## Project Structure

### Documentation (this feature)

```text
specs/014-admin-content-panel/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── admin-api.md     ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
app/
├── (admin)/
│   ├── _layout.tsx              ← Admin auth guard + Stack navigator
│   ├── index.tsx                ← Content list (paginated, filterable, searchable)
│   ├── content-new.tsx          ← New content item form
│   ├── content-edit/
│   │   └── [id].tsx             ← Edit existing content item
│   └── categories.tsx           ← Category list + create/delete

services/api/
├── admin.ts                     ← Admin CRUD hooks (NEW)
│   ├── useAdminContentList(page, typeFilter, titleSearch)
│   ├── createContentItem(input)
│   ├── updateContentItem(id, updates)
│   ├── deleteContentItem(id)
│   ├── useAdminCategories()
│   ├── createCategory(input)
│   └── deleteCategory(id)
└── types.ts                     ← Add AdminContentInput, AdminCategoryInput, AdminListQuery types
                                    Extend UserRole: 'parent' | 'child' | 'admin' | null

services/auth.ts                 ← Add admin role detection from app_metadata

tests/integration/
└── adminCrud.test.ts            ← Admin CRUD integration tests (TDD — written first)

tests/unit/admin/
└── adminHooks.test.ts           ← Unit tests for admin API hooks
```

**Structure Decision**: Single Expo app — no separate backend/frontend split. Admin panel is a new route group `(admin)` alongside existing `(child)` and `(parent)`. The API layer follows the existing `services/api/*.ts` hook pattern exactly.

## Phases

### Phase 0: Research (COMPLETE → see research.md)

All unknowns resolved. No NEEDS CLARIFICATION items remain in the spec.

### Phase 1: Design & Contracts (COMPLETE → see data-model.md, contracts/, quickstart.md)

Entities: `content_items`, `categories` (no new tables). TypeScript types extended additively. Supabase pagination via `range(from, to)`. Title search via `.ilike('title', '%query%')`.

### Phase 2: Implementation (tasks.md — generated by /speckit-tasks)

Implementation phases (in priority order):
1. **Setup**: TypeScript types, admin.ts skeleton, package.json script additions
2. **TDD Gate**: Write integration tests first (red state before screens exist)
3. **US1 (P1)**: Admin can add new content — `content-new.tsx` form + `createContentItem` hook
4. **US2 (P2)**: Admin can edit content — `content-edit/[id].tsx` + `updateContentItem` hook
5. **US3 (P2)**: Admin can delete content — delete button with confirmation on list/edit screen
6. **US4 (P3)**: Admin can manage categories — `categories.tsx` + `createCategory`/`deleteCategory` hooks
7. **Cross-cutting**: Admin list screen with pagination, filter, search + `(admin)/_layout.tsx` auth guard
8. **Polish**: TypeScript, lint, full test suite regression

## Complexity Tracking

No constitution violations. No complexity justification required.
