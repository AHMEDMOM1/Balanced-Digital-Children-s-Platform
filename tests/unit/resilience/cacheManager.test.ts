import { cacheManager } from '../../../services/resilience/cacheManager';
import { getDB, getTotalCacheSize, evictLRU } from '../../../services/resilience/db';

jest.mock('../../../services/resilience/db', () => ({
  getDB: jest.fn(),
  getTotalCacheSize: jest.fn(),
  evictLRU: jest.fn(),
  evictExpired: jest.fn(),
}));

const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getDB as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: jest.fn(),
  });
});

describe('CacheManager', () => {
  describe('get', () => {
    it('returns null when key not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);
      const result = await cacheManager.get('nonexistent');
      expect(result).toBeNull();
    });

    it('returns parsed data for valid cache entry', async () => {
      mockGetFirstAsync.mockResolvedValue({
        data_json: JSON.stringify({ name: 'test' }),
        last_synced: Date.now(),
        size_bytes: 100,
      });
      const result = await cacheManager.get('valid-key');
      expect(result).toEqual({ name: 'test' });
    });

    it('deletes and returns null for stale entries (>7 days)', async () => {
      const staleTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
      mockGetFirstAsync.mockResolvedValue({
        data_json: JSON.stringify({ name: 'stale' }),
        last_synced: staleTime,
        size_bytes: 100,
      });
      const result = await cacheManager.get('stale-key');
      expect(result).toBeNull();
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM cached_content WHERE id = ?',
        'stale-key'
      );
    });

    it('deletes and returns null on checksum mismatch', async () => {
      mockGetFirstAsync.mockResolvedValue({
        data_json: JSON.stringify({ name: 'test' }),
        last_synced: Date.now(),
        size_bytes: 100,
      });
      const result = await cacheManager.get('corrupt-key', 'expected-checksum');
      expect(result).toBeNull();
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM cached_content WHERE id = ?',
        'corrupt-key'
      );
    });
  });

  describe('set', () => {
    it('inserts a new cache entry', async () => {
      (getTotalCacheSize as jest.Mock).mockResolvedValue(0);
      await cacheManager.set('new-key', { type: 'story', data: 'hello' });
      expect(mockRunAsync).toHaveBeenCalled();
    });

    it('evicts LRU when adding exceeds limit', async () => {
      (getTotalCacheSize as jest.Mock).mockResolvedValue(100 * 1024 * 1024);
      await cacheManager.set('large-key', { data: 'x'.repeat(1000) });
      expect(evictLRU).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('deletes all cached content', async () => {
      await cacheManager.clear();
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM cached_content');
    });
  });
});
