# Contract: API Hooks (`services/api/`)

**Date**: 2026-06-09

All content and data access in screen components MUST go through these hooks. No direct `supabase.from()` calls in screens.

---

## Shared Response Shape

Every hook returns `ApiResponse<T>` (defined in `services/api/types.ts`):

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isOffline: boolean;
}
```

Structured log emitted on every call: `{ level, hook, duration_ms, cached, error }` via `console.debug/info/warn/error`.

---

## `services/api/stories.ts`

| Export | Signature | Description |
|--------|-----------|-------------|
| `useStories` | `(childId: string) => ApiResponse<ContentItem[]>` | Filtered by child age group + non-blocked categories |
| `useStory` | `(id: string) => ApiResponse<ContentItem>` | Single story by ID |
| `logStoryActivity` | `(childId, contentId, action, durationSeconds) => Promise<void>` | Appends to `activity_logs` |

**Filtering applied inside hook** (never in screen):
- `content_items.type = 'story'`
- `min_age <= child_age_numeric AND max_age >= child_age_numeric`
- `category NOT IN (SELECT category FROM category_preferences WHERE child_id = $childId AND is_allowed = false)`

**Caching**: Results stored in expo-sqlite local cache. Cache hit returns immediately; background refresh on stale-while-revalidate pattern. Cache TTL: 5 minutes.

---

## `services/api/games.ts`

Same contract as `stories.ts` with `type = 'game'`.

| Export | Signature |
|--------|-----------|
| `useGames` | `(childId: string) => ApiResponse<ContentItem[]>` |
| `useGame` | `(id: string) => ApiResponse<ContentItem>` |
| `logGameActivity` | `(childId, contentId, action, durationSeconds) => Promise<void>` |

---

## `services/api/videos.ts`

Same contract as `stories.ts` with `type = 'video'`.

| Export | Signature |
|--------|-----------|
| `useVideos` | `(childId: string) => ApiResponse<ContentItem[]>` |
| `useVideo` | `(id: string) => ApiResponse<ContentItem>` |
| `logVideoActivity` | `(childId, contentId, action, durationSeconds) => Promise<void>` |

---

## `services/api/creative.ts`

Same contract as `stories.ts` with `type = 'creative'`.

| Export | Signature |
|--------|-----------|
| `useCreativeActivities` | `(childId: string) => ApiResponse<ContentItem[]>` |
| `useCreativeActivity` | `(id: string) => ApiResponse<ContentItem>` |
| `logCreativeActivity` | `(childId, contentId, action, durationSeconds) => Promise<void>` |

---

## `services/api/hooks.ts` (combined entry point)

Re-exports all hooks from the four modules above. Screens import from this file:

```typescript
import { useStories, useGames, useVideos, useCreativeActivities } from '@/services/api/hooks';
```

---

## `services/api/reports.ts`

| Export | Signature | Description |
|--------|-----------|-------------|
| `useChildStats` | `(childId: string, range: ReportRange) => ApiResponse<DailyStats[]>` | Aggregated stats for today/week/month |
| `useComparisonStats` | `(childAId, childBId, range) => ApiResponse<ComparisonData>` | Side-by-side stats |

`ReportRange = 'today' | 'week' | 'month'`

**Cache**: 60-second TTL for historical days (immutable). Real-time partial update for "today" only.

---

## Error Handling

All hooks follow this pattern:
1. Return `{ data: cached, isOffline: true }` when network unavailable
2. Return `{ data: null, error: message, isLoading: false }` on Supabase error
3. Never throw — all errors captured in `error` field
4. Empty result set → `{ data: [], error: null }` (not an error)
