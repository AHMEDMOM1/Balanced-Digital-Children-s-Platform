/**
 * Child Layout — Stack Navigation (No visible nav bar)
 * Child cannot exit without entering PIN.
 */
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, BackHandler } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import SessionOverlay from '../../components/ui/SessionOverlay';
import useSessionStore from '../../store/useSessionStore';
import useSettingsStore from '../../store/useSettingsStore';
import { RealtimeProvider } from '../../components/RealtimeProvider';
import PauseOverlay from '../../components/ui/PauseOverlay';
import { recoverAbandonedSessions } from '../../services/api/sessions';
import useAuthStore from '../../store/useAuthStore';

export default function ChildLayout() {
    const { startSession, isSessionActive } = useSessionStore();
    const { storiesEnabled, gamesEnabled, creativeEnabled, videosEnabled } = useSettingsStore();
    const pathname = usePathname();
    const router = useRouter();
    const backgroundAt = useRef<number | null>(null);
    const childData = useAuthStore((s) => s.childData);

    useEffect(() => {
        if (!isSessionActive) {
            startSession();
        }
    }, [isSessionActive, startSession]);

    // FR-007: recover abandoned sessions after child layout mounts (post-auth)
    useEffect(() => {
        if (childData?.id) {
            recoverAbandonedSessions(childData.id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childData?.id]);

    // AppState: re-lock after 5 minutes in background
    useEffect(() => {
        const handleAppState = (next: AppStateStatus) => {
            if (next === 'background' || next === 'inactive') {
                backgroundAt.current = Date.now();
                console.debug('[childLayout] AppState background', { at: backgroundAt.current });
            } else if (next === 'active' && backgroundAt.current !== null) {
                const elapsed = Date.now() - backgroundAt.current;
                console.debug('[childLayout] AppState active', { elapsed });
                // Child does not require PIN — no re-lock needed
                backgroundAt.current = null;
            }
        };
        const sub = AppState.addEventListener('change', handleAppState);
        return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Child no longer requires PIN — removed FR-017 guard

    // Hardware back: pop within the child stack normally; at the root, go to
    // the home/welcome screen instead of exiting the app.
    useEffect(() => {
        const onBackPress = () => {
            if (router.canGoBack()) return false;
            router.replace('/?hub=1');
            return true;
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Category Guard
    useEffect(() => {
        if (pathname.includes('/stories') && !storiesEnabled) {
            router.replace('/(child)/blocked');
        } else if (pathname.includes('/games') && !gamesEnabled) {
            router.replace('/(child)/blocked');
        } else if (pathname.includes('/creative') && !creativeEnabled) {
            router.replace('/(child)/blocked');
        } else if (pathname.includes('/videos') && !videosEnabled) {
            router.replace('/(child)/blocked');
        } else if (pathname.includes('/story/') && !storiesEnabled) {
            router.replace('/(child)/blocked');
        } else if (pathname.includes('/game/') && !gamesEnabled) {
            router.replace('/(child)/blocked');
        } else if (pathname.includes('/video/') && !videosEnabled) {
            router.replace('/(child)/blocked');
        }
    }, [pathname, storiesEnabled, gamesEnabled, creativeEnabled, videosEnabled]);

    return (
        <RealtimeProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    contentStyle: {
                        backgroundColor: Colors.child.background,
                    },
                }}
            />
            <SessionOverlay />
            <PauseOverlay />
        </RealtimeProvider>
    );
}
