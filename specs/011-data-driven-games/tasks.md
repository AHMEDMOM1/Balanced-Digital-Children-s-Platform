# Tasks: Data-Driven Games

**Input**: Design documents from `specs/011-data-driven-games/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/game-screen.md ✅, quickstart.md ✅

**TDD Note**: Per constitution §I, unit tests are written BEFORE the game screen is edited. Tests MUST fail (red state) before implementation begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Add CLI entry points before any test or implementation work begins.

- [x] T001 Add `"test:game-screen": "jest tests/unit/game/gameScreen.test.tsx --no-coverage"` and `"test:game-screen-integration": "jest tests/integration/gameScreen.test.ts --no-coverage"` to the `scripts` section of `package.json`

---

## Phase 2: Foundational — TDD Gate + Type Fix

**Purpose**: Write ALL tests and fix the `useGame` return type BEFORE touching the game screen. Tests must FAIL after this phase.

**⚠️ CRITICAL**: Do not edit `app/(child)/game/[id].tsx` until T005 confirms FAIL.

- [x] T002 [P] Write `tests/unit/game/gameScreen.test.tsx` — create `tests/unit/game/` directory; add `jest.mock('../../services/api/games', ...)` to mock `useGame` returning `{data, error, isLoading}` and mock `logGameActivity`; add `jest.mock('expo-router', ...)` to mock `useLocalSearchParams({id: 'test-id'})` and `useRouter`; add `jest.mock('../../store/useAuthStore', ...)` returning `{childData: {id: 'child-1'}}`; write these 11 test cases grouped in describe blocks:
  - `describe('loading state')`: `it('shows ActivityIndicator when isLoading is true', ...)` — assert `queryByTestId('loading-indicator')` or similar is present
  - `describe('error state')`: `it('shows error message and back button when error is set', ...)` — assert error text appears; `it('shows fallback error state for unknown game_type', ...)` — assert error text for `game_type: 'unknown'` config
  - `describe('counting game (US1)')`: `it('renders question text from config_json.question', ...)` — mock `useGame` returning GameItem with `config_json: {type:'counting', question:'How many apples?', image_url:'https://picsum.photos/seed/test/400/300', correct_answer:5, choices:[3,4,5,6]}`; assert `getByText('How many apples?')`; `it('renders a button for each choice', ...)` — assert `getByText('3')`, `getByText('4')`, `getByText('5')`, `getByText('6')`; `it('pressing correct answer transitions to win screen', ...)` — fireEvent.press correct answer button, assert win text appears; `it('pressing wrong answer shows error feedback', ...)` — fireEvent.press wrong answer button, assert button visual change or feedback (async); `it('calls logGameActivity on counting win', ...)` — fireEvent.press correct, assert mock was called with gameId and childId
  - `describe('matching game (US2)')`: `it('renders label cards for each pair item', ...)` — mock `useGame` returning `config_json: {type:'matching', pairs:[{item:'Dog',image:'https://...'},{item:'Cat',image:'https://...'}]}`; assert `getByText('Dog')` and `getByText('Cat')`; `it('calls logGameActivity on matching win', ...)` — simulate matching all pairs, assert mock called

- [x] T003 [P] Write `tests/integration/gameScreen.test.ts` — use same `SUPABASE_URL`/`SERVICE_ROLE_KEY`/`HAS_CREDENTIALS`/`maybeDescribe` skip pattern as `tests/integration/contentSeed.test.ts`; `maybeDescribe('Game Screen Integration (011-data-driven-games)', () => { it('counting game row has valid config_json keys', async () => { /* query content_items where game_type='counting' and title='Count the Apples'; assert config_json has keys: type, question, image_url, correct_answer, choices; assert Array.isArray(choices) */ }) })`

- [x] T004 [P] Edit `services/api/games.ts` — in the `useGame` function, change the return type cast from `as ApiResponse<ContentItem> & { refetch: () => Promise<void> }` to `as ApiResponse<GameItem> & { refetch: () => Promise<void> }`; also change `const [data, setData] = useState<ContentItem | null>(null)` to `useState<GameItem | null>(null)`; import `GameItem` from `./types` if not already imported

- [x] T005 Run `npm run test:game-screen` — confirm ALL 11 unit tests FAIL with assertion errors or "element not found" errors (the existing game screen has no `useGame` call, hardcoded apples, no config_json rendering). This is the **required red state** per constitution §I. If any test unexpectedly passes, inspect why before proceeding.

**Checkpoint**: Tests are failing as expected. Type fix is in place. Implementation can begin.

---

## Phase 3: User Story 1 — Counting Game from Database (Priority: P1) 🎯 MVP

**Goal**: The game screen reads `config_json` for a counting game and renders the question, image, and choices from the DB row. Correct answer → immediate win screen with 1 star. `logGameActivity` called on win.

**Independent Test**: Run `npm run test:game-screen` — US1 counting game unit tests pass.

### Implementation for User Story 1

- [x] T006 [US1] Edit `app/(child)/game/[id].tsx` — add wire-up: (1) add `import { useGame, logGameActivity } from '../../../services/api/games'`; (2) add `import { ActivityIndicator, Image } from 'react-native'`; (3) add `import useAuthStore from '../../../store/useAuthStore'`; (4) add local type aliases directly after imports: `type CountingConfig = { type: 'counting'; question: string; image_url: string; correct_answer: number; choices: number[]; }` and `type MatchingConfig = { type: 'matching'; pairs: Array<{ item: string; image: string }> }` and `type GameConfig = CountingConfig | MatchingConfig`; (5) replace the hardcoded state block with: `const { id } = useLocalSearchParams(); const { data: game, isLoading, error } = useGame(id as string); const childData = useAuthStore(s => s.childData); const [startedAt] = useState(() => Date.now()); const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null); const [showFeedback, setShowFeedback] = useState(false); const [won, setWon] = useState(false);`; (6) remove `level`, `targetCount`, and `choices` state; remove the `useEffect` that generates choices; (7) add loading render: `if (isLoading) return <SafeAreaView style={styles.safe}><View style={styles.winCenter}><ActivityIndicator size="large" color={Colors.child.primary} /></View></SafeAreaView>`; (8) add error render: `if (error || !game) return <SafeAreaView style={styles.safe}><View style={styles.winCenter}><Text style={styles.wonSubtitle}>Could not load game</Text><TouchableOpacity style={styles.homeBtn3D} onPress={() => router.back()}><Text style={styles.homeBtnText}>Go Back</Text></TouchableOpacity></View></SafeAreaView>`

- [x] T007 [US1] Edit `app/(child)/game/[id].tsx` — implement the counting game renderer: (1) parse config: `const config = game.config_json as GameConfig`; (2) define a `handleWin` function: `const handleWin = () => { setWon(true); if (childData?.id) { logGameActivity({ childId: childData.id, gameId: id as string, durationSeconds: Math.round((Date.now() - startedAt) / 1000) }); } }`; (3) define `handleAnswer`: `const handleAnswer = (choice: number) => { if (showFeedback) return; setSelectedAnswer(choice); setShowFeedback(true); if (choice === (config as CountingConfig).correct_answer) { setTimeout(handleWin, 800); } else { setTimeout(() => { setShowFeedback(false); setSelectedAnswer(null); }, 600); } }`; (4) replace the `if (won)` win screen: keep the existing BounceIn/star layout but show exactly 1 star earned (`s <= 1` for star colouring); (5) in the main return, replace the hardcoded question section content: question text = `{(config as CountingConfig).question}` and sub-question text = `Count them all!`; (6) replace the `<Animated.View key={level}>` game card content: replace the emoji grid with `<Image source={{ uri: (config as CountingConfig).image_url }} style={styles.gameImage} resizeMode="contain" />`; (7) replace the answers row: map `(config as CountingConfig).choices.map(choice => ...)` — keep the same button style logic (correct/wrong highlighting); (8) add `gameImage` to StyleSheet: `{ width: '100%', height: 200, borderRadius: 16 }` (inside the game card)

- [x] T008 [US1] Run `npm run test:game-screen` — confirm US1 unit tests pass: loading indicator, error state, question text from config_json, choice buttons, correct/wrong answer behavior, logGameActivity called on win. US2 and US3 tests may still fail at this point — that is expected.

**Checkpoint**: US1 complete — counting game renders from DB, test assertions green.

---

## Phase 4: User Story 2 — Matching Game from Database (Priority: P2)

**Goal**: The game screen detects `game_type = 'matching'` and renders tap-to-match interaction from `config_json.pairs`. All pairs matched → win screen.

**Independent Test**: Run `npm run test:game-screen` — US2 matching game unit tests pass.

### Implementation for User Story 2

- [x] T009 [US2] Edit `app/(child)/game/[id].tsx` — add matching game renderer: (1) add matching state: `const [selectedLabel, setSelectedLabel] = useState<string | null>(null); const [matchedItems, setMatchedItems] = useState<Set<string>>(new Set()); const [showWrong, setShowWrong] = useState(false);`; (2) add `handleMatchingWin`: `const handleMatchingWin = () => { setWon(true); if (childData?.id) { logGameActivity({ childId: childData.id, gameId: id as string, durationSeconds: Math.round((Date.now() - startedAt) / 1000) }); } }`; (3) add label tap handler: `const handleLabelTap = (item: string) => { if (matchedItems.has(item)) return; setSelectedLabel(item); }`; (4) add image tap handler: `const handleImageTap = (pair: { item: string; image: string }) => { if (!selectedLabel || matchedItems.has(pair.item)) return; if (selectedLabel === pair.item) { const next = new Set(matchedItems); next.add(pair.item); setMatchedItems(next); setSelectedLabel(null); if (next.size === (config as MatchingConfig).pairs.length) { setTimeout(handleMatchingWin, 800); } } else { setShowWrong(true); setTimeout(() => { setShowWrong(false); setSelectedLabel(null); }, 600); } }`; (5) add a `game_type === 'matching'` branch in the main render (before or after the counting game block): render a two-section layout — (a) label column: `{(config as MatchingConfig).pairs.filter(p => !matchedItems.has(p.item)).map(p => <TouchableOpacity key={p.item} style={[styles.matchLabel, selectedLabel===p.item && styles.matchLabelSelected]} onPress={() => handleLabelTap(p.item)}><Text style={styles.matchLabelText}>{p.item}</Text></TouchableOpacity>)}`; (b) image column: `{(config as MatchingConfig).pairs.filter(p => !matchedItems.has(p.item)).map(p => <TouchableOpacity key={p.item} style={[styles.matchImageCard, showWrong && styles.matchImageCardWrong]} onPress={() => handleImageTap(p)}><Image source={{uri: p.image}} style={styles.matchImage} resizeMode="contain" /></TouchableOpacity>)}`; (6) add styles: `matchLabel: { padding: 16, borderRadius: 12, backgroundColor: Colors.child.surfaceContainerLowest, borderBottomWidth: 4, borderBottomColor: Colors.child.outline, marginBottom: 12 }`, `matchLabelSelected: { backgroundColor: Colors.child.primaryFixed }`, `matchLabelText: { ...Typography.child.subtitle, color: Colors.child.textPrimary }`, `matchImageCard: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', marginBottom: 12, backgroundColor: Colors.child.surfaceContainerLowest }`, `matchImageCardWrong: { borderWidth: 2, borderColor: Colors.child.error }`, `matchImage: { width: '100%', height: '100%' }`

- [x] T010 [US2] Run `npm run test:game-screen` — confirm US2 unit tests pass: matching pair labels render, logGameActivity called on matching win. US3 fallback test may still fail — that is expected.

**Checkpoint**: US2 complete — matching game renders from DB, test assertions green.

---

## Phase 5: User Story 3 — Unknown game_type Fallback (Priority: P3)

**Goal**: An unrecognised `game_type` shows a safe error state instead of crashing. This is the final guard that makes the "new game = new row" promise safe.

**Independent Test**: Run `npm run test:game-screen` — all 11 unit tests pass including the unknown game_type fallback test.

### Implementation for User Story 3

- [x] T011 [US3] Edit `app/(child)/game/[id].tsx` — add the final `else` branch after both the `game_type === 'counting'` and `game_type === 'matching'` blocks: render the same error UI as the network error state — `<SafeAreaView style={styles.safe}><View style={styles.winCenter}><Text style={styles.wonSubtitle}>Game type not supported</Text><TouchableOpacity style={styles.homeBtn3D} onPress={() => router.back()}><Text style={styles.homeBtnText}>Go Back</Text></TouchableOpacity></View></SafeAreaView>`; this satisfies FR-009 (unknown game_type fallback) and SC-005 (no unhandled exception)

- [x] T012 [US3] Run `npm run test:game-screen` — confirm ALL 11 unit tests now pass: loading, error, unknown game_type fallback, counting question/choices/correct/wrong/activity-log, matching pairs/activity-log

- [x] T013 [US3] Run `npm run test:game-screen-integration` — confirm integration test passes (querying real DB for counting game row with valid config_json keys); if `HAS_CREDENTIALS` is false the suite skips — both outcomes are acceptable at this stage

**Checkpoint**: All 3 user stories complete — all unit tests green, integration test passes or skipped.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: TypeScript hygiene, regression check, quality gates per constitution.

- [x] T014 [P] Run `npx tsc --noEmit` — confirm 0 TypeScript errors introduced in `app/(child)/game/[id].tsx` and `services/api/games.ts` (pre-existing errors in `supabase/functions/` and e2e tests are known and not from this feature)
- [x] T015 [P] Run `npm run test` — confirm 0 regressions across all existing unit and integration tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (needs npm scripts first)
- **Phase 3 (US1)**: Depends on Phase 2 — tests must be failing before implementation
- **Phase 4 (US2)**: Depends on Phase 3 — matching game extends the same screen file
- **Phase 5 (US3)**: Depends on Phase 4 — fallback is the last else branch
- **Phase 6 (Polish)**: Depends on Phase 5

### Within Phase 2

- T002, T003, T004 are all independent — run in parallel
- T005 depends on T002 and T003 (must confirm tests exist and fail)

### Within Phase 6

- T014 (tsc) and T015 (full test suite) are independent — run in parallel

---

## Parallel Example: Phase 2 (TDD Gate)

```bash
# Launch in parallel:
Task T002: Write tests/unit/game/gameScreen.test.tsx
Task T003: Write tests/integration/gameScreen.test.ts
Task T004: Fix useGame return type in services/api/games.ts

# Then sequentially:
Task T005: npm run test:game-screen  (confirm all FAIL)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: TDD Gate (T002–T005)
3. Complete Phase 3: US1 — counting game renderer (T006–T008)
4. **STOP and VALIDATE**: counting game renders from DB, 11 tests running (8+ passing)
5. App is demo-ready with a real data-driven counting game

### Incremental Delivery

1. Phase 1 + Phase 2 → TDD gate in place
2. Phase 3 (US1) → Counting game data-driven (MVP)
3. Phase 4 (US2) → Matching game data-driven
4. Phase 5 (US3) → Safe fallback for new game types
5. Phase 6 → Polish, TypeScript clean, suite passes

---

## Notes

- [P] tasks touch different files — safe to run in parallel
- T005 (confirm FAIL) is the required TDD gate — do not implement before this step
- The matching game state (`selectedLabel`, `matchedItems`, `showWrong`) lives alongside counting state in the same component — they don't conflict because only one game type renders at a time
- `logGameActivity` is fire-and-forget — no `await` needed, no error handling required in the screen
- Pre-existing TypeScript errors in `supabase/functions/` and e2e device types are unrelated to this feature — T014 should show 0 new errors (not 0 total)
