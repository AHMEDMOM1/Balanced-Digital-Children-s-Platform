import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getClient } from './client';

const PENDING_QUEUE_KEY = 'pending_session_write';

// --- Types ---

export type ActivityType = 'story' | 'game' | 'video' | 'creative';

export interface SessionRow {
  id: string;
  child_id: string;
  family_id: string;
  parent_id: string | null;
  activity_type: ActivityType;
  content_item_id: string | null;
  started_at: string;
  ended_at: string | null;
  elapsed_seconds: number;
  status: 'active' | 'paused' | 'completed' | 'expired';
  created_at: string;
}

export interface OpenSessionInput {
  child_id: string;
  family_id: string;
  parent_id?: string;
  activity_type: ActivityType;
  content_item_id?: string;
}

export interface SessionApiResult<T = void> {
  data: T | null;
  error: string | null;
}

export interface DailySummary {
  totalSeconds: number;
  byType: Record<ActivityType, number>;
}

// --- Pure functions ---

export function computeDailySummary(
  sessions: Pick<SessionRow, 'activity_type' | 'elapsed_seconds'>[]
): DailySummary {
  const byType: Record<ActivityType, number> = { story: 0, game: 0, video: 0, creative: 0 };
  let totalSeconds = 0;
  for (const s of sessions) {
    const t = s.elapsed_seconds ?? 0;
    byType[s.activity_type] = (byType[s.activity_type] ?? 0) + t;
    totalSeconds += t;
  }
  return { totalSeconds, byType };
}

export function todayBoundaryUTC(tzOffsetMinutes: number): { start: string; end: string } {
  const now = new Date();
  const localMidnight = new Date(now);
  localMidnight.setUTCHours(0, 0, 0, 0);
  const startUTC = new Date(localMidnight.getTime() - tzOffsetMinutes * 60_000);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60_000);
  return { start: startUTC.toISOString(), end: endUTC.toISOString() };
}

// --- API functions ---

// The child device is headless (no auth.uid(), ever — see
// supabase/migrations/20260620000000_child_rpc_layer.sql), so every write
// below goes through a SECURITY DEFINER RPC instead of a direct table call,
// which would otherwise be silently rejected by RLS.

export async function recoverAbandonedSessions(
  childId: string
): Promise<SessionApiResult<number>> {
  const supabase = getClient();
  try {
    const { data, error } = await supabase.rpc('child_recover_abandoned_sessions', { p_child_id: childId });
    if (error) {
      console.error('[sessions] recoverAbandonedSessions error', { error: error.message });
      return { data: null, error: error.message };
    }
    console.warn('[sessions] recovered abandoned sessions', { count: data });
    return { data: data as number, error: null };
  } catch (err: any) {
    console.error('[sessions] recoverAbandonedSessions error', { error: err.message });
    return { data: null, error: err.message };
  }
}

export async function drainPendingSessionQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
    if (!raw) return;

    const row = JSON.parse(raw) as OpenSessionInput;
    const supabase = getClient();

    const { error } = await supabase.rpc('child_open_session', {
      p_child_id: row.child_id,
      p_family_id: row.family_id,
      p_activity_type: row.activity_type,
      p_content_item_id: row.content_item_id ?? null,
    });

    if (!error) {
      await AsyncStorage.removeItem(PENDING_QUEUE_KEY);
      console.warn('[sessions] drained pending session', { activityType: row.activity_type });
    }
  } catch (err: any) {
    console.error('[sessions] drainPendingSessionQueue error', { error: err.message });
  }
}

// --- Hooks ---

export function useSessionWriter(
  childId: string,
  familyId: string,
  activityType: ActivityType,
  contentItemId?: string
): {
  sessionId: string | null;
  openSession: () => Promise<SessionApiResult<string>>;
  closeSession: (elapsedSeconds: number) => Promise<SessionApiResult>;
} {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const openSession = async (): Promise<SessionApiResult<string>> => {
    if (!childId || !familyId) return { data: null, error: 'missing childId or familyId' };
    const supabase = getClient();
    const input: OpenSessionInput = { child_id: childId, family_id: familyId, activity_type: activityType, content_item_id: contentItemId };

    // child_open_session expires any existing active session for this child
    // server-side before inserting the new one (FR-009).
    const { data, error } = await supabase.rpc('child_open_session', {
      p_child_id: childId,
      p_family_id: familyId,
      p_activity_type: activityType,
      p_content_item_id: contentItemId ?? null,
    });

    if (error || !data) {
      try { await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(input)); } catch {}
      console.warn('[sessions] openSession failed, queued locally', { activityType, error: error?.message });
      return { data: null, error: error?.message ?? 'rpc failed' };
    }

    setSessionId(data);
    sessionIdRef.current = data;
    console.debug('[sessions] session opened', { activityType, contentItemId, sessionId: data });
    return { data, error: null };
  };

  const closeSession = async (elapsedSeconds: number): Promise<SessionApiResult> => {
    const id = sessionIdRef.current;
    if (!id) return { data: null, error: 'no active session' };

    const clamped = Math.max(0, elapsedSeconds);
    const supabase = getClient();

    const { error } = await supabase.rpc('child_close_session', {
      p_session_id: id,
      p_elapsed_seconds: clamped,
    });

    if (error) {
      console.error('[sessions] closeSession error', { error: error.message, sessionId: id });
      return { data: null, error: error.message };
    }

    console.debug('[sessions] session closed', { elapsedSeconds: clamped, sessionId: id });
    setSessionId(null);
    sessionIdRef.current = null;
    return { data: undefined, error: null };
  };

  return { sessionId, openSession, closeSession };
}

export function useTodaysSessions(
  childId: string,
  familyId: string,
  tzOffsetMinutes: number
): {
  sessions: SessionRow[];
  isLoading: boolean;
  error: string | null;
  summary: DailySummary;
} {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary>(() => computeDailySummary([]));

  useEffect(() => {
    if (!childId || !familyId) {
      setIsLoading(false);
      return;
    }

    const supabase = getClient();

    // Phase 1: initial fetch of today's sessions (FR-010)
    const { start, end } = todayBoundaryUTC(tzOffsetMinutes);
    supabase
      .from('sessions')
      .select('*')
      .eq('child_id', childId)
      .gte('started_at', start)
      .lt('started_at', end)
      .order('started_at', { ascending: true })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) {
          console.error('[sessions] useTodaysSessions fetch error', { error: fetchErr.message });
          setError(fetchErr.message);
          setIsLoading(false);
          return;
        }
        const rows = (data ?? []) as SessionRow[];
        setSessions(rows);
        setSummary(computeDailySummary(rows));
        console.debug('[sessions] today fetch', { count: rows.length });
        setIsLoading(false);
      });

    // Phase 2: CDC live subscription (FR-004)
    // Topic includes a random suffix, not just familyId — getClient().channel(topic)
    // returns the SAME cached channel object for a repeated topic name, and calling
    // .on() on a channel that's already past .subscribe() throws. A deterministic
    // topic collides exactly that way under React StrictMode / Fast Refresh double-
    // effect-invocation (old channel's cleanup hasn't finished removing it yet when
    // the new effect run asks for the same topic again).
    const topicSuffix = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`sessions-live-${familyId}-${topicSuffix}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sessions', filter: `family_id=eq.${familyId}` },
        (payload) => {
          const newRow = payload.new as SessionRow;
          console.debug('[sessions] live insert', { activityType: newRow.activity_type });
          setSessions((prev) => {
            const next = [...prev, newRow];
            setSummary(computeDailySummary(next));
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `family_id=eq.${familyId}` },
        (payload) => {
          const updated = payload.new as SessionRow;
          setSessions((prev) => {
            const next = prev.map((s) => (s.id === updated.id ? updated : s));
            setSummary(computeDailySummary(next));
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, familyId, tzOffsetMinutes]);

  return { sessions, isLoading, error, summary };
}
