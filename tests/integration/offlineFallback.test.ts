import { cacheManager } from '../../services/resilience/cacheManager';
import { getDB, getTotalCacheSize, evictLRU } from '../../services/resilience/db';

jest.mock('../../services/resilience/db', () => ({
  getDB: jest.fn(),
  getTotalCacheSize: jest.fn(),
  evictLRU: jest.fn(),
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

describe('Offline Fallback Integration', () => {
  it('stores content when online and retrieves it when offline', async () => {
    const content = { id: 'story-1', title: 'The Brave Fox', pages: 10 };

    (getTotalCacheSize as jest.Mock).mockResolvedValue(0);
    await cacheManager.set(`content:${content.id}`, content);

    mockGetFirstAsync.mockResolvedValue({
      data_json: JSON.stringify(content),
      last_synced: Date.now(),
      size_bytes: 200,
    });

    const cached = await cacheManager.get(`content:${content.id}`);
    expect(cached).toEqual(content);
  });

  it('returns null for uncached content when offline', async () => {
    mockGetFirstAsync.mockResolvedValue(null);

    const cached = await cacheManager.get('content:nonexistent');
    expect(cached).toBeNull();
  });
});
