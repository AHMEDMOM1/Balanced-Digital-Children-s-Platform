# Research: Resilience & Real-Device Testing

## Overview

Research findings and technical decisions for Phase 4 resilience hardening. All ambiguities were resolved during the clarification session.

## Research Decisions

### Decision 1: FPS Degradation Scope
- **Decision**: FPS monitoring and animation degradation applies to all screens including transitions.
- **Rationale**: Consistent user experience across child and parent views.
- **Alternatives considered**: Child-only scope (simpler but inconsistent UX).

### Decision 2: E2E Test Strategy
- **Decision**: E2E tests run automated in CI via a device-farm service.
- **Rationale**: Catches regressions early; manual testing alone is insufficient for cross-platform resilience verification.
- **Alternatives considered**: Manual-only (too slow for CI), emulators-only (misses physical device issues).

### Decision 3: Cache Retention Policy
- **Decision**: Local content cache persists across sessions, evicted after 7 days or when storage exceeds 100MB.
- **Rationale**: Balances offline usability with storage budget.
- **Alternatives considered**: Per-session cache (breaks offline launch), indefinite retention (risks storage bloat).

### Decision 4: PIN Recovery Security
- **Decision**: 3 attempts per hour, escalating to 24-hour cooldown after 3 consecutive locked hours.
- **Rationale**: Balances security against parent lockout risk.
- **Alternatives considered**: 5 attempts (too permissive), permanent lockout (too aggressive for parent UX).

### Decision 5: Observability Strategy
- **Decision**: All resilience events logged locally and forwarded to a remote crash reporting service when connectivity is available.
- **Rationale**: Enables debugging and production monitoring without blocking on Phase 5 Sentry setup.
- **Alternatives considered**: Console-only (no production visibility), user-facing toasts (annoying).

## Technical Research

### Library Choices
- **NetInfo** (`@react-native-community/netinfo`): Mature, well-maintained connectivity detection with event-driven API.
- **expo-file-system**: For cache storage with size tracking.
- **expo-sqlite** or **AsyncStorage**: For structured cache (content metadata, session state).
- **Performance Monitor**: `react-native-reanimated` provides `useAnimatedProps` with FPS hooks; native FPS monitoring via `FrameCallback` on Android / `CADisplayLink` on iOS.
- **Battery Saver Detection**: `expo-battery` provides `BatteryState` and low power mode detection.

### Existing Patterns to Reuse
- `services/api/hooks.ts`: Follow existing hook pattern (`useContentById`, etc.)
- `store/useSessionStore.ts` (Zustand): Session state management, extend for persistence
- `services/utils/bidi.ts`: Existing BiDi utility, not directly relevant to resilience
- `components/ui/EmptyState.tsx`: Used for offline indicators
