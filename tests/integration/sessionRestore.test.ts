/**
 * tests/integration/sessionRestore.test.ts
 * T039 (integration): Session snapshot is saved and restored correctly
 * across a simulated app-kill and restart, with gap compensation.
 */

jest.mock('../../../services/resilience/db', () => {
  let stored: Record<string, any> | null = null;
  const db = {
    runAsync: jest.fn(async (_sql: string, ...args: any[]) => {
      stored = {
        child_id: args[0],
        content_id: args[1],
        activity_type: args[2],
        elapsed_seconds: args[3],
        start_time: args[4],
        limit_snapshot: args[5],
        last_updated: args[6],
      };
    }),
    getFirstAsync: jest.fn(async () => stored),
    runAsync_clear: () => { stored = null; },
  };
  return {
    getDB: jest.fn(async () => db),
    _getStored: () => stored,
    _setStored: (v: any) => { stored = v; },
  };
});

import { sessionManager, SessionSnapshot } from '../../../services/resilience/sessionManager';

const SNAPSHOT: SessionSnapshot = {
  childId: 'child-restore-test',
  contentItemId: 'story-123',
  activityType: 'story',
  elapsedSeconds: 300,
  sessionStartedAt: new Date(Date.now() - 300_000).toISOString(),
  lastSavedAt: new Date().toISOString(),
  dailyLimitSeconds: 3600,
};

describe('Session restore integration', () => {
  it('round-trips a session snapshot', async () => {
    await sessionManager.save(SNAPSHOT);
    const restored = await sessionManager.restore();

    expect(restored).not.toBeNull();
    expect(restored!.childId).toBe(SNAPSHOT.childId);
    expect(restored!.contentItemId).toBe(SNAPSHOT.contentItemId);
    expect(restored!.activityType).toBe(SNAPSHOT.activityType);
    expect(restored!.dailyLimitSeconds).toBe(SNAPSHOT.dailyLimitSeconds);
  });

  it('applies gap compensation ≤ 30s when app was killed for a short period', async () => {
    const { _setStored } = jest.requireMock('../../../services/resilience/db');
    const tenSecondsAgo = Date.now() - 10_000;
    _setStored({
      child_id: 'gap-child',
      content_id: 'game-xyz',
      activity_type: 'game',
      elapsed_seconds: 200,
      start_time: Date.now() - 250_000,
      limit_snapshot: 1800,
      last_updated: tenSecondsAgo,
    });

    const restored = await sessionManager.restore();
    expect(restored!.elapsedSeconds).toBe(210); // 200 + 10
  });

  it('caps gap compensation at 30s even after a long gap', async () => {
    const { _setStored } = jest.requireMock('../../../services/resilience/db');
    _setStored({
      child_id: 'gap-child',
      content_id: 'video-abc',
      activity_type: 'video',
      elapsed_seconds: 150,
      start_time: Date.now() - 500_000,
      limit_snapshot: 3600,
      last_updated: Date.now() - 120_000, // 2 minutes ago
    });

    const restored = await sessionManager.restore();
    expect(restored!.elapsedSeconds).toBe(180); // 150 + 30 (capped)
  });

  it('returns null when no session has been saved', async () => {
    const { _setStored } = jest.requireMock('../../../services/resilience/db');
    _setStored(null);

    const restored = await sessionManager.restore();
    expect(restored).toBeNull();
  });
});
