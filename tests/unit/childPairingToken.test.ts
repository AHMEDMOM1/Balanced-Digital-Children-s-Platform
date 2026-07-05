jest.mock('../../services/api/client', () => ({
  getClient: jest.fn(() => ({})),
}));

import { parseQrPayload, isTokenExpired, parseManualCode } from '../../services/api/childPairing';

describe('parseQrPayload', () => {
  it('returns QrPayload for valid JSON with all required fields', () => {
    const payload = JSON.stringify({
      token: 'abc123uuid',
      family_id: 'fam456uuid',
      expires_at: '2099-01-01T00:00:00Z',
    });
    const result = parseQrPayload(payload);
    expect(result).not.toBeNull();
    expect(result!.token).toBe('abc123uuid');
    expect(result!.family_id).toBe('fam456uuid');
    expect(result!.expires_at).toBe('2099-01-01T00:00:00Z');
  });

  it('returns null for malformed JSON', () => {
    expect(parseQrPayload('not-json')).toBeNull();
    expect(parseQrPayload('')).toBeNull();
    expect(parseQrPayload('{bad')).toBeNull();
  });

  it('returns null when token field is missing', () => {
    const payload = JSON.stringify({ family_id: 'fam', expires_at: '2099-01-01T00:00:00Z' });
    expect(parseQrPayload(payload)).toBeNull();
  });

  it('returns null when family_id field is missing', () => {
    const payload = JSON.stringify({ token: 'tok', expires_at: '2099-01-01T00:00:00Z' });
    expect(parseQrPayload(payload)).toBeNull();
  });

  it('returns null when expires_at field is missing', () => {
    const payload = JSON.stringify({ token: 'tok', family_id: 'fam' });
    expect(parseQrPayload(payload)).toBeNull();
  });

  it('returns null when any field is empty string', () => {
    const payload = JSON.stringify({ token: '', family_id: 'fam', expires_at: '2099-01-01T00:00:00Z' });
    expect(parseQrPayload(payload)).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('returns true for past expires_at', () => {
    const pastTime = new Date(Date.now() - 60_000).toISOString();
    expect(isTokenExpired({ token: 't', family_id: 'f', expires_at: pastTime })).toBe(true);
  });

  it('returns false for future expires_at', () => {
    const futureTime = new Date(Date.now() + 600_000).toISOString();
    expect(isTokenExpired({ token: 't', family_id: 'f', expires_at: futureTime })).toBe(false);
  });

  it('returns true when expires_at equals now (boundary)', () => {
    const nowIsh = new Date(Date.now() - 1).toISOString();
    expect(isTokenExpired({ token: 't', family_id: 'f', expires_at: nowIsh })).toBe(true);
  });
});

describe('parseManualCode', () => {
  it('strips hyphen and returns 6-digit string', () => {
    expect(parseManualCode('482-931')).toBe('482931');
  });

  it('accepts plain 6-digit string without hyphen', () => {
    expect(parseManualCode('482931')).toBe('482931');
  });

  it('returns null for fewer than 6 digits', () => {
    expect(parseManualCode('123')).toBeNull();
    expect(parseManualCode('12345')).toBeNull();
  });

  it('returns null for more than 6 digits', () => {
    expect(parseManualCode('1234567')).toBeNull();
  });

  it('returns null for non-digit characters after strip', () => {
    expect(parseManualCode('abc-def')).toBeNull();
    expect(parseManualCode('12a456')).toBeNull();
  });

  it('handles leading zeros correctly', () => {
    expect(parseManualCode('000-001')).toBe('000001');
  });
});
