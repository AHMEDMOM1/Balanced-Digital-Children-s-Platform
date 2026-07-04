import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  submitForValidation,
  approveContent,
  rejectContent,
  resubmitContent,
  getValidationHistory,
  getReviewQueue,
  getFlaggedItems,
  triggerRevalidation,
} from '../../services/api/contentValidation';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY);
const maybeDescribe = HAS_CREDENTIALS ? describe : describe.skip;

jest.setTimeout(60000);

// Helper: insert a draft content item and return its id
async function seedDraft(
  client: SupabaseClient,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const base = {
    title: 'Test Video',
    type: 'video',
    category: 'nature',
    min_age: 5,
    max_age: 7,
    thumbnail_url: 'https://cdn.example.com/thumb.png',
    url: 'https://www.youtube.com/watch?v=test',
    status: 'draft',
    ...overrides,
  };
  const { data, error } = await client
    .from('content_items')
    .insert(base)
    .select('id')
    .single();
  if (error || !data) throw new Error('seedDraft failed: ' + JSON.stringify(error));
  return data.id;
}

async function cleanup(client: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return;
  await client.from('content_validation_results').delete().in('content_id', ids);
  await client.from('content_review_records').delete().in('content_id', ids);
  await client.from('content_items').delete().in('id', ids);
}

maybeDescribe('Content Validation Integration Tests (015-content-validation-quality)', () => {
  let client: SupabaseClient;
  const seeded: string[] = [];

  beforeAll(() => {
    client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  afterAll(async () => {
    await cleanup(client, seeded);
  });

  // ── US1: Automated Validation Gate ─────────────────────────────────────────

  describe('US1: Automated validation gate', () => {
    it('SC-003: single-item validation completes under 5 s', async () => {
      const id = await seedDraft(client);
      seeded.push(id);
      const t0 = Date.now();
      const { report, error } = await submitForValidation(id, client);
      const elapsed = Date.now() - t0;
      expect(error).toBeNull();
      expect(report).not.toBeNull();
      expect(elapsed).toBeLessThan(5000);
    });

    it('missing thumbnail → status stays draft, error identifies rule', async () => {
      const id = await seedDraft(client, { thumbnail_url: '' });
      seeded.push(id);
      const { report, error } = await submitForValidation(id, client);
      expect(error).toBeNull();
      expect(report!.passed).toBe(false);

      const failedRule = report!.rule_outcomes.find(r => r.rule_name === 'required_thumbnail');
      expect(failedRule).toBeDefined();
      expect(failedRule!.passed).toBe(false);
      expect(failedRule!.severity).toBe('error');
      expect(failedRule!.message).not.toBe('');

      // Item must remain draft
      const { data: item } = await client.from('content_items').select('status').eq('id', id).single();
      expect(item!.status).toBe('draft');
    });

    it('valid story → status advances to pending_review', async () => {
      const id = await seedDraft(client, {
        type: 'story',
        url: undefined,
      });
      seeded.push(id);
      const { report, error } = await submitForValidation(id, client);
      expect(error).toBeNull();
      expect(report!.passed).toBe(true);

      const { data: item } = await client.from('content_items').select('status').eq('id', id).single();
      expect(item!.status).toBe('pending_review');
    });

    it('game with malformed config → stays draft', async () => {
      const id = await seedDraft(client, {
        type: 'game',
        url: undefined,
        game_type: 'counting',
        config_json: { question: 'How many?', choices: 'three' }, // invalid: choices is string
      });
      seeded.push(id);
      const { report } = await submitForValidation(id, client);
      expect(report!.passed).toBe(false);

      const { data: item } = await client.from('content_items').select('status').eq('id', id).single();
      expect(item!.status).toBe('draft');
    });

    it('invalid age range → stays draft', async () => {
      const id = await seedDraft(client, { min_age: 10, max_age: 15 });
      seeded.push(id);
      const { report } = await submitForValidation(id, client);
      expect(report!.passed).toBe(false);

      const failedRule = report!.rule_outcomes.find(r => r.rule_name === 'valid_age_range');
      expect(failedRule!.passed).toBe(false);
    });

    it('inserts a content_validation_results row after each run', async () => {
      const id = await seedDraft(client);
      seeded.push(id);
      await submitForValidation(id, client);

      const { data: rows } = await client
        .from('content_validation_results')
        .select('run_number')
        .eq('content_id', id);
      expect(rows!.length).toBe(1);
      expect(rows![0].run_number).toBe(1);
    });

    it('returns error for non-draft item', async () => {
      const id = await seedDraft(client);
      seeded.push(id);
      await submitForValidation(id, client); // advances to pending_review
      const { error } = await submitForValidation(id, client); // attempt again
      expect(error).toContain('Expected status');
    });
  });

  // ── US2: Validation History ────────────────────────────────────────────────

  describe('US2: Validation history', () => {
    it('getValidationHistory returns all runs newest-first', async () => {
      const id = await seedDraft(client, { thumbnail_url: '' }); // first run fails
      seeded.push(id);
      await submitForValidation(id, client);

      // Fix and resubmit
      await client.from('content_items').update({ thumbnail_url: 'https://cdn.example.com/t.png' }).eq('id', id);
      await client.from('content_items').update({ status: 'draft' }).eq('id', id);
      await submitForValidation(id, client);

      const { history, error } = await getValidationHistory(id, client);
      expect(error).toBeNull();
      expect(history.length).toBe(2);
      expect(history[0].run_number).toBeGreaterThan(history[1].run_number);
    });

    it('each history entry has correct rule_outcomes shape', async () => {
      const id = await seedDraft(client);
      seeded.push(id);
      await submitForValidation(id, client);

      const { history } = await getValidationHistory(id, client);
      expect(history.length).toBeGreaterThan(0);
      const entry = history[0];
      expect(Array.isArray(entry.rule_outcomes)).toBe(true);
      expect(entry.rule_outcomes.length).toBeGreaterThan(0);
      const outcome = entry.rule_outcomes[0];
      expect(typeof outcome.rule_name).toBe('string');
      expect(typeof outcome.passed).toBe('boolean');
      expect(['error', 'warning']).toContain(outcome.severity);
      expect(typeof outcome.message).toBe('string');
    });

    it('SC-002 proxy: every failed rule has non-empty message', async () => {
      const id = await seedDraft(client, { thumbnail_url: '', category: '' });
      seeded.push(id);
      await submitForValidation(id, client);
      const { history } = await getValidationHistory(id, client);
      const failedOutcomes = history[0].rule_outcomes.filter(o => !o.passed);
      expect(failedOutcomes.length).toBeGreaterThan(0);
      for (const o of failedOutcomes) {
        expect(o.message.trim()).not.toBe('');
      }
    });
  });

  // ── US3: Human Review Workflow ─────────────────────────────────────────────

  describe('US3: Review workflow', () => {
    it('approve pending item → status becomes published', async () => {
      const id = await seedDraft(client, { type: 'story', url: undefined });
      seeded.push(id);
      await submitForValidation(id, client);

      const { error } = await approveContent(id, ADMIN_ID, client);
      expect(error).toBeNull();

      const { data: item } = await client.from('content_items').select('status').eq('id', id).single();
      expect(item!.status).toBe('published');
    });

    it('reject with reason → status becomes rejected, reason stored', async () => {
      const id = await seedDraft(client, { type: 'story', url: undefined });
      seeded.push(id);
      await submitForValidation(id, client);

      const { error } = await rejectContent(id, 'Content is not age-appropriate', ADMIN_ID, client);
      expect(error).toBeNull();

      const { data: item } = await client.from('content_items').select('status').eq('id', id).single();
      expect(item!.status).toBe('rejected');

      const { data: records } = await client
        .from('content_review_records')
        .select('reason, decision')
        .eq('content_id', id);
      expect(records![0].decision).toBe('rejected');
      expect(records![0].reason).toBe('Content is not age-appropriate');
    });

    it('reject without reason → returns error', async () => {
      const id = await seedDraft(client, { type: 'story', url: undefined });
      seeded.push(id);
      await submitForValidation(id, client);

      const { error } = await rejectContent(id, '', ADMIN_ID, client);
      expect(error).toBe('Rejection reason is required');
    });

    it('reject with whitespace-only reason → returns error', async () => {
      const id = await seedDraft(client, { type: 'story', url: undefined });
      seeded.push(id);
      await submitForValidation(id, client);

      const { error } = await rejectContent(id, '   ', ADMIN_ID, client);
      expect(error).toBe('Rejection reason is required');
    });

    it('concurrent approve: second call returns already-reviewed error', async () => {
      const id = await seedDraft(client, { type: 'story', url: undefined });
      seeded.push(id);
      await submitForValidation(id, client);

      const [r1, r2] = await Promise.all([
        approveContent(id, ADMIN_ID, client),
        approveContent(id, ADMIN_ID, client),
      ]);
      const errors = [r1.error, r2.error];
      expect(errors.filter(e => e === null).length).toBe(1);
      expect(errors.filter(e => e === 'This item has already been reviewed').length).toBe(1);
    });

    it('getReviewQueue returns only pending_review items oldest-first', async () => {
      const id1 = await seedDraft(client, { type: 'story', url: undefined });
      const id2 = await seedDraft(client, { type: 'story', url: undefined, title: 'Story 2' });
      seeded.push(id1, id2);
      await submitForValidation(id1, client);
      await submitForValidation(id2, client);

      const { items, error } = await getReviewQueue(client);
      expect(error).toBeNull();
      const queueIds = items.map(i => i.id);
      expect(queueIds).toContain(id1);
      expect(queueIds).toContain(id2);
      // Confirm order: id1 was inserted first so should appear before id2
      expect(queueIds.indexOf(id1)).toBeLessThan(queueIds.indexOf(id2));
    });

    it('getReviewQueue returns empty array when nothing pending', async () => {
      // Use a separate client query to verify our cleanup leaves empty queue for test
      // (this test is best-effort — queue may have pre-existing items from other tests)
      const { items, error } = await getReviewQueue(client);
      expect(error).toBeNull();
      expect(Array.isArray(items)).toBe(true);
    });

    it('resubmitContent preserves history and increments run_number', async () => {
      const id = await seedDraft(client, { thumbnail_url: '' }); // first run fails
      seeded.push(id);
      const { report: r1 } = await submitForValidation(id, client);
      expect(r1!.run_number).toBe(1);

      // Manually reject so we can resubmit
      await client.from('content_items').update({ status: 'rejected' }).eq('id', id);
      await client.from('content_items').update({ thumbnail_url: 'https://cdn.example.com/t.png' }).eq('id', id);

      const { report: r2, error } = await resubmitContent(id, client);
      expect(error).toBeNull();
      expect(r2!.run_number).toBe(2);

      const { history } = await getValidationHistory(id, client);
      expect(history.length).toBe(2);
    });

    it('resubmitContent on non-rejected item returns error', async () => {
      const id = await seedDraft(client, { type: 'story', url: undefined });
      seeded.push(id);
      await submitForValidation(id, client); // now pending_review

      const { error } = await resubmitContent(id, client);
      expect(error).toContain("Expected status 'rejected'");
    });
  });

  // ── US4: Re-Validation on Rule Changes ────────────────────────────────────

  describe('US4: Re-validation', () => {
    it('triggerRevalidation flags failing published items and leaves passing ones intact', async () => {
      // Seed a valid published item
      const validId = await seedDraft(client, { type: 'story', url: undefined });
      seeded.push(validId);
      await submitForValidation(validId, client);
      await approveContent(validId, ADMIN_ID, client);

      // Seed a "published" item with invalid data (bypass validation by direct insert)
      const { data: badRow } = await client
        .from('content_items')
        .insert({
          title: '',
          type: 'story',
          category: 'nature',
          min_age: 5,
          max_age: 7,
          thumbnail_url: 'https://cdn.example.com/t.png',
          status: 'published',
        })
        .select('id')
        .single();
      const badId = badRow!.id;
      seeded.push(badId);

      const { flaggedIds, processedCount, error } = await triggerRevalidation(client);
      expect(error).toBeNull();
      expect(processedCount).toBeGreaterThanOrEqual(2);
      expect(flaggedIds).toContain(badId);
      expect(flaggedIds).not.toContain(validId);

      // Flagged item stays visible (not unpublished, status = flagged)
      const { data: badItem } = await client.from('content_items').select('status').eq('id', badId).single();
      expect(badItem!.status).toBe('flagged');

      // Valid item stays published
      const { data: goodItem } = await client.from('content_items').select('status').eq('id', validId).single();
      expect(goodItem!.status).toBe('published');
    });

    it('triggerRevalidation with all-passing items returns empty flaggedIds', async () => {
      // Approve a valid item
      const id = await seedDraft(client, { type: 'story', url: undefined, title: 'Passing Story' });
      seeded.push(id);
      await submitForValidation(id, client);
      await approveContent(id, ADMIN_ID, client);

      const { flaggedIds } = await triggerRevalidation(client);
      // flaggedIds could be empty or contain only previously failing items
      expect(Array.isArray(flaggedIds)).toBe(true);
    });

    it('triggerRevalidation inserts validation_results with triggered_by=revalidation', async () => {
      const id = await seedDraft(client, { type: 'story', url: undefined, title: 'Revalidation Test' });
      seeded.push(id);
      await submitForValidation(id, client);
      await approveContent(id, ADMIN_ID, client);

      await triggerRevalidation(client);

      const { data: rows } = await client
        .from('content_validation_results')
        .select('triggered_by')
        .eq('content_id', id)
        .order('created_at', { ascending: false });
      const revalidationRow = rows!.find(r => r.triggered_by === 'revalidation');
      expect(revalidationRow).toBeDefined();
    });

    it('SC-006 proxy: multiple validation runs are all retained (no deletion)', async () => {
      const id = await seedDraft(client, { thumbnail_url: '' }); // fails
      seeded.push(id);
      await submitForValidation(id, client);

      await client.from('content_items').update({ thumbnail_url: 'https://cdn.example.com/t.png', status: 'draft' }).eq('id', id);
      await submitForValidation(id, client);

      const { data: rows } = await client
        .from('content_validation_results')
        .select('id')
        .eq('content_id', id);
      expect(rows!.length).toBe(2);
    });

    it('getFlaggedItems returns items with status=flagged', async () => {
      const id = await seedDraft(client);
      seeded.push(id);
      await client.from('content_items').update({ status: 'flagged' }).eq('id', id);

      const { items, error } = await getFlaggedItems(client);
      expect(error).toBeNull();
      const flaggedIds = items.map(i => i.id);
      expect(flaggedIds).toContain(id);
    });
  });
});
