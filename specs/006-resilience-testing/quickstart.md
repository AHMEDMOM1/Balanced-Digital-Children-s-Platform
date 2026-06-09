# Quickstart: Resilience & Real-Device Testing

## Prerequisites

- Node.js 18+
- Expo CLI (`npx expo`)
- Physical iOS and Android devices for manual testing
- E2E device-farm account (e.g., BrowserStack, Sauce Labs) for CI tests

## Installation

No new npm packages required for Phase 4 — all dependencies are already in `package.json`:

| Package | Purpose |
|---|---|
| `@react-native-community/netinfo` | Connectivity detection |
| `expo-file-system` | Cache storage with size tracking |
| `expo-battery` | Battery saver mode detection |
| `react-native-reanimated` | FPS monitoring via animation frame callbacks |

If any are missing, install:
```bash
npx expo install @react-native-community/netinfo expo-file-system expo-battery
```

## Key Implementation Files

| File | Purpose |
|---|---|
| `services/resilience/cacheManager.ts` | Content cache with 100MB/7-day LRU eviction |
| `services/resilience/sessionManager.ts` | Session state persistence (every 30s) |
| `services/resilience/fpsMonitor.ts` | FPS tracking + animation degradation |
| `services/resilience/connectivityManager.ts` | NetInfo + battery saver adaptation |
| `services/resilience/pinRecoveryManager.ts` | Two-step PIN recovery with rate limiting |
| `services/resilience/eventLogger.ts` | Resilience event logging + batching |

## Usage

### Run on device
```bash
npx expo start --device
```

### Run E2E tests
```bash
npx detox test --configuration ios.sim.release  # iOS simulator
npx detox test --configuration android.emu.release  # Android emulator
```

### Run on device farm (CI)
```bash
npx detox test --configuration ios.device.release --device-farm browserstack
```

## Test Scenarios

### Manual test matrix
| Device | OS | Test Focus |
|---|---|---|
| iPhone SE | iOS | Small screen, cold start |
| iPad | iOS | Tablet layout, multi-window |
| Pixel 4a | Android | Mid-tier performance |
| Galaxy A series | Android | Low-end, animation degradation |

### Key manual tests
1. Launch with airplane mode → verify cached content + offline badge
2. Force-kill during session → reopen → verify timer resume
3. Trigger "Forgot PIN" → complete recovery flow
4. Change device clock forward → verify server-time enforcement
5. Rapidly switch between screens → verify FPS degradation triggers
6. Enable battery saver → disconnect network → verify 15s reconnection interval

## Verification

After implementation, verify all success criteria:

| SC | Check | How |
|---|---|---|
| SC-001 | Cold start < 3s | `npx react-native start --measure` or manual timing on Pixel 4a |
| SC-002 | Session timer accuracy < 5s | Force-kill mid-session, reopen, compare elapsed |
| SC-003 | Offline indicator < 5s | Enable airplane mode, observe badge appearance |
| SC-004 | PIN recovery < 3min | Time the full recovery flow on device |
| SC-005 | Server time enforcement | Change device clock, start session, observe end time |
| SC-006 | Accessibility audit | VoiceOver (iOS) + TalkBack (Android) on 5 key screens |
| SC-007 | E2E tests pass in CI | `npx detox test` on device farm |
| SC-008 | Degradation < 500ms | Instrument FPS monitor, measure trigger latency |
