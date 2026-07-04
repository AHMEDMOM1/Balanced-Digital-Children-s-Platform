/**
 * tests/unit/pairingToken.test.ts
 * T008: Unit tests for formatDisplayCode helper — TDD gate (must FAIL before T012)
 */

jest.mock('../../services/api/client', () => ({
  getClient: jest.fn(() => ({})),
}));

import { formatDisplayCode } from '../../services/api/pairing';

describe('formatDisplayCode', () => {
  it('formats 6-digit code as XXX-XXX', () => {
    expect(formatDisplayCode('482931')).toBe('482-931');
  });

  it('preserves leading zeros', () => {
    expect(formatDisplayCode('000001')).toBe('000-001');
  });

  it('handles max value', () => {
    expect(formatDisplayCode('999999')).toBe('999-999');
  });

  it('result always matches /^\\d{3}-\\d{3}$/', () => {
    const result = formatDisplayCode('123456');
    expect(result).toMatch(/^\d{3}-\d{3}$/);
  });
});
