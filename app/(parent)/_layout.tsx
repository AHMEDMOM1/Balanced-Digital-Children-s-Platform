/**
 * Parent Layout — Tab Navigation
 * Bottom tabs for Home, Settings, and Reports.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';

export default function ParentLayout() {
    return (
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
                    title: 'Ana Sayfa',
                    tabBarIcon: ({ color }) => (
                        <Text style={[styles.tabIcon, { color }]}>🏠</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Ayarlar',
                    tabBarIcon: ({ color }) => (
                        <Text style={[styles.tabIcon, { color }]}>⚙️</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Raporlar',
                    tabBarIcon: ({ color }) => (
                        <Text style={[styles.tabIcon, { color }]}>📊</Text>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.parent.surface,
        borderTopColor: Colors.parent.border,
        borderTopWidth: 1,
        height: 65,
        paddingBottom: 8,
        paddingTop: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    tabLabel: {
        fontFamily: Typography.fonts.semiBold,
        fontSize: 12,
    },
    tabIcon: {
        fontSize: 22,
    },
});
