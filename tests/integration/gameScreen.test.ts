import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY);

const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

maybeDescribe('Game Screen Integration Tests (011-data-driven-games)', () => {
  let client: SupabaseClient;

  beforeAll(() => {
    client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  describe('counting game config_json structure', () => {
    it('has at least one game with game_type = counting', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'game')
        .eq('game_type', 'counting');
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('counting games have required config_json keys', async () => {
      const { data, error } = await client
        .from('content_items')
        .select('id, config_json')
        .eq('type', 'game')
        .eq('game_type', 'counting')
        .limit(5);
      expect(error).toBeNull();
      expect(data).toBeTruthy();
      for (const row of data!) {
        const cfg = row.config_json as Record<string, unknown>;
        expect(cfg).toHaveProperty('type', 'counting');
        expect(cfg).toHaveProperty('question');
        expect(typeof cfg['question']).toBe('string');
        expect(cfg).toHaveProperty('correct_answer');
        expect(typeof cfg['correct_answer']).toBe('number');
        expect(cfg).toHaveProperty('choices');
        expect(Array.isArray(cfg['choices'])).toBe(true);
        expect((cfg['choices'] as unknown[]).length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('matching game config_json structure', () => {
    it('has at least one game with game_type = matching', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'game')
        .eq('game_type', 'matching');
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('matching games have required config_json keys', async () => {
      const { data, error } = await client
        .from('content_items')
        .select('id, config_json')
        .eq('type', 'game')
        .eq('game_type', 'matching')
        .limit(5);
      expect(error).toBeNull();
      expect(data).toBeTruthy();
      for (const row of data!) {
        const cfg = row.config_json as Record<string, unknown>;
        expect(cfg).toHaveProperty('type', 'matching');
        expect(cfg).toHaveProperty('pairs');
        expect(Array.isArray(cfg['pairs'])).toBe(true);
        const pairs = cfg['pairs'] as Record<string, unknown>[];
        expect(pairs.length).toBeGreaterThanOrEqual(2);
        for (const pair of pairs) {
          expect(pair).toHaveProperty('item');
          expect(typeof pair['item']).toBe('string');
          expect(pair).toHaveProperty('image');
          expect(typeof pair['image']).toBe('string');
        }
      }
    });
  });
});
