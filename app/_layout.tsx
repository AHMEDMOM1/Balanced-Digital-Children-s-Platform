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
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import useSettingsStore from '../store/useSettingsStore';
import SessionOverlay from '../components/ui/SessionOverlay';

export default function RootLayout() {
    const loadSettings = useSettingsStore((s) => s.loadSettings);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    if (!fontsLoaded) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.parent.primary} />
            </View>
        );
    }

    return (
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
