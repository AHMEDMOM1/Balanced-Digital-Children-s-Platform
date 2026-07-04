-- spec 020: Add family_id to sessions for CDC filtering and RLS
-- Enables parent to subscribe to live session inserts via postgres_changes
-- filtered by family_id

-- 1. Add family_id column
-- No FK here: family_id is a plain UUID matching a parent profile's id by
-- convention throughout this schema (see pairing_tokens, device_registrations)
-- — there is no separate `families` table.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS family_id UUID;

-- 2. Backfill existing rows: set family_id from parent profile
UPDATE sessions s
SET family_id = p.family_id
FROM profiles p
WHERE p.id = s.parent_id AND s.family_id IS NULL;

-- 3. Add index for CDC filter performance
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions(family_id);

-- 4. Update RLS policies to use family_id
DROP POLICY IF EXISTS sessions_child_select ON sessions;
DROP POLICY IF EXISTS sessions_child_insert ON sessions;
DROP POLICY IF EXISTS sessions_child_update ON sessions;

-- Child: read own sessions
CREATE POLICY child_own_sessions_select ON sessions FOR SELECT
    USING (child_id = auth.uid());

-- Child: insert own sessions
CREATE POLICY child_own_sessions_insert ON sessions FOR INSERT
    WITH CHECK (child_id = auth.uid());

-- Child: update own sessions (close them)
CREATE POLICY child_own_sessions_update ON sessions FOR UPDATE
    USING (child_id = auth.uid());

-- Parent: read sessions for their family
CREATE POLICY parent_read_sessions ON sessions FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles
            WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- 5. Enable full replica identity for CDC UPDATE payloads
ALTER TABLE sessions REPLICA IDENTITY FULL;

-- 6. Add sessions to Realtime publication for CDC
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
