# Research: Data-Driven Games

**Feature**: 011-data-driven-games | **Date**: 2026-06-10

All decisions below were resolved from existing codebase patterns and React Native documentation. No external research agents were required — all NEEDS CLARIFICATION items were pre-resolved in the spec and clarification session.

---

## Decision 1: useGame hook return type

**Decision**: Change `useGame`'s return type from `ApiResponse<ContentItem>` to `ApiResponse<GameItem>`.

**Rationale**: `ContentItem` (from `services/api/types.ts`) does not include `game_type` or `config_json`. `GameItem extends ContentItem` and adds both fields with proper types. The hook already filters `.eq('type', 'game')` and does `select('*')`, so the runtime data is always a full game row. Fixing the type removes the need for unsafe casts in screen code and aligns with constitution §II (types defined in `services/api/types.ts` as single source of truth).

**Alternatives considered**: Cast `ContentItem` to `GameItem` in the screen — rejected because it pushes type unsafety into the presentation layer. Define new inline types in the screen — rejected (violates §II single source of truth).

---

## Decision 2: config_json local type aliases

**Decision**: Define `CountingConfig` and `MatchingConfig` as local TypeScript type aliases inside `app/(child)/game/[id].tsx`, not in `services/api/types.ts`.

**Rationale**: These are presentation-layer config shapes that describe how the screen interprets `config_json`. The DB column is typed `Record<string, unknown>` in `GameItem.config_json`. Narrowing to a discriminated union inside the screen is the appropriate boundary. Per constitution §VII (YAGNI), adding them to `types.ts` would be premature — no other module needs to parse `config_json` at this time.

**Alternatives considered**: Adding to `types.ts` — deferred as over-engineering for a single consumer.

---

## Decision 3: Image rendering for config_json URLs

**Decision**: Use React Native's `Image` component (`source={{ uri: url }}`) for `image_url` (counting game) and pair `image` URLs (matching game).

**Rationale**: Standard React Native pattern. The existing codebase uses it throughout. Picsum URLs (used in seed data) are HTTPS CDN URLs that work directly with the `Image` component. No additional library needed.

**Alternatives considered**: Expo Image — more capable but not yet used in this project. Not needed for this feature.

---

## Decision 4: Matching game interaction model

**Decision**: Two-step tap — tap a label card to select it (highlighted), then tap an image card. If the image belongs to the selected pair, mark it as matched. If not, briefly flash error and reset selection.

**Rationale**: Simplest tap-to-match pattern for a children's game on small screens. The spec explicitly excludes drag-and-drop (Assumptions). Two-step tap works identically on iOS and Android, requires no gesture libraries, and is familiar to young children.

**State shape**:
```typescript
const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
const [matchedItems, setMatchedItems] = useState<Set<string>>(new Set());
const [showWrong, setShowWrong] = useState(false);
```

**Alternatives considered**: Drag-and-drop via react-native-gesture-handler — excluded by spec. Side-by-side columns with simultaneous tap — no meaningful advantage over two-step.

---

## Decision 5: Component unit testing approach

**Decision**: Test the game screen component using `@testing-library/react-native` with `jest.mock` for `services/api/games` (to mock `useGame` return values) and `expo-router` (to mock `useLocalSearchParams` and `useRouter`).

**Rationale**: `@testing-library/react-native@14` is already installed. Mocking the hook lets us test the rendering logic with controlled `config_json` values, independently of Supabase connectivity. This satisfies constitution §I (tests fail first) and §IV (contract test for hook consumption pattern).

**Test file location**: `tests/unit/game/gameScreen.test.tsx`

**Alternatives considered**: Integration test with real Supabase — also added in `tests/integration/gameScreen.test.ts` for the HAS_CREDENTIALS path (verifies real DB rendering). Both are needed.

---

## Decision 6: Activity logging trigger point

**Decision**: Call `logGameActivity` inside the win transition handler in the game screen component. Pass `childData.id` from the auth store, `id` from route params, and an approximate `durationSeconds` calculated from component mount time.

**Rationale**: `logGameActivity` already exists in `services/api/games.ts` and accepts `{ childId, gameId, durationSeconds }`. The auth store `useAuthStore` is already used in other screens. Calling it at the win transition is idiomatic with how other activity hooks work in the codebase.

**Alternatives considered**: Log in `useEffect` on win state change — equivalent but slightly less explicit. Log via a separate hook — unnecessary indirection (YAGNI).
