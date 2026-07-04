import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ALL_SYNC_RULES,
  urlReachability,
} from './contentValidationRules';
import type {
  ContentItemExtended,
  ValidationReport,
  ValidationRuleOutcome,
  ReviewRecord,
} from './types';

function getClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    || '';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function log(level: string, hook: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level, hook, ...extra, ts: new Date().toISOString() }));
}

// ── submitForValidation ───────────────────────────────────────────────────────

export async function submitForValidation(
  contentId: string,
  supabase?: SupabaseClient
): Promise<{ report: ValidationReport | null; error: string | null }> {
  const start = Date.now();
  const client = supabase ?? getClient();

  const { data: item, error: fetchErr } = await client
    .from('content_items')
    .select('*')
    .eq('id', contentId)
    .single();

  if (fetchErr || !item) {
    return { report: null, error: 'Content item not found' };
  }

  if (item.status !== 'draft') {
    return { report: null, error: `Expected status 'draft', current status is '${item.status}'` };
  }

  // Sync rules
  const syncOutcomes: ValidationRuleOutcome[] = ALL_SYNC_RULES.map(rule => rule(item as Partial<ContentItemExtended>));

  // Async URL reachability (Warning only, skipped during revalidation)
  const urlOutcome = await urlReachability(item as Partial<ContentItemExtended>);
  const allOutcomes = [...syncOutcomes, urlOutcome];

  const passed = allOutcomes.every(o => o.passed || o.severity === 'warning');
  const errorCount = allOutcomes.filter(o => !o.passed && o.severity === 'error').length;

  // Determine next run_number
  const { data: priorRuns } = await client
    .from('content_validation_results')
    .select('run_number')
    .eq('content_id', contentId)
    .order('run_number', { ascending: false })
    .limit(1);

  const runNumber = priorRuns && priorRuns.length > 0 ? priorRuns[0].run_number + 1 : 1;

  const { data: resultRow, error: insertErr } = await client
    .from('content_validation_results')
    .insert({
      content_id: contentId,
      run_number: runNumber,
      triggered_by: 'submission',
      passed,
      rule_outcomes: allOutcomes,
    })
    .select()
    .single();

  if (insertErr || !resultRow) {
    return { report: null, error: 'A network error occurred. Please try again.' };
  }

  const newStatus = passed ? 'pending_review' : 'draft';
  await client
    .from('content_items')
    .update({ status: newStatus })
    .eq('id', contentId);

  const duration_ms = Date.now() - start;
  log('info', 'submitForValidation', { content_id: contentId, passed, errorCount, runNumber, duration_ms });

  const report: ValidationReport = {
    id: resultRow.id,
    content_id: contentId,
    run_number: runNumber,
    triggered_by: 'submission',
    passed,
    rule_outcomes: allOutcomes,
    created_at: resultRow.created_at,
  };

  return { report, error: null };
}

// ── approveContent ────────────────────────────────────────────────────────────

export async function approveContent(
  contentId: string,
  adminId: string,
  supabase?: SupabaseClient
): Promise<{ error: string | null }> {
  const start = Date.now();
  const client = supabase ?? getClient();

  const { data, error } = await client
    .from('content_items')
    .update({ status: 'published' })
    .eq('id', contentId)
    .in('status', ['pending_review', 'flagged'])
    .select('id')
    .single();

  if (error || !data) {
    return { error: 'This item has already been reviewed' };
  }

  await client.from('content_review_records').insert({
    content_id: contentId,
    admin_id: adminId,
    decision: 'approved',
    reason: null,
  });

  log('info', 'approveContent', { content_id: contentId, admin_id: adminId, duration_ms: Date.now() - start });
  return { error: null };
}

// ── rejectContent ─────────────────────────────────────────────────────────────

export async function rejectContent(
  contentId: string,
  reason: string,
  adminId: string,
  supabase?: SupabaseClient
): Promise<{ error: string | null }> {
  const start = Date.now();
  const client = supabase ?? getClient();

  if (!reason || !reason.trim()) {
    return { error: 'Rejection reason is required' };
  }

  const { data, error } = await client
    .from('content_items')
    .update({ status: 'rejected' })
    .eq('id', contentId)
    .in('status', ['pending_review', 'flagged'])
    .select('id')
    .single();

  if (error || !data) {
    return { error: 'This item has already been reviewed' };
  }

  await client.from('content_review_records').insert({
    content_id: contentId,
    admin_id: adminId,
    decision: 'rejected',
    reason: reason.trim(),
  });

  log('info', 'rejectContent', { content_id: contentId, admin_id: adminId, duration_ms: Date.now() - start });
  return { error: null };
}

// ── resubmitContent ───────────────────────────────────────────────────────────

export async function resubmitContent(
  contentId: string,
  supabase?: SupabaseClient
): Promise<{ report: ValidationReport | null; error: string | null }> {
  const client = supabase ?? getClient();

  const { data: item, error: fetchErr } = await client
    .from('content_items')
    .select('status')
    .eq('id', contentId)
    .single();

  if (fetchErr || !item) {
    return { report: null, error: 'Content item not found' };
  }

  if (item.status !== 'rejected') {
    return { report: null, error: `Expected status 'rejected', current status is '${item.status}'` };
  }

  await client.from('content_items').update({ status: 'draft' }).eq('id', contentId);
  return submitForValidation(contentId, client);
}

// ── getValidationHistory ──────────────────────────────────────────────────────

export async function getValidationHistory(
  contentId: string,
  supabase?: SupabaseClient
): Promise<{ history: ValidationReport[]; error: string | null }> {
  const client = supabase ?? getClient();

  const { data, error } = await client
    .from('content_validation_results')
    .select('*')
    .eq('content_id', contentId)
    .order('created_at', { ascending: false });

  if (error) {
    return { history: [], error: 'A network error occurred. Please try again.' };
  }

  const history: ValidationReport[] = (data || []).map(row => ({
    id: row.id,
    content_id: row.content_id,
    run_number: row.run_number,
    triggered_by: row.triggered_by,
    passed: row.passed,
    rule_outcomes: row.rule_outcomes,
    created_at: row.created_at,
  }));

  log('info', 'getValidationHistory', { content_id: contentId, count: history.length });
  return { history, error: null };
}

// ── getReviewQueue ────────────────────────────────────────────────────────────

export async function getReviewQueue(
  supabase?: SupabaseClient
): Promise<{ items: ContentItemExtended[]; error: string | null }> {
  const client = supabase ?? getClient();

  const { data, error } = await client
    .from('content_items')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  if (error) {
    return { items: [], error: 'A network error occurred. Please try again.' };
  }

  log('info', 'getReviewQueue', { count: (data || []).length });
  return { items: (data || []) as ContentItemExtended[], error: null };
}

// ── getFlaggedItems ───────────────────────────────────────────────────────────

export async function getFlaggedItems(
  supabase?: SupabaseClient
): Promise<{ items: ContentItemExtended[]; error: string | null }> {
  const client = supabase ?? getClient();

  const { data, error } = await client
    .from('content_items')
    .select('*')
    .eq('status', 'flagged')
    .order('created_at', { ascending: true });

  if (error) {
    return { items: [], error: 'A network error occurred. Please try again.' };
  }

  log('info', 'getFlaggedItems', { count: (data || []).length });
  return { items: (data || []) as ContentItemExtended[], error: null };
}

// ── triggerRevalidation ───────────────────────────────────────────────────────

export async function triggerRevalidation(
  supabase?: SupabaseClient
): Promise<{ flaggedIds: string[]; processedCount: number; error: string | null }> {
  const start = Date.now();
  const client = supabase ?? getClient();
  const flaggedIds: string[] = [];
  let processedCount = 0;
  const PAGE_SIZE = 50;
  let page = 0;

  while (true) {
    const { data: items, error } = await client
      .from('content_items')
      .select('*')
      .eq('status', 'published')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      return { flaggedIds, processedCount, error: 'A network error occurred. Please try again.' };
    }
    if (!items || items.length === 0) break;

    // Batch-fetch existing max run_numbers for all items in this page
    const itemIds = items.map((i: any) => i.id);
    const { data: runNums } = await client
      .from('content_validation_results')
      .select('content_id, run_number')
      .in('content_id', itemIds)
      .order('run_number', { ascending: false });

    const maxRunByItem: Record<string, number> = {};
    for (const row of runNums || []) {
      if (!(row.content_id in maxRunByItem)) {
        maxRunByItem[row.content_id] = row.run_number;
      }
    }

    const insertRows: object[] = [];
    const failingIds: string[] = [];

    for (const item of items) {
      const outcomes: ValidationRuleOutcome[] = ALL_SYNC_RULES.map(rule =>
        rule(item as Partial<ContentItemExtended>)
      );
      const passed = outcomes.every(o => o.passed || o.severity === 'warning');
      const runNumber = (maxRunByItem[item.id] ?? 0) + 1;
      insertRows.push({
        content_id: item.id,
        run_number: runNumber,
        triggered_by: 'revalidation',
        passed,
        rule_outcomes: outcomes,
      });
      if (!passed) failingIds.push(item.id);
      processedCount++;
    }

    await client.from('content_validation_results').insert(insertRows);

    if (failingIds.length > 0) {
      await client.from('content_items').update({ status: 'flagged' }).in('id', failingIds);
      flaggedIds.push(...failingIds);
    }

    if (items.length < PAGE_SIZE) break;
    page++;
  }

  const duration_ms = Date.now() - start;
  log('info', 'triggerRevalidation', { processedCount, flaggedCount: flaggedIds.length, duration_ms });
  return { flaggedIds, processedCount, error: null };
}

// ── getReviewRecords ──────────────────────────────────────────────────────────

export async function getReviewRecords(
  contentId: string,
  supabase?: SupabaseClient
): Promise<{ records: ReviewRecord[]; error: string | null }> {
  const client = supabase ?? getClient();

  const { data, error } = await client
    .from('content_review_records')
    .select('*')
    .eq('content_id', contentId)
    .order('created_at', { ascending: false });

  if (error) {
    return { records: [], error: 'A network error occurred. Please try again.' };
  }

  return { records: (data || []) as ReviewRecord[], error: null };
}
