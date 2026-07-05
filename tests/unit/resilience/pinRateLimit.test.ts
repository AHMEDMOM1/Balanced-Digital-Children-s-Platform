/**
 * tests/unit/resilience/pinRateLimit.test.ts
 * T047: PIN recovery rate limit — 3/hr, 24h lockout after 3 consecutive locked hours.
 */

jest.mock('../../../services/resilience/db', () => {
  const logs: Array<[string, number, string, number]> = [];
  const db = {
    runAsync: jest.fn(async (_sql: string, ...args: any[]) => {
      logs.push(args as [string, number, string, number]);
    }),
    getFirstAsync: jest.fn(async (sql: string, ...queryArgs: any[]) => {
      if (sql.includes('pin_recovery_lockout')) {
        const likePattern: string = queryArgs[0] ?? '';
        const emailMatch = likePattern.match(/"email":"([^"]+)"/);
        const email = emailMatch ? emailMatch[1] : '';
        const matches = logs
          .filter(r => r[0] === 'pin_recovery_lockout' && (!email || (r[2] ?? '').includes(email)));
        return matches.length > 0 ? { context_json: matches[matches.length - 1][2] } : null;
      }
      return null;
    }),
  };
  return { getDB: jest.fn(async () => db) };
});

jest.mock('../../../services/api/client', () => ({
  getClient: jest.fn(() => ({
    rpc: jest.fn(async () => ({ error: null })),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({ data: null, error: { message: 'not found' } })),
          })),
        })),
      })),
    })),
  })),
}));

import { PinRecoveryManager } from '../../../services/resilience/pinRecoveryManager';

let manager: PinRecoveryManager;

beforeEach(() => {
  manager = new PinRecoveryManager();
});

describe('PIN rate limiting', () => {
  it('allows first 3 attempts within 1 hour', async () => {
    const r1 = await manager.attempt('a@test.com');
    const r2 = await manager.attempt('a@test.com');
    const r3 = await manager.attempt('a@test.com');
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it('blocks the 4th attempt within 1 hour', async () => {
    await manager.attempt('b@test.com');
    await manager.attempt('b@test.com');
    await manager.attempt('b@test.com');
    const r4 = await manager.attempt('b@test.com');
    expect(r4.allowed).toBe(false);
    expect(r4.reason).toBeTruthy();
  });

  it('allows a new attempt after hour window resets', async () => {
    const RealDate = Date;
    let fakeNow = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);

    const m = new PinRecoveryManager();
    await m.attempt('c@test.com');
    await m.attempt('c@test.com');
    await m.attempt('c@test.com');

    // Advance 61 minutes
    fakeNow += 61 * 60 * 1000;

    const r = await m.attempt('c@test.com');
    expect(r.allowed).toBe(true);

    jest.restoreAllMocks();
  });
});

describe('PIN token generation and verification', () => {
  it('generates a UUID token', () => {
    const token = manager.generateToken('d@test.com');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  it('verifyEmail returns true for valid unexpired token', async () => {
    const token = manager.generateToken('e@test.com');
    const valid = await manager.verifyEmail(token);
    expect(valid).toBe(true);
  });

  it('verifyEmail returns false for unknown token', async () => {
    const valid = await manager.verifyEmail('nonexistent-token');
    expect(valid).toBe(false);
  });
});
