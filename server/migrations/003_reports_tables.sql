-- 003_reports_tables.sql
-- Phase 3: Daily statistics rollup table for the Live Reports & Charts feature.

-- ── Daily Stats (pre-computed per-child, per-day aggregation) ──
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_seconds INTEGER DEFAULT 0,
    stories_seconds INTEGER DEFAULT 0,
    games_seconds INTEGER DEFAULT 0,
    videos_seconds INTEGER DEFAULT 0,
    creative_seconds INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    top_activity TEXT,
    timezone_offset_minutes INTEGER DEFAULT 0,
    is_finalized BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(child_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_child_date
    ON daily_stats(child_id, stat_date DESC);

COMMENT ON TABLE daily_stats IS 'Pre-computed daily usage rollup per child for fast report queries.';

-- ── Row-Level Security ──
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Parents can only read stats for their own children
CREATE POLICY "parent_read_daily_stats" ON daily_stats
    FOR SELECT
    USING (
        child_id IN (
            SELECT id FROM profiles
            WHERE parent_id = auth.uid()
              AND role = 'child'
        )
    );

-- Only the service role (pg_cron / Edge Function) can write
CREATE POLICY "service_write_daily_stats" ON daily_stats
    FOR ALL
    USING (auth.role() = 'service_role');

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

-- ── Aggregate Function (with error logging and fallback) ──
CREATE OR REPLACE FUNCTION aggregate_daily_stats(p_child_id UUID, p_day DATE)
RETURNS void AS $$
DECLARE
    v_total_seconds     INTEGER := 0;
    v_stories_seconds   INTEGER := 0;
    v_games_seconds     INTEGER := 0;
    v_videos_seconds    INTEGER := 0;
    v_creative_seconds  INTEGER := 0;
    v_session_count     INTEGER := 0;
    v_top_activity      TEXT;
    v_log_id            UUID;
BEGIN
    -- Log job start
    INSERT INTO cron_job_log (job_name, status, started_at, child_id)
    VALUES ('aggregate_daily_stats', 'running', now(), p_child_id)
    RETURNING id INTO v_log_id;

    -- Main aggregation: bucket sessions by child's local calendar day
    BEGIN
        SELECT
            COALESCE(SUM(elapsed_seconds), 0),
            COALESCE(SUM(CASE WHEN activity_type = 'story'    THEN elapsed_seconds ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN activity_type = 'game'     THEN elapsed_seconds ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN activity_type = 'video'    THEN elapsed_seconds ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN activity_type = 'creative' THEN elapsed_seconds ELSE 0 END), 0),
            COUNT(*)
        INTO
            v_total_seconds, v_stories_seconds, v_games_seconds,
            v_videos_seconds, v_creative_seconds, v_session_count
        FROM sessions s
        CROSS JOIN LATERAL (
            SELECT COALESCE(p.timezone_offset_minutes, 0) AS tz_offset
            FROM profiles p
            WHERE p.id = p_child_id
        ) tz
        WHERE s.child_id = p_child_id
          AND DATE(s.started_at AT TIME ZONE 'UTC' AT TIME ZONE (interval '1 minute' * tz.tz_offset)) = p_day
          AND s.status IN ('completed', 'paused');
    EXCEPTION WHEN OTHERS THEN
        UPDATE cron_job_log
        SET status = 'failed', finished_at = now(), error_message = SQLERRM
        WHERE id = v_log_id;
        RAISE;
    END;

    -- Top activity query
    BEGIN
        SELECT ci.title INTO v_top_activity
        FROM sessions s
        JOIN content_items ci ON s.content_item_id = ci.id
        CROSS JOIN LATERAL (
            SELECT COALESCE(p.timezone_offset_minutes, 0) AS tz_offset
            FROM profiles p
            WHERE p.id = p_child_id
        ) tz
        WHERE s.child_id = p_child_id
          AND DATE(s.started_at AT TIME ZONE 'UTC' AT TIME ZONE (interval '1 minute' * tz.tz_offset)) = p_day
          AND s.status IN ('completed', 'paused')
        GROUP BY ci.title
        ORDER BY SUM(s.elapsed_seconds) DESC
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_top_activity := NULL;
    END;

    -- Upsert daily_stats
    BEGIN
        INSERT INTO daily_stats (
            child_id, stat_date, total_seconds, stories_seconds, games_seconds,
            videos_seconds, creative_seconds, session_count, top_activity, is_finalized
        ) VALUES (
            p_child_id, p_day, v_total_seconds, v_stories_seconds, v_games_seconds,
            v_videos_seconds, v_creative_seconds, v_session_count, v_top_activity,
            (p_day < CURRENT_DATE)
        )
        ON CONFLICT (child_id, stat_date) DO UPDATE SET
            total_seconds    = EXCLUDED.total_seconds,
            stories_seconds  = EXCLUDED.stories_seconds,
            games_seconds    = EXCLUDED.games_seconds,
            videos_seconds   = EXCLUDED.videos_seconds,
            creative_seconds = EXCLUDED.creative_seconds,
            session_count    = EXCLUDED.session_count,
            top_activity     = EXCLUDED.top_activity,
            is_finalized     = EXCLUDED.is_finalized,
            updated_at       = now();
    EXCEPTION WHEN OTHERS THEN
        UPDATE cron_job_log
        SET status = 'failed', finished_at = now(), error_message = SQLERRM
        WHERE id = v_log_id;
        RAISE;
    END;

    -- Mark job as success
    UPDATE cron_job_log
    SET status = 'success', finished_at = now()
    WHERE id = v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;