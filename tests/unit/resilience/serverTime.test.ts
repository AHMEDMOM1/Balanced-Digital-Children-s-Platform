/**
 * tests/unit/resilience/serverTime.test.ts
 * T040: Server time sync offset stored in useSessionStore.
 * Verifies TimeSync calculates, caches, and applies the server→client offset.
 */
import { timeSync } from '../../../services/resilience/timeSync';

jest.mock('../../../services/api/client', () => ({
  getClient: jest.fn(() => ({
    rpc: jest.fn(),
  })),
}));

function getMockRpc() {
  const { getClient } = jest.requireMock('../../../services/api/client');
  return getClient().rpc as jest.Mock;
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TimeSync', () => {
  it('returns server time and stores positive offset', async () => {
    const serverMs = 1_700_000_005_000; // 5s ahead
    getMockRpc().mockResolvedValue({ data: serverMs, error: null });

    const result = await timeSync.sync();
    expect(result).toBe(serverMs);
    expect(timeSync.getOffset()).toBe(5000); // 5s ahead
  });

  it('returns server time and stores negative offset', async () => {
    const serverMs = 1_699_999_998_000; // 2s behind
    getMockRpc().mockResolvedValue({ data: serverMs, error: null });

    await timeSync.sync();
    expect(timeSync.getOffset()).toBe(-2000);
  });

  it('falls back to Date.now() on RPC error', async () => {
    getMockRpc().mockResolvedValue({ data: null, error: { message: 'network error' } });

    const result = await timeSync.sync();
    expect(result).toBe(1_700_000_000_000); // equals Date.now()
  });

  it('getServerAdjustedNow() applies offset to Date.now()', async () => {
    getMockRpc().mockResolvedValue({ data: 1_700_000_003_000, error: null });
    await timeSync.sync();

    const adjusted = timeSync.getServerAdjustedNow();
    expect(adjusted).toBe(1_700_000_000_000 + 3000);
  });

  it('getDriftSeconds() returns rounded drift in seconds', async () => {
    getMockRpc().mockResolvedValue({ data: 1_700_000_007_500, error: null }); // 7.5s ahead
    await timeSync.sync();
    expect(timeSync.getDriftSeconds()).toBe(8); // Math.round(7500/1000)
  });

  it('deduplicates concurrent sync calls (only one RPC fired)', async () => {
    let resolveRpc!: (v: any) => void;
    getMockRpc().mockReturnValue(new Promise((res) => { resolveRpc = res; }));

    const p1 = timeSync.sync();
    const p2 = timeSync.sync();

    resolveRpc({ data: 1_700_000_001_000, error: null });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(r2);
    expect(getMockRpc()).toHaveBeenCalledTimes(1);
  });

  it('getLastSyncAt() updates after successful sync', async () => {
    getMockRpc().mockResolvedValue({ data: 1_700_000_002_000, error: null });
    const before = timeSync.getLastSyncAt();
    await timeSync.sync();
    expect(timeSync.getLastSyncAt()).toBeGreaterThanOrEqual(before);
  });
});
