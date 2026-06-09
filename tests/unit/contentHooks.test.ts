/**
 * TDD tests for content API helpers — opt-out category model.
 *
 * Spec FR-001: All categories are available by default; parent blocks specific
 * categories to restrict access (opt-out model).
 *
 * Verifies:
 * - fetchBlockedCategories queries is_allowed=false (not true)
 * - buildContentQuery uses .not() to exclude blocked categories (not .in() to include)
 * - No category filter when none are blocked (all content accessible)
 */

import { fetchBlockedCategories, buildContentQuery } from '../../services/api/contentHelpers';

// Thenable query builder mock that records all chained calls
function makeQueryChain(resolveValue: { data: any; error: any }) {
  const calls: { method: string; args: any[] }[] = [];
  const chain: any = {
    _calls: calls,
    select: jest.fn((...a) => { calls.push({ method: 'select', args: a }); return chain; }),
    eq: jest.fn((...a) => { calls.push({ method: 'eq', args: a }); return chain; }),
    not: jest.fn((...a) => { calls.push({ method: 'not', args: a }); return chain; }),
    in: jest.fn((...a) => { calls.push({ method: 'in', args: a }); return chain; }),
    lte: jest.fn((...a) => { calls.push({ method: 'lte', args: a }); return chain; }),
    gte: jest.fn((...a) => { calls.push({ method: 'gte', args: a }); return chain; }),
    single: jest.fn((...a) => { calls.push({ method: 'single', args: a }); return chain; }),
    // Make the chain awaitable — resolves with the configured value
    then: (onFulfilled: any, onRejected?: any) =>
      Promise.resolve(resolveValue).then(onFulfilled, onRejected),
  };
  return chain;
}

let mockFromFn: jest.Mock;

jest.mock('../../services/api/client', () => ({
  getClient: jest.fn(() => ({ from: (...a: any[]) => mockFromFn(...a) })),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchBlockedCategories — opt-out model', () => {
  it('queries is_allowed = false (not true)', async () => {
    const chain = makeQueryChain({ data: [], error: null });
    mockFromFn = jest.fn(() => chain);

    await fetchBlockedCategories('child-123');

    const eqCalls = (chain.eq as jest.Mock).mock.calls;
    const isAllowedCall = eqCalls.find((c: any[]) => c[0] === 'is_allowed');
    expect(isAllowedCall).toBeDefined();
    // MUST be false (opt-out) — not true (opt-in)
    expect(isAllowedCall![1]).toBe(false);
  });

  it('returns empty array when no categories are blocked (all accessible by default)', async () => {
    const chain = makeQueryChain({ data: [], error: null });
    mockFromFn = jest.fn(() => chain);
    const blocked = await fetchBlockedCategories('child-123');
    expect(blocked).toEqual([]);
  });

  it('returns blocked category names', async () => {
    const chain = makeQueryChain({
      data: [{ category: 'videos' }, { category: 'games' }],
      error: null,
    });
    mockFromFn = jest.fn(() => chain);
    const blocked = await fetchBlockedCategories('child-123');
    expect(blocked).toEqual(['videos', 'games']);
  });

  it('returns empty array on database error', async () => {
    const chain = makeQueryChain({ data: null, error: { message: 'DB error' } });
    mockFromFn = jest.fn(() => chain);
    const blocked = await fetchBlockedCategories('child-123');
    expect(blocked).toEqual([]);
  });
});

describe('buildContentQuery — excludes blocked categories', () => {
  it('uses .not() to exclude blocked categories, not .in() to include allowed', () => {
    const chain = makeQueryChain({ data: [], error: null });
    mockFromFn = jest.fn(() => chain);

    buildContentQuery(chain, 'story', { min: 5, max: 7 }, ['videos', 'games']);

    // Must use NOT IN to exclude blocked categories
    expect(chain.not).toHaveBeenCalledWith(
      'category',
      'in',
      expect.stringContaining('videos'),
    );
    // Must NOT use .in() to filter to only allowed categories
    expect(chain.in).not.toHaveBeenCalled();
  });

  it('does not filter by category when no categories are blocked', () => {
    const chain = makeQueryChain({ data: [], error: null });
    mockFromFn = jest.fn(() => chain);

    buildContentQuery(chain, 'story', { min: 5, max: 7 }, []);

    // With no blocked categories, no category filter at all
    expect(chain.not).not.toHaveBeenCalled();
    expect(chain.in).not.toHaveBeenCalled();
  });

  it('applies age range filter using lte+gte', () => {
    const chain = makeQueryChain({ data: [], error: null });
    mockFromFn = jest.fn(() => chain);

    buildContentQuery(chain, 'story', { min: 5, max: 7 }, []);

    expect(chain.lte).toHaveBeenCalledWith('min_age', 7);
    expect(chain.gte).toHaveBeenCalledWith('max_age', 5);
  });

  it('skips age filter when ageRange is null', () => {
    const chain = makeQueryChain({ data: [], error: null });
    mockFromFn = jest.fn(() => chain);

    buildContentQuery(chain, 'story', null, []);

    expect(chain.lte).not.toHaveBeenCalled();
    expect(chain.gte).not.toHaveBeenCalled();
  });
});
