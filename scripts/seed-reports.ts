import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TOP_ACTIVITIES = ['The Brave Knight', 'Puzzle Palace', 'Animal Kingdom', 'Magic Canvas', 'Space Explorer'];

function randInt(min: number, range: number): number {
  return min + Math.floor(Math.random() * (range + 1));
}

function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    process.exit(1);
  }

  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: children, error: childErr } = await client
    .from('profiles')
    .select('id')
    .eq('role', 'child')
    .limit(5);

  if (childErr) {
    console.error('Failed to fetch child profiles:', childErr.message);
    process.exit(1);
  }
  if (!children || children.length === 0) {
    console.log('No child profiles found — apply 001_initial_data.sql first.');
    process.exit(0);
  }

  const today = new Date().toISOString().split('T')[0];
  const rows: object[] = [];

  for (const child of children) {
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const statDate = d.toISOString().split('T')[0];

      rows.push({
        child_id: child.id,
        stat_date: statDate,
        total_seconds:    randInt(1200, 3600),
        stories_seconds:  randInt(300, 900),
        games_seconds:    randInt(200, 800),
        videos_seconds:   randInt(100, 600),
        creative_seconds: randInt(200, 700),
        session_count:    randInt(2, 4),
        top_activity:     randPick(TOP_ACTIVITIES),
        is_finalized:     statDate < today,
      });
    }
  }

  const { error } = await client
    .from('daily_stats')
    .upsert(rows, { onConflict: 'child_id,stat_date', ignoreDuplicates: true });

  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} rows for ${children.length} child(ren). Existing rows untouched.`);
}

main().catch(err => {
  console.error('seed-reports error:', err);
  process.exit(1);
});
