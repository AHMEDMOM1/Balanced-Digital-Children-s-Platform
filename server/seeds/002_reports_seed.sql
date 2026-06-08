-- 002_reports_seed.sql
-- Phase 3 seed: 30 days of daily_stats for existing seed children.
-- Relies on seed children from 001_initial_data.sql having known IDs via a subquery.

DO $$
DECLARE
    v_child RECORD;
    v_day DATE;
    v_i INTEGER;
BEGIN
    FOR v_child IN
        SELECT id FROM profiles WHERE role = 'child' LIMIT 5
    LOOP
        FOR v_i IN 0..29 LOOP
            v_day := CURRENT_DATE - v_i;
            INSERT INTO daily_stats (
                child_id, stat_date,
                total_seconds, stories_seconds, games_seconds,
                videos_seconds, creative_seconds,
                session_count, top_activity, is_finalized
            ) VALUES (
                v_child.id,
                v_day,
                (1200 + (random() * 3600)::int),
                (300  + (random() * 900)::int),
                (200  + (random() * 800)::int),
                (100  + (random() * 600)::int),
                (200  + (random() * 700)::int),
                (2    + (random() * 4)::int),
                (ARRAY['The Brave Knight', 'Puzzle Palace', 'Animal Kingdom', 'Magic Canvas', 'Space Explorer'])[1 + (random() * 4)::int],
                (v_day < CURRENT_DATE)
            )
            ON CONFLICT (child_id, stat_date) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;