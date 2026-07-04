import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Get the first parent's id and family_id
  const { data: parents, error: parentsErr } = await client
    .from('profiles')
    .select('id, family_id, full_name')
    .eq('role', 'parent')
    .limit(1);

  if (parentsErr) { console.error('Error fetching parents:', parentsErr.message); process.exit(1); }
  if (!parents || parents.length === 0) { console.error('No parent profiles found.'); process.exit(1); }

  const parent = parents[0];
  console.log(`Using parent: ${parent.full_name} (${parent.id})`);

  const seedChildren = [
    { email: 'alex-seed@balanced-digital.dev', fullName: 'Alex (Seed)', ageGroup: '5-7', color: '#4CAF50' },
    { email: 'sam-seed@balanced-digital.dev',  fullName: 'Sam (Seed)',  ageGroup: '8-10', color: '#2196F3' },
  ];

  for (const child of seedChildren) {
    // Create an auth user so profiles.id FK is satisfied
    const { data: authUser, error: authErr } = await client.auth.admin.createUser({
      email: child.email,
      email_confirm: true,
    });
    let userId: string;
    if (authErr) {
      // Already exists — find the user and still upsert the profile
      const { data: existing } = await client.auth.admin.listUsers();
      const found = existing?.users?.find(u => u.email === child.email);
      if (!found) { console.error(`Auth user error for ${child.email}:`, authErr.message); process.exit(1); }
      userId = found.id;
      console.log(`  Auth user already exists for ${child.email}, upserting profile...`);
    } else {
      userId = authUser.user.id;
    }

    const { error: profileErr } = await client.from('profiles').upsert({
      id: userId,
      role: 'child',
      parent_id: parent.id,
      family_id: parent.family_id,
      full_name: child.fullName,
      age_group: child.ageGroup,
      avatar_color: child.color,
      is_active: true,
    }, { onConflict: 'id' });
    if (profileErr) { console.error(`Profile error for ${child.fullName}:`, profileErr.message); process.exit(1); }
    console.log(`  Created ${child.fullName} (${userId})`);
  }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
