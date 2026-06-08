import React, { useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../store/useAuthStore';
import { useRealtimeStore } from '../store/useRealtimeStore';
import useSessionStore from '../store/useSessionStore';
import { 
  subscribeFamilyChannel, 
  unsubscribeFamilyChannel, 
  broadcastHeartbeat 
} from '../services/realtime/familyChannel';
import { processCommand } from '../services/realtime/commandProcessor';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getClient } from '../services/api/client';

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, parentData, childData } = useAuthStore();
  const { 
    setConnected, 
    recordHeartbeat, 
    loadAppliedCommandIds,
    setChildOnline,
    setChannel
  } = useRealtimeStore();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const familyId = role === 'parent' ? parentData?.familyId : childData?.familyId;

  const fetchUnackedCommands = useCallback(() => {
    if (!familyId) return;
    getClient()
      .from('realtime_commands')
      .select('*')
      .eq('family_id', familyId)
      .is('acknowledged_at', null)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (data && !error) {
          data.forEach(row => {
            processCommand({
              command_id: row.id,
              command_type: row.command_type,
              sender_id: row.sender_id,
              child_id: row.child_id,
              payload: row.payload,
              created_at: row.created_at
            }, useRealtimeStore, useSessionStore);
          });
        }
      });
  }, [familyId]);

  const startSubscription = useCallback(() => {
    if (!familyId || !role) return;

    const handlers = {
      onCommand: (cmd: any) => {
        if (role === 'child') {
          processCommand(cmd, useRealtimeStore, useSessionStore);
        }
      },
      onHeartbeat: (hb: any) => {
        if (role === 'parent') {
          recordHeartbeat();
        }
      },
      onAck: (ack: any) => {}
    };

    const channel = subscribeFamilyChannel(familyId, role, handlers);
    channelRef.current = channel;
    setChannel(channel);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        if (role === 'child') {
          fetchUnackedCommands();
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnected(false);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(startSubscription, 5000);
      }
    });
  }, [familyId, role, recordHeartbeat, setConnected, setChannel, fetchUnackedCommands]);

  useEffect(() => {
    if (!familyId || !role) return;

    loadAppliedCommandIds();
    startSubscription();

    if (role === 'child' && childData) {
      heartbeatIntervalRef.current = setInterval(() => {
        if (channelRef.current && channelRef.current.status === 'SUBSCRIBED') {
          const sessionState = useSessionStore.getState();
          broadcastHeartbeat(channelRef.current, {
            child_id: childData.id,
            timestamp: new Date().toISOString(),
            session_active: sessionState.isSessionActive,
            elapsed_seconds: sessionState.elapsedSeconds
          });
        }
      }, 30000);
    }

    if (role === 'parent') {
      presenceIntervalRef.current = setInterval(() => {
        const lastHb = useRealtimeStore.getState().lastHeartbeatAt;
        if (lastHb && Date.now() - lastHb > 90000) {
          setChildOnline(false);
        }
      }, 1000);
    }

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (channelRef.current) {
        unsubscribeFamilyChannel(channelRef.current);
      }
      setConnected(false);
      setChannel(null);
    };
  }, [familyId, role, startSubscription]);

  return <>{children}</>;
};
