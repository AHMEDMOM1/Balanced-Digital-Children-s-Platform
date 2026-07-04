jest.mock('../../services/api/client', () => ({
  getClient: jest.fn(),
}));

import { getClient } from '../../services/api/client';
import { verifySeed } from '../../scripts/seed-verify';

type MockRow = {
  child_id: string;
  stat_date: string;
  total_seconds: number;
  stories_seconds: number;
  games_seconds: number;
  videos_seconds: number;
  creative_seconds: number;
  is_finalized: boolean;
};

function mockClient(rows: MockRow[] | null, error: object | null = null) {
  (getClient as jest.Mock).mockReturnValue({
    from: () => ({
      select: () => Promise.resolve({ data: rows, error }),
    }),
  });
}

function makeGoodRows(childId = 'child-1', count = 30): MockRow[] {
  const today = new Date().toISOString().split('T')[0];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (count - 1 - i));
    const date = d.toISOString().split('T')[0];
    return {
      child_id: childId,
      stat_date: date,
      total_seconds: 7200,
      stories_seconds: 600,
      games_seconds: 600,
      videos_seconds: 600,
      creative_seconds: 600,
      is_finalized: date < today,
    };
  });
}

describe('Seed Verification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns PASS when 30 rows per child exist with valid data', async () => {
    mockClient(makeGoodRows());
    const result = await verifySeed();
    expect(result.pass).toBe(true);
  });

  it('returns FAIL with "0 rows found" when no rows exist', async () => {
    mockClient([]);
    const result = await verifySeed();
    expect(result.pass).toBe(false);
    expect(result.messages.join(' ')).toMatch(/0 rows found/i);
  });

  it('returns FAIL when a category value is zero', async () => {
    const rows = makeGoodRows();
    rows[0].stories_seconds = 0;
    mockClient(rows);
    const result = await verifySeed();
    expect(result.pass).toBe(false);
    expect(result.categoriesOk).toBe(false);
  });

  it('passes finalization check when past rows have is_finalized = true', async () => {
    mockClient(makeGoodRows());
    const result = await verifySeed();
    expect(result.pastFinalizedOk).toBe(true);
  });

  it('passes today check when today row has is_finalized = false', async () => {
    mockClient(makeGoodRows());
    const result = await verifySeed();
    expect(result.todayNotFinalizedOk).toBe(true);
  });

  it('returns FAIL when MIN(total_seconds) < 1200', async () => {
    const rows = makeGoodRows().map(r => ({ ...r, total_seconds: 800 }));
    mockClient(rows);
    const result = await verifySeed();
    expect(result.pass).toBe(false);
    expect(result.totalSecondsOk).toBe(false);
    expect(result.messages.join(' ')).toMatch(/total_seconds below minimum/i);
  });

  // US2: multi-child scenario
  it('outputs "Children seeded: 2" when two children have rows', async () => {
    const childA = makeGoodRows('child-a');
    const childB = makeGoodRows('child-b').map(r => ({ ...r, total_seconds: 3600 }));
    mockClient([...childA, ...childB]);
    const result = await verifySeed();
    expect(result.childCount).toBe(2);
    expect(result.pass).toBe(true);
  });

  // US3 pass: all 4 category MIN values > 0
  it('outputs "All 4 categories non-zero: ✓" when all MIN category values > 0', async () => {
    mockClient(makeGoodRows());
    const result = await verifySeed();
    expect(result.categoriesOk).toBe(true);
    expect(result.pass).toBe(true);
  });

  // US3 fail: MIN(stories_seconds) = 0
  it('outputs "All 4 categories non-zero: ✗" when MIN(stories_seconds) = 0', async () => {
    const rows = makeGoodRows();
    rows[0].stories_seconds = 0;
    mockClient(rows);
    const result = await verifySeed();
    expect(result.categoriesOk).toBe(false);
    expect(result.pass).toBe(false);
  });
});
