/**
 * Parent Layout — Tab Navigation
 * Bottom tabs for Home, Reports, Control, and Settings.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { RealtimeProvider } from '../../components/RealtimeProvider';

export default function ParentLayout() {
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
