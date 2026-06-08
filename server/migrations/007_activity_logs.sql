-- Create activity_logs table (FR-005: audit trail for all commands and state changes)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id),  -- who triggered the event
  target_child_id UUID,                               -- which child was affected (null = all)
  event_type TEXT NOT NULL,                           -- e.g. 'command_sent', 'command_applied', 'session_paused'
  command_id UUID,                                    -- references realtime_commands.id (nullable)
  payload JSONB DEFAULT '{}',                         -- additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Index for fast family audit queries
CREATE INDEX idx_activity_logs_family
  ON activity_logs (family_id, created_at DESC);

-- Policy: Parents can read their family's activity logs
CREATE POLICY "Parents can read family activity logs"
  ON activity_logs FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM families WHERE parent_id = auth.uid()
    )
  );

-- Policy: System (service role) inserts logs — app inserts via supabase client
CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());
