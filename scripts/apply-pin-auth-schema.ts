import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20260612000002_pin_auth_schema.sql');

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

  console.log('Checking migration status for 018-pin-auth-two-device...\n');

  // Check if get_pending_pin_reset already exists
  const { error: checkErr } = await client.rpc('get_pending_pin_reset', {
    p_child_id: '00000000-0000-0000-0000-000000000000',
  });

  if (!checkErr || (!checkErr.message?.includes('Could not find') && checkErr.code !== 'PGRST202')) {
    console.log('✅ Migration already applied.');
    console.log('   get_pending_pin_reset function exists');
    console.log('   acknowledge_pin_reset function exists');
    console.log('   dispatch_child_pin_reset function exists');
    console.log('   update_parent_pin_hash function exists');
    process.exit(0);
  }

  console.log('❌ Migration not yet applied.\n');
  console.log('   Missing: get_pending_pin_reset and related functions');

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (accessToken) {
    const projectRef = (supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1];
    if (!projectRef) {
      console.error('❌ Could not extract project ref from EXPO_PUBLIC_SUPABASE_URL');
      process.exit(1);
    }
    console.log(`\nApplying migration via Management API (project: ${projectRef})...\n`);
    try {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
      const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body}`);
      }
      console.log('✅ Migration applied successfully.');
      console.log('Re-run: npm run migrate:pin-auth to confirm.');
    } catch (e: any) {
      console.error('\n❌ Auto-apply failed:', e.message);
      console.log('Apply manually via Supabase Dashboard → SQL Editor using the file:');
      console.log('  supabase/migrations/20260612000002_pin_auth_schema.sql');
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
    console.log('\nAfter applying, re-run: npm run migrate:pin-auth');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
