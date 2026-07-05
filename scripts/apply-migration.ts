import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20260610000001_content_schema_v1.sql');

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

  console.log('Checking migration status for 009-content-schema-storage...\n');

  const { error: colErr } = await client.from('content_items').select('duration_seconds').limit(0);
  const columnsExist = !colErr;
  const { error: catErr } = await client.from('categories').select('id').limit(0);
  const categoriesExist = !catErr;

  if (columnsExist && categoriesExist) {
    console.log('✅ Migration already applied.');
    console.log('   content_items has new columns (duration_seconds, content_text, assets_url, game_type, config_json)');
    console.log('   categories table exists');
    process.exit(0);
  }

  console.log('❌ Migration not yet applied.\n');
  if (!columnsExist) console.log('   Missing: new columns on content_items');
  if (!categoriesExist) console.log('   Missing: categories table');

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
      console.log('Re-run: npm run db:migrate to confirm.');
    } catch (e: any) {
      console.error('\n❌ Auto-apply failed:', e.message);
      console.log('Apply manually via Supabase Dashboard → SQL Editor using the file:');
      console.log('  supabase/migrations/20260610000001_content_schema_v1.sql');
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
      console.log('(Migration file not found. Copy from: specs/009-content-schema-storage/contracts/content-schema.sql)');
    }
    console.log('─'.repeat(60));
    console.log('\nAfter applying, re-run: npm run db:migrate');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
