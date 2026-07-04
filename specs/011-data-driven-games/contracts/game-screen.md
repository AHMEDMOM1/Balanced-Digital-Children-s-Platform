# Contract: Game Screen Component

**Feature**: 011-data-driven-games | **Date**: 2026-06-10
**File**: `app/(child)/game/[id].tsx`

---

## Route Contract

**Route**: `/(child)/game/[id]`

**Parameter**:
- `id` — Supabase UUID of a `content_items` row where `type = 'game'`

**Navigation in**: `app/(child)/games.tsx` via `router.push(\`/(child)/game/${game.id}\`)`

**Navigation out**: `router.back()` from win screen home button or error state back button

---

## Data Contract

**Hook consumed**: `useGame(id: string)` from `services/api/games.ts`

**Hook return shape** (after this feature's type fix):

```typescript
{
  data: GameItem | null;   // null while loading or on error
  error: string | null;    // null on success
  isLoading: boolean;
  isOffline: boolean;      // always false for single-item fetch
  refetch: () => Promise<void>;
}
```

**`GameItem` fields used by game screen**:

| Field | Used when | Purpose |
|---|---|---|
| `id` | win → activity log | Passed to `logGameActivity` |
| `game_type` | always | Selects renderer: `'counting'` or `'matching'` |
| `config_json.type` | always | Narrows to `CountingConfig` or `MatchingConfig` |
| `config_json.question` | counting | Displayed as question text |
| `config_json.image_url` | counting | Rendered as `Image` |
| `config_json.correct_answer` | counting | Answer evaluation |
| `config_json.choices` | counting | Renders one button per entry |
| `config_json.pairs` | matching | Renders label + image cards |

---

## Activity Log Contract

**Function called**: `logGameActivity` from `services/api/games.ts`

**Trigger**: On win transition (correct answer for counting; all pairs matched for matching)

**Arguments**:
```typescript
logGameActivity({
  childId: string,     // from useAuthStore childData.id
  gameId: string,      // route param id
  durationSeconds: number,  // Math.round((Date.now() - startedAt) / 1000)
  sessionId: undefined,     // not tracked at this layer
})
```

---

## Visual States Contract

| State | Trigger | What screen shows |
|---|---|---|
| Loading | `isLoading = true` | ActivityIndicator centred on pink background |
| Error | `error !== null` OR `game_type` unknown | Error message + back button |
| Counting — playing | `game_type = 'counting'`, not won | Question text, image, choice buttons |
| Counting — won | Correct answer tapped | Win screen with 1 star, "Back to Home" button |
| Matching — playing | `game_type = 'matching'`, not won | Label cards + image cards, matched pairs hidden |
| Matching — won | All pairs matched | Win screen, "Back to Home" button |

---

## Hardcoded Values Contract (prohibition)

After this feature, the following values MUST NOT appear in `app/(child)/game/[id].tsx`:

- Any literal string question text (e.g., `"How many apples?"`)
- Any hardcoded emoji for counting items (e.g., `🍎`)
- Any hardcoded `choices` or `targetCount` derived from a level counter
- Any hardcoded pair labels or pair image URLs

The only permitted literal values are:
- UI text that is always static: `"Amazing Job!"`, `"Back to Home"`, error message strings
- Style constants (colours, sizes)
- Animation durations
