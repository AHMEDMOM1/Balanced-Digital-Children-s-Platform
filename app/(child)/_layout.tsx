/**
 * Child Layout — Stack Navigation (No visible nav bar)
 * Child cannot exit without entering PIN.
 */
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import Colors from '../../constants/Colors';
import SessionOverlay from '../../components/ui/SessionOverlay';
import useSessionStore from '../../store/useSessionStore';

export default function ChildLayout() {
    const { startSession, isSessionActive } = useSessionStore();

    useEffect(() => {
        if (!isSessionActive) {
            startSession();
        }
    }, [isSessionActive, startSession]);

    return (
        <>
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
        </>
    );
}
