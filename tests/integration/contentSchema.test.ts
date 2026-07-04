import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY);

// Skip all tests if Supabase credentials are not set.
// To run: set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.
const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

maybeDescribe('Content Schema Integration Tests (009-content-schema-storage)', () => {
  let client: SupabaseClient;
  const insertedItemIds: string[] = [];
  const insertedCategoryIds: string[] = [];

  beforeAll(() => {
    client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  afterEach(async () => {
    if (insertedItemIds.length > 0) {
      await client.from('content_items').delete().in('id', [...insertedItemIds]);
      insertedItemIds.length = 0;
    }
    if (insertedCategoryIds.length > 0) {
      await client.from('categories').delete().in('id', [...insertedCategoryIds]);
      insertedCategoryIds.length = 0;
    }
  });

  // ── Schema column verification ─────────────────────────────────────────────

  describe('Schema: new columns on content_items', () => {
    it('duration_seconds column exists', async () => {
      const { error } = await client.from('content_items').select('duration_seconds').limit(0);
      expect(error).toBeNull();
    });

    it('content_text column exists', async () => {
      const { error } = await client.from('content_items').select('content_text').limit(0);
      expect(error).toBeNull();
    });

    it('assets_url column exists', async () => {
      const { error } = await client.from('content_items').select('assets_url').limit(0);
      expect(error).toBeNull();
    });

    it('game_type column exists', async () => {
      const { error } = await client.from('content_items').select('game_type').limit(0);
      expect(error).toBeNull();
    });

    it('config_json column exists', async () => {
      const { error } = await client.from('content_items').select('config_json').limit(0);
      expect(error).toBeNull();
    });
  });

  describe('Schema: categories table', () => {
    it('categories table exists with all required columns', async () => {
      const { error } = await client
        .from('categories')
        .select('id, name, icon_url, created_at')
        .limit(0);
      expect(error).toBeNull();
    });
  });

  // ── INSERT + SELECT round-trips ────────────────────────────────────────────

  describe('Round-trip: video (duration_seconds)', () => {
    it('inserts a video row with duration_seconds and reads it back unchanged', async () => {
      const { data, error } = await client
        .from('content_items')
        .insert({
          title: '[test] Count to 10',
          type: 'video',
          category: 'math',
          min_age: 2,
          max_age: 4,
          thumbnail_url: 'http://test.example/thumb.jpg',
          duration_seconds: 180,
        })
        .select('id, title, type, duration_seconds')
        .single();

      expect(error).toBeNull();
      expect(data?.type).toBe('video');
      expect(data?.duration_seconds).toBe(180);
      if (data?.id) insertedItemIds.push(data.id);
    });
  });

  describe('Round-trip: story (content_text)', () => {
    it('inserts a story row with content_text and reads it back unchanged', async () => {
      const storyText = 'Once upon a time in a land far away...';
      const { data, error } = await client
        .from('content_items')
        .insert({
          title: '[test] The Magic Forest',
          type: 'story',
          category: 'animals',
          min_age: 5,
          max_age: 7,
          thumbnail_url: 'http://test.example/thumb.jpg',
          content_text: storyText,
        })
        .select('id, title, type, content_text')
        .single();

      expect(error).toBeNull();
      expect(data?.type).toBe('story');
      expect(data?.content_text).toBe(storyText);
      if (data?.id) insertedItemIds.push(data.id);
    });
  });

  describe('Round-trip: creative/activity (assets_url)', () => {
    it('inserts a creative row with assets_url and reads it back unchanged', async () => {
      const assetsUrl = 'https://storage.supabase.co/activity-assets/coloring-page.svg';
      const { data, error } = await client
        .from('content_items')
        .insert({
          title: '[test] Flower Coloring',
          type: 'creative',
          category: 'art',
          min_age: 2,
          max_age: 4,
          thumbnail_url: 'http://test.example/thumb.jpg',
          assets_url: assetsUrl,
        })
        .select('id, title, type, assets_url')
        .single();

      expect(error).toBeNull();
      expect(data?.type).toBe('creative');
      expect(data?.assets_url).toBe(assetsUrl);
      if (data?.id) insertedItemIds.push(data.id);
    });
  });

  describe('Round-trip: game (game_type + config_json)', () => {
    it('inserts a game row with game_type and config_json and reads them back unchanged', async () => {
      const config = {
        type: 'counting',
        question: 'How many apples?',
        image_url: 'https://storage.supabase.co/game-assets/apples.png',
        correct_answer: 5,
        choices: [3, 4, 5, 6],
      };
      const { data, error } = await client
        .from('content_items')
        .insert({
          title: '[test] Apple Counting',
          type: 'game',
          category: 'math',
          min_age: 2,
          max_age: 4,
          thumbnail_url: 'http://test.example/thumb.jpg',
          game_type: 'counting',
          config_json: config,
        })
        .select('id, title, type, game_type, config_json')
        .single();

      expect(error).toBeNull();
      expect(data?.type).toBe('game');
      expect(data?.game_type).toBe('counting');
      expect(data?.config_json).toMatchObject(config);
      if (data?.id) insertedItemIds.push(data.id);
    });

    it('accepts an empty config_json object without error', async () => {
      const { data, error } = await client
        .from('content_items')
        .insert({
          title: '[test] Empty Config Game',
          type: 'game',
          category: 'math',
          min_age: 2,
          max_age: 4,
          thumbnail_url: 'http://test.example/thumb.jpg',
          game_type: 'counting',
          config_json: {},
        })
        .select('id, config_json')
        .single();

      expect(error).toBeNull();
      expect(data?.config_json).toEqual({});
      if (data?.id) insertedItemIds.push(data.id);
    });
  });

  // ── Age-range filter ───────────────────────────────────────────────────────

  describe('Age-range filter (min_age <= childAge AND max_age >= childAge)', () => {
    it('returns items in range and excludes items outside range for childAge=3', async () => {
      const { data: inserted, error: insertError } = await client
        .from('content_items')
        .insert([
          {
            title: '[test] In-Range Video',
            type: 'video',
            category: 'math',
            min_age: 2,
            max_age: 4,
            thumbnail_url: 'http://test.example/t.jpg',
            duration_seconds: 60,
          },
          {
            title: '[test] Out-of-Range Video',
            type: 'video',
            category: 'math',
            min_age: 5,
            max_age: 7,
            thumbnail_url: 'http://test.example/t.jpg',
            duration_seconds: 60,
          },
        ])
        .select('id, title');

      expect(insertError).toBeNull();
      inserted?.forEach(r => insertedItemIds.push(r.id));

      const childAge = 3;
      const insertedIdSet = inserted!.map(r => r.id);
      const { data, error } = await client
        .from('content_items')
        .select('title')
        .lte('min_age', childAge)
        .gte('max_age', childAge)
        .in('id', insertedIdSet);

      expect(error).toBeNull();
      const titles = data?.map(r => r.title) ?? [];
      expect(titles).toContain('[test] In-Range Video');
      expect(titles).not.toContain('[test] Out-of-Range Video');
    });
  });

  // ── Categories table ───────────────────────────────────────────────────────

  describe('Categories CRUD', () => {
    it('inserts a category and reads it back with auto-generated created_at', async () => {
      const { data, error } = await client
        .from('categories')
        .insert({ name: '[test]-math-' + Date.now(), icon_url: 'https://test.example/math-icon.png' })
        .select('id, name, icon_url, created_at')
        .single();

      expect(error).toBeNull();
      expect(data?.name).toMatch(/^\[test\]-math-/);
      expect(data?.icon_url).toBe('https://test.example/math-icon.png');
      expect(data?.created_at).toBeTruthy();
      if (data?.id) insertedCategoryIds.push(data.id);
    });

    it('accepts null icon_url without NOT NULL violation', async () => {
      const { data, error } = await client
        .from('categories')
        .insert({ name: '[test]-no-icon-' + Date.now() })
        .select('id, name')
        .single();

      expect(error).toBeNull();
      expect(data?.name).toMatch(/^\[test\]-no-icon-/);
      if (data?.id) insertedCategoryIds.push(data.id);
    });
  });

  // ── Category filter on content_items ──────────────────────────────────────

  describe('Category filter (content_items.category)', () => {
    it('returns only rows matching the requested category, excludes others', async () => {
      const testCategory = '[test]-cat-filter-' + Date.now();
      const { data: inserted, error: insertError } = await client
        .from('content_items')
        .insert([
          {
            title: '[test] Matches Category',
            type: 'video',
            category: testCategory,
            min_age: 2,
            max_age: 4,
            thumbnail_url: 'http://test.example/t.jpg',
          },
          {
            title: '[test] Different Category',
            type: 'video',
            category: 'other-unrelated',
            min_age: 2,
            max_age: 4,
            thumbnail_url: 'http://test.example/t.jpg',
          },
        ])
        .select('id, title, category');

      expect(insertError).toBeNull();
      inserted?.forEach(r => insertedItemIds.push(r.id));

      const insertedIdSet = inserted!.map(r => r.id);
      const { data, error } = await client
        .from('content_items')
        .select('title')
        .eq('category', testCategory)
        .in('id', insertedIdSet);

      expect(error).toBeNull();
      expect(data?.length).toBe(1);
      expect(data?.[0].title).toBe('[test] Matches Category');
    });
  });
});
