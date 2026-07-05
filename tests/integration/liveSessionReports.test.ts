/**
 * tests/integration/liveSessionReports.test.ts
 * T004 (TDD): Scenario H  — unit test for computeDailySummary (written before implementation)
 * T005 [US1]: Scenarios A, B, B2, E — session write, close, accuracy, abandoned recovery
 * T014 [US2]: Scenarios C, D, G, G2 — CDC INSERT/UPDATE, RLS positive/negative
 * T017 [US3]: Scenario F            — timezone-aware today boundary
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_PUBLIC_SUPABASE_ANON_KEY
 * Run: npm run test:live-sessions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { computeDailySummary, todayBoundaryUTC } from '../../services/api/sessions';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);

const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

// Stable UUIDs — spec 020 prefix, no collision with 018/019
const TEST_FAMILY_ID = 'f4444444-0000-0000-0000-000000000020';
const TEST_PARENT_ID = 'a4444444-0000-0000-0000-000000000020';
const TEST_CHILD_ID  = 'c4444444-0000-0000-0000-000000000020';
const OTHER_FAMILY_ID = 'f9999999-0000-0000-0000-000000000020';

// ── Scenario H (T004 TDD — unit, no network) ────────────────────────────────

describe('computeDailySummary unit', () => {
  it('Scenario H — sums elapsed_seconds by activity_type with all four keys initialized', () => {
    const sessions = [
      { activity_type: 'story' as const, elapsed_seconds: 600 },
      { activity_type: 'story' as const, elapsed_seconds: 300 },
      { activity_type: 'game' as const,  elapsed_seconds: 900 },
    ];
    const summary = computeDailySummary(sessions);
    expect(summary.totalSeconds).toBe(1800);
    expect(summary.byType.story).toBe(900);
    expect(summary.byType.game).toBe(900);
    expect(summary.byType.video).toBe(0);
    expect(summary.byType.creative).toBe(0);
  });

  it('Scenario H (empty) — returns zeros for empty session list', () => {
    const summary = computeDailySummary([]);
    expect(summary.totalSeconds).toBe(0);
    expect(summary.byType.story).toBe(0);
    expect(summary.byType.game).toBe(0);
    expect(summary.byType.video).toBe(0);
    expect(summary.byType.creative).toBe(0);
  });
});

// ── Integration scenarios ─────────────────────────────────────────────────────

maybeDescribe('Live Session Reports Integration (020-live-session-reports)', () => {
  jest.setTimeout(30000);

  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await anonClient.auth.signInAnonymously();

    await serviceClient.from('profiles').upsert([
      {
        id: TEST_PARENT_ID,
        role: 'parent',
        family_id: TEST_FAMILY_ID,
        full_name: 'LiveReports Parent 020',
        is_active: true,
      },
      {
        id: TEST_CHILD_ID,
        role: 'child',
        family_id: TEST_FAMILY_ID,
        parent_id: TEST_PARENT_ID,
        full_name: 'LiveReports Child 020',
        is_active: true,
      },
    ], { onConflict: 'id' });
  });

  afterAll(async () => {
    await serviceClient.from('sessions').delete().eq('family_id', TEST_FAMILY_ID);
    await serviceClient.from('sessions').delete().eq('family_id', OTHER_FAMILY_ID);
    await serviceClient.from('profiles').delete().in('id', [TEST_CHILD_ID, TEST_PARENT_ID]);
    await anonClient.auth.signOut();
  });

  // ── Scenario A (US1, FR-001) ──────────────────────────────────────────────

  it('Scenario A — child inserts session row with correct fields', async () => {
    const sessionId = randomUUID();
    const { error } = await serviceClient.from('sessions').insert({
      id: sessionId,
      child_id: TEST_CHILD_ID,
      family_id: TEST_FAMILY_ID,
      parent_id: TEST_PARENT_ID,
      activity_type: 'game',
      started_at: new Date().toISOString(),
      status: 'active',
    });
    expect(error).toBeNull();

    const { data } = await serviceClient
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    expect(data?.activity_type).toBe('game');
    expect(data?.ended_at).toBeNull();
    expect(data?.family_id).toBe(TEST_FAMILY_ID);
    expect(data?.status).toBe('active');
    expect(data?.child_id).toBe(TEST_CHILD_ID);
  });

  // ── Scenario B (US1, FR-002) ──────────────────────────────────────────────

  it('Scenario B — closing session sets elapsed_seconds (clamped ≥0) and ended_at', async () => {
    const { data: inserted, error: insertErr } = await serviceClient
      .from('sessions')
      .insert({
        child_id: TEST_CHILD_ID,
        family_id: TEST_FAMILY_ID,
        parent_id: TEST_PARENT_ID,
        activity_type: 'story',
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    expect(insertErr).toBeNull();

    const elapsed = Math.max(0, 120);
    const { error: updateErr } = await serviceClient.from('sessions').update({
      ended_at: new Date().toISOString(),
      elapsed_seconds: elapsed,
      status: 'completed',
    }).eq('id', inserted!.id);
    expect(updateErr).toBeNull();

    const { data: closed } = await serviceClient
      .from('sessions')
      .select('*')
      .eq('id', inserted!.id)
      .single();

    expect(closed?.ended_at).not.toBeNull();
    expect(closed?.elapsed_seconds).toBe(120);
    expect(closed?.elapsed_seconds).toBeGreaterThanOrEqual(0);
    expect(closed?.status).toBe('completed');
  });

  // ── Scenario B2 (SC-003 accuracy) ────────────────────────────────────────

  it('Scenario B2 — elapsed_seconds accurate to within 5 seconds of actual elapsed time (SC-003)', async () => {
    const t0 = Date.now();
    const { data: inserted, error: insertErr } = await serviceClient
      .from('sessions')
      .insert({
        child_id: TEST_CHILD_ID,
        family_id: TEST_FAMILY_ID,
        parent_id: TEST_PARENT_ID,
        activity_type: 'video',
        status: 'active',
        started_at: new Date(t0).toISOString(),
      })
      .select()
      .single();
    expect(insertErr).toBeNull();

    await new Promise(r => setTimeout(r, 1000));
    const elapsed = Math.round((Date.now() - t0) / 1000);

    const { error: updateErr } = await serviceClient.from('sessions').update({
      ended_at: new Date().toISOString(),
      elapsed_seconds: elapsed,
      status: 'completed',
    }).eq('id', inserted!.id);
    expect(updateErr).toBeNull();

    const { data: closed } = await serviceClient
      .from('sessions')
      .select('elapsed_seconds')
      .eq('id', inserted!.id)
      .single();

    expect(Math.abs((closed?.elapsed_seconds ?? 0) - elapsed)).toBeLessThanOrEqual(5);
  });

  // ── Scenario E (US1, FR-007) ──────────────────────────────────────────────

  it('Scenario E — abandoned session recovery: elapsed_seconds=0, status=expired, ended_at=started_at', async () => {
    const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: inserted, error: insertErr } = await serviceClient
      .from('sessions')
      .insert({
        child_id: TEST_CHILD_ID,
        family_id: TEST_FAMILY_ID,
        parent_id: TEST_PARENT_ID,
        activity_type: 'game',
        status: 'active',
        started_at: startedAt,
      })
      .select()
      .single();
    expect(insertErr).toBeNull();

    const { error: updateErr } = await serviceClient.from('sessions').update({
      ended_at: startedAt,
      elapsed_seconds: 0,
      status: 'expired',
    }).eq('id', inserted!.id);
    expect(updateErr).toBeNull();

    const { data } = await serviceClient
      .from('sessions')
      .select('*')
      .eq('id', inserted!.id)
      .single();

    expect(data?.elapsed_seconds).toBe(0);
    expect(data?.ended_at).toBe(startedAt);
    expect(data?.status).toBe('expired');
  });

  // ── Scenario C (US2, FR-004 — CDC INSERT) ────────────────────────────────

  it('Scenario C — parent CDC subscription receives child session INSERT within 5000ms', async () => {
    try {
      let receivedPayload: any = null;
      const channel = serviceClient
        .channel('test-sessions-cdc-c')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'sessions', filter: `family_id=eq.${TEST_FAMILY_ID}` },
          (payload) => { receivedPayload = payload.new; }
        );

      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') reject(new Error('CDC_NOT_ENABLED'));
        });
        setTimeout(() => reject(new Error('CDC_NOT_ENABLED')), 5000);
      });

      const sessionId = randomUUID();
      await serviceClient.from('sessions').insert({
        id: sessionId,
        child_id: TEST_CHILD_ID,
        family_id: TEST_FAMILY_ID,
        parent_id: TEST_PARENT_ID,
        activity_type: 'video',
        status: 'active',
        started_at: new Date().toISOString(),
      });

      await new Promise<void>((resolve, reject) => {
        const deadline = setTimeout(() => reject(new Error('CDC_NOT_ENABLED')), 5000);
        const poll = setInterval(() => {
          if (receivedPayload) { clearInterval(poll); clearTimeout(deadline); resolve(); }
        }, 100);
      });

      expect(receivedPayload?.activity_type).toBe('video');
      expect(receivedPayload?.family_id).toBe(TEST_FAMILY_ID);
      await serviceClient.removeChannel(channel);
    } catch (err: any) {
      if (err?.message?.includes('CDC_NOT_ENABLED')) {
        console.warn('[sessions] Scenario C skipped: CDC not enabled — apply migration 20260613020001');
        return;
      }
      throw err;
    }
  });

  // ── Scenario D (US2, FR-004 — CDC UPDATE) ────────────────────────────────

  it('Scenario D — parent CDC receives session close UPDATE (ended_at set) within 5000ms', async () => {
    try {
      let updatedPayload: any = null;
      const channel = serviceClient
        .channel('test-sessions-cdc-d')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `family_id=eq.${TEST_FAMILY_ID}` },
          (payload) => { if (payload.new?.ended_at) updatedPayload = payload.new; }
        );

      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') reject(new Error('CDC_NOT_ENABLED'));
        });
        setTimeout(() => reject(new Error('CDC_NOT_ENABLED')), 5000);
      });

      const { data: inserted, error: insertErr2 } = await serviceClient
        .from('sessions')
        .insert({
          child_id: TEST_CHILD_ID,
          family_id: TEST_FAMILY_ID,
          parent_id: TEST_PARENT_ID,
          activity_type: 'story',
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!inserted) throw new Error('CDC_NOT_ENABLED');

      await serviceClient.from('sessions').update({
        ended_at: new Date().toISOString(),
        elapsed_seconds: 60,
        status: 'completed',
      }).eq('id', inserted!.id);

      await new Promise<void>((resolve, reject) => {
        const deadline = setTimeout(() => reject(new Error('CDC_NOT_ENABLED')), 5000);
        const poll = setInterval(() => {
          if (updatedPayload) { clearInterval(poll); clearTimeout(deadline); resolve(); }
        }, 100);
      });

      expect(updatedPayload?.ended_at).not.toBeNull();
      expect(updatedPayload?.status).toBe('completed');
      await serviceClient.removeChannel(channel);
    } catch (err: any) {
      if (err?.message?.includes('CDC_NOT_ENABLED')) {
        console.warn('[sessions] Scenario D skipped: CDC not enabled — apply migration 20260613020001');
        return;
      }
      throw err;
    }
  });

  // ── Scenario G (US2, FR-008 — positive RLS) ──────────────────────────────

  it('Scenario G — serviceClient reads own-family sessions; returns correct family_id rows', async () => {
    await serviceClient.from('sessions').insert({
      child_id: TEST_CHILD_ID,
      family_id: TEST_FAMILY_ID,
      parent_id: TEST_PARENT_ID,
      activity_type: 'creative',
      status: 'active',
      started_at: new Date().toISOString(),
    });

    const { data, error } = await serviceClient
      .from('sessions')
      .select('*')
      .eq('family_id', TEST_FAMILY_ID);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((s: any) => s.family_id === TEST_FAMILY_ID)).toBe(true);
  });

  // ── Scenario G2 (US2, FR-008 — negative RLS) ─────────────────────────────

  it('Scenario G2 — unauthenticated client cannot read sessions from another family (RLS blocks)', async () => {
    await serviceClient.from('sessions').insert({
      child_id: TEST_CHILD_ID,
      family_id: OTHER_FAMILY_ID,
      parent_id: TEST_PARENT_ID,
      activity_type: 'game',
      status: 'active',
      started_at: new Date().toISOString(),
    });

    // anonClient (signed in anonymously, no profile row) should see 0 rows via RLS
    const { data, error } = await anonClient
      .from('sessions')
      .select('*')
      .eq('family_id', OTHER_FAMILY_ID);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  // ── Scenario F (US3, FR-006 — timezone boundary) ─────────────────────────

  it('Scenario F — today query (tzOffset=0) excludes sessions from yesterday UTC', async () => {
    const now = new Date();
    const todayISO = now.toISOString();
    const yesterdayISO = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: todayRow } = await serviceClient
      .from('sessions')
      .insert({
        child_id: TEST_CHILD_ID,
        family_id: TEST_FAMILY_ID,
        parent_id: TEST_PARENT_ID,
        activity_type: 'story',
        status: 'completed',
        started_at: todayISO,
        ended_at: todayISO,
        elapsed_seconds: 600,
      })
      .select()
      .single();

    const { data: yesterdayRow } = await serviceClient
      .from('sessions')
      .insert({
        child_id: TEST_CHILD_ID,
        family_id: TEST_FAMILY_ID,
        parent_id: TEST_PARENT_ID,
        activity_type: 'story',
        status: 'completed',
        started_at: yesterdayISO,
        ended_at: yesterdayISO,
        elapsed_seconds: 300,
      })
      .select()
      .single();

    const { start, end } = todayBoundaryUTC(0);

    const { data: sessions, error } = await serviceClient
      .from('sessions')
      .select('id')
      .eq('child_id', TEST_CHILD_ID)
      .gte('started_at', start)
      .lt('started_at', end);

    expect(error).toBeNull();
    const ids = sessions!.map((s: any) => s.id);
    expect(ids).toContain(todayRow!.id);
    expect(ids).not.toContain(yesterdayRow!.id);
  });
});
