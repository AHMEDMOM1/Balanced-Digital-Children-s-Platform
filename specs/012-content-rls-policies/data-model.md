# Data Model: Content RLS Admin Write Policies

**Feature**: `012-content-rls-policies`
**Date**: 2026-06-11

---

## No New Entities

This feature adds no new database tables or columns. All entities were defined in spec 009. For entity definitions see [specs/009-content-schema-storage/data-model.md](../009-content-schema-storage/data-model.md).

---

## Policy Definitions

### Table: `content_items`

Expected complete policy set after spec 012 migration:

| Policy Name | Command | Condition | Source |
|-------------|---------|-----------|--------|
| `authenticated_read_content_items` | SELECT | `auth.role() = 'authenticated'` | spec 009 |
| `service_write_content_items` | ALL | `auth.role() = 'service_role'` | spec 009 |
| `admin_write_content_items` | ALL | `auth.jwt() ->> 'role' = 'admin'` | **spec 012 (NEW)** |

### Table: `categories`

Expected complete policy set after spec 012 migration:

| Policy Name | Command | Condition | Source |
|-------------|---------|-----------|--------|
| `authenticated_read_categories` | SELECT | `auth.role() = 'authenticated'` | spec 009 |
| `service_write_categories` | ALL | `auth.role() = 'service_role'` | spec 009 |
| `admin_write_categories` | ALL | `auth.jwt() ->> 'role' = 'admin'` | **spec 012 (NEW)** |

---

## Access Matrix

| Actor | Table | SELECT | INSERT | UPDATE | DELETE |
|-------|-------|--------|--------|--------|--------|
| Unauthenticated (anon) | `content_items` | ❌ | ❌ | ❌ | ❌ |
| Unauthenticated (anon) | `categories` | ❌ | ❌ | ❌ | ❌ |
| Authenticated child/parent | `content_items` | ✅ | ❌ | ❌ | ❌ |
| Authenticated child/parent | `categories` | ✅ | ❌ | ❌ | ❌ |
| Admin (`role='admin'` JWT) | `content_items` | ✅ | ✅ | ✅ | ✅ |
| Admin (`role='admin'` JWT) | `categories` | ✅ | ✅ | ✅ | ✅ |
| Service role key | `content_items` | ✅ | ✅ | ✅ | ✅ |
| Service role key | `categories` | ✅ | ✅ | ✅ | ✅ |

---

## Admin Role Mechanics

The `admin_write_*` policies use `auth.jwt() ->> 'role'`. In Supabase:

1. The JWT is issued by Supabase Auth on sign-in.
2. Custom claims in `app_metadata` are embedded into the JWT at issue time.
3. `auth.jwt()` returns the decoded JWT payload as jsonb.
4. `auth.jwt() ->> 'role'` extracts the top-level `role` key.
5. Supabase automatically promotes `app_metadata` keys to the JWT top level.

To grant admin access to a user:
```sql
-- Via Supabase Dashboard or admin API (service role only):
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';
```
The user must sign out and sign back in for the new JWT to take effect.
