/**
 * Notification Settings Screen — Stitch parent_settings_notifications Design
 * - Toggle switches for Session Alerts, Daily Reports, Time Limit Warnings, Security Alerts
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    primary: '#4F378A',
    onPrimary: '#FFFFFF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    error: '#BA1A1A',
    surfaceVariant: '#E6E0E9',
    outline: '#7A7582',
};

const notificationItems = [
    {
        id: 'session',
        title: 'Session Start/End Alerts',
        desc: 'Receive immediate notifications when a supervised device connects or disconnects.',
        defaultOn: true,
        isError: false,
    },
    {
        id: 'daily',
        title: 'Daily Usage Reports',
        desc: 'Get a comprehensive evening summary of screen time, app usage, and activity trends.',
        defaultOn: true,
        isError: false,
    },
    {
        id: 'timeLimit',
        title: 'Time Limit Warnings',
        desc: 'Be alerted when a device is within 15 minutes of reaching its daily screen time limit.',
        defaultOn: false,
        isError: false,
    },
    {
        id: 'security',
        title: 'Security Alerts',
        desc: 'Critical notifications for attempted PIN changes, new device logins, or bypassed restrictions.',
        defaultOn: true,
        isError: true,
    },
];

export default function SettingsNotificationsScreen() {
    const router = useRouter();
    const [toggles, setToggles] = useState<Record<string, boolean>>(
        Object.fromEntries(notificationItems.map(i => [i.id, i.defaultOn]))
    );

    const toggle = (id: string) => {
        setToggles(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={S.primary} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Parental Control</Text>
                <TouchableOpacity style={styles.topBarBtn}>
                    <Ionicons name="settings-outline" size={22} color={S.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Page Header */}
                <Text style={styles.pageTitle}>Notification Settings</Text>
                <Text style={styles.pageDesc}>
                    Manage your alerts and daily summaries to stay informed without feeling overwhelmed.
                </Text>

                {/* Section Title */}
                <Text style={styles.sectionTitle}>Push Notifications</Text>

                {/* Toggle Items Card */}
                <View style={styles.card}>
                    {notificationItems.map((item, index) => (
                        <View key={item.id}>
                            {index > 0 && <View style={styles.divider} />}
                            <View style={styles.toggleRow}>
                                <View style={styles.toggleText}>
                                    <Text style={[styles.toggleTitle, item.isError && { color: S.error }]}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.toggleDesc}>{item.desc}</Text>
                                </View>
                                <Switch
                                    value={toggles[item.id]}
                                    onValueChange={() => toggle(item.id)}
                                    trackColor={{ false: S.surfaceVariant, true: S.primary }}
                                    thumbColor={toggles[item.id] ? S.onPrimary : S.outline}
                                />
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surfaceLow },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: S.outlineVariant, backgroundColor: S.surface,
    },
    topBarBtn: { padding: 8, borderRadius: 99 },
    topBarTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    content: { padding: 20, paddingBottom: 40 },
    pageTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface, marginBottom: 4 },
    pageDesc: { fontSize: 15, color: S.onSurfaceVariant, lineHeight: 22, marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: S.primary, marginBottom: 12 },
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 8,
        borderWidth: 1, borderColor: S.outlineVariant, overflow: 'hidden',
    },
    divider: { height: 1, backgroundColor: S.outlineVariant },
    toggleRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, gap: 16,
    },
    toggleText: { flex: 1 },
    toggleTitle: { fontSize: 15, fontWeight: '600', color: S.onSurface, marginBottom: 4 },
    toggleDesc: { fontSize: 13, color: S.onSurfaceVariant, lineHeight: 18 },
});
