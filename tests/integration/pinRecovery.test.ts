/**
 * tests/integration/pinRecovery.test.ts
 * T047 (integration): Full PIN recovery flow — generate token → verify → reset PIN via RPC.
 */

jest.mock('../../../services/resilience/db', () => {
  const rows: any[] = [];
  const db = {
    runAsync: jest.fn(async (_sql: string, ...args: any[]) => { rows.push(args); }),
    getFirstAsync: jest.fn(async () => null),
  };
  return { getDB: jest.fn(async () => db), _rows: rows };
});

jest.mock('../../../services/api/client', () => {
  const rpcMock = jest.fn(async () => ({ error: null }));
  const fromMock = jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => ({ data: null, error: { message: 'not found' } })),
        })),
      })),
    })),
  }));
  return {
    getClient: jest.fn(() => ({ rpc: rpcMock, from: fromMock })),
    _getRpc: () => rpcMock,
  };
});

import { PinRecoveryManager } from '../../../services/resilience/pinRecoveryManager';

function getMockRpc() {
  const { _getRpc } = jest.requireMock('../../../services/api/client');
  return _getRpc() as jest.Mock;
}

describe('PIN recovery flow', () => {
  let manager: PinRecoveryManager;

  beforeEach(() => {
    manager = new PinRecoveryManager();
    jest.clearAllMocks();
  });

  it('full flow: attempt → generateToken → verifyEmail → resetPin', async () => {
    const email = 'parent@test.com';

    const attempt = await manager.attempt(email);
    expect(attempt.allowed).toBe(true);

    const token = manager.generateToken(email);
    expect(typeof token).toBe('string');

    const emailVerified = await manager.verifyEmail(token);
    expect(emailVerified).toBe(true);

    const resetResult = await manager.resetPin('1234');
    expect(resetResult).toBe(true);
    expect(getMockRpc()).toHaveBeenCalledWith('reset_parent_pin', {
      p_email: email,
      p_new_pin: '1234',
    });
  });

  it('resetPin fails when no email is pending (verifyEmail not called)', async () => {
    const result = await manager.resetPin('5678');
    expect(result).toBe(false);
  });

  it('resetPin fails for PIN shorter than 4 digits', async () => {
    manager.generateToken('short@test.com');
    await manager.verifyEmail(manager.generateToken('short@test.com'));
    const result = await manager.resetPin('12');
    expect(result).toBe(false);
  });

  it('resetPin returns false when RPC fails', async () => {
    getMockRpc().mockResolvedValue({ error: { message: 'rpc error' } });

    const email = 'fail@test.com';
    manager.generateToken(email);
    await manager.verifyEmail(manager.generateToken(email));

    const result = await manager.resetPin('9999');
    expect(result).toBe(false);
  });

  it('getLockoutStatus returns not locked initially', async () => {
    const status = await manager.getLockoutStatus();
    expect(status.locked).toBe(false);
    expect(status.remainingMs).toBe(0);
  });
});
