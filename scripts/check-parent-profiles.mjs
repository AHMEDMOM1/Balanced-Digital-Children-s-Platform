import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const lines = readFileSync('.env', 'utf-8').split('\n');
const env = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = val;
}

const sc = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Check existing parent profiles
const { data: parents, error: pe } = await sc.from('profiles').select('id,family_id,role').eq('role', 'parent').limit(3);
console.log('existing parents (first 3):', parents?.map(p => ({ id: p.id.slice(0,8), family_id: p.family_id?.slice(0,8), role: p.role })));
if (pe) console.log('parents error:', pe.message);

// Try inserting a test profile to see the actual FK error message
const testId = '99999999-0000-0000-0000-000000000099';
const { error: insertErr } = await sc.from('profiles').insert({
  id: testId,
  role: 'parent',
  family_id: 'f1111111-0000-0000-0000-000000000017',
  full_name: 'FK Test',
  is_active: true,
});
console.log('insert test error:', insertErr?.message, insertErr?.details, insertErr?.hint);

// Clean up if it somehow succeeded
if (!insertErr) {
  await sc.from('profiles').delete().eq('id', testId);
  console.log('test profile cleaned up');
}
