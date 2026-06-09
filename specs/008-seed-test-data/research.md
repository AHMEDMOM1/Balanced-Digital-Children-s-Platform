# Research: Seed & Test Data

**Feature**: Seed & Test Data (Phase 5)
**Branch**: `008-seed-test-data`
**Date**: 2026-06-09

---

## Decision 1: SQL Execution Mechanism

**Decision**: Apply seeds via `supabase db execute -f <file>` (Supabase CLI), exposed as an npm script.

**Rationale**: The Supabase JS client v2 does not support raw DDL/DML execution for non-service-role keys in a way safe to embed in a committed script. The Supabase CLI is the official tool for applying SQL files to a connected project and is already used for migrations. This keeps the seed application consistent with the migration apply flow.

**Alternatives considered**:
- `psql $DATABASE_URL < file` — requires direct Postgres credentials, which are not available in the managed Supabase free tier without connection pooling configuration
- TS script using `supabase.rpc()` — requires a custom `execute_sql` RPC on the server, which adds surface area and complexity (YAGNI violation)
- Supabase Studio SQL editor (manual) — not scriptable, violates Constitution III

---

## Decision 2: Idempotency Pattern

**Decision**: `ON CONFLICT (child_id, stat_date) DO NOTHING` — existing rows are preserved, new rows are inserted.

**Rationale**: The `daily_stats` table has a UNIQUE constraint on `(child_id, stat_date)` (from `003_reports_tables.sql`). DO NOTHING is the lightest-weight idempotency guard. DO UPDATE would overwrite existing real data in a staging environment that has received actual usage, which is undesirable.

**Alternatives considered**:
- `DELETE FROM daily_stats WHERE child_id IN (...)` then re-insert — destructive, breaks staging environments that have mixed real + seed data
- `DO UPDATE SET ...` — overwrites real data, unacceptable per FR-004

---

## Decision 3: Data Variation Strategy

**Decision**: Use PostgreSQL `random()` to generate varied daily values within bounded min/max ranges per category.

**Rationale**: `random()` produces a different value per row per run, giving a visually natural bar chart with irregular heights. The minimum bounds (FR-003: total ≥ 1200 s; FR-002: per-category > 0) prevent degenerate charts. Because `ON CONFLICT DO NOTHING` preserves existing rows, the values are stable after the first seed run on any given database instance.

**Alternatives considered**:
- Deterministic sequence (e.g., `i * 300`) — produces a perfectly linear chart that looks synthetic and doesn't test chart rendering at varied heights
- Fixed values per child — same problem as above

---

## Decision 4: `top_activity` Source

**Decision**: Hardcoded array of five content titles drawn from `001_initial_data.sql` — no live query.

**Rationale**: Clarified in spec (`Q1: A`). The seed already depends on `001_initial_data.sql` for child profiles; adding a content_items query would increase execution complexity for no functional gain. The five titles are stable across all environments that have applied `001_initial_data.sql`.

**Alternatives considered**:
- `SELECT title FROM content_items ORDER BY random() LIMIT 1` — extra query per row, adds latency, breaks if content_items is empty

---

## Decision 5: Verification Approach

**Decision**: A TypeScript verification script `scripts/seed-verify.ts` connects to Supabase using the JS client and queries row counts; paired with an integration test that mocks the client.

**Rationale**: Matches the pattern of all other `scripts/*.ts` files in the project. Constitution III requires a CLI command; Constitution IV requires an integration test. The mock-based test follows the established jest pattern in `tests/integration/`.

---

## Confirmed Stack

| Concern | Technology | Already in use |
|---------|-----------|---------------|
| Seed execution | Supabase CLI (`supabase db execute`) | Yes (migrations) |
| Verification script | TypeScript + `ts-node` | Yes (`scripts/*.ts`) |
| Integration tests | jest + supabase-js mocks | Yes (`tests/integration/*.ts`) |
| npm scripts | package.json | Yes |
