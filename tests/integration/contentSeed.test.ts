import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY);

const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

maybeDescribe('Content Seed Integration Tests (010-content-seed-initial)', () => {
  let client: SupabaseClient;

  beforeAll(() => {
    client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  // ── US1: Child sees real content ──────────────────────────────────────────

  describe('US1: Content type counts (SC-001)', () => {
    it('has at least 3 videos', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'video');
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('has at least 3 stories', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'story');
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('has at least 2 creative activities', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'creative');
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('has at least 2 games', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'game');
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  // ── FR-006: Video URLs are non-null ───────────────────────────────────────

  describe('FR-006: Video URLs present', () => {
    it('all video rows have a non-null url', async () => {
      const { data, error } = await client
        .from('content_items')
        .select('title, url')
        .eq('type', 'video');
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      for (const item of data!) {
        expect(item.url).toBeTruthy();
      }
    });
  });

  // ── FR-007: Thumbnail URLs are non-null ───────────────────────────────────

  describe('FR-007: Thumbnail URLs present', () => {
    it('all content items have a non-null thumbnail_url', async () => {
      const { data, error } = await client
        .from('content_items')
        .select('title, thumbnail_url');
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      for (const item of data!) {
        expect(item.thumbnail_url).toBeTruthy();
      }
    });
  });

  // ── SC-004: Age range 2–5 has content from all types ─────────────────────

  describe('SC-004: Age range 2–5 coverage', () => {
    it('has at least 1 video for age 2–5 (min_age <= 5)', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'video')
        .lte('min_age', 5);
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('has at least 1 story for age 2–5', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'story')
        .lte('min_age', 5);
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('has at least 1 creative activity for age 2–5', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'creative')
        .lte('min_age', 5);
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('has at least 1 game for age 2–5', async () => {
      const { count, error } = await client
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'game')
        .lte('min_age', 5);
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  // ── US2: Categories (SC-002, SC-005) ─────────────────────────────────────

  describe('US2: Categories (SC-002)', () => {
    it('has at least 3 categories', async () => {
      const { count, error } = await client
        .from('categories')
        .select('*', { count: 'exact', head: true });
      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('category filter for math returns only math items (SC-005)', async () => {
      const { data, error } = await client
        .from('content_items')
        .select('title, category')
        .eq('category', 'math');
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      for (const item of data!) {
        expect(item.category).toBe('math');
      }
    });
  });

  // ── US3: Game config_json (SC-006, FR-010) ────────────────────────────────

  describe('US3: Game config_json (SC-006)', () => {
    it('counting game has all required config keys', async () => {
      const { data, error } = await client
        .from('content_items')
        .select('title, config_json')
        .eq('type', 'game')
        .eq('game_type', 'counting');
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      for (const item of data!) {
        const cfg = item.config_json as Record<string, unknown>;
        expect(cfg).toHaveProperty('type');
        expect(cfg).toHaveProperty('question');
        expect(cfg).toHaveProperty('correct_answer');
        expect(cfg).toHaveProperty('choices');
        expect(Array.isArray(cfg.choices)).toBe(true);
        if (cfg.display === 'interactive') {
          expect(cfg).toHaveProperty('emoji');
        } else {
          expect(cfg).toHaveProperty('image_url');
        }
      }
    });

    it('matching game has type and pairs array with at least 2 items', async () => {
      const { data, error } = await client
        .from('content_items')
        .select('title, config_json')
        .eq('type', 'game')
        .eq('game_type', 'matching');
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      for (const item of data!) {
        const cfg = item.config_json as Record<string, unknown>;
        expect(cfg).toHaveProperty('type');
        expect(cfg).toHaveProperty('pairs');
        const pairs = cfg.pairs as Array<Record<string, unknown>>;
        expect(Array.isArray(pairs)).toBe(true);
        expect(pairs.length).toBeGreaterThanOrEqual(2);
        for (const pair of pairs) {
          expect(pair).toHaveProperty('item');
          expect(pair).toHaveProperty('image');
        }
      }
    });
  });
});
