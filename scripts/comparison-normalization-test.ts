/**
 * scripts/comparison-normalization-test.ts
 * SC-004: Verifies comparison normalization
 * Child A = 7200s, Child B = 900s → Child B bar = 12.5% of max bar width.
 *
 * Usage: npx ts-node scripts/comparison-normalization-test.ts
 */
interface TestCase {
  totalA: number;
  totalB: number;
  expectedPctB: number; // expected percentage relative to max
}

function normalizeBarWidth(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return (value / maxValue) * 100;
}

function runTest({ totalA, totalB, expectedPctB }: TestCase): boolean {
  const maxTotal = Math.max(totalA, totalB, 1);
  const pctB = normalizeBarWidth(totalB, maxTotal);
  const pass = Math.abs(pctB - expectedPctB) < 0.01;
  console.log(`  A=${totalA}s B=${totalB}s → B bar=${pctB.toFixed(2)}% (expected ${expectedPctB}%) ${pass ? '✓' : '✗'}`);
  return pass;
}

function main() {
  const cases: TestCase[] = [
    { totalA: 7200, totalB: 900, expectedPctB: 12.5 },   // 900/7200 = 12.5%
    { totalA: 3600, totalB: 3600, expectedPctB: 100 },    // equal → both 100%
    { totalA: 0, totalB: 1800, expectedPctB: 100 },       // A=0 → B fills bar
    { totalA: 120, totalB: 30, expectedPctB: 25 },        // 30/120 = 25%
    { totalA: 10000, totalB: 2500, expectedPctB: 25 },    // 2500/10000 = 25%
  ];

  console.log(`Comparison Normalization Test:\n`);
  const failures = cases.filter((c) => !runTest(c));

  console.log(`\nResults: ${cases.length - failures.length}/${cases.length} passed`);

  if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} case(s) failed`);
    process.exit(1);
  }

  console.log(`PASS: All cases normalized correctly`);
}

main();
