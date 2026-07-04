# Schema Requirements Quality Checklist: Content Schema & Storage Setup

**Purpose**: Validate completeness, clarity, consistency, and safety of schema + security requirements before implementation
**Created**: 2026-06-10
**Feature**: [spec.md](../spec.md)
**Audience**: Developer — author self-review pre-PR
**Focus**: Data schema quality (deep), RLS/security (deep), migration safety (gap check), storage + TypeScript (light)

---

## Requirement Completeness

- [ ] CHK001 - Are the PostgreSQL data types for all 5 new `content_items` columns (`duration_seconds` integer, `content_text` text, `assets_url` text, `game_type` text, `config_json` jsonb) explicitly documented in FR-001–FR-004? [Completeness, Spec §FR-001–FR-004]
- [ ] CHK002 - Is nullability (nullable / NOT NULL) explicitly stated for each of the 5 new `content_items` columns in FR-001–FR-004? [Completeness, Spec §FR-001–FR-004]
- [ ] CHK003 - Are default values — or an explicit "no default value" — specified for each new column in FR-001–FR-004? [Completeness, Gap]
- [ ] CHK004 - Is the mapping from each new column to its corresponding `type` discriminator value documented (e.g., `duration_seconds` belongs to `type = 'video'`)? [Completeness, Spec §FR-001–FR-004]
- [ ] CHK005 - Are all `categories` table columns (`id` UUID PK, `name` text UNIQUE, `icon_url` text nullable, `created_at` timestamptz) specified with data types in FR-005? [Completeness, Spec §FR-005]
- [ ] CHK006 - Does FR-012 specify the scope of the service-role bypass policy — whether it covers ALL operations or only INSERT for seed scripts? [Completeness, Spec §FR-012]
- [ ] CHK007 - Are all 4 storage bucket names (`thumbnails`, `activity-assets`, `story-images`, `game-assets`) spelled out exactly in FR-013–FR-016? [Completeness, Spec §FR-013–FR-016]
- [ ] CHK008 - Is the storage-URL-to-database-column mapping documented for all 4 buckets in FR-019, not only the `thumbnails` example? [Completeness, Spec §FR-019]

---

## Requirement Clarity

- [ ] CHK009 - Is the age-range filter predicate (`min_age <= childAge AND max_age >= childAge`) explicitly stated in FR-007, rather than implied? [Clarity, Spec §FR-007]
- [ ] CHK010 - Is "flexible JSON structure" in FR-008 intentionally deferred with explicit documentation, or does the spec need a minimum required shape for `config_json`? [Ambiguity, Spec §FR-008]
- [ ] CHK011 - Is "public" access for storage buckets (FR-013–FR-016) defined in terms of whether unauthenticated (CDN-level) access is permitted, or only authenticated app users? [Ambiguity, Spec §FR-013–FR-016]
- [ ] CHK012 - Is the absence of a foreign key constraint between `content_items.category` and `categories.name` documented and justified in the spec (not only in the research document)? [Clarity, Spec §Key Entities, Gap]

---

## Requirement Consistency

- [ ] CHK013 - Is the `type` discriminator value for activities/creative content consistently specified as `'creative'` (not `'activities'`) across all FR sections, acceptance scenarios, and Key Entities? [Consistency, Spec §FR-003, Acceptance Scenario 4]
- [ ] CHK014 - Do FR-007 and FR-009 specify distinct requirements, or are they redundant — both describing age-range queryability with `min_age`/`max_age`? [Consistency, Spec §FR-007, §FR-009]
- [ ] CHK015 - Is the `categories.created_at` auto-default (`now()`) consistent between FR-005 (which lists the column) and the database contract in `contracts/content-schema.sql`? [Consistency, Spec §FR-005, Gap]

---

## Security & RLS Requirements Quality

- [ ] CHK016 - Does FR-011 specify whether a service-role bypass policy is required on `content_items` (mirroring the service-role bypass on `categories` in FR-012), or is the asymmetry intentional? [Completeness, Spec §FR-011–FR-012]
- [ ] CHK017 - Does FR-011 explicitly state that write operations (INSERT/UPDATE/DELETE) on `content_items` are denied for all non-service-role users during Phases 1–4, until Phase 5 admin policies are added? [Clarity, Spec §FR-011]
- [ ] CHK018 - Are the RLS policy names in FR-011/FR-012 aligned with the project constitution's required naming pattern (`parent_read_<table>`, `service_write_<table>`)? [Consistency, Spec §FR-011–FR-012]
- [ ] CHK019 - Is the "authenticated-read" SELECT policy in FR-011/FR-012 defined using the same `auth.role()` condition as existing platform RLS policies, for consistency across the data layer? [Consistency, Spec §FR-011–FR-012]

---

## Migration Safety Requirements

- [ ] CHK020 - Does the spec document that the migration is non-destructive — no existing `content_items` columns are dropped or modified? [Completeness, Spec §Assumptions]
- [ ] CHK021 - Is a rollback/reverse migration requirement specified for the case where the schema change needs to be undone? [Gap]
- [ ] CHK022 - Is idempotency of the migration required — should the spec document that applying the migration twice must not cause errors (requiring `IF NOT EXISTS` guards)? [Completeness, Gap]
- [ ] CHK023 - Is backward compatibility of existing API hooks (`useVideos`, `useStories`, `useGames`, `useCreative`) specified as a formal requirement (FR-###), rather than left as an unverified assumption? [Coverage, Spec §Assumptions]

---

## Acceptance Criteria Quality

- [ ] CHK024 - Is SC-001 ("inserting and reading back one sample row per content type") verifiable with a defined query or test, rather than described loosely? [Measurability, Spec §SC-001]
- [ ] CHK025 - Is SC-004 ("new game = single row insert, no code changes") scoped to the schema layer — or does it implicitly depend on the game rendering engine requiring no changes, which is outside this spec's scope? [Measurability, Spec §SC-004]
- [ ] CHK026 - Is SC-006 ("zero migration conflicts when seeding begins") measurable at this stage, given that Phase 3 seed data schema has not yet been defined? [Measurability, Spec §SC-006]
- [ ] CHK027 - Does SC-003 ("all 4 storage buckets accessible within 5 seconds per file") define the file size that the 5-second upload limit applies to? [Clarity, Spec §SC-003]

---

## Edge Case Coverage

- [ ] CHK028 - Does the spec define a resolution for the edge case of `min_age` values outside expected ranges (e.g., `min_age = 99`) — is a DB constraint, app-layer validation, or silent acceptance required? [Edge Case, Spec §Edge Cases]
- [ ] CHK029 - Does the spec define requirements for a null `thumbnail_url` — is a placeholder image required, or is null display behavior explicitly delegated to a later phase? [Edge Case, Spec §Edge Cases]
- [ ] CHK030 - Is it specified how a single `assets_url` column distinguishes between `story-images` bucket URLs and `activity-assets` bucket URLs, given that both stories and activities use the same column? [Clarity, Spec §FR-003, Edge Case]
- [ ] CHK031 - Does the spec define what happens when `config_json` contains an empty object `{}` or malformed JSON — is DB-level validation required, or is runtime handling delegated to the game engine? [Edge Case, Spec §Edge Cases]

---

## Dependencies & Assumptions

- [ ] CHK032 - Is the assumption that `content_items` already exists with specific columns (id, title, type, category, min_age, max_age, url, thumbnail_url, created_at) verified against the actual database state in any acceptance scenario? [Assumption, Spec §Assumptions]
- [ ] CHK033 - Is the dependency on Supabase Dashboard access for manual bucket creation documented as a prerequisite in the spec (not only in the plan or quickstart)? [Dependency, Gap]
- [ ] CHK034 - Are the `created_at` auto-timestamp defaults for `categories` documented in the spec as a database-level default (`now()`), rather than left as implied? [Completeness, Spec §FR-005, Gap]

---

## Notes

- Items marked [Gap] indicate requirements that are missing from the spec entirely — spec should be updated before proceeding
- Items marked [Ambiguity] indicate vague requirements that could be interpreted differently by different implementors
- Items marked [Consistency] indicate requirements that conflict between sections or with the project constitution
- CHK003, CHK021, CHK022, CHK023, CHK033 are likely spec gaps requiring additions before `/speckit-implement`
- CHK016, CHK018 involve constitution alignment — verify against `.specify/memory/constitution.md` naming conventions
