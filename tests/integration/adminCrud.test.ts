import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  createContentItem,
  updateContentItem,
  deleteContentItem,
  createCategory,
  deleteCategory,
} from '../../services/api/admin';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const ADMIN_EMAIL = process.env.SUPABASE_ADMIN_TEST_EMAIL || '';
const ADMIN_PASSWORD = process.env.SUPABASE_ADMIN_TEST_PASSWORD || '';
const PARENT_EMAIL = process.env.SUPABASE_PARENT_TEST_EMAIL || '';
const PARENT_PASSWORD = process.env.SUPABASE_PARENT_TEST_PASSWORD || '';

const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY && ADMIN_EMAIL && ADMIN_PASSWORD);
const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

maybeDescribe('Content CRUD (US1–US3)', () => {
  let serviceClient: SupabaseClient;
  let adminClient: SupabaseClient;

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    adminClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await adminClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (error) throw new Error(`Admin sign-in failed: ${error.message}`);
  });

  afterAll(async () => {
    await adminClient.auth.signOut();
  });

  it('createContentItem inserts a video row', async () => {
    const start = Date.now();
    const { data, error } = await createContentItem({
      title: '[test-admin] Video Row',
      type: 'video',
      category: 'science',
      min_age: 5,
      max_age: 10,
      thumbnail_url: 'https://example.com/thumb.jpg',
      url: 'https://example.com/video.mp4',
      duration_seconds: 120,
    });
    expect(Date.now() - start).toBeLessThan(5000);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBeDefined();
    expect(data?.title).toBe('[test-admin] Video Row');

    if (data?.id) {
      await serviceClient.from('content_items').delete().eq('id', data.id);
    }
  });

  it('updateContentItem updates the title', async () => {
    const { data: inserted } = await serviceClient
      .from('content_items')
      .insert([{
        title: '[test-admin] Update Source',
        type: 'story',
        category: 'science',
        min_age: 5,
        max_age: 12,
        thumbnail_url: 'https://example.com/thumb.jpg',
      }])
      .select()
      .single();

    expect(inserted?.id).toBeDefined();

    const start = Date.now();
    const { data, error } = await updateContentItem(inserted.id, {
      title: '[test-admin] Update Source — Updated',
      category: 'science',
      min_age: 5,
      max_age: 12,
      thumbnail_url: 'https://example.com/thumb.jpg',
    });
    expect(Date.now() - start).toBeLessThan(5000);
    expect(error).toBeNull();
    expect(data?.title).toBe('[test-admin] Update Source — Updated');

    await serviceClient.from('content_items').delete().eq('id', inserted.id);
  });

  it('deleteContentItem removes the row', async () => {
    const { data: inserted } = await serviceClient
      .from('content_items')
      .insert([{
        title: '[test-admin] Delete Target',
        type: 'story',
        category: 'science',
        min_age: 5,
        max_age: 12,
        thumbnail_url: 'https://example.com/thumb.jpg',
      }])
      .select()
      .single();

    expect(inserted?.id).toBeDefined();

    const start = Date.now();
    const { error } = await deleteContentItem(inserted.id);
    expect(Date.now() - start).toBeLessThan(5000);
    expect(error).toBeNull();

    const { data: rows } = await serviceClient
      .from('content_items')
      .select('id')
      .eq('id', inserted.id);
    expect(rows).toHaveLength(0);
  });
});

maybeDescribe('Category CRUD (US4)', () => {
  let serviceClient: SupabaseClient;
  let adminClient: SupabaseClient;

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    adminClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await adminClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (error) throw new Error(`Admin sign-in failed: ${error.message}`);
  });

  afterAll(async () => {
    await adminClient.auth.signOut();
  });

  it('createCategory inserts a category', async () => {
    const start = Date.now();
    const { data, error } = await createCategory({
      name: '[test-admin] Category ' + Date.now(),
    });
    expect(Date.now() - start).toBeLessThan(5000);
    expect(error).toBeNull();
    expect(data?.id).toBeDefined();

    if (data?.id) {
      await serviceClient.from('categories').delete().eq('id', data.id);
    }
  });

  it('deleteCategory removes the category', async () => {
    const { data: inserted } = await serviceClient
      .from('categories')
      .insert([{ name: '[test-admin] Delete Cat ' + Date.now() }])
      .select()
      .single();

    expect(inserted?.id).toBeDefined();

    const start = Date.now();
    const { error } = await deleteCategory(inserted.id);
    expect(Date.now() - start).toBeLessThan(5000);
    expect(error).toBeNull();

    const { data: rows } = await serviceClient
      .from('categories')
      .select('id')
      .eq('id', inserted.id);
    expect(rows).toHaveLength(0);
  });
});

maybeDescribe('Unauthenticated write regression', () => {
  it('rejects anon INSERT to content_items', async () => {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await anonClient
      .from('content_items')
      .insert([{ title: '[test-rls] Anon attempt', type: 'video' }]);
    expect(error).not.toBeNull();
  });
});

const HAS_PARENT_CREDENTIALS = !!(
  SUPABASE_URL && SERVICE_ROLE_KEY && PARENT_EMAIL && PARENT_PASSWORD
);
const maybeDescribeParent = HAS_PARENT_CREDENTIALS ? describe : describe.skip;

maybeDescribeParent('Non-admin authenticated user blocked (SC-006)', () => {
  it('parent-role user cannot INSERT to content_items', async () => {
    const parentClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await parentClient.auth.signInWithPassword({
      email: PARENT_EMAIL,
      password: PARENT_PASSWORD,
    });
    expect(signInError).toBeNull();

    const { error } = await parentClient
      .from('content_items')
      .insert([{ title: '[test-rls] Parent attempt', type: 'video' }]);
    expect(error).not.toBeNull();

    await parentClient.auth.signOut();
  });
});
