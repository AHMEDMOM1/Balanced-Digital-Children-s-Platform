import { RealtimeChannel } from '@supabase/supabase-js';
import { getClient } from '../api/client';
import { RealtimeCommand, HeartbeatEvent, CommandAckEvent } from './types';

export interface ChannelHandlers {
  onCommand?: (cmd: RealtimeCommand) => void;
  onHeartbeat?: (hb: HeartbeatEvent) => void;
  onAck?: (ack: CommandAckEvent) => void;
}

export function subscribeFamilyChannel(
  familyId: string, 
  role: 'parent' | 'child', 
  handlers: ChannelHandlers
): RealtimeChannel {
  const channel = getClient().channel(`family:${familyId}`);

  channel
    .on('broadcast', { event: 'command' }, (payload) => {
      handlers.onCommand?.(payload.payload as RealtimeCommand);
    })
    .on('broadcast', { event: 'heartbeat' }, (payload) => {
      handlers.onHeartbeat?.(payload.payload as HeartbeatEvent);
    })
    .on('broadcast', { event: 'command_ack' }, (payload) => {
      handlers.onAck?.(payload.payload as CommandAckEvent);
    })
    .subscribe();

  return channel;
}

export function broadcastCommand(channel: RealtimeChannel, command: RealtimeCommand): void {
  channel.send({
    type: 'broadcast',
    event: 'command',
    payload: command
  });
}

export function broadcastHeartbeat(channel: RealtimeChannel, heartbeat: HeartbeatEvent): void {
  channel.send({
    type: 'broadcast',
    event: 'heartbeat',
    payload: heartbeat
  });
}

export function broadcastAck(channel: RealtimeChannel, ack: CommandAckEvent): void {
  channel.send({
    type: 'broadcast',
    event: 'command_ack',
    payload: ack
  });
}

export function unsubscribeFamilyChannel(channel: RealtimeChannel): void {
  getClient().removeChannel(channel);
}

export interface SettingsChangeHandlers {
  onSettingsUpdate: (fields: Partial<{
    daily_time_limit_minutes: number;
    sessions_per_day: number;
    stories_enabled: boolean;
    games_enabled: boolean;
    videos_enabled: boolean;
    creative_enabled: boolean;
  }>) => void;
  onCategoryUpdate: (category: string, isAllowed: boolean) => void;
}

export function subscribeSettingsChanges(
  childId: string,
  handlers: SettingsChangeHandlers
): () => void {
  // Private, single-subscriber CDC feed (not used for cross-device
  // rendezvous like the family: channel) — random suffix avoids reusing a
  // cached, already-subscribed channel object under StrictMode/Fast Refresh
  // double-effect-invocation, which throws "cannot add ... after subscribe()".
  const topicSuffix = Math.random().toString(36).slice(2);
  const channel = getClient()
    .channel(`settings-sync:${childId}-${topicSuffix}`)
    .on(
      // parent_settings has no family_id column — scope by child_id (also
      // fixes a prior bug here: this used to listen on `profiles` for a
      // `daily_limit_minutes` column that doesn't exist on that table).
      'postgres_changes',
      { event: '*', schema: 'public', table: 'parent_settings', filter: `child_id=eq.${childId}` },
      (payload) => {
        const row = payload.new as any;
        if (!row) return;
        handlers.onSettingsUpdate({
          daily_time_limit_minutes: row.daily_time_limit_minutes,
          sessions_per_day: row.sessions_per_day,
          stories_enabled: row.stories_enabled,
          games_enabled: row.games_enabled,
          videos_enabled: row.videos_enabled,
          creative_enabled: row.creative_enabled,
        });
        console.debug('[settings-sync] parent_settings update', { childId });
      }
    )
    .on(
      // category_preferences also has no family_id column — scope by child_id.
      'postgres_changes',
      { event: '*', schema: 'public', table: 'category_preferences', filter: `child_id=eq.${childId}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as any;
        if (row?.category && typeof row.is_allowed === 'boolean') {
          handlers.onCategoryUpdate(row.category, row.is_allowed);
          console.debug('[settings-sync] category update', { category: row.category });
        }
      }
    )
    .subscribe();
  return () => { getClient().removeChannel(channel); };
}
