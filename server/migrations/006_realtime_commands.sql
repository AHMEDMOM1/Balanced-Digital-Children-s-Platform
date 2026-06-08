-- Create realtime_commands table
CREATE TABLE IF NOT EXISTS realtime_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  child_id UUID,
  command_type TEXT NOT NULL CHECK (command_type IN ('pause', 'resume', 'time_update', 'category_block', 'force_end')),
  payload JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE realtime_commands ENABLE ROW LEVEL SECURITY;

-- Index for fast child reconnection query
CREATE INDEX idx_realtime_commands_child_unacked
  ON realtime_commands (family_id, child_id, acknowledged_at)
  WHERE acknowledged_at IS NULL;

-- Policy: Parents can insert commands they send
CREATE POLICY "Parents can create commands"
  ON realtime_commands FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Policy: Children can read commands targeted at them
CREATE POLICY "Children can read their commands"
  ON realtime_commands FOR SELECT
  USING (
    child_id = auth.uid()
    OR (child_id IS NULL AND family_id IN (
      SELECT parent_id FROM profiles WHERE id = auth.uid()
    ))
  );

-- Policy: Parents can read commands they sent
CREATE POLICY "Parents can read own commands"
  ON realtime_commands FOR SELECT
  USING (sender_id = auth.uid());

-- Policy: Children can acknowledge commands
CREATE POLICY "Children can acknowledge commands"
  ON realtime_commands FOR UPDATE
  USING (
    child_id = auth.uid()
    OR (child_id IS NULL AND family_id IN (
      SELECT parent_id FROM profiles WHERE id = auth.uid()
    ))
  )
  WITH CHECK (
    child_id = auth.uid()
    OR (child_id IS NULL AND family_id IN (
      SELECT parent_id FROM profiles WHERE id = auth.uid()
    ))
  );
