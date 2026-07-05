// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SimpleClient = { from: (table: string) => { select: (cols: string) => Promise<{ data: any; error: any }> } };

type StatRow = {
  child_id: string;
  stat_date: string;
  total_seconds: number;
  stories_seconds: number;
  games_seconds: number;
  videos_seconds: number;
  creative_seconds: number;
  is_finalized: boolean;
};

export interface VerifyResult {
  pass: boolean;
  childCount: number;
  rowsPerChild: Record<string, number>;
  categoriesOk: boolean;
  totalSecondsOk: boolean;
  pastFinalizedOk: boolean;
  todayNotFinalizedOk: boolean;
  messages: string[];
}

const MIN_ROWS_PER_CHILD = 30;
const MIN_TOTAL_SECONDS = 1200;

export async function verifySeed(injectedClient?: SimpleClient): Promise<VerifyResult> {
  const messages: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: SimpleClient = (injectedClient ?? (await import('../services/api/client')).getClient()) as any;

  const { data, error } = await client
    .from('daily_stats')
    .select('child_id, stat_date, total_seconds, stories_seconds, games_seconds, videos_seconds, creative_seconds, is_finalized');

  if (error) {
    return {
      pass: false,
      childCount: 0,
      rowsPerChild: {},
      categoriesOk: false,
      totalSecondsOk: false,
      pastFinalizedOk: false,
      todayNotFinalizedOk: false,
      messages: [`DB error: ${error.message ?? String(error)}`],
    };
  }

  const rows: StatRow[] = (data as StatRow[]) ?? [];

  if (rows.length === 0) {
    return {
      pass: false,
      childCount: 0,
      rowsPerChild: {},
      categoriesOk: false,
      totalSecondsOk: false,
      pastFinalizedOk: false,
      todayNotFinalizedOk: false,
      messages: ['0 rows found — run npm run seed:reports first'],
    };
  }

  // (1) Row count per child
  const rowsPerChild: Record<string, number> = {};
  for (const row of rows) {
    rowsPerChild[row.child_id] = (rowsPerChild[row.child_id] ?? 0) + 1;
  }
  const childCount = Object.keys(rowsPerChild).length;
  let rowCountOk = true;
  for (const [childId, count] of Object.entries(rowsPerChild)) {
    if (count < MIN_ROWS_PER_CHILD) {
      messages.push(`Child ${childId} has only ${count} rows (expected ≥ ${MIN_ROWS_PER_CHILD})`);
      rowCountOk = false;
    }
  }

  // (2) Category floor check — all 4 categories must be non-zero in every row
  const categoriesOk = rows.every(
    r => r.stories_seconds > 0 && r.games_seconds > 0 && r.videos_seconds > 0 && r.creative_seconds > 0
  );
  if (!categoriesOk) {
    messages.push('One or more rows have a zero category value (stories/games/videos/creative)');
  }

  // (3) MIN(total_seconds) check
  const minTotal = Math.min(...rows.map(r => r.total_seconds));
  const totalSecondsOk = minTotal >= MIN_TOTAL_SECONDS;
  if (!totalSecondsOk) {
    messages.push(`total_seconds below minimum: found ${minTotal} (expected ≥ ${MIN_TOTAL_SECONDS})`);
  }

  // (4) Finalization flags
  const pastRows = rows.filter(r => r.stat_date < today);
  const todayRows = rows.filter(r => r.stat_date === today);

  const pastFinalizedOk = pastRows.every(r => r.is_finalized === true);
  const todayNotFinalizedOk = todayRows.length === 0 || todayRows.every(r => r.is_finalized === false);

  if (!pastFinalizedOk) {
    messages.push('Some past rows have is_finalized = false (should be true)');
  }
  if (!todayNotFinalizedOk) {
    messages.push('Today row has is_finalized = true (should be false)');
  }

  const pass = rowCountOk && categoriesOk && totalSecondsOk && pastFinalizedOk && todayNotFinalizedOk;

  return { pass, childCount, rowsPerChild, categoriesOk, totalSecondsOk, pastFinalizedOk, todayNotFinalizedOk, messages };
}

async function main() {
  console.log('Seed verification:');
  const result = await verifySeed(undefined);
  console.log(`  Children seeded: ${result.childCount}`);
  const totalRows = Object.values(result.rowsPerChild).reduce((a, b) => a + b, 0);
  console.log(`  Daily stats rows: ${totalRows}`);
  console.log(`  All 4 categories non-zero: ${result.categoriesOk ? '✓' : '✗'}`);
  console.log(`  total_seconds ≥ ${MIN_TOTAL_SECONDS}: ${result.totalSecondsOk ? '✓' : '✗'}`);
  console.log(`  Past rows is_finalized = true: ${result.pastFinalizedOk ? '✓' : '✗'}`);
  console.log(`  Today row is_finalized = false: ${result.todayNotFinalizedOk ? '✓' : '✗'}`);
  if (result.messages.length > 0) {
    console.log('  Issues:');
    for (const msg of result.messages) {
      console.log(`    - ${msg}`);
    }
  }
  console.log(`Result: ${result.pass ? 'PASS' : 'FAIL'}`);
  process.exit(result.pass ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error('seed-verify error:', err);
    process.exit(1);
  });
}
