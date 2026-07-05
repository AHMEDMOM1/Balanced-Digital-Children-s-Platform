-- Data repair: profiles.family_id defaults to gen_random_uuid() (see
-- 20260609000000_full_schema_bootstrap.sql line 17/31), which is unrelated to
-- the parent's own id. Every parent_*_pairing_tokens RLS policy, plus
-- parent_read_sessions and friends, assume family_id = the parent's own id
-- (this is the convention used everywhere in app code — see
-- services/auth.ts buildAuthStateFromSession: parentData.familyId = profile.id).
-- Since nothing ever set family_id to match, every parent's pairing_tokens
-- INSERT (and session/report reads) were silently failing RLS checks.
--
-- Fix existing rows. Children inherit their parent's id as family_id too,
-- to match the value the app already sends when opening sessions
-- (childData.familyId = profile.parent_id).

UPDATE profiles
SET family_id = id
WHERE role = 'parent' AND family_id IS DISTINCT FROM id;

UPDATE profiles c
SET family_id = c.parent_id
FROM profiles p
WHERE c.role = 'child'
  AND c.parent_id = p.id
  AND c.family_id IS DISTINCT FROM c.parent_id;

NOTIFY pgrst, 'reload schema';
