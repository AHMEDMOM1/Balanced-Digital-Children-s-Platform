-- 002_rls_policies.sql
-- Row-Level Security policies for Balanced Digital Children's Platform
-- Enforces data access boundaries: parents own their family data, children read allowed content

-- ── Enable RLS on all tables ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_settings ENABLE ROW LEVEL SECURITY;

-- ── Profiles RLS ──
-- Parents can read/update their own profile and profiles within their family
CREATE POLICY profiles_parent_select ON profiles
    FOR SELECT
    USING (
        auth.uid() = id
        OR family_id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY profiles_parent_insert ON profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY profiles_parent_update ON profiles
    FOR UPDATE
    USING (auth.uid() = id OR family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY profiles_parent_delete ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- ── Content Items RLS ──
-- Children can only read content matching their age group and allowed categories
CREATE POLICY content_items_select ON content_items
    FOR SELECT
    USING (is_active = true);

-- Content items are managed by service role, not by end users
CREATE POLICY content_items_insert ON content_items
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY content_items_update ON content_items
    FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY content_items_delete ON content_items
    FOR DELETE
    USING (auth.role() = 'service_role');

-- ── Category Preferences RLS ──
-- Parents manage preferences for their own children
CREATE POLICY category_prefs_parent_select ON category_preferences
    FOR SELECT
    USING (
        parent_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent'
        )
        OR child_id = auth.uid()
    );

CREATE POLICY category_prefs_parent_insert ON category_preferences
    FOR INSERT
    WITH CHECK (
        parent_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent'
        )
    );

CREATE POLICY category_prefs_parent_update ON category_preferences
    FOR UPDATE
    USING (
        parent_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent'
        )
    );

CREATE POLICY category_prefs_parent_delete ON category_preferences
    FOR DELETE
    USING (
        parent_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- ── Sessions RLS ──
-- Children can read/insert their own sessions; parents can read their children's sessions
CREATE POLICY sessions_child_select ON sessions
    FOR SELECT
    USING (
        child_id = auth.uid()
        OR parent_id = auth.uid()
        OR parent_id IN (
            SELECT id FROM profiles WHERE id = auth.uid() AND role = 'parent'
        )
    );

CREATE POLICY sessions_child_insert ON sessions
    FOR INSERT
    WITH CHECK (
        child_id = auth.uid()
        OR parent_id = auth.uid()
    );

CREATE POLICY sessions_child_update ON sessions
    FOR UPDATE
    USING (
        child_id = auth.uid()
        OR parent_id = auth.uid()
    );

-- ── Activity Logs RLS ──
CREATE POLICY activity_logs_select ON activity_logs
    FOR SELECT
    USING (
        child_id = auth.uid()
        OR child_id IN (
            SELECT id FROM profiles
            WHERE family_id IN (
                SELECT family_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY activity_logs_insert ON activity_logs
    FOR INSERT
    WITH CHECK (child_id = auth.uid());

-- ── Family Codes RLS ──
CREATE POLICY family_codes_select ON family_codes
    FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY family_codes_insert ON family_codes
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY family_codes_update ON family_codes
    FOR UPDATE
    USING (
        created_by = auth.uid()
    );

-- ── Parent Settings RLS ──
CREATE POLICY parent_settings_select ON parent_settings
    FOR SELECT
    USING (
        parent_id = auth.uid()
        OR child_id IN (
            SELECT id FROM profiles
            WHERE family_id IN (
                SELECT family_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY parent_settings_insert ON parent_settings
    FOR INSERT
    WITH CHECK (parent_id = auth.uid());

CREATE POLICY parent_settings_update ON parent_settings
    FOR UPDATE
    USING (parent_id = auth.uid());

-- ── Helper: Create parent/child lookup function ──
CREATE OR REPLACE FUNCTION public.get_user_family_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT family_id FROM profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_family_id IS 'Returns the family_id for the currently authenticated user';
