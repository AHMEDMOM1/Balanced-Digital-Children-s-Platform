/**
 * Child Home Screen — SafePlay Timer Activity Picker
 * Large, friendly activity cards with remaining time indicator.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';
import PinLock from '../../components/ui/PinLock';
import useSettingsStore from '../../store/useSettingsStore';
import useSessionStore from '../../store/useSessionStore';

export default function ChildHomeScreen() {
    const router = useRouter();
    const [showPinLock, setShowPinLock] = useState(false);
    const { storiesEnabled, gamesEnabled, creativeEnabled, videosEnabled } = useSettingsStore();
    const { dailyTimeLimitMinutes, sessionsPerDay } = useSettingsStore();
    const { elapsedSeconds } = useSessionStore();

    // Calculate time remaining for current session
    const maxSessionSeconds = Math.floor((dailyTimeLimitMinutes * 60) / sessionsPerDay);
    const remainingSeconds = Math.max(0, maxSessionSeconds - elapsedSeconds);
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const activities = [
        {
            id: 'stories',
            icon: 'book-outline' as const,
            title: 'Stories',
            color: '#E8E0FF',
            iconColor: '#7C5CFC',
            enabled: storiesEnabled,
            route: '/(child)/stories' as const,
        },
        {
            id: 'games',
            icon: 'extension-puzzle-outline' as const,
            title: 'Games',
            color: '#FFE0E0',
            iconColor: '#FF6B6B',
            enabled: gamesEnabled,
            route: '/(child)/games' as const,
        },
        {
            id: 'creative',
            icon: 'color-palette-outline' as const,
            title: 'Create',
            color: '#FFF4D1',
            iconColor: '#FFB800',
            enabled: creativeEnabled,
            route: '/(child)/creative' as const,
        },
        {
            id: 'videos',
            icon: 'play-circle-outline' as const,
            title: 'Videos',
            color: '#F2ECF4',
            iconColor: '#494551',
            enabled: videosEnabled,
            route: '/(child)/videos' as const,
        },
    ];

    return (
        <LinearGradient colors={['#F2EEFF', '#FFF1D6']} style={styles.container}>
            <Header onLockPress={() => setShowPinLock(true)} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <View style={styles.welcomeContainer}>
                    <Text style={styles.welcomeTitle}>Hi Leo!</Text>
                    <Text style={styles.welcomeSubtitle}>Ready for an adventure today?</Text>
                </View>

                {/* ── Time Pill ── */}
                <View style={styles.timerPill}>
                    <Ionicons name="time-outline" size={20} color={Colors.child.textPrimary} />
                    <Text style={styles.timerText}>{formatTime(remainingSeconds)} remaining</Text>
                </View>

                {/* ── Grid ── */}
                <View style={styles.grid}>
                    {activities.map((activity) => {
                        if (!activity.enabled) return null;
                        return (
                            <TouchableOpacity
                                key={activity.id}
                                activeOpacity={0.8}
                                style={[styles.card, { backgroundColor: activity.color }]}
                                onPress={() => router.push(activity.route)}
                            >
                                <View style={styles.iconCircle}>
                                    <Ionicons name={activity.icon} size={36} color={activity.iconColor} />
                                </View>
                                <Text style={[styles.cardTitle, { color: activity.iconColor }]}>
                                    {activity.title}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <PinLock
                visible={showPinLock}
                onSuccess={() => {
                    setShowPinLock(false);
                    router.replace('/');
                }}
                onCancel={() => setShowPinLock(false)}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.xxl,
        paddingBottom: Layout.spacing.xxl,
        alignItems: 'center',
    },
    welcomeContainer: {
        alignItems: 'center',
        marginBottom: Layout.spacing.xl,
    },
    welcomeTitle: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        marginBottom: 4,
    },
    welcomeSubtitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textSecondary,
    },
    timerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.child.surfaceContainer,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: Layout.radius.full,
        marginBottom: Layout.spacing.xxxl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    timerText: {
        ...Typography.child.body,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.child.textPrimary,
    },
    grid: {
        width: '100%',
        gap: Layout.spacing.lg,
    },
    card: {
        width: '100%',
        borderRadius: Layout.radius.xxxl,
        padding: Layout.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 140,
        // Elevation/Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.shared.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Layout.spacing.sm,
    },
    cardTitle: {
        ...Typography.child.title,
        fontSize: 22,
    },
});
