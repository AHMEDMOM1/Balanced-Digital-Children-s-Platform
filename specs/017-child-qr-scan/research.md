# Research: Child Device QR Scan & Pairing

**Spec**: 017-child-qr-scan | **Date**: 2026-06-12

---

## Decision 1 — Child Profile Creation Without Supabase Auth Users

**Decision**: Create child profiles as rows in the `profiles` table with a generated UUID — no corresponding `auth.users` entry required.

**Rationale**: The `profiles` table definition (migration `20260609000000_full_schema_bootstrap.sql`) declares `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` with NO foreign key constraint to `auth.users`. Profile IDs are independent UUIDs, not auth UIDs. This means a SECURITY DEFINER PostgreSQL function can INSERT a valid child profile row without needing to create an auth.users entry. Children authenticate via PIN locally; they do not need Supabase auth sessions for Phase 2.

**Alternatives considered**:
- Creating Supabase auth users with dummy email (e.g. `child-{uuid}@family.internal`) — requires service_role credentials inside the function AND leaks implementation complexity; rejected.
- Separate `child_profiles` table with no auth FK — unnecessary since `profiles` already supports this pattern; rejected.

---

## Decision 2 — SECURITY DEFINER RPC for Token Consumption

**Decision**: Use PostgreSQL SECURITY DEFINER functions (`consume_pairing_token`, `consume_pairing_token_by_code`) callable via the anon key. The functions execute as the function owner (service role equivalent) within Postgres, bypassing RLS for the INSERT/UPDATE operations they perform.

**Rationale**: The child device has no authenticated session when it first opens. Direct table writes via anon key are blocked by RLS (correct). A SECURITY DEFINER function runs server-side with elevated privileges, enforcing all business rules (token validity, expiry, atomicity) internally — making the token UUID itself the credential for this one-time operation. This is the pattern recommended by Supabase for privileged server-side operations callable without auth. `GRANT EXECUTE TO anon` exposes the function to unauthenticated clients.

**Security considerations**: The function validates the token UUID, family_id match, expiry, and used-at status before creating anything. Token UUIDs are cryptographically random (gen_random_uuid); guessing is infeasible within the 10-minute window.

**Alternatives considered**:
- Supabase Edge Function — adds cold-start latency, deployment complexity, and a separate deployment pipeline; rejected per YAGNI.
- Direct table write via anon + custom RLS — would require RLS policies that allow anon inserts to `profiles`, which is an unacceptable security regression; rejected.

---

## Decision 3 — Manual Code Lookup Without family_id

**Decision**: `consume_pairing_token_by_code(p_manual_code TEXT)` looks up tokens by `manual_code` globally (across all families) within the active window (`used_at IS NULL AND expires_at > NOW()`). The `family_id` is derived from the matched token row.

**Rationale**: A child device using manual entry doesn't know the parent's `family_id`. The 6-digit manual code is short-lived (10 minutes) and randomly generated server-side. The probability of a collision between two simultaneously active codes across all families is negligible (6 digits = 1 in 1,000,000 per active token). Adding a family_id requirement would force a two-field input form on the child, breaking the UX goal of simple numeric entry.

**Alternatives considered**:
- Require both `manual_code` + `family_id` (display family_id separately on parent screen) — two-field UX is impractical for young children; rejected.
- Encode family_id prefix into the manual code (e.g., first 4 chars of family UUID + 6 digits) — longer code, harder to type; rejected.

---

## Decision 4 — QR Code Scanning Library

**Decision**: Use `expo-camera` (Expo SDK 55 compatible) for QR code scanning. Specifically: `CameraView` component with `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}` and `onBarcodeScanned` callback.

**Rationale**: `expo-camera` is the Expo-managed camera solution for SDK 50+. The `CameraView` component handles camera permissions, scanning, and lifecycle natively. It is the successor to the deprecated `Camera` from older SDKs. `useCameraPermissions()` hook provides a clean permission request flow. No separate barcode scanner library is needed — QR scanning is built in.

**Alternatives considered**:
- `expo-barcode-scanner` (standalone) — deprecated in SDK 50+; not recommended.
- `react-native-vision-camera` — powerful but over-engineered for basic QR scanning; heavier native dependency; rejected per YAGNI.
- `react-native-camera` — community-maintained, not Expo-managed; version conflicts likely; rejected.

**Install**: `npx expo install expo-camera` (SDK 55 version resolved automatically)

---

## Decision 5 — PIN Hashing Algorithm

**Decision**: Use SHA-256 via `expo-crypto`'s `Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin)`.

**Rationale**: The PIN is 6 digits (1,000,000 combinations). bcrypt would be ideal for a password but requires native code and is unavailable as an Expo-managed package. SHA-256 with `expo-crypto` is pure JavaScript, Expo-managed, and available offline. A 6-digit PIN with SHA-256 is not cryptographically strong against offline brute-force (1M iterations is trivial) but is appropriate for a child's PIN on a personal device where the attacker would need physical access to the AsyncStorage data. Future phases can migrate to a stronger scheme. The same hash is synced to `profiles.pin_hash` for parent-initiated remote reset (Phase 3).

**Alternatives considered**:
- bcrypt via `react-native-bcrypt` — community-only, not Expo-managed, requires native code; rejected.
- SHA-256 with salt — would require storing the salt alongside the hash; the improvement is marginal for a 6-digit PIN; deferred to Phase 3.
- Plain storage — never acceptable even for children's PIN; rejected.

**Install**: `npx expo install expo-crypto`

---

## Decision 6 — Local State Storage: AsyncStorage

**Decision**: Use `@react-native-async-storage/async-storage` (already installed) for both pairing state and PIN hash.

**Rationale**: `expo-secure-store` would provide encrypted OS keychain storage but requires an additional install and only works for small string values. Since the PIN is already SHA-256 hashed (not the raw PIN), and the pairing state contains no secrets (only UUIDs and role), AsyncStorage is sufficient. The child's security posture is defended by the hash, not by keychain encryption.

**Key names**:
- `@child_pairing_state` — JSON-serialized `ChildPairingState`
- `@child_pin_hash` — hex string from SHA-256

**Alternatives considered**:
- `expo-secure-store` — adds complexity without proportional security benefit for non-secret data; deferred to future security review.
- `expo-sqlite` — over-engineered for three key-value pairs; rejected per YAGNI.

---

## Decision 7 — Cloud PIN Sync: Fire-and-Forget

**Decision**: After a successful local PIN save, the `profiles` table UPDATE (`pin_hash`, `pin_length`) is dispatched but NOT awaited. Failure is logged but the user proceeds to `/(child)` regardless.

**Rationale**: FR-016 is explicit: "cloud sync failure MUST NOT prevent the child from completing setup." Local PIN storage is sufficient for day-to-day PIN entry. Cloud sync enables future parent PIN reset (Phase 3), but that is not required to complete setup. Background retry is acceptable — on next app open, the `usePairingStore` can re-attempt sync if `profiles.pin_hash` is still null.

**Implementation note**: The update call uses `getClient()` (anon key). It will succeed only if there is an RLS policy allowing it. Since the child profile was created by a SECURITY DEFINER function (and the child has no auth session), direct update to `profiles` via anon key is blocked by default RLS. Therefore: either (a) add a service_role call in the migration to update profiles after pairing, or (b) add an additional RPC `set_child_pin_hash(p_child_id UUID, p_pin_hash TEXT)` that can be called with just child_id as credential — this is Phase 3 work. For Phase 2, the sync will silently fail (logged as warn); the local hash is sufficient.

---

## Decision 8 — app/index.tsx Routing Logic

**Decision**: Modify `app/index.tsx` to check `usePairingStore` on mount and redirect to `/auth/child-scan` if unpaired.

**Rationale**: The spec clarification states: "Check the locally stored pairing state on app open. If unpaired: show the 'Link to Parent' (QR scan) screen directly." The root `app/index.tsx` is the entry point for all users. Adding a pairing-state check there is minimal and does not affect parent or single-device flows (those have `pairingState !== null` or rely on `useAuthStore.isAuthenticated`).

**Guard logic**:
1. `pairingState === null` → redirect to `/auth/child-scan` (first-time child device)
2. `pairingState !== null && !has_pin` → redirect to `/auth/child-setup-pin` (pairing done but PIN setup interrupted)
3. Otherwise → show normal index (parent login link + "Start Playing" button)

**Note**: This routing check only applies when the app is running in child-device mode. On a parent-device (or single-device), `pairingState` will be null but `useAuthStore.isAuthenticated` will be true. The check should be: only redirect to child-scan if `!isAuthenticated && pairingState === null`.

---

## Decision 9 — expo-camera Permission UX

**Decision**: If camera permission is denied or unavailable, the child-scan screen automatically shows the manual code entry view — no error blocking screen.

**Rationale**: FR-010 mandates a manual fallback. The spec states "the manual code fallback covers cases where the camera is unavailable." The UX should never dead-end — denying camera permission instantly surfaces the manual input. The `useCameraPermissions` hook from `expo-camera` makes this straightforward: if `permission?.status !== 'granted'`, render the manual entry UI instead of `CameraView`.

---

## Decision 10 — Integration Test Strategy for Phase 2

**Unit tests** (`tests/unit/childPairingToken.test.ts`):
- QR payload parsing (valid JSON, missing fields, malformed input)
- Local token expiry check (comparing `expires_at` to `Date.now()`)
- Manual code normalization (strip hyphen, validate 6 digits)

**Integration tests** (`tests/integration/childPairing.test.ts`):
- RPC: valid UUID token consumed successfully (Scenario A)
- RPC: double-consume rejected (Scenario B)
- RPC: expired token rejected (Scenario C)
- RPC: wrong family_id rejected (Scenario D)
- RPC: manual code path succeeds (Scenario E)
- Realtime: `watchForChildPaired` callback fires after token consumed (Scenario F — the US3 acceptance test deferred from Phase 1)
- Atomicity: invalid token leaves no profile row behind (Scenario G)

All integration tests use `HAS_CREDENTIALS`/`maybeDescribe` skip pattern. `afterAll` cleanup deletes created profile rows and pairing tokens.
