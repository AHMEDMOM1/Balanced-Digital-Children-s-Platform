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
 * Falls back to 60-second polling if subscription fails to connect within 10s.
 * Returns the latest DailyStats row for today (or null if none yet).
 */
export function useLiveTodayStats(childId: string | null): {
  todayStats: DailyStats | null;
  isLive: boolean;
} {
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [isLive, setIsLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    let subscribeRetries = 0;
    const MAX_RETRIES = 3;

    function startPolling() {
      stopPolling();
      setIsLive(false);
      pollingRef.current = setInterval(() => {
        fetchToday();
      }, 60000); // 60-second polling fallback
    }

    function stopPolling() {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    function trySubscribe() {
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
          if (status === 'SUBSCRIBED') {
            setIsLive(true);
            stopPolling();
            if (subscriptionTimeoutRef.current) {
              clearTimeout(subscriptionTimeoutRef.current);
              subscriptionTimeoutRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            subscribeRetries++;
            if (subscribeRetries <= MAX_RETRIES) {
              setTimeout(trySubscribe, 2000 * subscribeRetries);
            } else {
              startPolling();
            }
          }
        });

      channelRef.current = channel;
    }

    trySubscribe();

    // If subscription not connected within 10 seconds, fall back to polling
    subscriptionTimeoutRef.current = setTimeout(() => {
      if (!isLive && !pollingRef.current) {
        startPolling();
      }
    }, 10000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      stopPolling();
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
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
