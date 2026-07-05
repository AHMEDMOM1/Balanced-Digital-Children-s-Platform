import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Get one row to inspect actual columns
  const { data: row, error } = await client.from('profiles').select('*').limit(1);
  if (error) { console.error('profiles error:', error.message); }
  else { console.log('profiles columns:', Object.keys(row?.[0] ?? {})); }

  // Check if daily_stats table exists
  const { data: ds, error: dsErr } = await client.from('daily_stats').select('*').limit(1);
  if (dsErr) { console.log('daily_stats:', dsErr.message); }
  else { console.log('daily_stats columns:', Object.keys(ds?.[0] ?? {}), '(table exists)'); }
}
main().catch(e => { console.error(e); process.exit(1); });
