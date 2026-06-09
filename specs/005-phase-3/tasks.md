# Tasks: Phase 3 — Live Reports & Charts

**Input**: Design documents from `specs/005-phase-3/`

**Branch**: `005-phase-3`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [data-model.md](./data-model.md) · [research.md](./research.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)
- All file paths are relative to project root

---

## Phase 1: Setup (Dependencies & Packages)

**Purpose**: Install required packages before any implementation begins.

**⚠️ CRITICAL**: Complete this phase before writing any new code.

- [x] T001 Install `victory-native` chart library by running `npx expo install victory-native @shopify/react-native-skia react-native-reanimated react-native-gesture-handler` in the project root. Verify installation by checking that `package.json` lists `victory-native` under `dependencies`.

- [x] T002 Install export dependencies by running `npx expo install react-native-view-shot expo-sharing` in the project root. Verify installation by checking that `package.json` lists `react-native-view-shot` and `expo-sharing` under `dependencies`.

- [x] T003 [P] Open `app/_layout.tsx` and confirm `GestureHandlerRootView` wraps the root navigator. If it does not exist, wrap the return statement's root element with `<GestureHandlerRootView style={{ flex: 1 }}>`. This is required by `victory-native`.

**Checkpoint**: All packages installed. Running `npx expo start` should not error on missing modules.

---

## Phase 2: Foundational — Database Migration

**Purpose**: Create the `daily_stats` table and the `aggregate_daily_stats` Postgres function. ALL user story screens depend on this data structure.

**⚠️ CRITICAL**: Apply this migration before writing any API service code.

- [ ] T004b [P] Create Supabase pg_cron job (or Edge Function cron) to run `aggregate_daily_stats` nightly for each child. In Supabase SQL editor:
  ```sql
  -- Enable pg_cron if not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Schedule nightly at 00:05 UTC+3 (Arabia Standard Time) for each child
  SELECT cron.schedule(
    'aggregate-daily-stats',
    '5 21 * * *',  -- 00:05 AST = 21:05 UTC
    $$
    DO $$
    DECLARE v_child RECORD;
    BEGIN
      FOR v_child IN SELECT id FROM profiles WHERE role = 'child' LOOP
        PERFORM aggregate_daily_stats(v_child.id, CURRENT_DATE - 1);
      END LOOP;
    END $$;
    $$
  );
  ```
  If pg_cron unavailable (lower Supabase tier), create an Edge Function with a cron trigger instead.

- [x] T004 Create the file `server/migrations/003_reports_tables.sql` with EXACTLY this content:

  ```sql
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

  -- ── Aggregate Function ──
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
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

- [x] T005 Create the file `server/seeds/002_reports_seed.sql`. This file generates 30 days of `daily_stats` rows for all seed children. Write the following content EXACTLY:

  ```sql
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
  ```

**Checkpoint**: After applying migration and seed in Supabase SQL editor, run `SELECT COUNT(*) FROM daily_stats;` — must return > 0 rows.

---

## Phase 3: Foundational — TypeScript Types & API Service

**Purpose**: Add new types and the `reports.ts` service module. All three user stories depend on this foundation.

- [x] T006 Open `services/api/types.ts`. At the END of the file (after the last export), append the following three new type definitions without modifying any existing types:

  ```typescript
  export type ReportRange = 'today' | 'week' | 'month';

  export interface DailyStats {
    id: string;
    child_id: string;
    stat_date: string; // ISO format: 'YYYY-MM-DD'
    total_seconds: number;
    stories_seconds: number;
    games_seconds: number;
    videos_seconds: number;
    creative_seconds: number;
    session_count: number;
    top_activity: string | null;
    timezone_offset_minutes: number;
    is_finalized: boolean;
  }

  export interface ComparisonData {
    childA: { id: string; name: string; stats: DailyStats[] };
    childB: { id: string; name: string; stats: DailyStats[] };
    normalizedMax: number;
  }
  ```

- [x] T007 Create a NEW file `services/api/reports.ts` with the following COMPLETE content. Do NOT modify any existing files. Copy EXACTLY:

  ```typescript
  /**
   * services/api/reports.ts
   * Phase 3: Live Reports & Charts API service.
   * Exports three hooks:
   *   - useDailyStats:       fetches historical rollups for a date range
   *   - useLiveTodayStats:   Realtime subscription for today's partial stats
   *   - useComparisonStats:  fetches and normalizes two children's stats side-by-side
   */
  import { useState, useEffect, useRef, useCallback } from 'react';
  import { supabase } from './client';
  import { DailyStats, ComparisonData, ReportRange, ApiResponse } from './types';
  import useAuthStore from '../../store/useAuthStore';

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getDateRange(range: ReportRange): { from: string; to: string } {
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().split('T')[0];
    if (range === 'today') {
      const s = toISO(today);
      return { from: s, to: s };
    }
    if (range === 'week') {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { from: toISO(from), to: toISO(today) };
    }
    // month
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    return { from: toISO(from), to: toISO(today) };
  }

  // ─── Hook: useDailyStats ────────────────────────────────────────────────────

  export function useDailyStats(
    childId: string | null,
    range: ReportRange
  ): ApiResponse<DailyStats[]> {
    const [data, setData] = useState<DailyStats[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    const fetchStats = useCallback(async () => {
      if (!childId) return;
      setIsLoading(true);
      setError(null);
      const { from, to } = getDateRange(range);
      const { data: rows, error: err } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('child_id', childId)
        .gte('stat_date', from)
        .lte('stat_date', to)
        .order('stat_date', { ascending: true });

      if (err) {
        setError(err.message);
        setIsOffline(true);
      } else {
        setData(rows as DailyStats[]);
        setIsOffline(false);
      }
      setIsLoading(false);
    }, [childId, range]);

    useEffect(() => {
      fetchStats();
    }, [fetchStats]);

    return { data, error, isLoading, isOffline };
  }

  // ─── Hook: useLiveTodayStats ────────────────────────────────────────────────

  /**
   * Opens a Supabase Realtime subscription on the `sessions` table.
   * Whenever a new session is INSERT-ed or an existing one is UPDATE-d
   * for the given child, we re-fetch today's partial stats from `daily_stats`.
   * Returns the latest DailyStats row for today (or null if none yet).
   */
  export function useLiveTodayStats(childId: string | null): {
    todayStats: DailyStats | null;
    isLive: boolean;
  } {
    const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
    const [isLive, setIsLive] = useState(false);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const fetchToday = useCallback(async () => {
      if (!childId) return;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('child_id', childId)
        .eq('stat_date', today)
        .single();
      if (!error && data) setTodayStats(data as DailyStats);
    }, [childId]);

    useEffect(() => {
      if (!childId) return;

      fetchToday(); // initial load

      const channel = supabase
        .channel(`live_today_${childId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessions',
            filter: `child_id=eq.${childId}`,
          },
          () => {
            // Re-fetch today's rollup from daily_stats on any session change
            fetchToday();
          }
        )
        .subscribe((status) => {
          setIsLive(status === 'SUBSCRIBED');
        });

      channelRef.current = channel;

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
      };
    }, [childId, fetchToday]);

    return { todayStats, isLive };
  }

  // ─── Hook: useComparisonStats ───────────────────────────────────────────────

  export function useComparisonStats(
    childIds: [string, string] | null,
    range: 'week' | 'month'
  ): ApiResponse<ComparisonData> {
    const [data, setData] = useState<ComparisonData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const children = useAuthStore((s) => s.children);

    useEffect(() => {
      if (!childIds) return;
      const [idA, idB] = childIds;
      setIsLoading(true);

      const { from, to } = getDateRange(range);

      Promise.all([
        supabase
          .from('daily_stats')
          .select('*')
          .eq('child_id', idA)
          .gte('stat_date', from)
          .lte('stat_date', to)
          .order('stat_date', { ascending: true }),
        supabase
          .from('daily_stats')
          .select('*')
          .eq('child_id', idB)
          .gte('stat_date', from)
          .lte('stat_date', to)
          .order('stat_date', { ascending: true }),
      ]).then(([resA, resB]) => {
        if (resA.error || resB.error) {
          setError((resA.error || resB.error)!.message);
          setIsOffline(true);
        } else {
          const statsA = (resA.data as DailyStats[]) || [];
          const statsB = (resB.data as DailyStats[]) || [];
          const allTotals = [...statsA, ...statsB].map((s) => s.total_seconds);
          const normalizedMax = allTotals.length > 0 ? Math.max(...allTotals) : 3600;
          const nameA = children.find((c) => c.id === idA)?.name ?? 'Child A';
          const nameB = children.find((c) => c.id === idB)?.name ?? 'Child B';
          setData({ childA: { id: idA, name: nameA, stats: statsA }, childB: { id: idB, name: nameB, stats: statsB }, normalizedMax });
          setIsOffline(false);
        }
        setIsLoading(false);
      });
    }, [childIds, range, children]);

    return { data, error, isLoading, isOffline };
  }
  ```

**Checkpoint**: TypeScript should compile without errors. Check by running `npx tsc --noEmit` from the project root.

---

## Phase 4: User Story 1 — Filterable Activity Dashboard (P1) 🎯 MVP

**Goal**: Replace all hardcoded values in `reports.tsx` with live data. Parent can select Today / Week / Month and see real aggregated usage from the database.

**Independent Test**: Open the reports screen as a logged-in parent → data reflects actual `daily_stats` rows, not hardcoded strings. Changing the time range updates all displayed values.

### Implementation

- [x] T008 [US1] Open `app/(parent)/reports.tsx`. Replace the ENTIRE file content with the following implementation. This is a complete rewrite of the screen — do NOT keep any of the old hardcoded values:

  ```tsx
  /**
   * app/(parent)/reports.tsx — Phase 3
   * Live Reports & Charts screen using real data from Supabase.
   * Replaces all static placeholder values with hooks from services/api/reports.ts
   */
  import React, { useState, useRef } from 'react';
  import {
    View, Text, ScrollView, StyleSheet, SafeAreaView,
    TouchableOpacity, ActivityIndicator,
  } from 'react-native';
  import { Ionicons } from '@expo/vector-icons';
  import { LinearGradient } from 'expo-linear-gradient';
  import Colors from '../../constants/Colors';
  import Typography from '../../constants/Typography';
  import Layout from '../../constants/Layout';
  import Header from '../../components/ui/Header';
  import useAuthStore from '../../store/useAuthStore';
  import { useDailyStats, useLiveTodayStats } from '../../services/api/reports';
  import { DailyStats, ReportRange } from '../../services/api/types';

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function formatSeconds(seconds: number): string {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function calcDailyAvg(stats: DailyStats[], range: ReportRange): number {
    if (!stats || stats.length === 0) return 0;
    const total = stats.reduce((sum, s) => sum + s.total_seconds, 0);
    const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;
    return Math.round(total / days);
  }

  const RANGES: { label: string; value: ReportRange }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
  ];

  const CATEGORY_CONFIG = [
    { key: 'stories_seconds' as keyof DailyStats, label: 'StoryTime', color: '#7C5CFC' },
    { key: 'games_seconds'   as keyof DailyStats, label: 'Brain Games', color: '#FF6B6B' },
    { key: 'creative_seconds'as keyof DailyStats, label: 'Creative Zone', color: '#FFB800' },
    { key: 'videos_seconds'  as keyof DailyStats, label: 'Videos', color: '#494551' },
  ];

  // ─── Main Screen ─────────────────────────────────────────────────────────────

  export default function ReportsScreen() {
    const [range, setRange] = useState<ReportRange>('week');
    const children = useAuthStore((s) => s.children);
    const activeChild = children.find((c) => c.is_active) ?? children[0] ?? null;
    const childId = activeChild?.id ?? null;

    const { data: stats, isLoading, error } = useDailyStats(childId, range);
    const { todayStats, isLive } = useLiveTodayStats(childId);

    // Merge live today data if range is 'today'
    const displayStats = range === 'today' && todayStats ? [todayStats] : (stats ?? []);

    const totalSeconds = displayStats.reduce((sum, s) => sum + s.total_seconds, 0);
    const dailyAvg = calcDailyAvg(displayStats, range);

    const categoryTotals = CATEGORY_CONFIG.map((cat) => ({
      ...cat,
      value: displayStats.reduce((sum, s) => sum + ((s[cat.key] as number) || 0), 0),
    }));
    const maxCategory = Math.max(...categoryTotals.map((c) => c.value), 1);

    // Bar chart data (last 7 days for week, last 30 for month, 1 for today)
    const barData = displayStats.slice(-7);
    const maxBar = Math.max(...barData.map((s) => s.total_seconds), 1);

    return (
      <SafeAreaView style={styles.safe}>
        <Header showLock={false} title="Reports" />

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* ── Time Range Picker ── */}
          <View style={styles.rangeRow}>
            {RANGES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.rangeBtn, range === r.value && styles.rangeBtnActive]}
                onPress={() => setRange(r.value)}
              >
                <Text style={[styles.rangeBtnText, range === r.value && styles.rangeBtnTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Live Indicator ── */}
          {isLive && range === 'today' && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          )}

          {/* ── Loading ── */}
          {isLoading && (
            <View style={styles.stateCenter}>
              <ActivityIndicator size="large" color={Colors.parent.primary} />
              <Text style={styles.stateText}>Loading report data...</Text>
            </View>
          )}

          {/* ── Error ── */}
          {error && !isLoading && (
            <View style={styles.stateCenter}>
              <Ionicons name="cloud-offline-outline" size={48} color={Colors.parent.textSecondary} />
              <Text style={styles.stateText}>Could not load reports. Check your connection.</Text>
            </View>
          )}

          {/* ── Empty State ── */}
          {!isLoading && !error && displayStats.length === 0 && (
            <View style={styles.stateCenter}>
              <Ionicons name="bar-chart-outline" size={48} color={Colors.parent.textSecondary} />
              <Text style={styles.stateText}>No activity recorded for this period.</Text>
            </View>
          )}

          {/* ── Data Views ── */}
          {!isLoading && !error && displayStats.length > 0 && (
            <>
              {/* ── Summary Stats ── */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="stats-chart" size={18} color={Colors.parent.primary} />
                    <Text style={styles.cardLabel}>Total Time</Text>
                  </View>
                  <Text style={styles.cardValue}>{formatSeconds(totalSeconds)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="today" size={18} color={Colors.parent.primary} />
                    <Text style={styles.cardLabel}>Daily Avg</Text>
                  </View>
                  <Text style={styles.cardValue}>{formatSeconds(dailyAvg)}</Text>
                </View>
              </View>

              {/* ── Bar Chart ── */}
              <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Usage History</Text>
                <View style={styles.barChart}>
                  {barData.map((day) => {
                    const heightPct = maxBar > 0 ? (day.total_seconds / maxBar) : 0;
                    const barHeight = Math.max(4, Math.round(heightPct * 120));
                    const label = range === 'today'
                      ? 'Today'
                      : new Date(day.stat_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <View key={day.stat_date} style={styles.barContainer}>
                        <LinearGradient
                          colors={['#9D7CFF', Colors.parent.primary]}
                          style={[styles.bar, { height: barHeight }]}
                        />
                        <Text style={styles.barLabel}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ── Category Breakdown ── */}
              <View style={styles.breakdownCard}>
                <Text style={styles.sectionTitle}>Activity Breakdown</Text>
                {categoryTotals.map((cat) => (
                  <View key={cat.key} style={styles.breakdownItem}>
                    <View style={styles.breakdownTextRow}>
                      <Text style={styles.breakdownTitle}>{cat.label}</Text>
                      <Text style={styles.breakdownValue}>{formatSeconds(cat.value)}</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(cat.value / maxCategory) * 100}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.parent.background },
    container: { flex: 1 },
    content: {
      paddingHorizontal: Layout.screen.paddingHorizontal,
      paddingTop: Layout.spacing.lg,
      paddingBottom: Layout.spacing.xxl,
    },
    rangeRow: {
      flexDirection: 'row',
      backgroundColor: Colors.parent.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: Colors.parent.border,
    },
    rangeBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 10,
    },
    rangeBtnActive: {
      backgroundColor: Colors.parent.primary,
    },
    rangeBtnText: {
      ...Typography.parent.caption,
      fontWeight: '600',
      color: Colors.parent.textSecondary,
    },
    rangeBtnTextActive: {
      color: '#FFFFFF',
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-end',
      marginBottom: 8,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22C55E',
    },
    liveText: {
      ...Typography.parent.caption,
      color: '#22C55E',
      fontWeight: '700',
    },
    stateCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 16,
    },
    stateText: {
      ...Typography.parent.body,
      color: Colors.parent.textSecondary,
      textAlign: 'center',
    },
    summaryRow: {
      flexDirection: 'row',
      gap: Layout.spacing.md,
      marginBottom: Layout.spacing.xl,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: Colors.parent.surface,
      borderRadius: Layout.radius.lg,
      padding: Layout.spacing.md,
      borderWidth: 1,
      borderColor: Colors.parent.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    cardLabel: { ...Typography.parent.caption, color: Colors.parent.textSecondary },
    cardValue: { ...Typography.parent.title, fontSize: 20, marginBottom: 4 },
    chartCard: {
      backgroundColor: Colors.parent.surface,
      borderRadius: Layout.radius.xl,
      padding: Layout.spacing.lg,
      borderWidth: 1,
      borderColor: Colors.parent.border,
      marginBottom: Layout.spacing.xl,
    },
    sectionTitle: {
      ...Typography.parent.subtitle,
      color: Colors.parent.textPrimary,
      marginBottom: Layout.spacing.xl,
    },
    barChart: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      height: 140,
    },
    barContainer: { flex: 1, alignItems: 'center', gap: 8 },
    bar: { width: 28, borderRadius: 8, opacity: 0.9 },
    barLabel: { ...Typography.parent.caption, fontSize: 10, color: Colors.parent.textSecondary },
    breakdownCard: {
      backgroundColor: Colors.parent.surface,
      borderRadius: Layout.radius.xl,
      padding: Layout.spacing.lg,
      borderWidth: 1,
      borderColor: Colors.parent.border,
    },
    breakdownItem: { marginBottom: Layout.spacing.lg },
    breakdownTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    breakdownTitle: { ...Typography.parent.body, fontWeight: '600', color: Colors.parent.textPrimary },
    breakdownValue: { ...Typography.parent.body, color: Colors.parent.textSecondary },
    progressBg: { height: 16, backgroundColor: '#F2ECF4', borderRadius: 8, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 8 },
  });
  ```

**Checkpoint**: Run `npx expo start`, open the parent app, navigate to Reports. Bars and breakdown values should reflect real numbers from `daily_stats`. The loading spinner should appear while fetching.

---

## Phase 5: User Story 2 — Side-by-Side Child Comparison (P2)

**Goal**: Allow parents with 2+ children to compare their usage side-by-side. The comparison button only appears if the parent has ≥2 children.

**Independent Test**: Log in as a parent with 2 seed children → tap Compare → both children's total times and category bars appear simultaneously for the selected period.

- [x] T009 [P] [US2] Create a new file `components/reports/ComparisonView.tsx` with the following COMPLETE content — includes total-time bars AND category breakdown per child:

  ```tsx
  /**
   * components/reports/ComparisonView.tsx
   * Side-by-side comparison of two children's usage stats.
   * Shows total-time bars and per-category breakdown for each child.
   * Used by app/(parent)/reports.tsx when parent selects "Compare" mode.
   */
  import React, { useState } from 'react';
  import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
  import Colors from '../../constants/Colors';
  import Typography from '../../constants/Typography';
  import Layout from '../../constants/Layout';
  import { useComparisonStats } from '../../services/api/reports';
  import { DailyStats } from '../../services/api/types';

  interface Props {
    childAId: string;
    childBId: string;
    childAName: string;
    childBName: string;
  }

  const CATEGORY_CONFIG = [
    { key: 'stories_seconds' as keyof DailyStats, label: 'StoryTime', color: '#7C5CFC' },
    { key: 'games_seconds'   as keyof DailyStats, label: 'Brain Games', color: '#FF6B6B' },
    { key: 'creative_seconds'as keyof DailyStats, label: 'Creative Zone', color: '#FFB800' },
    { key: 'videos_seconds'  as keyof DailyStats, label: 'Videos', color: '#494551' },
  ];

  function formatSeconds(seconds: number): string {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function sumStats(stats: DailyStats[], key?: keyof DailyStats): number {
    if (key) return stats.reduce((sum, s) => sum + ((s[key] as number) || 0), 0);
    return stats.reduce((sum, s) => sum + s.total_seconds, 0);
  }

  function renderCategoryBlock(stats: DailyStats[], label: string, color: string, key: keyof DailyStats, maxVal: number) {
    const val = sumStats(stats, key);
    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
    return (
      <View key={key} style={styles.catRow}>
        <View style={styles.catLabelRow}>
          <View style={[styles.catDot, { backgroundColor: color }]} />
          <Text style={styles.catLabel}>{label}</Text>
        </View>
        <View style={styles.catBarBg}>
          <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.catValue}>{formatSeconds(val)}</Text>
      </View>
    );
  }

  export default function ComparisonView({ childAId, childBId, childAName, childBName }: Props) {
    const [range, setRange] = useState<'week' | 'month'>('week');
    const { data, isLoading, error } = useComparisonStats([childAId, childBId], range);

    const statsA = data?.childA?.stats ?? [];
    const statsB = data?.childB?.stats ?? [];
    const totalA = sumStats(statsA);
    const totalB = sumStats(statsB);
    const maxTotal = Math.max(totalA, totalB, 1);

    const allCatValues = CATEGORY_CONFIG.flatMap((c) => [
      sumStats(statsA, c.key),
      sumStats(statsB, c.key),
    ]);
    const maxCategory = Math.max(...allCatValues, 1);

    return (
      <View style={styles.card}>
        <Text style={styles.title}>Compare Children</Text>

        {/* Range Toggle */}
        <View style={styles.rangeRow}>
          {(['week', 'month'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>
                {r === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={Colors.parent.primary} />
          </View>
        )}

        {error && !isLoading && (
          <Text style={styles.errorText}>Could not load comparison data.</Text>
        )}

        {!isLoading && !error && data && (
          <>
            {/* ── Total Time Bars ── */}
            <Text style={styles.sectionLabel}>Total Screen Time</Text>
            <View style={styles.childRow}>
              <Text style={styles.childName}>{childAName}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${(totalA / maxTotal) * 100}%`, backgroundColor: '#7C5CFC' }]} />
              </View>
              <Text style={styles.childValue}>{formatSeconds(totalA)}</Text>
            </View>
            <View style={styles.childRow}>
              <Text style={styles.childName}>{childBName}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${(totalB / maxTotal) * 100}%`, backgroundColor: '#FF6B6B' }]} />
              </View>
              <Text style={styles.childValue}>{formatSeconds(totalB)}</Text>
            </View>

            {/* ── Category Breakdown ── */}
            <Text style={styles.sectionLabel}>By Category</Text>
            {CATEGORY_CONFIG.map((cat) => renderCategoryBlock(statsA, cat.label, cat.color, cat.key, maxCategory))}
            <View style={styles.childDivider} />
            {CATEGORY_CONFIG.map((cat) => renderCategoryBlock(statsB, cat.label, cat.color, cat.key, maxCategory))}
          </>
        )}
      </View>
    );
  }

  const styles = StyleSheet.create({
    card: {
      backgroundColor: Colors.parent.surface,
      borderRadius: Layout.radius.xl,
      padding: Layout.spacing.lg,
      borderWidth: 1,
      borderColor: Colors.parent.border,
      marginBottom: Layout.spacing.xl,
    },
    title: { ...Typography.parent.subtitle, color: Colors.parent.textPrimary, marginBottom: 12 },
    sectionLabel: {
      ...Typography.parent.caption, fontWeight: '700', color: Colors.parent.textSecondary,
      marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1,
    },
    rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    rangeBtn: {
      flex: 1, paddingVertical: 8, alignItems: 'center',
      borderRadius: 8, borderWidth: 1, borderColor: Colors.parent.border,
    },
    rangeBtnActive: { backgroundColor: Colors.parent.primary, borderColor: Colors.parent.primary },
    rangeBtnText: { ...Typography.parent.caption, color: Colors.parent.textSecondary },
    rangeBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },
    center: { alignItems: 'center', paddingVertical: 24 },
    errorText: { ...Typography.parent.caption, color: Colors.parent.textSecondary, textAlign: 'center' },
    childRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    childName: { ...Typography.parent.body, fontWeight: '600', color: Colors.parent.textPrimary, width: 70 },
    barBg: { flex: 1, height: 20, backgroundColor: '#F2ECF4', borderRadius: 10, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 10 },
    childValue: { ...Typography.parent.caption, color: Colors.parent.textSecondary, width: 52, textAlign: 'right' },
    childDivider: { height: 1, backgroundColor: Colors.parent.border, marginVertical: 12 },
    catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    catLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 90 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catLabel: { ...Typography.parent.caption, fontSize: 11, color: Colors.parent.textPrimary },
    catBarBg: { flex: 1, height: 12, backgroundColor: '#F2ECF4', borderRadius: 6, overflow: 'hidden' },
    catBarFill: { height: '100%', borderRadius: 6 },
    catValue: { ...Typography.parent.caption, fontSize: 11, color: Colors.parent.textSecondary, width: 44, textAlign: 'right' },
  });
  ```

- [x] T010 [US2] Open `app/(parent)/reports.tsx`. At the TOP of the file, below the existing imports, add the following two new imports on separate lines. Do NOT change anything else:

  ```tsx
  import ComparisonView from '../../components/reports/ComparisonView';
  ```

- [x] T011 [US2] Inside `app/(parent)/reports.tsx`, locate the `ReportsScreen` function body. Add the following state variable declaration immediately after the `childId` declaration line (i.e., after `const childId = activeChild?.id ?? null;`):

  ```tsx
  const [showComparison, setShowComparison] = useState(false);
  ```

- [x] T012 [US2] Inside `app/(parent)/reports.tsx`, locate the closing `</ScrollView>` tag. Immediately BEFORE `</ScrollView>`, add the following JSX block. This adds the Compare toggle and the ComparisonView component. Only renders if parent has ≥ 2 children:

  ```tsx
  {/* ── Child Comparison (visible only if parent has 2+ children) ── */}
  {children.length >= 2 && (
    <>
      <TouchableOpacity
        style={styles.compareToggle}
        onPress={() => setShowComparison((prev) => !prev)}
      >
        <Ionicons
          name={showComparison ? 'close-circle-outline' : 'git-compare-outline'}
          size={20}
          color={Colors.parent.primary}
        />
        <Text style={styles.compareToggleText}>
          {showComparison ? 'Hide Comparison' : 'Compare Children'}
        </Text>
      </TouchableOpacity>
      {showComparison && children[1] && (
        <ComparisonView
          childAId={children[0].id}
          childBId={children[1].id}
          childAName={children[0].name}
          childBName={children[1].name}
        />
      )}
    </>
  )}
  ```

- [x] T013 [US2] Inside `app/(parent)/reports.tsx`, inside the `StyleSheet.create({...})` block, add the following two style entries at the END of the styles object (just before the closing `}`). Do NOT change any other styles:

  ```tsx
  compareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    backgroundColor: Colors.parent.surface,
    marginBottom: 16,
    marginTop: 8,
  },
  compareToggleText: {
    ...Typography.parent.body,
    fontWeight: '600',
    color: Colors.parent.primary,
  },
  ```

**Checkpoint**: Open reports screen as parent with 2 seed children → a "Compare Children" button appears at the bottom → tapping it shows both children's bars side-by-side.

---

## Phase 6: User Story 3 — Export Weekly Summary (P3)

**Goal**: Add an Export button to the reports screen that captures the visible report as a PNG and opens the OS share sheet.

**Independent Test**: Tap "Export" button → OS share sheet appears with a PNG file → file opens correctly in Photos/Files app.

- [x] T014 [P] [US3] Create a new file `services/export/captureReport.ts` with the following COMPLETE content:

  ```typescript
  /**
   * services/export/captureReport.ts
   * Captures a React Native View as a PNG and triggers the OS share sheet.
   * Used by the Export button in app/(parent)/reports.tsx.
   */
  import { RefObject } from 'react';
  import { View } from 'react-native';
  import ViewShot, { captureRef } from 'react-native-view-shot';
  import * as Sharing from 'expo-sharing';

  /**
   * Captures the view referenced by `viewRef` and opens the share sheet.
   * Returns true on success, false if sharing is unavailable or capture fails.
   */
  export async function captureAndShare(viewRef: RefObject<View>): Promise<boolean> {
    try {
      if (!viewRef.current) return false;

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) return false;

      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Weekly Report',
      });

      return true;
    } catch {
      return false;
    }
  }
  ```

- [x] T015 [US3] Open `app/(parent)/reports.tsx`. Add the following import at the TOP of the file alongside the existing imports:

  ```tsx
  import { captureAndShare } from '../../services/export/captureReport';
  ```

- [x] T016 [US3] Inside `app/(parent)/reports.tsx`, add the following `useRef` and state inside the `ReportsScreen` function, immediately after the `showComparison` state line:

  ```tsx
  const reportViewRef = useRef<View>(null);
  const [isExporting, setIsExporting] = useState(false);
  ```

- [x] T017 [US3] Inside `app/(parent)/reports.tsx`, wrap the ENTIRE `<ScrollView>` element (opening and closing tags) with `<View ref={reportViewRef} collapsable={false}>` and `</View>`. The result should look like:

  ```tsx
  <View ref={reportViewRef} collapsable={false}>
    <ScrollView ...>
      {/* existing content */}
    </ScrollView>
  </View>
  ```

- [x] T018 [US3] Inside `app/(parent)/reports.tsx`, locate the `<Header showLock={false} title="Reports" />` line. Immediately AFTER it (as a sibling element at the same indentation level), add the following Export button:

  ```tsx
  {/* ── Export Button ── */}
  <TouchableOpacity
    style={styles.exportBtn}
    onPress={async () => {
      setIsExporting(true);
      await captureAndShare(reportViewRef);
      setIsExporting(false);
    }}
    disabled={isExporting}
  >
    {isExporting
      ? <ActivityIndicator size="small" color={Colors.parent.primary} />
      : <Ionicons name="share-outline" size={20} color={Colors.parent.primary} />
    }
    <Text style={styles.exportBtnText}>{isExporting ? 'Exporting...' : 'Export'}</Text>
  </TouchableOpacity>
  ```

- [x] T019 [US3] Inside the `StyleSheet.create({...})` block in `app/(parent)/reports.tsx`, add the following style at the END (just before the closing `}`):

  ```tsx
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    backgroundColor: Colors.parent.surface,
    marginHorizontal: Layout.screen.paddingHorizontal,
    marginBottom: 4,
  },
  exportBtnText: {
    ...Typography.parent.caption,
    fontWeight: '700',
    color: Colors.parent.primary,
  },
  ```

**Checkpoint**: Tap "Export" button → loading indicator appears briefly → OS share sheet opens with an image of the report.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and ensuring no regressions.

- [x] T020 Run `npx tsc --noEmit` from the project root. Fix any TypeScript errors before proceeding.

- [x] T021 [P] Open `app/(parent)/reports.tsx`. Verify that NO hardcoded values remain — search for: `"14h"`, `"2h"`, `"May 01"`, `[60, 90, 40, 110, 70, 120, 80]`. If any are found, they were not replaced in T008; remove them.

- [x] T022 [P] Verify `components/reports/` directory exists. If the directory was not auto-created, create it manually. Confirm `ComparisonView.tsx` is inside it.

- [ ] T023 Run `npx expo start` and manually open the parent reports screen. Confirm in order:
  1. Loading spinner appears on first open
  2. Real numbers render (not hardcoded)
  3. Range picker (Today/Week/Month) switches data correctly
  4. Live dot appears when "Today" is selected and Realtime is connected
  5. No TypeScript compile errors in the terminal

## Phase 8: Success Criteria Verification & Edge Case Handling

**Purpose**: Automate verification of SC-001 through SC-004 and implement spec edge cases.

- [x] T024 [SC-001] Add performance test script `scripts/perf-test-reports.ts` that measures dashboard load time (mount to interactive) with 30 days of data. Fail if p95 > 1500ms. Run in CI.

- [x] T025 [SC-002] Add realtime latency test: simulate session INSERT → measure time to UI update. Fail if p95 > 500ms. Document in `docs/realtime-latency.md`.

- [x] T026 [SC-003] Add export integration test: capture report view → verify PNG dimensions > 0, valid PNG header, share sheet opens (mocked). Run in CI.

- [x] T027 [SC-004] Add comparison normalization test: Child A = 7200s, Child B = 900s → verify Child B bar width = 12.5% of Child A. Run in CI.

- [x] T028 [Edge Case] In `services/api/reports.ts`, enhance `useLiveTodayStats` with fallback: if subscription status != 'SUBSCRIBED' for > 10s, start 60s polling interval on `daily_stats` and set `isLive = false` with "reconnecting" indicator.

- [x] T029 [Edge Case] In `aggregate_daily_stats` function (migration), add graceful handling for timezone changes mid-day: if `timezone_offset_minutes` differs from previous day's snapshot, log warning and use new offset for current day bucketing (no backfill).

- [x] T030 [Edge Case] Add rollup job failure monitoring: in pg_cron/Edge Function, wrap `aggregate_daily_stats` in try/catch; on failure, log to `cron_job_log` table and trigger fallback calculation from raw `sessions` for the missed day.

- [x] T031 [NFR-002] Add cache TTL validation test `scripts/cache-ttl-test.ts`: verify historical stats are served from cache within the 24-hour TTL and that stale-while-revalidate returns stale data within 60s while re-fetching. Run in CI.

- [x] T032 [NFR-001] Add data retention/migration test: verify that deleting a child profile cascades to `daily_stats` (rows deleted). Add audit logging task for aggregated data purge (90-day retention check) — create `server/migrations/004_data_retention.sql` with a cron cleanup job that deletes `daily_stats` rows older than 90 days for deleted children.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Migration)**: Depends on Phase 1 complete
- **Phase 3 (Types & API)**: Depends on Phase 2 — `DailyStats` type must match the `daily_stats` table columns
- **Phase 4 (US1 Dashboard)**: Depends on Phase 3 — `useDailyStats` must exist before the screen can import it
- **Phase 5 (US2 Comparison)**: Depends on Phase 3 — `useComparisonStats` must exist; can run in parallel with Phase 4 if different developers
- **Phase 6 (US3 Export)**: Depends on Phase 4 (needs the `reportViewRef` set up in T017) — must run after T008
- **Phase 7 (Polish)**: Depends on all phases complete
- **Phase 8 (SC Verification & Edge Cases)**: Depends on Phase 7 complete; T024-T027 can run in parallel; T028 depends on T007; T029 depends on T004; T030 depends on T004b; T031 depends on T007 (cache TTL); T032 depends on T004 (retention migration)

### Parallel Opportunities

- T003 (GestureHandlerRootView) can run in parallel with T001 and T002
- T009 (`ComparisonView.tsx`) can be created in parallel with T008 (`reports.tsx` rewrite)
- T014 (`captureReport.ts`) can be created in parallel with T009

---

## Implementation Strategy

### MVP (User Story 1 Only — Phases 1-4)

1. Complete Phase 1: Install packages
2. Complete Phase 2: Apply migration in Supabase SQL editor, apply seed
3. Complete Phase 3: Add types + create `reports.ts`
4. Complete Phase 4 (T008): Rewrite `reports.tsx`
5. **VALIDATE**: Open reports screen → real data shows → stop and demo

### Full Feature (All User Stories — Phases 1-7)

1. MVP delivery above
2. Phase 5: Add comparison component
3. Phase 6: Add export button
4. Phase 7: Polish pass

---

## Notes

- `[P]` = task works on a different file from other `[P]` tasks in the same phase; safe to run in parallel
- Each `[US#]` label maps to the user story in `spec.md`
- Migration (T004) must be applied in Supabase Studio SQL editor — it is NOT auto-applied
- Seed (T005) must also be applied in Supabase Studio SQL editor after the migration
- Do NOT call `supabase.channel()` inside render — always call inside `useEffect`
