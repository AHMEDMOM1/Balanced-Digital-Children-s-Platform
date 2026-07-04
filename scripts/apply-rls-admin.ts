import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20260611000000_admin_write_policies.sql');

function loadEnv() {
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

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing env vars: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Checking migration status for 012-content-rls-policies...\n');

  // Pre-check: verify spec 009 migration has been applied (tables must exist)
  const { error: tableErr } = await client.from('content_items').select('id').limit(0);
  if (tableErr) {
    console.error('❌ Prerequisite not met: content_items table not found.');
    console.error('   Apply spec 009 migration first: npm run db:migrate');
    process.exit(1);
  }

  // Idempotency check via rls_policy_names helper (deployed by this migration).
  // Before migration the function does not exist — rpc returns error, data is null → proceed.
  // After migration the function exists and returns policy names → check for both admin policies.
  const { data: ciData } = await client.rpc('rls_policy_names', { target_table: 'content_items' });
  const { data: catData } = await client.rpc('rls_policy_names', { target_table: 'categories' });
  const ciPolicies: string[] = ciData || [];
  const catPolicies: string[] = catData || [];

  const ciHasAdmin = ciPolicies.includes('admin_write_content_items');
  const catHasAdmin = catPolicies.includes('admin_write_categories');

  if (ciHasAdmin && catHasAdmin) {
    console.log('✅ Migration already applied.');
    console.log('   admin_write_content_items policy: EXISTS');
    console.log('   admin_write_categories policy: EXISTS');
    process.exit(0);
  }

  if (ciHasAdmin !== catHasAdmin) {
    console.log('⚠️  Partial migration detected — reapplying:');
    console.log(`   admin_write_content_items: ${ciHasAdmin ? 'EXISTS' : 'MISSING'}`);
    console.log(`   admin_write_categories: ${catHasAdmin ? 'EXISTS' : 'MISSING'}`);
  } else {
    console.log('❌ Migration not yet applied.');
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = (supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1];

  if (accessToken && projectRef) {
    console.log('\nApplying migration via Supabase CLI...\n');
    const { execSync } = await import('child_process');
    try {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
      const tmpFile = path.join(__dirname, '../.migration-tmp.sql');
      fs.writeFileSync(tmpFile, sql);
      execSync(
        `npx supabase db query --linked --file "${tmpFile}"`,
        { env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken }, stdio: 'inherit' }
      );
      fs.unlinkSync(tmpFile);
      console.log('\n✅ Migration applied successfully.');
      console.log('Re-run: npm run migrate:rls-admin to confirm.');
    } catch (e: any) {
      console.error('\n❌ Auto-apply failed:', e.message);
      console.log('Apply manually via Supabase Dashboard → SQL Editor using:');
      console.log('  supabase/migrations/20260611000000_admin_write_policies.sql');
      process.exit(1);
    }
  } else {
    console.log('\nTo apply automatically, add SUPABASE_ACCESS_TOKEN to .env');
    console.log('Or paste this SQL into Supabase Dashboard → SQL Editor:\n');
    console.log('─'.repeat(60));
    try {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
      console.log(sql);
    } catch {
      console.log('(Migration file not found at: ' + MIGRATION_FILE + ')');
    }
    console.log('─'.repeat(60));
    console.log('\nAfter applying, re-run: npm run migrate:rls-admin');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
