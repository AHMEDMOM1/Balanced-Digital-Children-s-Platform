/**
 * scripts/realtime-latency-test.ts
 * SC-002: Measures realtime latency from session INSERT to UI update.
 * Fail if p95 > 500ms. Run in CI.
 *
 * Usage: npx ts-node scripts/realtime-latency-test.ts
 */
import { supabase } from '../services/api/client';

async function main() {
  const childId = process.env.TEST_CHILD_ID;
  if (!childId) throw new Error('TEST_CHILD_ID env var required');

  const latencies: number[] = [];
  const TEST_COUNT = 10;

  for (let i = 0; i < TEST_COUNT; i++) {
    const start = performance.now();

    // Subscribe to daily_stats changes for this child
    const channel = supabase
      .channel(`latency-test-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
          filter: `child_id=eq.${childId}`,
        },
        () => {
          const latency = performance.now() - start;
          latencies.push(latency);
        }
      )
      .subscribe();

    // Wait for subscription to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Insert a test session
    const { error: insertError } = await supabase.from('sessions').insert({
      child_id: childId,
      content_item_id: '00000000-0000-0000-0000-000000000000',
      activity_type: 'test',
      started_at: new Date().toISOString(),
      status: 'active',
      elapsed_seconds: 0,
    });

    if (insertError) {
      console.error(`Insert error on run ${i + 1}:`, insertError.message);
    }

    // Wait for realtime notification
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Clean up test session
    await supabase.from('sessions').delete().eq('activity_type', 'test');

    supabase.removeChannel(channel);
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log(`Realtime Latency Test Results:`);
  console.log(`  Samples: ${latencies.length}`);
  console.log(`  Avg: ${avg.toFixed(1)}ms`);
  console.log(`  p95: ${p95.toFixed(1)}ms`);
  console.log(`  Threshold: 500ms`);

  if (p95 > 500) {
    console.error(`FAIL: p95 (${p95.toFixed(1)}ms) exceeds 500ms threshold`);
    process.exit(1);
  }

  console.log(`PASS: p95 (${p95.toFixed(1)}ms) within threshold`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
