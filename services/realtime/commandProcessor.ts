import { getClient } from '../api/client';
import { RealtimeCommand } from './types';
import { useSettingsStore } from '../../store/useSettingsStore';

export function processCommand(
  command: RealtimeCommand, 
  realtimeStore: any, 
  sessionStore: any
): boolean {
  // 1. Check if command is already applied
  if (realtimeStore.getState().isCommandApplied(command.command_id)) {
    return false;
  }

  // 2. Switch on command_type
  switch (command.command_type) {
    case 'pause':
      sessionStore.getState().setPaused(true);
      break;
    case 'resume':
      sessionStore.getState().setPaused(false);
      break;
    case 'time_update':
      sessionStore.getState().updateRemainingMinutes(command.payload.remaining_minutes);
      break;
    case 'category_block':
      const { category, is_allowed } = command.payload;
      const settingsStore = useSettingsStore.getState();
      
      // Map category name to store action
      const catLower = category.toLowerCase();
      if (catLower.includes('stor')) {
        useSettingsStore.setState({ storiesEnabled: is_allowed });
      } else if (catLower.includes('game')) {
        useSettingsStore.setState({ gamesEnabled: is_allowed });
      } else if (catLower.includes('creat')) {
        useSettingsStore.setState({ creativeEnabled: is_allowed });
      } else if (catLower.includes('vid')) {
        useSettingsStore.setState({ videosEnabled: is_allowed });
      }

      // Upsert to database (category_preferences)
      getClient().from('category_preferences').upsert({
        child_id: command.child_id,
        category: category,
        is_allowed: is_allowed
      }, { onConflict: 'child_id, category' }).then(); // fire and forget
      
      break;
    case 'force_end':
      sessionStore.getState().endSession();
      break;
  }

  // 3. Record as applied
  realtimeStore.getState().addAppliedCommandId(command.command_id);

  // 4. Acknowledge in DB
  getClient()
    .from('realtime_commands')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', command.command_id)
    .then(); // fire and forget

  // Log to activity_logs (FR-005)
  getClient().from('activity_logs').insert({
    family_id: command.payload?.family_id ?? '',
    actor_id: command.sender_id,
    target_child_id: command.child_id,
    event_type: 'command_applied',
    command_id: command.command_id,
    payload: { command_type: command.command_type, ...command.payload },
  }).then(); // fire and forget

  return true;
}
