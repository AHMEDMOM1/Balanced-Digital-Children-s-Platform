# Data Model: Content Validation & Quality (spec 015)

**Date**: 2026-06-11 | **Plan**: [plan.md](plan.md)

---

## Schema Changes

### 1. `content_items` — modified

Add a `status` column to track lifecycle state. Existing rows are grandfathered as `'published'`.

```sql
-- Step 1: add column; existing rows get 'published' (grandfathered)
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- Step 2: add valid-values constraint
ALTER TABLE content_items
  ADD CONSTRAINT content_items_status_check
  CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'flagged'));

-- Step 3: change INSERT default so new items start as draft
ALTER TABLE content_items ALTER COLUMN status SET DEFAULT 'draft';

-- Step 4: index for queue queries (review queue, re-validation scan)
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
```

**Lifecycle transitions** (enforced at application layer):

```
draft ──► pending_review ──► published
                        └──► rejected ──► (edit + resubmit) ──► pending_review
published ──► flagged (re-validation only; does not auto-unpublish)
```

---

### 2. `content_validation_results` — new

Immutable audit trail. One row per validation run. Never updated or deleted.

```sql
CREATE TABLE IF NOT EXISTS content_validation_results (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    UUID        NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  run_number    INT         NOT NULL DEFAULT 1,
  triggered_by  TEXT        NOT NULL CHECK (triggered_by IN ('submission', 'revalidation')),
  passed        BOOLEAN     NOT NULL,
  rule_outcomes JSONB       NOT NULL DEFAULT '[]',
  -- rule_outcomes shape: Array<{
  --   rule_name: string,
  --   passed: boolean,
  --   severity: 'error' | 'warning',
  --   message: string
  -- }>
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cvr_content_id    ON content_validation_results(content_id);
CREATE INDEX IF NOT EXISTS idx_cvr_created_at    ON content_validation_results(content_id, created_at DESC);
```

**run_number** is set by the application: `MAX(run_number) + 1` for the same `content_id`, defaulting to 1 for first run.

---

### 3. `content_review_records` — new

One row per admin decision (approve or reject). Multiple rows per content item are possible (reject → resubmit → approve).

```sql
CREATE TABLE IF NOT EXISTS content_review_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id  UUID        NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  admin_id    UUID        NOT NULL,
  decision    TEXT        NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason      TEXT,       -- required when decision = 'rejected'; enforced at application layer
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crr_content_id ON content_review_records(content_id);
```

---

## Row-Level Security

### Updated policies on `content_items`

```sql
-- Drop the old broad read policy (all authenticated = all rows)
DROP POLICY IF EXISTS "authenticated_read_content_items" ON content_items;

-- Non-admin authenticated users (parents, children) see only published items
CREATE POLICY "authenticated_read_published_content_items"
  ON content_items
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'admin'
    AND status = 'published'
  );

-- Admins see all statuses (draft, pending_review, published, rejected, flagged)
CREATE POLICY "admin_read_all_content_items"
  ON content_items
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

### New policies on `content_validation_results`

```sql
ALTER TABLE content_validation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_content_validation_results"
  ON content_validation_results FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "service_write_content_validation_results"
  ON content_validation_results FOR ALL
  USING (auth.role() = 'service_role');
```

### New policies on `content_review_records`

```sql
ALTER TABLE content_review_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_content_review_records"
  ON content_review_records FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_write_content_review_records"
  ON content_review_records FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "service_write_content_review_records"
  ON content_review_records FOR ALL
  USING (auth.role() = 'service_role');
```

---

## TypeScript Types (additions to `services/api/types.ts`)

```typescript
export type ContentStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'flagged';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationRuleOutcome {
  rule_name: string;
  passed: boolean;
  severity: ValidationSeverity;
  message: string;  // always present for failures; empty string for passes
}

export interface ValidationReport {
  id: string;
  content_id: string;
  run_number: number;
  triggered_by: 'submission' | 'revalidation';
  passed: boolean;  // true iff zero error-severity failures
  rule_outcomes: ValidationRuleOutcome[];
  created_at: string;  // ISO 8601
}

export interface ReviewRecord {
  id: string;
  content_id: string;
  admin_id: string;
  decision: 'approved' | 'rejected';
  reason: string | null;
  created_at: string;  // ISO 8601
}
```

Also extend `ContentItem` to include the new field:

```typescript
// Add to existing ContentItem interface:
status?: ContentStatus;  // present after spec-015 migration
```

---

## Validation Rules (hardcoded in `services/api/contentValidationRules.ts`)

| Rule Name | Severity | Applies To | What It Checks |
|-----------|----------|------------|----------------|
| `required_title` | Error | All | `title` non-empty |
| `required_type` | Error | All | `type` in valid set |
| `required_thumbnail` | Error | All | `thumbnail_url` non-empty |
| `required_category` | Error | All | `category` non-empty |
| `valid_age_range` | Error | All | `(min_age, max_age)` is one of `(2,4)`, `(5,7)`, `(8,10)` |
| `video_url_required` | Error | video | `url` non-empty when `type = 'video'` |
| `video_url_format` | Error | video | `url` matches `https?://` pattern |
| `asset_format` | Error | creative | `assets_url` ends with `.svg` or `.png` (case-insensitive) |
| `game_config_schema` | Error | game | `config_json` matches expected schema for `game_type` |
| `url_reachability` | Warning | video | HTTP HEAD to `url` resolves within 3 s (advisory) |

Each rule function signature: `(item: Partial<ContentItemExtended>) => ValidationRuleOutcome`

The game config schema validators per `game_type`:

| `game_type` | Required config fields |
|-------------|----------------------|
| `counting` | `question` (string), `image_url` (string), `correct_answer` (number), `choices` (number[]) where `correct_answer ∈ choices` |
| `matching` | `pairs` (Array<`{ item: string, image: string }`>), min 2 pairs |
| _(unknown)_ | Error: "Unknown game_type — no schema available" |
