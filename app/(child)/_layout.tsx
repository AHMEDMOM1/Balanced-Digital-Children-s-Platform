/**
 * Child Layout — Stack Navigation (No visible nav bar)
 * Child cannot exit without entering PIN.
 */
import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import SessionOverlay from '../../components/ui/SessionOverlay';
import useSessionStore from '../../store/useSessionStore';
import useSettingsStore from '../../store/useSettingsStore';
import { RealtimeProvider } from '../../components/RealtimeProvider';
import PauseOverlay from '../../components/ui/PauseOverlay';

export default function ChildLayout() {
    const { startSession, isSessionActive } = useSessionStore();
    const { storiesEnabled, gamesEnabled, creativeEnabled, videosEnabled } = useSettingsStore();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!isSessionActive) {
            startSession();
        }
    }, [isSessionActive, startSession]);

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
