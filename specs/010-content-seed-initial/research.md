# Research: Initial Content Seed

**Feature**: 010-content-seed-initial
**Date**: 2026-06-10

---

## Decision 1: Idempotency Mechanism

**Decision**: SELECT-before-INSERT (check existence, then skip or insert)

**Rationale**: Supabase JS client v2 does not expose `ON CONFLICT DO NOTHING` cleanly through `.insert()`. Using `ignoreDuplicates: true` with `.upsert()` silently overwrites — which violates the spec requirement to never overwrite existing rows. A manual `SELECT` check by `(title, type)` before each insert is explicit, auditable, and produces the correct "inserted vs skipped" count with zero ambiguity. The cost of N extra SELECT queries for a 10-item seed batch is negligible.

**Alternatives considered**:
- `upsert({ ignoreDuplicates: true })` — rejected: Supabase returns the existing row without indicating it was a skip vs insert; count tracking becomes unreliable
- PostgreSQL `INSERT ... ON CONFLICT DO NOTHING` via raw SQL — rejected: requires Supabase CLI or direct pg connection, not available via JS client RPC without a helper function

---

## Decision 2: Image URL Source

**Decision**: `https://picsum.photos` (Lorem Picsum) for all thumbnail/asset images

**Rationale**: Lorem Picsum (`https://picsum.photos/400/300`) returns stable, CDN-backed placeholder images by numeric ID. No API key required. URLs are permanent. More predictable than Unsplash source URLs which can change behaviour across regions. Specific photo IDs chosen for thematic relevance (nature, animals, colourful scenes).

**Alternatives considered**:
- `images.unsplash.com` — rejected: free-tier URLs sometimes redirect or throttle; requires `?client_id` for consistent access
- Upload real images to Supabase Storage — rejected: out of scope per clarification Q1; adds bucket dependency to seed script

---

## Decision 3: TDD Gate for Seed Script

**Decision**: Write `tests/integration/contentSeed.test.ts` BEFORE running seed. Test asserts minimum row counts. Fails before seed, passes after.

**Rationale**: Constitution §I requires tests written first. For data-seeding, the "failing test" is a count assertion (`count >= 3 videos`) that returns 0 before the seed runs. This satisfies Red-Green-Refactor: Red = 0 rows, Green = rows present after seed. No cleanup in this test (the seeded data is the desired output, not a side effect to revert).

**Alternatives considered**:
- Skip integration tests for seed script — rejected: violates constitution §I and §IV
- Write unit tests that mock Supabase — rejected: mocked tests cannot verify real DB state; defeats the purpose of verifying seed data is correct

---

## Decision 4: Script Module Pattern

**Decision**: ESM-compatible TypeScript with `fileURLToPath(import.meta.url)` for `__dirname`, consistent with `scripts/apply-migration.ts`

**Rationale**: The project's `package.json` does not set `"type": "module"` but ts-node detects ESM syntax and parses as ESM. The `__dirname` workaround is already established in `apply-migration.ts` and should be reused verbatim.

**Alternatives considered**:
- CommonJS (`require`, `__dirname` native) — rejected: project is already drifting ESM; mixing would create confusion
- Adding `"type": "module"` to package.json — rejected: would require updating all existing CJS-style files; out of scope

---

## Decision 5: Seed Content Choices

**Decision**: 10 items across 3 categories (Math, Animals, Nature/Colors), split across 2 age ranges (2–5 and 6–10)

| Type | Title | Category | Age | Key Field |
|---|---|---|---|---|
| video | Count to 10 with Animals | math | 2–5 | YouTube URL |
| video | Animal Sounds Adventure | animals | 2–5 | YouTube URL |
| video | Shapes All Around Us | nature | 6–10 | YouTube URL |
| story | The Friendly Lion | animals | 2–5 | content_text |
| story | Max Learns to Share | nature | 2–5 | content_text |
| story | A Day on the Farm | nature | 6–10 | content_text |
| creative | Draw a Rainbow | nature | 2–5 | assets_url (Picsum) |
| creative | Colour the Animals | animals | 6–10 | assets_url (Picsum) |
| game | Count the Apples | math | 2–5 | config_json (counting) |
| game | Match the Animals | animals | 6–10 | config_json (matching) |

Categories seeded: `math` (icon: Picsum), `animals` (icon: Picsum), `nature` (icon: Picsum)

**Rationale**: Covers all 4 content types, 2 distinct age ranges, 3 distinct categories — satisfies all acceptance scenarios in spec US1/US2/US3 and SC-001 through SC-006.
