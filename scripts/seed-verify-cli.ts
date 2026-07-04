import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const MIN_ROWS_PER_CHILD = 30;
const MIN_TOTAL_SECONDS = 1200;

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

async function run() {
  if (!SUPABASE_URL) { console.error('Missing EXPO_PUBLIC_SUPABASE_URL'); process.exit(1); }
  const key = SERVICE_KEY || ANON_KEY;
  if (!key) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY'); process.exit(1); }

  const client = createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date().toISOString().split('T')[0];
  const messages: string[] = [];

  const { data, error } = await client
    .from('daily_stats')
    .select('child_id, stat_date, total_seconds, stories_seconds, games_seconds, videos_seconds, creative_seconds, is_finalized');

  if (error) { console.error('DB error:', error.message); process.exit(1); }

  const rows: StatRow[] = (data as StatRow[]) ?? [];

  if (rows.length === 0) {
    console.log('Seed verification:\n  0 rows found — run npm run seed:reports first\nResult: FAIL');
    process.exit(1);
  }

  // Row count per child
  const rowsPerChild: Record<string, number> = {};
  for (const row of rows) rowsPerChild[row.child_id] = (rowsPerChild[row.child_id] ?? 0) + 1;
  const childCount = Object.keys(rowsPerChild).length;
  let rowCountOk = true;
  for (const [id, count] of Object.entries(rowsPerChild)) {
    if (count < MIN_ROWS_PER_CHILD) { messages.push(`Child ${id} has only ${count} rows (expected ≥ ${MIN_ROWS_PER_CHILD})`); rowCountOk = false; }
  }

  // Category floor check
  const categoriesOk = rows.every(r => r.stories_seconds > 0 && r.games_seconds > 0 && r.videos_seconds > 0 && r.creative_seconds > 0);
  if (!categoriesOk) messages.push('One or more rows have a zero category value');

  // MIN total_seconds
  const minTotal = Math.min(...rows.map(r => r.total_seconds));
  const totalSecondsOk = minTotal >= MIN_TOTAL_SECONDS;
  if (!totalSecondsOk) messages.push(`total_seconds below minimum: found ${minTotal} (expected ≥ ${MIN_TOTAL_SECONDS})`);

  // Finalization flags
  const pastFinalizedOk = rows.filter(r => r.stat_date < today).every(r => r.is_finalized === true);
  const todayRows = rows.filter(r => r.stat_date === today);
  const todayNotFinalizedOk = todayRows.length === 0 || todayRows.every(r => r.is_finalized === false);
  if (!pastFinalizedOk) messages.push('Some past rows have is_finalized = false');
  if (!todayNotFinalizedOk) messages.push('Today row has is_finalized = true');

  const pass = rowCountOk && categoriesOk && totalSecondsOk && pastFinalizedOk && todayNotFinalizedOk;
  const totalRows = Object.values(rowsPerChild).reduce((a, b) => a + b, 0);

  console.log('Seed verification:');
  console.log(`  Children seeded: ${childCount}`);
  console.log(`  Daily stats rows: ${totalRows}`);
  console.log(`  All 4 categories non-zero: ${categoriesOk ? '✓' : '✗'}`);
  console.log(`  total_seconds ≥ ${MIN_TOTAL_SECONDS}: ${totalSecondsOk ? '✓' : '✗'}`);
  console.log(`  Past rows is_finalized = true: ${pastFinalizedOk ? '✓' : '✗'}`);
  console.log(`  Today row is_finalized = false: ${todayNotFinalizedOk ? '✓' : '✗'}`);
  if (messages.length > 0) { console.log('  Issues:'); messages.forEach(m => console.log(`    - ${m}`)); }
  console.log(`Result: ${pass ? 'PASS' : 'FAIL'}`);
  process.exit(pass ? 0 : 1);
}

run().catch(err => { console.error('seed-verify error:', err); process.exit(1); });
