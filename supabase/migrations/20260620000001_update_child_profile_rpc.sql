-- Migration: bypass the family_id-matching RLS path for child profile
-- writes entirely. The "Unnamed child" save kept failing
-- ("Cannot coerce the result to a single JSON object" — i.e. the UPDATE
-- matched zero rows) despite the parent's own family_id self-heal already
-- being in place, which means something about the family_id comparison
-- still doesn't line up for some pairings (stale client state, ordering,
-- or otherwise) and is not worth chasing further. This RPC validates
-- ownership directly via the child's parent_id column instead — set
-- correctly and unambiguously by consume_pairing_token at pairing time —
-- which sidesteps the family_id question altogether.

CREATE OR REPLACE FUNCTION public.update_child_profile(
  p_child_id     UUID,
  p_full_name    TEXT,
  p_age_group    TEXT,
  p_avatar_color TEXT DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT parent_id INTO v_parent_id FROM profiles WHERE id = p_child_id AND role = 'child';

  IF v_parent_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'child_not_found');
  END IF;

  IF v_parent_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'not_authorized');
  END IF;

  UPDATE profiles
  SET full_name = p_full_name, age_group = p_age_group, avatar_color = p_avatar_color
  WHERE id = p_child_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_child_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
