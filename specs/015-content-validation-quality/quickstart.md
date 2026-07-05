# Quickstart: Content Validation & Quality (spec 015)

## Prerequisites

- Supabase project credentials in `.env`:
  ```
  EXPO_PUBLIC_SUPABASE_URL=...
  EXPO_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
  SUPABASE_ACCESS_TOKEN=...       # for CLI migration
  SUPABASE_ADMIN_TEST_EMAIL=...   # for integration tests
  SUPABASE_ADMIN_TEST_PASSWORD=...
  ```

---

## Step 1 — Apply the migration

```bash
npm run migrate:validation-lifecycle
```

This runs `scripts/apply-validation-lifecycle.ts` which:
1. Checks if `status` column already exists on `content_items`
2. If not: applies `supabase/migrations/20260612000000_content_lifecycle.sql`
3. Falls back to printing SQL to stdout if Supabase CLI is unavailable

Manual alternative — paste `supabase/migrations/20260612000000_content_lifecycle.sql` into the Supabase Dashboard → SQL Editor → Run.

**What the migration does:**
- Adds `status TEXT DEFAULT 'published'` to `content_items` (all existing rows become `'published'`)
- Adds CHECK constraint and index on `status`
- Changes column default to `'draft'` for future INSERTs
- Creates `content_validation_results` table + RLS
- Creates `content_review_records` table + RLS
- Replaces `authenticated_read_content_items` policy with status-filtered version

---

## Step 2 — Verify migration

```bash
npm run test:content-validation
```

Expected output when `HAS_CREDENTIALS=true`: all tests PASS.
Expected output when credentials absent: all tests SKIPPED.

---

## Step 3 — Run the full test suite

```bash
npm run test
```

Confirm 0 regressions. The `content_items` read policy change may affect tests that previously expected all-status rows from authenticated reads — those tests are updated as part of this spec.

---

## Step 4 — TypeScript check

```bash
npx tsc --noEmit
```

Expected: 0 errors.

---

## Using the validation service

```typescript
import { submitForValidation, approveContent, rejectContent } from '../services/api/contentValidation';

// Submit a draft for validation
const { report, error } = await submitForValidation(contentId);
if (error) { /* show error */ }
if (!report?.passed) {
  const errors = report?.rule_outcomes.filter(r => !r.passed && r.severity === 'error');
  // show errors to admin
}

// Approve a pending_review item
const { error: approveErr } = await approveContent(contentId);
if (approveErr === 'This item has already been reviewed') {
  // refresh the queue — another admin acted first
}

// Reject with reason
const { error: rejectErr } = await rejectContent(contentId, 'Image resolution too low — please replace thumbnail');
```

---

## Verifying the RLS policy change

After migration, confirm that non-admin authenticated users can no longer see `draft` or `pending_review` items:

```sql
-- In Supabase Dashboard → SQL Editor (as anon/authenticated, not service role):
SELECT id, title, status FROM content_items WHERE status != 'published';
-- Expected: 0 rows
```

As an admin user (JWT with `app_metadata.role = 'admin'`):
```sql
SELECT id, title, status FROM content_items;
-- Expected: all rows regardless of status
```
