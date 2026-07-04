# Data Model: Data-Driven Games

**Feature**: 011-data-driven-games | **Date**: 2026-06-10

No database schema changes in this feature. All tables and columns were created in features 009 and 010. This document describes the TypeScript types and component state shapes that the game screen uses to interpret `config_json`.

---

## Existing DB Entities (read-only)

### content_items (from feature 009)

| Column | Type | Relevant to this feature |
|---|---|---|
| id | uuid | Route parameter `[id]` |
| type | text | Always `'game'` for this screen |
| game_type | text | `'counting'` or `'matching'` — drives renderer selection |
| config_json | jsonb | Parsed by the screen into CountingConfig or MatchingConfig |
| title | text | Displayed in win screen title (optional) |
| thumbnail_url | text | Not used by game screen (used by games list) |

---

## TypeScript Config Types (new — presentation layer)

Defined locally in `app/(child)/game/[id].tsx`. Not exported to `services/api/types.ts` (single consumer, per YAGNI).

### CountingConfig

```typescript
type CountingConfig = {
  type: 'counting';
  question: string;       // e.g., "How many apples are in the basket?"
  image_url: string;      // URL for the counting image
  correct_answer: number; // e.g., 5
  choices: number[];      // e.g., [3, 4, 5, 6]
};
```

**Constraints**:
- `choices` must include `correct_answer`
- `choices.length >= 1` (game renders degenerate single-button case without crashing)
- `image_url` is an HTTPS CDN URL

### MatchingConfig

```typescript
type MatchingConfig = {
  type: 'matching';
  pairs: MatchingPair[];  // min 2 pairs for a meaningful game
};

type MatchingPair = {
  item: string;   // label text, e.g., "Dog"
  image: string;  // HTTPS CDN URL for the image
};
```

**Constraints**:
- `pairs.length >= 2` for a meaningful matching session
- Each `item` value is unique within a config (used as identity key)

### Discriminated Union

```typescript
type GameConfig = CountingConfig | MatchingConfig;
```

Narrowed at runtime via `config.type` check.

---

## useGame Return Type Fix

**File**: `services/api/games.ts` — `useGame(id: string)` function

**Before**: Returns `ApiResponse<ContentItem>` — missing `game_type` and `config_json`.

**After**: Returns `ApiResponse<GameItem>` — exposes both fields with proper types.

This is a type-only change; the runtime SQL query already does `select('*')`.

`GameItem` (already in `services/api/types.ts`):
```typescript
export interface GameItem extends ContentItem {
  type: 'game';
  game_type?: string;
  config_json?: GameConfig;  // typed as GameConfig after this feature
}
```

Note: `GameItem.config_json` is currently typed as `GameConfig` (generic `{ type: string; [key: string]: unknown }`). The local `CountingConfig`/`MatchingConfig` types in the screen are the narrow aliases for rendering — they do not need to be reflected in `types.ts`.

---

## Component State Shapes

### Counting Game State

```typescript
type CountingState = {
  selectedAnswer: number | null;
  showFeedback: boolean;
  won: boolean;
  startedAt: number;  // Date.now() on mount — for durationSeconds calculation
};
```

**State machine**:

```
idle (loading) → playing → [correct] → won
                         → [wrong]  → playing (reset, retry)
```

### Matching Game State

```typescript
type MatchingState = {
  selectedLabel: string | null;     // item value of selected label card
  matchedItems: Set<string>;        // item values that have been correctly matched
  showWrong: boolean;               // brief error flash
  won: boolean;
  startedAt: number;
};
```

**State machine**:

```
idle (loading) → playing
playing → label_selected (selectedLabel set)
label_selected → [correct image tapped] → pair matched → (more pairs? playing : won)
label_selected → [wrong image tapped]   → showWrong → playing (reset selection)
```

---

## Summary of File Changes

| File | Change Type | Description |
|---|---|---|
| `services/api/games.ts` | Edit | `useGame` return type: `ContentItem` → `GameItem` |
| `services/api/types.ts` | Edit | `GameItem.config_json` typed more precisely (optional) |
| `app/(child)/game/[id].tsx` | Edit (major) | Wire to `useGame`, add loading/error states, counting + matching renderers |
| `tests/unit/game/gameScreen.test.tsx` | New | Unit tests (TDD gate — written before screen changes) |
| `tests/integration/gameScreen.test.ts` | New | Integration test with HAS_CREDENTIALS skip pattern |
