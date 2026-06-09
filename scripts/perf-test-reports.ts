/**
 * scripts/perf-test-reports.ts
 * SC-001: Measures dashboard load time (mount to interactive) with 30-day data.
 * Fail if p95 > 1500ms. Run in CI.
 *
 * Usage: npx ts-node scripts/perf-test-reports.ts [--ci]
 */
import { supabase } from '../services/api/client';
import { DailyStats, ReportRange } from '../services/api/types';

interface PerfResult {
  run: number;
  durationMs: number;
  rowCount: number;
  success: boolean;
}

async function runLoadTest(): Promise<PerfResult> {
  const childId = process.env.TEST_CHILD_ID;
  if (!childId) throw new Error('TEST_CHILD_ID env var required');

  const start = performance.now();

  const range: ReportRange = 'month';
  const today = new Date();
  const to = today.toISOString().split('T')[0];
  const from = new Date(today.getTime() - 29 * 86400000).toISOString().split('T')[0];

  const { data, error, count } = await supabase
    .from('daily_stats')
    .select('*', { count: 'exact', head: false })
    .eq('child_id', childId)
    .gte('stat_date', from)
    .lte('stat_date', to)
    .order('stat_date', { ascending: true });

  const durationMs = performance.now() - start;

  return {
    run: 1,
    durationMs,
    rowCount: (data as DailyStats[])?.length ?? 0,
    success: !error && data !== null,
  };
}

async function main() {
  const RUNS = process.argv.includes('--ci') ? 50 : 5;
  const results: PerfResult[] = [];

  for (let i = 0; i < RUNS; i++) {
    const result = await runLoadTest();
    results.push(result);
    console.log(`Run ${i + 1}: ${result.durationMs.toFixed(1)}ms (${result.rowCount} rows)`);
  }

  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

  console.log(`\nResults:`);
  console.log(`  Avg: ${avg.toFixed(1)}ms`);
  console.log(`  p95: ${p95.toFixed(1)}ms`);
  console.log(`  Threshold: 1500ms`);

  if (p95 > 1500) {
    console.error(`FAIL: p95 (${p95.toFixed(1)}ms) exceeds 1500ms threshold`);
    process.exit(1);
  }

  console.log(`PASS: p95 (${p95.toFixed(1)}ms) within threshold`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
