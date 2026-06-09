/**
 * supabase/functions/aggregate-daily-stats/index.ts
 * Edge Function fallback for pg_cron.
 *
 * Invoke via Supabase Edge Function cron trigger (Free tier):
 *   Schedule: "5 21 * * *"  →  00:05 Arabia Standard Time (UTC+3)
 *
 * Can also be invoked manually via:
 *   supabase functions invoke aggregate-daily-stats
 *
 * Requires the service role key to bypass RLS.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (_req: Request): Promise<Response> => {
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch all child profile IDs
    const { data: children, error: childErr } = await client
      .from('profiles')
      .select('id')
      .eq('role', 'child');

    if (childErr) {
      console.error('Failed to fetch child profiles:', childErr.message);
      return new Response(JSON.stringify({ error: childErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!children || children.length === 0) {
      return new Response(JSON.stringify({ message: 'No children to aggregate', count: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aggregate yesterday's stats for each child (run at 00:05 local = 21:05 UTC)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const targetDay = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const child of children) {
      const { error } = await client.rpc('aggregate_daily_stats', {
        p_child_id: child.id,
        p_day: targetDay,
      });

      results.push({
        id: child.id,
        success: !error,
        ...(error ? { error: error.message } : {}),
      });

      if (error) {
        console.error(`aggregate_daily_stats failed for child ${child.id}:`, error.message);
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Aggregation complete: ${succeeded} succeeded, ${failed} failed, date=${targetDay}`);

    return new Response(
      JSON.stringify({ date: targetDay, total: children.length, succeeded, failed, results }),
      {
        status: failed > 0 ? 207 : 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Unhandled error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
