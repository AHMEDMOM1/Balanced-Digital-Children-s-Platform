/**
 * tests/unit/resilience/sessionAutoSave.test.ts
 * T039: Session auto-save to SQLite every 5 seconds while active.
 */
import { sessionManager, SessionSnapshot } from '../../../services/resilience/sessionManager';

// Mock expo-sqlite so tests run in Node
jest.mock('../../../services/resilience/db', () => {
  const store: Record<string, any> = {};
  const db = {
    runAsync: jest.fn(async (sql: string, ...args: any[]) => {
      if (sql.includes('INSERT OR REPLACE INTO session_persistence')) {
        store['row'] = {
          child_id: args[0],
          content_id: args[1],
          activity_type: args[2],
          elapsed_seconds: args[3],
          start_time: args[4],
          limit_snapshot: args[5],
          last_updated: args[6],
        };
      }
    }),
    getFirstAsync: jest.fn(async () => store['row'] ?? null),
  };
  return { getDB: jest.fn(async () => db), _store: store };
});

const BASE_SNAPSHOT: SessionSnapshot = {
  childId: 'child-1',
  contentItemId: 'item-abc',
  activityType: 'story',
  elapsedSeconds: 0,
  sessionStartedAt: new Date().toISOString(),
  lastSavedAt: new Date().toISOString(),
  dailyLimitSeconds: 3600,
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SessionManager — auto save', () => {
  it('saves snapshot without error', async () => {
    await expect(sessionManager.save(BASE_SNAPSHOT)).resolves.not.toThrow();
  });

  it('restores a saved snapshot', async () => {
    await sessionManager.save({ ...BASE_SNAPSHOT, elapsedSeconds: 120 });
    const restored = await sessionManager.restore();
    expect(restored).not.toBeNull();
    expect(restored!.childId).toBe('child-1');
    expect(restored!.activityType).toBe('story');
  });

  it('gap compensation adds elapsed time capped at 30s', async () => {
    const { _store } = jest.requireMock('../../../services/resilience/db');
    // Simulate a row that was saved 40s ago
    const fortySecondsAgo = Date.now() - 40_000;
    _store['row'] = {
      child_id: 'c1',
      content_id: 'i1',
      activity_type: 'game',
      elapsed_seconds: 100,
      start_time: Date.now() - 120_000,
      limit_snapshot: 3600,
      last_updated: fortySecondsAgo,
    };

    const restored = await sessionManager.restore();
    // Gap = 40s, capped at 30s → elapsedSeconds = 100 + 30 = 130
    expect(restored!.elapsedSeconds).toBe(130);
  });

  it('gap compensation does not exceed 30s even for very old saves', async () => {
    const { _store } = jest.requireMock('../../../services/resilience/db');
    _store['row'] = {
      child_id: 'c1',
      content_id: 'i1',
      activity_type: 'video',
      elapsed_seconds: 50,
      start_time: Date.now() - 600_000,
      limit_snapshot: 3600,
      last_updated: Date.now() - 300_000, // 5 minutes ago
    };

    const restored = await sessionManager.restore();
    expect(restored!.elapsedSeconds).toBe(80); // 50 + 30 (capped)
  });

  it('restore returns null when no session saved', async () => {
    const { _store } = jest.requireMock('../../../services/resilience/db');
    delete _store['row'];
    const restored = await sessionManager.restore();
    expect(restored).toBeNull();
  });
});
