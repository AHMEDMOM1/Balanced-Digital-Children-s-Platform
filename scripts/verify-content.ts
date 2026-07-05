import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(): void {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = raw;
  }
}

async function main() {
  loadEnv();

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !serviceKey || !anonKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
  }

  // ── Step 1: Check content with SERVICE_ROLE key (bypasses RLS) ──
  console.log('\n═══════════════════════════════════════════');
  console.log('  Step 1: Checking content via SERVICE_ROLE');
  console.log('═══════════════════════════════════════════\n');

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: allItems, error: adminErr } = await adminClient
    .from('content_items')
    .select('id, title, type, status, is_active')
    .order('type');

  if (adminErr) {
    console.error('❌ Admin query error:', adminErr.message);
    process.exit(1);
  }

  console.log(`📦 Total items in DB: ${allItems?.length ?? 0}`);
  if (!allItems || allItems.length === 0) {
    console.error('❌ No content found! The seed script may not have inserted anything.');
    process.exit(1);
  }

  // Group by type
  const byType: Record<string, number> = {};
  let inactiveCount = 0;
  for (const item of allItems) {
    byType[item.type] = (byType[item.type] || 0) + 1;
    if (!item.is_active) inactiveCount++;
  }
  console.log('   By type:', JSON.stringify(byType));
  console.log(`   Active: ${allItems.length - inactiveCount}, Inactive: ${inactiveCount}`);
  console.log('\n   Sample items:');
  for (const item of allItems.slice(0, 5)) {
    console.log(`     - [${item.type}] "${item.title}" (active=${item.is_active}, status=${item.status})`);
  }

  // ── Step 2: Check content with ANON key (subject to RLS) ──
  console.log('\n═══════════════════════════════════════════');
  console.log('  Step 2: Checking content via ANON key');
  console.log('  (This is what the child device sees)');
  console.log('═══════════════════════════════════════════\n');

  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: anonItems, error: anonErr } = await anonClient
    .from('content_items')
    .select('id, title, type');

  if (anonErr) {
    console.error('❌ Anon query ERROR:', anonErr.message);
    console.log('\n🔧 This means RLS is blocking the child device.');
    console.log('   Fix: Run this SQL in Supabase Dashboard → SQL Editor:');
    console.log('   ─────────────────────────────────────────────────');
    console.log('   DROP POLICY IF EXISTS "authenticated_read_content_items" ON content_items;');
    console.log('   DROP POLICY IF EXISTS "anon_read_content_items" ON content_items;');
    console.log('   CREATE POLICY "anon_read_content_items" ON content_items FOR SELECT USING (true);');
    console.log('   ─────────────────────────────────────────────────');
  } else {
    console.log(`📱 Items visible to child device: ${anonItems?.length ?? 0}`);
    if ((anonItems?.length ?? 0) === 0 && (allItems?.length ?? 0) > 0) {
      console.log('\n⚠️  Content EXISTS in DB but child device CANNOT see it!');
      console.log('   Root cause: RLS policy blocks anon reads.');
      console.log('   Attempting auto-fix...\n');

      // Try to fix via service_role rpc
      // We need to apply the fix via supabase CLI or dashboard
      console.log('   🔧 Run this SQL in Supabase Dashboard → SQL Editor:');
      console.log('   ─────────────────────────────────────────────────');
      console.log('   DROP POLICY IF EXISTS "authenticated_read_content_items" ON content_items;');
      console.log('   DROP POLICY IF EXISTS "anon_read_content_items" ON content_items;');
      console.log('   CREATE POLICY "anon_read_content_items" ON content_items FOR SELECT USING (true);');
      console.log('   ─────────────────────────────────────────────────');
    } else {
      console.log('\n✅ Everything looks good! The child device can see the content.');
      const anonByType: Record<string, number> = {};
      for (const item of anonItems ?? []) {
        anonByType[item.type] = (anonByType[item.type] || 0) + 1;
      }
      console.log('   By type:', JSON.stringify(anonByType));
    }
  }

  // ── Step 3: Check is_active field ──
  if (inactiveCount > 0) {
    console.log(`\n⚠️  ${inactiveCount} items have is_active=false and won't show.`);
    console.log('   Fixing: setting all to is_active=true...');
    const { error: fixErr } = await adminClient
      .from('content_items')
      .update({ is_active: true })
      .eq('is_active', false);
    if (fixErr) {
      console.error('   ❌ Fix failed:', fixErr.message);
    } else {
      console.log('   ✅ Fixed! All items are now active.');
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Verification complete!');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(e => { console.error(e); process.exit(1); });
