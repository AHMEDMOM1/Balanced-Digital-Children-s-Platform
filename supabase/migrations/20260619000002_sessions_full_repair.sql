-- Repair migration: creates `sessions` if it never existed on this project,
-- then (re)applies everything 20260613020001 and 20260619000001 needed.
-- Fully idempotent — safe to run multiple times on a partially-applied DB.

-- 1. Create sessions if missing (matches 20260609000000_full_schema_bootstrap.sql)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES profiles(id),
    activity_type TEXT NOT NULL,
    content_item_id UUID,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    elapsed_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_child_id ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 2. family_id column for CDC filtering (no FK — plain UUID by convention, see pairing_tokens)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS family_id UUID;

UPDATE sessions s
SET family_id = p.family_id
FROM profiles p
WHERE p.id = s.parent_id AND s.family_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions(family_id);

-- 3. RLS policies (drop any earlier version first, then recreate)
DROP POLICY IF EXISTS sessions_child_select ON sessions;
DROP POLICY IF EXISTS sessions_child_insert ON sessions;
DROP POLICY IF EXISTS sessions_child_update ON sessions;
DROP POLICY IF EXISTS child_own_sessions_select ON sessions;
DROP POLICY IF EXISTS child_own_sessions_insert ON sessions;
DROP POLICY IF EXISTS child_own_sessions_update ON sessions;
DROP POLICY IF EXISTS parent_read_sessions ON sessions;

CREATE POLICY child_own_sessions_select ON sessions FOR SELECT
    USING (child_id = auth.uid());

CREATE POLICY child_own_sessions_insert ON sessions FOR INSERT
    WITH CHECK (child_id = auth.uid());

CREATE POLICY child_own_sessions_update ON sessions FOR UPDATE
    USING (child_id = auth.uid());

CREATE POLICY parent_read_sessions ON sessions FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles
            WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- 4. CDC support
ALTER TABLE sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
    END IF;
END $$;

-- 5. REST access + schema cache reload
GRANT SELECT, INSERT, UPDATE ON public.sessions TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
