# Contract: Content Validation & Lifecycle API

**Module**: `services/api/contentValidation.ts`
**Spec**: [spec.md](../spec.md) | **Data Model**: [data-model.md](../data-model.md)

This contract defines the public surface of the validation and lifecycle service. All UI components and scripts consume this API — no component calls Supabase directly for validation or lifecycle operations.

---

## Exported Functions

### `submitForValidation(contentId: string)`

Runs all validation rules against the content item and advances its lifecycle.

- **Pre-condition**: item exists and has `status = 'draft'`
- **Behaviour**:
  1. Load item from `content_items` by `contentId`
  2. Run all applicable rules (synchronously, except URL reachability which is async)
  3. Persist result row to `content_validation_results`
  4. If zero error-severity failures: `UPDATE content_items SET status = 'pending_review'`
  5. If one or more errors: `UPDATE content_items SET status = 'draft'` (stays, not advanced)
- **Concurrent guard**: no concurrent guard needed — only the submitting admin triggers this
- **Returns**: `Promise<{ report: ValidationReport | null; error: string | null }>`

---

### `approveContent(contentId: string)`

Approves a `pending_review` item (first-wins, atomic).

- **Pre-condition**: item exists and has `status = 'pending_review'`
- **Behaviour**:
  1. `UPDATE content_items SET status = 'published' WHERE id = $id AND status = 'pending_review' RETURNING id`
  2. If 0 rows updated → return `error: 'This item has already been reviewed'`
  3. If 1 row updated → INSERT into `content_review_records` with `decision = 'approved'`
- **Returns**: `Promise<{ error: string | null }>`

---

### `rejectContent(contentId: string, reason: string)`

Rejects a `pending_review` item with a written reason (first-wins, atomic).

- **Pre-condition**: item has `status = 'pending_review'`; `reason` must be non-empty
- **Behaviour**:
  1. Validate `reason` is non-empty; return error if not
  2. `UPDATE content_items SET status = 'rejected' WHERE id = $id AND status = 'pending_review' RETURNING id`
  3. If 0 rows updated → return `error: 'This item has already been reviewed'`
  4. If 1 row updated → INSERT into `content_review_records` with `decision = 'rejected'`, `reason`
- **Returns**: `Promise<{ error: string | null }>`

---

### `resubmitContent(contentId: string)`

Re-runs validation on a previously `rejected` item. Preserves all prior runs.

- **Pre-condition**: item has `status = 'rejected'`
- **Behaviour**:
  1. Reset `status` to `'draft'` on the item
  2. Call `submitForValidation(contentId)` — run_number is `MAX(prior run_number) + 1`
- **Returns**: `Promise<{ report: ValidationReport | null; error: string | null }>`

---

### `getValidationHistory(contentId: string)`

Returns all prior validation runs for a content item, ordered newest-first.

- **Returns**: `Promise<{ history: ValidationReport[]; error: string | null }>`

---

### `getReviewQueue()`

Returns all content items with `status = 'pending_review'`, ordered by `created_at ASC` (oldest first).

- **Returns**: `Promise<{ items: ContentItemExtended[]; error: string | null }>`

---

### `getFlaggedItems()`

Returns all content items with `status = 'flagged'` (set by re-validation). Ordered by `created_at ASC`.

- **Returns**: `Promise<{ items: ContentItemExtended[]; error: string | null }>`

---

### `triggerRevalidation()`

Re-runs all hardcoded rules against every `status = 'published'` item. URL reachability is **skipped** (to avoid hitting external services in bulk). Items that now fail one or more error-severity rules have their `status` set to `'flagged'`.

- **Behaviour**:
  1. Load all `published` items (paginated internally, 50 at a time)
  2. For each: run rules (no URL check), persist result, update status to `'flagged'` if any errors
  3. Collect all flagged `content_id` values
- **Returns**: `Promise<{ flaggedIds: string[]; processedCount: number; error: string | null }>`

---

## Return Type: `ValidationReport`

```typescript
interface ValidationReport {
  id: string;
  content_id: string;
  run_number: number;
  triggered_by: 'submission' | 'revalidation';
  passed: boolean;        // true iff zero error-severity failures
  rule_outcomes: ValidationRuleOutcome[];
  created_at: string;
}

interface ValidationRuleOutcome {
  rule_name: string;
  passed: boolean;
  severity: 'error' | 'warning';
  message: string;        // plain-language; empty string when passed = true
}
```

---

## Error Codes (returned in `error` field)

| Scenario | Returned error string |
|----------|-----------------------|
| Item not found | `'Content item not found'` |
| Wrong status for operation | `'Expected status <X>, current status is <Y>'` |
| Already reviewed by another admin | `'This item has already been reviewed'` |
| Rejection reason missing | `'Rejection reason is required'` |
| Concurrent validation in progress | `'Validation already in progress for this item'` |
| Network / Supabase error | `'A network error occurred. Please try again.'` |
| Unauthorized | `'Unauthorized — admin JWT required'` |
