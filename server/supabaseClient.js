/**
 * Supabase Client — shared database access layer.
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

if (!config.supabase.url || config.supabase.url.includes('your-project')) {
    console.warn(
        '⚠️  Supabase URL not configured. Running in MOCK mode.\n' +
        '   Set SUPABASE_URL and keys in server/.env to connect to a real database.\n'
    );
}

const supabase = config.supabase.url && !config.supabase.url.includes('your-project')
    ? createClient(config.supabase.url, config.supabase.serviceKey)
    : null;

module.exports = supabase;
