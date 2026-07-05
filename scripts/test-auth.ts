import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Testing OTP login for ahmedalhamed1234@gmail.com...');
  const { data, error } = await supabase.auth.signInWithOtp({
    email: 'ahmedalhamed1234@gmail.com'
  });
  
  if (error) {
    console.error('Login Error:', error);
  } else {
    console.log('OTP sent successfully:', data);
  }
}

main().catch(console.error);
