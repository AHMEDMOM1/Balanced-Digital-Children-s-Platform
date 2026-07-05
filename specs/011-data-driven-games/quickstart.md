# Quickstart: Data-Driven Games

**Feature**: 011-data-driven-games | **Date**: 2026-06-10

---

## Prerequisites

- Feature 009 (content schema) deployed ✅
- Feature 010 (seed data) applied — both game rows present ✅
- `.env` contains `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- App running (`npm run start`)

---

## Verify Seed Data Exists

Run in Supabase Dashboard SQL Editor:

```sql
SELECT id, title, game_type, config_json
FROM content_items
WHERE type = 'game'
ORDER BY title;
```

Expected: 2 rows — "Count the Apples" (counting) and "Match the Animals" (matching).

Note the `id` values — you'll use them to navigate directly during testing.

---

## TDD Gate (run BEFORE implementation)

```bash
npm run test:game-screen
```

Expected: All unit tests FAIL — the game screen currently ignores `useGame` and renders hardcoded apples. This is the required red state.

---

## Manual End-to-End Test: Counting Game

1. Open the app and log in as a child.
2. Tap **Brain Games** on the home screen.
3. Tap the first game card (should be "Count the Apples").
4. **Verify**: Question text reads "How many apples are in the basket?" (from DB — not hardcoded).
5. **Verify**: An image is displayed (from `config_json.image_url`).
6. **Verify**: Four buttons appear: 3, 4, 5, 6 (from `config_json.choices`).
7. Tap the wrong answer — **verify** it flashes red and resets.
8. Tap "5" — **verify** win screen appears with 1 star.
9. **Verify** (Supabase Dashboard): a new row appears in `activity_log` for this child + game.

---

## Manual End-to-End Test: Matching Game

1. On the Games screen, tap the second game card ("Match the Animals").
2. **Verify**: Label cards show: Dog, Cat, Rabbit (from `config_json.pairs`).
3. **Verify**: Image cards show the corresponding animal images.
4. Tap "Dog" label — **verify** it highlights.
5. Tap the Cat image — **verify** it flashes wrong and selection resets.
6. Tap "Dog" label, then tap the Dog image — **verify** the pair is marked as matched.
7. Complete all 3 pairs — **verify** win screen appears.

---

## Integration Test (credentials required)

```bash
npm run test:game-screen-integration
```

This test connects to the real Supabase DB, navigates to each seeded game by its `id`, and asserts that config_json values appear in the rendered output.

Expected: All integration tests pass after implementation.

---

## Run Full TDD Cycle

```bash
# Step 1: Confirm red state (before implementation)
npm run test:game-screen

# Step 2: Implement (edit app/(child)/game/[id].tsx and services/api/games.ts)

# Step 3: Confirm green state
npm run test:game-screen

# Step 4: Regression check
npm run test
```

---

## Rollback

If you need to revert the game screen to the hardcoded state:

```bash
git checkout -- app/(child)/game/[id].tsx
git checkout -- services/api/games.ts
```

The DB rows are unaffected — seed data rollback is documented in `specs/010-content-seed-initial/quickstart.md`.

---

## CLI Gates (post-implementation)

| Gate | Command | Expected result |
|---|---|---|
| Unit tests | `npm run test:game-screen` | All pass |
| Integration tests | `npm run test:game-screen-integration` | All pass (skip if no credentials) |
| TypeScript | `npx tsc --noEmit` | 0 errors in changed files |
| Full suite | `npm run test` | 0 regressions |
