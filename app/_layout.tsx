/**
 * Root Layout — Loads fonts and provides the root navigation stack.
 * Includes global SessionOverlay to block usage when time expires.
 */
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    useFonts,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Colors from '../constants/Colors';
import useSettingsStore from '../store/useSettingsStore';
import useAuthStore from '../store/useAuthStore';
import useSessionStore from '../store/useSessionStore';
import SessionOverlay from '../components/ui/SessionOverlay';
import { connectivityManager } from '../services/resilience/connectivityManager';
import { eventLogger } from '../services/resilience/eventLogger';
import { sessionManager } from '../services/resilience/sessionManager';

export default function RootLayout() {
    const loadSettings = useSettingsStore((s) => s.loadSettings);
    const initializeAuth = useAuthStore((s) => s.initialize);
    const authIsLoading = useAuthStore((s) => s.isLoading);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    useEffect(() => {
        loadSettings();
        initializeAuth();
        connectivityManager.start();
        eventLogger.start();
        useSessionStore.getState().restoreFromSnapshot();

        const appStateSub = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'background') {
                const state = useSessionStore.getState();
                if (state.isSessionActive) {
                    sessionManager.save({
                        childId: 'active',
                        contentItemId: 'active',
                        activityType: 'story',
                        elapsedSeconds: state.elapsedSeconds,
                        sessionStartedAt: new Date(state.sessionStartTime ?? Date.now()).toISOString(),
                        lastSavedAt: new Date().toISOString(),
                        dailyLimitSeconds: state.remainingMinutes * 60,
                    });
                }
            }
        });

        return () => {
            connectivityManager.stop();
            eventLogger.stop();
            appStateSub.remove();
        };
    }, []);

    if (!fontsLoaded || authIsLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.parent.primary} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar style="dark" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: 'fade',
                    }}
                />
                {/* Global Overlay for Session/Time Control */}
                <SessionOverlay />
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.parent.background,
    },
});
