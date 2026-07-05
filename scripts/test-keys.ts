import { createClient } from '@supabase/supabase-js';

const url = 'https://oyfdifgtqkszdwxtsaba.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZmRpZmd0cWtzemR3eHRzYWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDY3NjYsImV4cCI6MjA5ODcyMjc2Nn0.LfpLESqctQGYwvuKiyMiO-9to2ozqDqn7EP9Sw6FQ9o';
const srvKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZmRpZmd0cWtzemR3eHRzYWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzE0Njc2NiwiZXhwIjoyMDk4NzIyNzY2fQ.bfLONc6L7ef_lUe4LnOHXSY-qcwOHVKWoJgS_f33wEc';

async function main() {
  console.log('--- Test 1: Service Role ---');
  const admin = createClient(url, srvKey, { auth: { persistSession: false } });
  const { data: d1, error: e1 } = await admin.from('content_items').select('title, type').limit(3);
  console.log('Error:', e1?.message ?? 'none');
  console.log('Count:', d1?.length ?? 0);
  if (d1) d1.forEach(r => console.log(`  [${r.type}] ${r.title}`));

  console.log('\n--- Test 2: Anon Key ---');
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: d2, error: e2 } = await anon.from('content_items').select('title, type').limit(3);
  console.log('Error:', e2?.message ?? 'none');
  console.log('Count:', d2?.length ?? 0);
  if (d2) d2.forEach(r => console.log(`  [${r.type}] ${r.title}`));

  console.log('\n--- Test 3: Anon Key on profiles ---');
  const { data: d3, error: e3 } = await anon.from('profiles').select('id, role').limit(3);
  console.log('Error:', e3?.message ?? 'none');
  console.log('Count:', d3?.length ?? 0);

  console.log('\n--- Test 4: Anon Key direct count via RPC ---');
  const { data: d4, error: e4 } = await anon.rpc('get_child_profile', { p_child_id: '00000000-0000-0000-0000-000000000000' });
  console.log('Error:', e4?.message ?? 'none');
  console.log('Data:', d4);
}

main().catch(console.error);
