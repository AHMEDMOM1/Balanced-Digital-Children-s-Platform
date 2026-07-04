# Quickstart: Content Management — Admin Panel

**Feature**: `specs/014-admin-content-panel/`
**Date**: 2026-06-11

---

## Prerequisites

1. Spec 009 migration applied — `content_items` and `categories` tables exist with seed data.
2. Spec 012 migration applied — `admin_write_content_items` and `admin_write_categories` RLS policies exist.
3. `.env` file has `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. An admin user exists in Supabase Auth with `app_metadata: { role: 'admin' }` (see Step 0 below).

---

## Step 0: Create Admin User (One-Time Setup)

In Supabase Dashboard → Authentication → Users:
1. Create a new user with an email/password (e.g., `admin@example.com` / `Admin1234!`).
2. In that user's row, click "Edit" → set `app_metadata` to: `{ "role": "admin" }`.
3. Save. The user now has admin JWT role.

Alternatively, via Supabase SQL Editor:
```sql
-- Replace with actual user ID from Auth → Users
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';
```

---

## Step 1: Run Integration Tests (TDD Gate — Expect FAIL before implementation)

```bash
npm run test:admin-crud
```

Before `services/api/admin.ts` and `app/(admin)/` screens exist, this will FAIL with module-not-found errors. This is the expected TDD red state.

---

## Step 2: Verify Admin Role Detection

After implementing `services/auth.ts` admin role check:

```bash
# Start Expo dev server
npx expo start

# On device/simulator: log in with admin@example.com
# Expect: app navigates to (admin)/index screen (content list)
# For non-admin user: navigates to auth/login (redirect)
```

---

## Step 3: Integration Test Scenarios

These scenarios validate the implementation end-to-end using a real Supabase connection:

```bash
npm run test:admin-crud
```

### Scenario A: Create Content Item

**Setup**: Admin client authenticated (service-role for setup; admin JWT for the actual test).
**Action**: Call `createContentItem({ title: '[test] Admin Video', type: 'video', category: 'science', min_age: 5, max_age: 10, thumbnail_url: 'https://example.com/thumb.jpg', url: 'https://example.com/video.mp4', duration_seconds: 120 })`.
**Expect**: `{ data: { id: <uuid>, title: '[test] Admin Video', ... }, error: null }`.
**Cleanup**: Delete the test row via service-role client.

### Scenario B: Update Content Item

**Setup**: Insert a test row via service-role client.
**Action**: Call `updateContentItem(testId, { title: '[test] Admin Video — Updated' })`.
**Expect**: `{ data: { title: '[test] Admin Video — Updated', ... }, error: null }`.
**Verify**: Service-role client confirms updated title in DB.
**Cleanup**: Delete test row.

### Scenario C: Delete Content Item

**Setup**: Insert a test row via service-role client.
**Action**: Call `deleteContentItem(testId)`.
**Expect**: `{ error: null }`.
**Verify**: Service-role client SELECT returns 0 rows for testId.

### Scenario D: Create and Delete Category

**Action**: Call `createCategory({ name: '[test] Admin Category' })`.
**Expect**: `{ data: { id: <uuid>, name: '[test] Admin Category' }, error: null }`.
**Then**: Call `deleteCategory(data.id)`.
**Verify**: Service-role client SELECT returns 0 rows for the category id.

### Scenario E: Unauthenticated Write Rejection

**Action**: Create anon client (no session). Call `anon.from('content_items').insert([{ title: 'Unauthorized', type: 'video' }])`.
**Expect**: `error !== null` (RLS rejection — tested comprehensively in spec 012 integration tests).

---

## Step 4: Manual UI Verification

1. Log in as admin user → confirm navigation to `(admin)/index` content list.
2. Verify paginated list loads (20 items, prev/next controls).
3. Use type filter dropdown → confirm list updates to show only that type.
4. Type a title keyword in search box → confirm list filters by title.
5. Tap "+ New Content" → fill form (video type) → submit → confirm new item appears in list.
6. Edit an existing item → change title → save → confirm updated title in list.
7. Delete an item → confirm dialog appears → cancel → item remains → confirm → item gone.
8. Navigate to Categories → create a new category → confirm it appears in category selector on New Content form.
9. Log in as a non-admin (parent) user → attempt to navigate to `/` of admin routes → confirm redirect to login.

---

## Running the Full Test Suite

```bash
npm run test                    # All unit + integration tests
npm run test:admin-crud         # Admin CRUD integration tests only
npx tsc --noEmit                # TypeScript check
npm run lint                    # ESLint check
```
