import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20260612000000_content_lifecycle.sql');

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

  console.log('Checking migration status for 015-content-validation-quality...\n');

  // Prerequisite: content_items table must exist (spec 009)
  const { error: tableErr } = await client.from('content_items').select('id').limit(0);
  if (tableErr) {
    console.error('❌ Prerequisite not met: content_items table not found.');
    console.error('   Apply spec 009 migration first: npm run db:migrate');
    process.exit(1);
  }

  // Idempotency check: look for status column on content_items
  const { data: colData, error: colErr } = await client
    .from('information_schema.columns' as any)
    .select('column_name')
    .eq('table_name', 'content_items')
    .eq('column_name', 'status')
    .limit(1);

  const statusColumnExists = !colErr && Array.isArray(colData) && colData.length > 0;

  // Also check for new tables
  const { error: cvrErr } = await client.from('content_validation_results').select('id').limit(0);
  const { error: crrErr } = await client.from('content_review_records').select('id').limit(0);
  const tablesExist = !cvrErr && !crrErr;

  if (statusColumnExists && tablesExist) {
    console.log('✅ Migration already applied.');
    console.log('   content_items.status column: EXISTS');
    console.log('   content_validation_results table: EXISTS');
    console.log('   content_review_records table: EXISTS');
    process.exit(0);
  }

  if (statusColumnExists !== tablesExist) {
    console.log('⚠️  Partial migration detected — reapplying:');
    console.log(`   content_items.status: ${statusColumnExists ? 'EXISTS' : 'MISSING'}`);
    console.log(`   content_validation_results: ${!cvrErr ? 'EXISTS' : 'MISSING'}`);
    console.log(`   content_review_records: ${!crrErr ? 'EXISTS' : 'MISSING'}`);
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
      console.log('Re-run: npm run migrate:validation-lifecycle to confirm.');
    } catch (e: any) {
      console.error('\n❌ Auto-apply failed:', e.message);
      console.log('Apply manually via Supabase Dashboard → SQL Editor using:');
      console.log('  supabase/migrations/20260612000000_content_lifecycle.sql');
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
    console.log('\nAfter applying, re-run: npm run migrate:validation-lifecycle');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
