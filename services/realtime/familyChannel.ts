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
