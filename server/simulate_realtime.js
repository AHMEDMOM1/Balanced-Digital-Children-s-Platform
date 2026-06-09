/**
 * Simulation Script: Realtime Command Flow
 * 
 * Verifies that:
 * 1. Commands can be inserted into realtime_commands.
 * 2. Activity logs are created (simulated based on logic).
 * 
 * Run with: node simulate_realtime.js
 */
const supabase = require('./supabaseClient');

async function runSimulation() {
  if (!supabase) {
    console.error('❌ Supabase client not initialized. Check your .env file.');
    return;
  }

  console.log('🚀 Starting Realtime Command Flow Simulation...');

  try {
    // 1. Fetch a test family/child for context
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, family_id, role')
      .limit(5);

    if (pError || !profiles || profiles.length === 0) {
      console.error('❌ Could not find test profiles:', pError);
      return;
    }

    const parent = profiles.find(p => p.role === 'parent');
    const child = profiles.find(p => p.role === 'child');

    if (!parent || !child) {
      console.error('❌ Need both a parent and child profile for this simulation.');
      return;
    }

    const familyId = parent.family_id || child.family_id;
    console.log(`📍 Using Family ID: ${familyId}`);
    console.log(`👤 Parent: ${parent.id} | Child: ${child.id}`);

    // 2. Simulate Parent sending a 'pause' command
    const commandId = crypto.randomUUID?.() || 'test-cmd-' + Date.now();
    console.log(`\n📤 Step 1: Parent sending 'pause' command (${commandId})...`);
    
    const { error: insError } = await supabase
      .from('realtime_commands')
      .insert({
        id: commandId,
        family_id: familyId,
        sender_id: parent.id,
        child_id: child.id,
        command_type: 'pause',
        payload: { test: true }
      });

    if (insError) throw insError;
    console.log('✅ Command inserted successfully.');

    // 3. Simulate Child acknowledging the command
    console.log(`\n📥 Step 2: Child acknowledging command...`);
    const { error: updError } = await supabase
      .from('realtime_commands')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', commandId);

    if (updError) throw updError;
    console.log('✅ Command acknowledged successfully.');

    // 4. Verify Activity Logs (FR-005)
    // Note: In the app, the child's commandProcessor inserts this log.
    // We simulate that here to verify the table works.
    console.log(`\n📝 Step 3: Logging activity...`);
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        family_id: familyId,
        actor_id: child.id,
        target_child_id: child.id,
        event_type: 'command_applied',
        command_id: commandId,
        payload: { command_type: 'pause' }
      });

    if (logError) throw logError;
    console.log('✅ Activity log entry created.');

    // 5. Final Verification
    console.log(`\n🔍 Step 4: Final verification query...`);
    const { data: audit, error: audError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('command_id', commandId)
      .single();

    if (audError) throw audError;
    console.log('🏁 SUCCESS: Audit trail verified for command:', audit.command_id);
    console.log('📊 Log Entry:', JSON.stringify(audit, null, 2));

  } catch (err) {
    console.error('💥 Simulation failed:', err.message);
  }
}

runSimulation();
