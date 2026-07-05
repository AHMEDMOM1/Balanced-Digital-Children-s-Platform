# Data Model: Parent Device Registration & QR Pairing

**Spec**: 016-parent-qr-pairing | **Date**: 2026-06-11

---

## New Database Tables (Phase 0 Migration)

### `pairing_tokens`

Stores one-time, time-limited pairing invitations created by a parent device.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Row identifier |
| `family_id` | UUID | NOT NULL | Must match the parent's `profiles.family_id` |
| `token` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | The secret value encoded in the QR code |
| `manual_code` | TEXT | NOT NULL | 6-digit human-readable code (e.g. "482931"), stored without hyphen |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the token was generated |
| `expires_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() + INTERVAL '10 minutes' | Server-authoritative expiry time |
| `used_at` | TIMESTAMPTZ | NULL | NULL = available; non-NULL = consumed |
| `child_id` | UUID | NULLABLE, FK → profiles(id) | Set when consumed (Phase 2) |

**Indexes**:
- `idx_pairing_tokens_family_id` on `(family_id)`
- `idx_pairing_tokens_token` on `(token)` (supports Phase 2 lookup)
- `idx_pairing_tokens_manual_code` on `(manual_code)` (supports Phase 2 manual entry)

**RLS**:
- Enabled
- `parent_read_pairing_tokens`: parent can SELECT tokens where `family_id` matches their own profile
- `parent_write_pairing_tokens`: parent can INSERT tokens where `family_id` matches their own profile

**State transitions**:
```
INSERT (used_at = NULL) → available
UPDATE used_at = now()  → consumed (Phase 2)
```

**Lifecycle**:
- Tokens are never deleted. Expired unconsumed tokens are simply ignored (server validates `expires_at > now()`).
- Multiple unexpired tokens for the same family_id are allowed (all are valid until used or expired).

---

### `device_registrations`

Tracks one row per physical device associated with a family. Created in Phase 0 migration; populated in Phase 2.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Row identifier |
| `profile_id` | UUID | NOT NULL, FK → profiles(id) ON DELETE CASCADE | The user profile this device belongs to |
| `family_id` | UUID | NOT NULL | Denormalized family identifier for query efficiency |
| `device_role` | TEXT | NOT NULL, CHECK IN ('parent', 'child') | Role this device serves |
| `device_token` | TEXT | NULLABLE | Push notification token (reserved for future use) |
| `last_seen_at` | TIMESTAMPTZ | NULLABLE | Updated on heartbeat (Phase 4) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the device first registered |

**RLS**: Enabled; policies defined in Phase 0 migration but no writes occur in Phase 1.

---

## Existing Table Modifications (Phase 0 Migration)

### `profiles` — new columns

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `pin_hash` | TEXT | NULL | bcrypt hash of the device PIN (set in Phase 3) |
| `pin_length` | INT | 6 | Number of digits in the PIN (Phase 3) |

These columns are added idempotently (`ADD COLUMN IF NOT EXISTS`). They are NULL for all existing rows and remain unused until Phase 3.

---

## TypeScript Types (additions to `services/api/types.ts`)

```typescript
export interface PairingToken {
  id: string;
  family_id: string;
  token: string;
  manual_code: string;        // raw 6 digits, e.g. "482931"
  created_at: string;
  expires_at: string;         // ISO 8601 UTC
  used_at: string | null;
  child_id: string | null;
}

export interface PairingResult {
  token: PairingToken | null;
  /** Formatted display code, e.g. "482-931" */
  displayCode: string | null;
  error: string | null;
}
```

---

## Existing Schema Context (no changes)

The existing `profiles` table already has:
- `family_id UUID` — the shared family identifier used across all queries
- `role TEXT CHECK IN ('parent', 'child')` — used in RLS policy expressions
- `unlock_pin_hash TEXT` — existing field for child unlock PIN

The new `pairing_tokens.family_id` is a plain UUID matched against `profiles.family_id` — not a foreign key to a separate families table (see `research.md` Decision 3).
