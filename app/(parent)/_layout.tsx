/**
 * Parent Layout — Tab Navigation
 * Bottom tabs for Home, Reports, Control, and Settings.
 */
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, BackHandler, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { RealtimeProvider } from '../../components/RealtimeProvider';
import useParentLockStore from '../../store/useParentLockStore';

export default function ParentLayout() {
    const router = useRouter();
    const backgroundAt = useRef<number | null>(null);

    // Gate: redirect to PIN entry if a PIN hash has been set AND we haven't
    // already unlocked this app session. Without the isUnlocked guard, this
    // effect re-fires on every mount of this layout (including the mount
    // caused by parent-pin-entry's own successful redirect here), producing
    // an infinite PIN-entry ↔ dashboard redirect loop.
    useEffect(() => {
        if (useParentLockStore.getState().isUnlocked) return;
        AsyncStorage.getItem('@parent_pin_hash').then(hash => {
            if (hash) {
                console.debug('[parentLayout] PIN hash found, requiring re-authentication');
                router.replace('/auth/parent-pin-entry');
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // AppState: re-lock after 5 minutes in background
    useEffect(() => {
        const handleAppState = (next: AppStateStatus) => {
            if (next === 'background' || next === 'inactive') {
                backgroundAt.current = Date.now();
            } else if (next === 'active' && backgroundAt.current !== null) {
                const elapsed = Date.now() - backgroundAt.current;
                if (elapsed >= 300_000) {
                    useParentLockStore.getState().lock();
                    router.replace('/auth/parent-pin-entry');
                }
                backgroundAt.current = null;
            }
        };
        const sub = AppState.addEventListener('change', handleAppState);
        return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Hardware back: if there's a screen to pop back to within this section
    // (e.g. a pushed settings sub-screen), let that happen normally. If we're
    // at the root of the parent section, go to the home/welcome screen
    // instead of letting Android fall through to exiting the app.
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

    return (
        <RealtimeProvider>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: Colors.parent.primary,
                    tabBarInactiveTintColor: Colors.parent.textSecondary,
                    tabBarStyle: styles.tabBar,
                    tabBarLabelStyle: styles.tabLabel,
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="reports"
                    options={{
                        title: 'Reports',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={24} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="control"
                    options={{
                        title: 'Control',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? "options" : "options-outline"} size={24} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: 'Settings',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
                        ),
                    }}
                />
                {/* ── Hidden Sub-screens (not shown in tab bar) ── */}
                <Tabs.Screen name="settings-pin" options={{ href: null }} />
                <Tabs.Screen name="settings-notifications" options={{ href: null }} />
                <Tabs.Screen name="settings-language" options={{ href: null }} />
                <Tabs.Screen name="settings-profile" options={{ href: null }} />
                <Tabs.Screen name="settings-help" options={{ href: null }} />
                <Tabs.Screen name="settings-privacy" options={{ href: null }} />
                <Tabs.Screen name="settings-child-profile" options={{ href: null }} />
                <Tabs.Screen name="my-children" options={{ href: null }} />
            </Tabs>
        </RealtimeProvider>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.parent.surface,
        borderTopColor: Colors.parent.border,
        borderTopWidth: 1,
        height: 70,
        paddingBottom: 10,
        paddingTop: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    tabLabel: {
        fontFamily: Typography.fonts.semiBold,
        fontSize: 12,
        marginTop: 4,
    },
});
