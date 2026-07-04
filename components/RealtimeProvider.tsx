import React, { useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../store/useAuthStore';
import { useRealtimeStore } from '../store/useRealtimeStore';
import useSessionStore from '../store/useSessionStore';
import { connectivityManager } from '../services/resilience/connectivityManager';
import { eventLogger } from '../services/resilience/eventLogger';
import { drainPendingSessionQueue } from '../services/api/sessions';
import {
  subscribeFamilyChannel,
  unsubscribeFamilyChannel,
  broadcastHeartbeat,
  subscribeSettingsChanges,
} from '../services/realtime/familyChannel';
import useSettingsStore from '../store/useSettingsStore';
import { processCommand } from '../services/realtime/commandProcessor';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getClient } from '../services/api/client';
import { getChildSettingsForSelf, getChildProfileForSelf } from '../services/api/childSettings';

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, parentData, childData } = useAuthStore();
  const {
    setConnected,
    recordHeartbeat,
    setLatestHeartbeat,
    loadAppliedCommandIds,
    setChildOnline,
    setChannel
  } = useRealtimeStore();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubSettingsRef = useRef<(() => void) | null>(null);

  const familyId = role === 'parent' ? parentData?.familyId : childData?.familyId;

  const fetchUnackedCommands = useCallback(() => {
    if (!familyId || !childData?.id) return;
    // Headless child device — no auth.uid(), so this must go through the
    // anon-callable RPC (it also filters child_id IS NULL OR = self
    // server-side, matching processCommand's own client-side filter).
    getClient()
      .rpc('child_fetch_unacked_commands', { p_child_id: childData.id, p_family_id: familyId })
      .then(({ data, error }) => {
        if (data && !error) {
          data.forEach((row: any) => {
            processCommand({
              command_id: row.id,
              command_type: row.command_type,
              sender_id: row.sender_id,
              child_id: row.child_id,
              payload: row.payload,
              created_at: row.created_at
            }, useRealtimeStore, useSessionStore, childData?.id ?? null);
          });
        }
      });
  }, [familyId, childData?.id]);

    const startSubscription = useCallback(() => {
        if (!familyId || !role || role === 'admin') return;

        const handlers = {
            onCommand: (cmd: any) => {
                if (role === 'child') {
                    processCommand(cmd, useRealtimeStore, useSessionStore, childData?.id ?? null);
                }
            },
            onHeartbeat: (hb: any) => {
                if (role === 'parent') {
                    setLatestHeartbeat(hb);
                    console.debug('[RealtimeProvider] heartbeat', { activity: hb.current_activity, elapsed: hb.elapsed_seconds });
                }
            },
            onAck: (ack: any) => {}
        };

        const channel = subscribeFamilyChannel(familyId, role as 'parent' | 'child', handlers);
        channelRef.current = channel;
        setChannel(channel);

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                subscribedRef.current = true;
                setConnected(true);
                eventLogger.log({
                    eventType: 'offline_transition',
                    success: true,
                    screen: 'realtime',
                    details: { status: 'SUBSCRIBED' },
                });
                if (role === 'child') {
                    fetchUnackedCommands();
                    drainPendingSessionQueue();
                }
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                subscribedRef.current = false;
                setConnected(false);
                eventLogger.log({
                    eventType: 'offline_transition',
                    success: false,
                    screen: 'realtime',
                    details: { status },
                });
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(startSubscription, connectivityManager.getReconnectionInterval());
            }
        });
    }, [familyId, role, setLatestHeartbeat, setConnected, setChannel, fetchUnackedCommands]);

  useEffect(() => {
    if (!familyId || !role) return;

    loadAppliedCommandIds();
    startSubscription();

    if (role === 'child' && childData) {
      // One-time hydration: this device's own effective settings + profile,
      // fetched via the anon-callable RPCs (no auth.uid() exists to read
      // these tables directly). Live updates after this come through both
      // the postgres_changes subscription below and settings_sync commands.
      getChildSettingsForSelf(childData.id).then((settings) => {
        useSettingsStore.setState({
          dailyTimeLimitMinutes: settings.daily_time_limit_minutes,
          sessionsPerDay: settings.sessions_per_day,
          storiesEnabled: settings.stories_enabled,
          gamesEnabled: settings.games_enabled,
          videosEnabled: settings.videos_enabled,
          creativeEnabled: settings.creative_enabled,
        });
      });
      getChildProfileForSelf(childData.id).then((profile) => {
        if (profile?.fullName) {
          useAuthStore.setState((s) => s.childData ? { childData: { ...s.childData, name: profile.fullName } } : s);
        }
      });

      unsubSettingsRef.current = subscribeSettingsChanges(childData.id, {
        onSettingsUpdate: (fields) => {
          if (fields.daily_time_limit_minutes !== undefined) {
            useSettingsStore.setState({ dailyTimeLimitMinutes: fields.daily_time_limit_minutes });
          }
          if (fields.sessions_per_day !== undefined) {
            useSettingsStore.setState({ sessionsPerDay: fields.sessions_per_day });
          }
          if (fields.stories_enabled !== undefined) {
            useSettingsStore.setState({ storiesEnabled: fields.stories_enabled });
          }
          if (fields.games_enabled !== undefined) {
            useSettingsStore.setState({ gamesEnabled: fields.games_enabled });
          }
          if (fields.videos_enabled !== undefined) {
            useSettingsStore.setState({ videosEnabled: fields.videos_enabled });
          }
          if (fields.creative_enabled !== undefined) {
            useSettingsStore.setState({ creativeEnabled: fields.creative_enabled });
          }
        },
        onCategoryUpdate: (category, isAllowed) => {
          const cat = category.toLowerCase();
          if (cat.includes('stor'))       useSettingsStore.setState({ storiesEnabled: isAllowed });
          else if (cat.includes('game'))  useSettingsStore.setState({ gamesEnabled: isAllowed });
          else if (cat.includes('creat')) useSettingsStore.setState({ creativeEnabled: isAllowed });
          else if (cat.includes('vid'))   useSettingsStore.setState({ videosEnabled: isAllowed });
        },
      });
    }

    if (role === 'child' && childData) {
      heartbeatIntervalRef.current = setInterval(() => {
        const ch = channelRef.current;
        if (ch && subscribedRef.current) {
          const sessionState = useSessionStore.getState();
          broadcastHeartbeat(ch, {
            child_id: childData.id,
            timestamp: new Date().toISOString(),
            session_active: sessionState.isSessionActive,
            elapsed_seconds: sessionState.elapsedSeconds,
            current_activity: sessionState.currentActivity ?? undefined,
            current_content_id: sessionState.currentContentId ?? undefined,
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

    const unsubBattery = connectivityManager.onBatterySaverChange((enabled) => {
      eventLogger.log({
        eventType: enabled ? 'battery_saver_enter' : 'battery_saver_exit',
        success: true,
        screen: 'realtime',
      });
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(startSubscription, connectivityManager.getReconnectionInterval());
      }
    });

    return () => {
      unsubBattery();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (unsubSettingsRef.current) unsubSettingsRef.current();
      if (channelRef.current) {
        unsubscribeFamilyChannel(channelRef.current);
      }
      setConnected(false);
      setChannel(null);
    };
  }, [familyId, role, startSubscription]);

  return <>{children}</>;
};
