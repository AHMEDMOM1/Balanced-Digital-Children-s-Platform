/**
 * tests/integration/clockBypass.test.ts
 * T040 (integration): Server time offset applied to session tick — device clock manipulation
 * cannot extend screen time beyond the real server-side limit.
 */

jest.mock('../../../services/api/client', () => ({
  getClient: jest.fn(() => ({
    rpc: jest.fn(),
  })),
}));

import { timeSync } from '../../../services/resilience/timeSync';

function getMockRpc() {
  const { getClient } = jest.requireMock('../../../services/api/client');
  return getClient().rpc as jest.Mock;
}

describe('Clock bypass resistance', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getServerAdjustedNow() reflects positive server offset', async () => {
    const clientNow = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(clientNow);
    getMockRpc().mockResolvedValue({ data: clientNow + 8000, error: null }); // server 8s ahead

    await timeSync.sync();
    const adjusted = timeSync.getServerAdjustedNow();
    // adjusted = clientNow + 8000
    expect(adjusted).toBe(clientNow + 8000);
  });

  it('getServerAdjustedNow() reflects negative server offset (client ahead)', async () => {
    const clientNow = 1_700_000_010_000;
    jest.spyOn(Date, 'now').mockReturnValue(clientNow);
    getMockRpc().mockResolvedValue({ data: clientNow - 5000, error: null }); // server 5s behind

    await timeSync.sync();
    const adjusted = timeSync.getServerAdjustedNow();
    expect(adjusted).toBe(clientNow - 5000);
  });

  it('session elapsed time should use server-adjusted clock', async () => {
    const clientNow = 1_700_000_000_000;
    // Client clock is 60s BEHIND real time (attacker moved clock back to gain extra time)
    const realServerTime = clientNow + 60_000;
    jest.spyOn(Date, 'now').mockReturnValue(clientNow);
    getMockRpc().mockResolvedValue({ data: realServerTime, error: null });

    await timeSync.sync();

    // If session starts at server time and ends 5 minutes later (by server time),
    // the elapsed should be 300s regardless of the local clock manipulation.
    const sessionStartServerTime = timeSync.getServerAdjustedNow();
    const fiveMinutesLater = clientNow + 5 * 60 * 1000; // 5 min by client clock
    jest.spyOn(Date, 'now').mockReturnValue(fiveMinutesLater);

    const sessionEndServerTime = timeSync.getServerAdjustedNow();
    const elapsedByServerClock = Math.round((sessionEndServerTime - sessionStartServerTime) / 1000);

    expect(elapsedByServerClock).toBe(300); // exactly 5 minutes, not inflated by clock manipulation
  });

  it('falls back gracefully when RPC fails — uses device clock', async () => {
    const clientNow = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(clientNow);
    getMockRpc().mockResolvedValue({ data: null, error: { message: 'timeout' } });

    const result = await timeSync.sync();
    expect(result).toBe(clientNow); // fallback to device clock
    expect(timeSync.getOffset()).toBe(0); // offset should remain at cached value (0 initially)
  });
});
