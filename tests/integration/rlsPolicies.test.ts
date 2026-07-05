import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY);

// Skip all tests if Supabase credentials are not set.
// To run: set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.
const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

maybeDescribe('Content RLS — Admin Write Policies (012)', () => {
  let client: SupabaseClient;

  beforeAll(() => {
    client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  // ── Policy catalog (US3) ──────────────────────────────────────────────────
  // Uses the rls_policy_names() helper function deployed by the spec 012 migration.
  // TDD red state: before migration the function does not exist → rpc returns error → tests FAIL.
  // TDD green state: after migration the function exists and returns all 3 policy names → tests PASS.

  describe('Policy catalog (US3)', () => {
    it('content_items has correct policies after spec-015 migration', async () => {
      const { data, error } = await client.rpc('rls_policy_names', { target_table: 'content_items' });
      expect(error).toBeNull();
      const names: string[] = data ?? [];
      // spec-015 replaced authenticated_read_content_items with two policies:
      //   authenticated_read_published_content_items (non-admins see only published)
      //   admin_read_all_content_items (admins see all statuses)
      expect(names).not.toContain('authenticated_read_content_items');
      expect(names).toContain('authenticated_read_published_content_items');
      expect(names).toContain('admin_read_all_content_items');
      expect(names).toContain('service_write_content_items');
      expect(names).toContain('admin_write_content_items');
      expect(names).toHaveLength(4);
    });

    it('categories has exactly 3 policies: authenticated_read, service_write, admin_write', async () => {
      const { data, error } = await client.rpc('rls_policy_names', { target_table: 'categories' });
      expect(error).toBeNull();
      const names: string[] = data ?? [];
      expect(names).toContain('authenticated_read_categories');
      expect(names).toContain('service_write_categories');
      expect(names).toContain('admin_write_categories');
      expect(names).toHaveLength(3);
    });
  });

  // ── Unauthenticated write rejection (US1) ────────────────────────────────

  describe('Unauthenticated write rejection (US1)', () => {
    it('rejects unauthenticated INSERT to content_items', async () => {
      const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await anonClient
        .from('content_items')
        .insert([{ title: '[test-rls] Anon write attempt', type: 'video' }]);
      expect(error).not.toBeNull();
    });

    it('rejects unauthenticated INSERT to categories', async () => {
      const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await anonClient
        .from('categories')
        .insert([{ name: '[test-rls]-anon-' + Date.now() }]);
      expect(error).not.toBeNull();
    });
  });

  // ── Read regression (US2) ────────────────────────────────────────────────

  describe('Read regression (US2)', () => {
    it('content_items returns rows for service role client', async () => {
      const { data, error } = await client.from('content_items').select('id').limit(1);
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(1);
    });

    it('categories returns rows for service role client', async () => {
      const { data, error } = await client.from('categories').select('id').limit(1);
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(1);
    });
  });
});
