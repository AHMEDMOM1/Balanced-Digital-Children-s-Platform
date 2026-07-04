# Contract: Child Pairing Service API

**Module**: `services/api/childPairing.ts`
**Store**: `store/usePairingStore.ts`
**Spec**: 017-child-qr-scan | **Date**: 2026-06-12

---

## Overview

The child pairing service exposes pure utility functions and two async service functions:
1. `parseQrPayload` — parse and validate the JSON string encoded in the QR code
2. `isTokenExpired` — advisory local expiry check (server is always authoritative)
3. `parseManualCode` — normalize 6-digit manual code input
4. `consumePairingToken` — call the `consume_pairing_token` RPC via anon key
5. `consumePairingTokenByCode` — call `consume_pairing_token_by_code` RPC via anon key

All Supabase calls are encapsulated here (no `supabase.rpc()` in screen components — constitution §API Hook Pattern).

---

## Function: `parseQrPayload`

```typescript
export function parseQrPayload(rawStr: string): QrPayload | null
```

**Behaviour**:
1. `JSON.parse(rawStr)` — catch SyntaxError → return `null`
2. Validate required fields: `token` (non-empty string), `family_id` (non-empty string), `expires_at` (non-empty string)
3. If any field missing or wrong type → return `null`
4. Return typed `QrPayload` object

---

## Function: `isTokenExpired`

```typescript
export function isTokenExpired(payload: QrPayload): boolean
```

**Behaviour**:
- `return new Date(payload.expires_at).getTime() <= Date.now()`
- Client-side advisory only (FR-009). Server validates independently.

---

## Function: `parseManualCode`

```typescript
export function parseManualCode(input: string): string | null
```

**Behaviour**:
1. Strip hyphens: `input.replace(/-/g, '')`
2. If result is not exactly 6 digits (`/^\d{6}$/`) → return `null`
3. Return the stripped 6-digit string

---

## Function: `consumePairingToken`

```typescript
export async function consumePairingToken(
  tokenUuid: string,
  familyId: string,
  supabase?: SupabaseClient
): Promise<ConsumePairingTokenResult>
```

**Behaviour**:
1. `const client = supabase ?? getClient()`
2. Call `client.rpc('consume_pairing_token', { p_token: tokenUuid, p_family_id: familyId })`
3. If `.rpc()` returns an error → return `{ success: false, child_id: null, family_id: null, error: 'rpc_error' }`
4. Map `data` JSON to `ConsumePairingTokenResult` (pass through `success`, `child_id`, `family_id`, `error`)
5. Emit structured log

**Structured log** (constitution §V):
```json
{ "level": "info|error", "hook": "consumePairingToken", "family_id": "...", "duration_ms": 123, "success": true, "error": null }
```

---

## Function: `consumePairingTokenByCode`

```typescript
export async function consumePairingTokenByCode(
  manualCode: string,
  supabase?: SupabaseClient
): Promise<ConsumePairingTokenResult>
```

**Behaviour**:
1. `const stripped = parseManualCode(manualCode)` — if null → return `{ success: false, error: 'invalid_token' }`
2. `const client = supabase ?? getClient()`
3. Call `client.rpc('consume_pairing_token_by_code', { p_manual_code: stripped })`
4. Map result identically to `consumePairingToken`
5. Emit structured log with `hook: 'consumePairingTokenByCode'`

---

## Store: `store/usePairingStore.ts`

```typescript
interface PairingStoreState {
  pairingState: ChildPairingState | null;
  pinHash: string | null;
  isLoading: boolean;
  loadPairingState: () => Promise<void>;
  savePairingState: (state: ChildPairingState) => Promise<void>;
  clearPairingState: () => Promise<void>;
  savePinHash: (hash: string) => Promise<void>;
}
```

**`loadPairingState()`**: Read `@child_pairing_state` and `@child_pin_hash` from AsyncStorage; parse JSON; set store state. Called once on app launch.

**`savePairingState(state)`**: Serialize to JSON; `AsyncStorage.setItem('@child_pairing_state', json)`. Does NOT set `has_pin` — that is set by `savePinHash`.

**`savePinHash(hash)`**: `AsyncStorage.setItem('@child_pin_hash', hash)`. Update `pairingState.has_pin = true`; persist updated state.

**`clearPairingState()`**: Remove both keys; set `pairingState = null`, `pinHash = null`.

---

## Screen Contract: `app/auth/child-scan.tsx`

### State

| Name | Type | Description |
|------|------|-------------|
| `mode` | `'camera' \| 'manual'` | Active UI mode |
| `isScanning` | `boolean` (ref) | Lock to prevent double-submit on rapid scans |
| `isSubmitting` | `boolean` | True while RPC call is in flight |
| `manualCode` | `string` | Current manual input value |
| `error` | `string \| null` | Error banner message |

### Behaviour

**On mount**:
1. Request camera permissions via `useCameraPermissions()` hook
2. If denied → set `mode = 'manual'`

**Camera scan (`handleScan`)**:
1. If `isScanning.current` is true → return immediately (debounce)
2. `isScanning.current = true`
3. `const payload = parseQrPayload(event.data)` — if null → show "Invalid QR code" error; reset `isScanning`
4. `if (isTokenExpired(payload))` → show "Code has expired. Ask the parent for a new code." error; reset `isScanning`
5. `setIsSubmitting(true)`
6. `consumePairingToken(payload.token, payload.family_id)` → on success: save pairing state → `router.replace('/auth/child-setup-pin')`; on failure: show error from result; `setIsSubmitting(false)`; reset `isScanning`

**Manual submit (`handleManualSubmit`)**:
1. `const code = parseManualCode(manualCode)` — if null → show "Enter 6 digits" error
2. `setIsSubmitting(true)`
3. `consumePairingTokenByCode(code)` → on success: save pairing state → `router.replace('/auth/child-setup-pin')`; on failure: show error

**Error messages**:
- `invalid_token` → "This code is invalid, expired, or already used. Ask the parent for a new code."
- `parent_not_found` → "Something went wrong. Please try again."
- `rpc_error` → "Connection error. Check your internet and try again."

### UI Elements

| Element | Condition | Notes |
|---------|-----------|-------|
| `<CameraView>` | `mode === 'camera' && permission.granted` | `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}` |
| Camera unavailable message + manual button | `mode === 'camera' && !permission.granted` | Tapping button sets `mode = 'manual'` |
| Manual code `<TextInput>` | `mode === 'manual'` | Numeric keyboard; max 6 chars (strip hyphens); show formatted as `XXX-XXX` |
| "Switch to camera" button | `mode === 'manual' && permission.granted` | Switches back to camera view |
| Submit button | `mode === 'manual'` | Disabled while `isSubmitting` |
| Activity indicator | `isSubmitting` | Overlays both camera and manual views |
| Error banner | `error !== null` | Dismissible |

---

## Screen Contract: `app/auth/child-setup-pin.tsx`

### Props / Route Params

None. `child_id` and `family_id` read from `usePairingStore().pairingState` (written by child-scan.tsx before navigation).

### State

| Name | Type | Description |
|------|------|-------------|
| `step` | `'new' \| 'confirm'` | Two-step PIN entry |
| `newPin` | `string` | 1–6 digit string |
| `confirmPin` | `string` | 1–6 digit string |
| `error` | `string` | Mismatch error |

### Behaviour

**Keypad press**: append digit; reject when length would exceed 6.

**"Next" tap**:
- In `'new'` step: if `newPin.length === 6` → `setStep('confirm')`
- In `'confirm'` step: if `confirmPin === newPin`:
  1. `const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPin)`
  2. `await AsyncStorage.setItem('@child_pin_hash', hash)`
  3. `usePairingStore.getState().savePinHash(hash)` → sets `has_pin: true` in pairing state
  4. Fire-and-forget: `supabase.from('profiles').update({ pin_hash: hash, pin_length: 6 }).eq('id', child_id)` (FR-016: sync failure must not block)
  5. `router.replace('/(child)')`
- Mismatch: `setError('PINs do not match')`, `setConfirmPin('')`

### UI Elements

| Element | Notes |
|---------|-------|
| 6-dot PIN indicator (new PIN) | Active slot: cursor blink |
| 6-dot PIN indicator (confirm) | Dimmed until step === 'confirm' |
| Numeric keypad (0–9 + backspace + Next) | Same pattern as `setup-pin.tsx` |
| Error text | Shown on mismatch |
