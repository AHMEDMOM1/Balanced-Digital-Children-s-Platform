import { pinRecoveryManager } from '../../../services/resilience/pinRecoveryManager';
import { getDB } from '../../../services/resilience/db';

jest.mock('../../../services/api/client', () => ({
  getClient: jest.fn(() => ({
    rpc: jest.fn(async () => ({ error: null })),
    from: jest.fn(() => ({ select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(async () => ({ data: null, error: null })) })) })) })) })),
  })),
}));

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

describe('PinRecoveryManager', () => {
  describe('attempt', () => {
    it('allows first attempt', async () => {
      mockGetFirstAsync.mockResolvedValue(null);
      const result = await pinRecoveryManager.attempt('parent@test.com');
      expect(result.allowed).toBe(true);
    });

    it('blocks when locked out', async () => {
      mockGetFirstAsync.mockResolvedValue({
        context_json: JSON.stringify({
          email: 'parent@test.com',
          attemptCount: 3,
          firstAttemptAt: Date.now(),
          lockedUntil: Date.now() + 3600000,
          consecutiveLockedHours: 0,
        }),
      });
      const result = await pinRecoveryManager.attempt('parent@test.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Locked');
    });

    it('blocks after 3 attempts in an hour', async () => {
      const hourAgo = Date.now() - 3000000;
      mockGetFirstAsync.mockResolvedValue({
        context_json: JSON.stringify({
          email: 'parent@test.com',
          attemptCount: 3,
          firstAttemptAt: hourAgo,
          lockedUntil: null,
          consecutiveLockedHours: 0,
        }),
      });
      const result = await pinRecoveryManager.attempt('parent@test.com');
      expect(result.allowed).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('generates a UUID token', () => {
      const token = pinRecoveryManager.generateToken('parent@test.com');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyEmail', () => {
    it('returns true for valid token', async () => {
      const token = pinRecoveryManager.generateToken('parent@test.com');
      const valid = await pinRecoveryManager.verifyEmail(token);
      expect(valid).toBe(true);
    });

    it('returns false for invalid token', async () => {
      const valid = await pinRecoveryManager.verifyEmail('fake-token');
      expect(valid).toBe(false);
    });
  });

  describe('resetPin', () => {
    it('resets PIN with valid length', async () => {
      const result = await pinRecoveryManager.resetPin('1234');
      expect(result).toBe(true);
    });
  });
});
