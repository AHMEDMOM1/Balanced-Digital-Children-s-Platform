import * as crypto from 'crypto';

export const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256' as const,
};

export const digestStringAsync = jest.fn(async (algorithm: string, data: string): Promise<string> => {
  return crypto.createHash('sha256').update(data).digest('hex');
});
