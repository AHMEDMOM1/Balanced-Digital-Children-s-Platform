-- 004_data_retention.sql
-- Phase 3: Data retention policy for daily_stats.
-- Purges aggregated stats older than 90 days for deleted/anonymized children.

-- ── Cron Job Log Table ──
CREATE TABLE IF NOT EXISTS cron_job_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    started_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    child_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ── Data Retention: Purge old stats ──
-- Run weekly: deletes daily_stats rows where the child profile no longer exists
-- and the stat_date is older than 90 days (anonymized data TTL).
CREATE OR REPLACE FUNCTION purge_old_daily_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO cron_job_log (job_name, status, started_at)
    VALUES ('purge_old_daily_stats', 'running', now());

    DELETE FROM daily_stats d
    WHERE d.stat_date < CURRENT_DATE - 90
      AND NOT EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = d.child_id
      );

    UPDATE cron_job_log
    SET status = 'success', finished_at = now()
    WHERE job_name = 'purge_old_daily_stats'
      AND status = 'running'
      AND finished_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule weekly purge (Sunday at 03:00 UTC)
SELECT cron.schedule(
    'purge-old-daily-stats',
    '0 3 * * 0',
    $$SELECT purge_old_daily_stats();$$
);
