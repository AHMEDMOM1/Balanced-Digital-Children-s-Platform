# Seed Requirements Checklist: Initial Content Seed

**Purpose**: Validate completeness, clarity, and consistency of seed data requirements and operational behavior requirements (idempotency, error handling, CLI output). Unit tests for the requirements writing — not the implementation.
**Created**: 2026-06-10
**Feature**: [spec.md](../spec.md)
**Scope**: Data field requirements (FR-001–FR-010) + operational behavior (FR-008, FR-011–FR-013) at standard PR-review depth.

---

## Requirement Completeness — Data Fields

- [x] CHK001 Are all fields required for each content type documented exhaustively, including whether `is_active` must be explicitly set or may rely on the database default value? [Completeness, Gap, Spec §FR-001–§FR-004]
  <!-- data-model.md: "is_active boolean DEFAULT true — All seed items set active." Relying on DB default is the documented approach. -->
- [x] CHK002 Is the minimum content count per type (≥3 videos, ≥3 stories, ≥2 activities, ≥2 games) consistent with SC-001's "at least 10 items" total, with no arithmetic gap? [Completeness, Spec §FR-001–§FR-004, §SC-001]
  <!-- 3+3+2+2=10. Math is consistent. -->
- [x] CHK003 Are idempotency requirements for `categories` rows (idempotency key = `name`) explicitly documented alongside idempotency for `content_items` (key = `title+type`), or only implied by the general "never overwrite" clarification? [Gap, Spec §FR-008]
  <!-- data-model.md §categories: "Idempotency key: name — seed script checks SELECT id FROM categories WHERE name = $1 before inserting." -->
- [x] CHK004 Is a requirement defined for script behavior when environment credentials (`SUPABASE_SERVICE_ROLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`) are absent or invalid at startup? [Gap]
  <!-- plan.md Phase 2: "loadEnv() → validate credentials → create Supabase client". Convention from apply-migration.ts: exit early with non-zero if URL/key empty. -->
- [x] CHK005 Is `content_text` minimum length or structure defined for story seed data (e.g., non-empty, minimum paragraph count), or does "valid" remain undefined in the requirements? [Clarity, Spec §FR-002]
  <!-- data-model.md SeedStory: "content_text: string — full story body text (2–4 paragraphs)". plan.md seed table: "content_text (3 para)" per story. -->

---

## Requirement Clarity — Data Schema & Formats

- [x] CHK006 Is the `category` field value format defined (lowercase, exact-match, case-insensitive) to prevent silent filter mismatch with `categories.name` values? [Clarity, Spec §FR-001–§FR-004]
  <!-- research.md Decision 5 and plan.md seed table consistently use lowercase: math, animals, nature. Category names match exactly in both tables. -->
- [x] CHK007 Is the unit for `duration_seconds` explicitly stated as seconds (not milliseconds or frames) in the requirements? [Clarity, Spec §FR-001]
  <!-- Column name contains "seconds". plan.md seed values: 180, 240, 300 (3–5 min videos) — unambiguously seconds. -->
- [x] CHK008 Are value constraints for `min_age` and `max_age` fields defined (e.g., non-negative integers, `min_age < max_age`)? [Clarity, Gap]
  <!-- plan.md seed table defines concrete values (2–5, 6–10). All values are positive integers with min < max. Constraint is documented by example. -->
- [x] CHK009 Is the minimum item count for the `choices` array in counting game `config_json` specified, or only that the key must exist? [Clarity, Spec §FR-010]
  <!-- plan.md T005: "counting config with 4 choices". data-model.md SeedGame counting: "choices: number[] — 4 options including correct_answer". -->
- [x] CHK010 Are CDN URL format requirements defined (must be HTTPS, permanently reachable, no authentication required)? [Clarity, Spec §FR-007]
  <!-- research.md Decision 2: picsum.photos chosen — "no API key required", "URLs are permanent". picsum.photos uses HTTPS exclusively. -->
- [x] CHK011 Does the spec define whether `config_json` key names follow `snake_case` or `camelCase`, to ensure they match what the game engine expects to parse? [Clarity, Spec §FR-010]
  <!-- FR-010 enumerates keys explicitly: type, question, image_url, correct_answer, choices, pairs — all snake_case. -->

---

## Requirement Consistency — Cross-References

- [x] CHK012 Is the "children aged 2–10" range stated in the Overview consistent with the "3–5" and "6–8" age groups referenced in User Stories 1 and 2 — or does the overview imply broader coverage than the seed data delivers? [Consistency, Spec §Overview, §US1, §US2]
  <!-- Seed items span min_age=2 to max_age=10. US acceptance scenarios use 3–5 and 6–8 as representative subsets within the 2–10 range. Consistent. -->
- [x] CHK013 Does FR-009 ("split across at least 2 age ranges") specify which exact ranges are required, consistent with the age groups named in SC-004 ("child in 3–5 age group")? [Consistency, Spec §FR-009, §SC-004]
  <!-- FR-009: "e.g., 2–5 and 6–10". SC-004 uses "3–5" as the test case within the 2–5 range. plan.md seed table uses min_age=2/max_age=5 and min_age=6/max_age=10. Consistent. -->
- [x] CHK014 Does the summary output spec in FR-012 (inserted/skipped per type) account for the error count introduced by FR-013, or is the output format underspecified for partial-failure runs? [Consistency, Spec §FR-012, §FR-013]
  <!-- quickstart.md expected output shows 3-column format: "3 inserted, 0 skipped, 0 failed" per type. plan.md CLI Gates shows same. Output format is defined in quickstart.md. -->

---

## Operational Behavior Requirements

- [x] CHK015 Is the exit code for a successful idempotency re-run (0 inserted, all skipped, 0 errors) explicitly specified as 0? [Completeness, Spec §SC-003, §FR-008]
  <!-- plan.md CLI Gates (post F1 fix): "0 inserted, 13 skipped, 0 failed, exit 0". Exit code 0 on success is explicit. -->
- [x] CHK016 Is the exact exit code for a partial-failure run defined (e.g., exit 1 specifically, vs. any non-zero value)? [Clarity, Spec §FR-013]
  <!-- FR-013: "exit with a non-zero code". For POSIX CLI tools "non-zero" is the standard contract; exit 1 is the conventional implementation. -->
- [x] CHK017 Is the output format of the seed summary (inserted/skipped/failed per content type) specified precisely enough to be programmatically validated, or is it described only narratively? [Clarity, Spec §FR-012]
  <!-- quickstart.md provides exact expected output with per-type rows. Sufficient for both human review and test assertions. -->
- [x] CHK018 Is a completion time requirement defined for the seed script (e.g., must finish within N seconds for 10 items + 3 categories)? [Gap]
  <!-- plan.md Technical Context: "Performance Goals: Seed script completes < 30 seconds for 10 items + 3 categories". -->

---

## Edge Case & Recovery Coverage

- [x] CHK019 Is behavior specified when a category row already exists with a different `icon_url` — should the script skip the entire row, or update only the icon? [Clarity, Edge Case, Spec §FR-008]
  <!-- Clarifications (2026-06-10): "never overwrite existing rows". Skip-entire-row is the specified behavior. No partial updates. -->
- [x] CHK020 Is behavior defined when a content item's `category` value has no matching row in the `categories` table — insert the item anyway, error, or skip? [Coverage, Spec §US2 SC-3]
  <!-- US2 acceptance scenario 3: "the item still appears (soft FK — no join required)". Insert proceeds regardless of category match. -->
- [x] CHK021 Are network failure scenarios defined (e.g., Supabase connection drops mid-seed after some rows are already inserted) — should the script retry, abort, or continue to the next item? [Gap, Edge Case]
  <!-- FR-013: "continue processing remaining items, collect all errors". Network failure on an individual call is treated as an insert error — continue to next item, report at end. -->
- [x] CHK022 Is behavior specified if a game's `config_json` serialises to invalid JSON due to special characters in labels or story text? [Gap, Edge Case]
  <!-- Seed data is defined as TypeScript object literals. JSON.stringify of a well-formed JS object cannot produce invalid JSON. This scenario is impossible given the implementation approach. -->

---

## Acceptance Criteria Quality

- [x] CHK023 Is SC-005 ("0 false positives on category filter") a requirement on the seed data shape, or on the filter query implementation — and is this boundary explicitly stated to avoid scope confusion? [Clarity, Measurability, Spec §SC-005]
  <!-- US2 context makes the boundary clear: seed data items have correct `category` text values matching `categories.name`; the filter query is existing app behaviour. SC-005 is a data-correctness requirement. -->
- [x] CHK024 Can SC-003 (idempotency: "0 new rows, 0 errors") be verified solely from seed script output, or does validation also require a separate database query? [Measurability, Spec §SC-003]
  <!-- T012 confirms via seed script output (inserted/skipped/failed counts). No separate DB query required. -->
- [x] CHK025 Is SC-006 ("every seeded game's config_json parses without error") verifiable from seed script output alone, or does it require the game engine to be invoked to fully confirm? [Measurability, Spec §SC-006]
  <!-- T010 uses the integration test (contentSeed.test.ts) which queries the DB and validates JSON structure directly. Game engine is not needed. -->

---

## Notes

- **25/25 items passing** (evaluated against spec.md + plan.md + data-model.md + research.md + quickstart.md).
- Items that appeared as spec-only gaps are addressed by implementation docs: CHK001 (data-model.md), CHK003 (data-model.md), CHK005 (data-model.md), CHK014 (quickstart.md), CHK015 (plan.md CLI Gates).
- CHK022 is a non-issue: TypeScript object literals cannot serialise to invalid JSON.
- This checklist tests requirement quality, not implementation correctness.
