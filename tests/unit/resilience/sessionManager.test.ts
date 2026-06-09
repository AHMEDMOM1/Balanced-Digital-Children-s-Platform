import { sessionManager, SessionSnapshot } from '../../../services/resilience/sessionManager';
import { getDB } from '../../../services/resilience/db';

jest.mock('../../../services/resilience/db', () => ({
  getDB: jest.fn(),
}));

const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getDB as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
  });
});

const sampleSnapshot: SessionSnapshot = {
  childId: 'child-1',
  contentItemId: 'content-1',
  activityType: 'story',
  elapsedSeconds: 300,
  sessionStartedAt: new Date(Date.now() - 600000).toISOString(),
  lastSavedAt: new Date().toISOString(),
  dailyLimitSeconds: 3600,
};

describe('SessionManager', () => {
  describe('save', () => {
    it('persists session snapshot to DB', async () => {
      await sessionManager.save(sampleSnapshot);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO session_persistence'),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('restore', () => {
    it('returns null when no snapshot exists', async () => {
      mockGetFirstAsync.mockResolvedValue(null);
      const result = await sessionManager.restore();
      expect(result).toBeNull();
    });

    it('returns parsed snapshot when one exists', async () => {
      mockGetFirstAsync.mockResolvedValue({
        child_id: 'child-1',
        content_id: 'content-1',
        elapsed_seconds: 300,
        start_time: Date.now() - 600000,
        limit_snapshot: 3600,
        last_updated: Date.now(),
      });
      const result = await sessionManager.restore();
      expect(result).not.toBeNull();
      expect(result!.childId).toBe('child-1');
      expect(result!.elapsedSeconds).toBe(300);
    });
  });

  describe('clear', () => {
    it('deletes session persistence row', async () => {
      await sessionManager.clear();
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM session_persistence WHERE id = 1'
      );
    });
  });
});
