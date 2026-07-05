import { getClient } from '../api/client';
import { RealtimeCommand, SettingsSyncPayload } from './types';
import useSettingsStore from '../../store/useSettingsStore';

export function processCommand(
  command: RealtimeCommand,
  realtimeStore: any,
  sessionStore: any,
  selfChildId: string | null = null,
): boolean {
  // 0. Targeting: null child_id = broadcast to every child in the family
  // (e.g. parent's "Pause all" button). A specific child_id means this
  // command is meant for exactly one child — ignore it everywhere else,
  // since every child in a family currently shares the same realtime
  // channel and would otherwise all apply it.
  if (command.child_id !== null && command.child_id !== selfChildId) {
    return false;
  }

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
    case 'category_block': {
      const { category, is_allowed } = command.payload;

      // Map category name to store action. The parent already persisted
      // this to category_preferences when toggling it — the child only
      // needs to update its own local effective-settings cache.
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
      break;
    }
    case 'force_end':
      sessionStore.getState().endSession();
      break;
    case 'settings_sync': {
      const p = command.payload as SettingsSyncPayload;
      if (p.daily_limit_minutes !== undefined)
        useSettingsStore.setState({ dailyTimeLimitMinutes: p.daily_limit_minutes });
      if (p.stories_enabled !== undefined)
        useSettingsStore.setState({ storiesEnabled: p.stories_enabled });
      if (p.games_enabled !== undefined)
        useSettingsStore.setState({ gamesEnabled: p.games_enabled });
      if (p.creative_enabled !== undefined)
        useSettingsStore.setState({ creativeEnabled: p.creative_enabled });
      if (p.videos_enabled !== undefined)
        useSettingsStore.setState({ videosEnabled: p.videos_enabled });
      console.debug('[commandProcessor] settings_sync applied', p);
      break;
    }
  }

  // 3. Record as applied
  realtimeStore.getState().addAppliedCommandId(command.command_id);

  // 4. Acknowledge in DB — headless child, no auth.uid(), must go through
  // the anon-callable RPC (a direct .update() always failed RLS silently).
  getClient()
    .rpc('child_ack_command', { p_command_id: command.command_id })
    .then(); // fire and forget

  return true;
}
