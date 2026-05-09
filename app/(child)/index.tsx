/**
 * Child Home Screen — Activity Picker
 * Large, friendly cards for Stories, Games, and Creative activities.
 * Includes PIN lock exit button for parents.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import PinLock from '../../components/ui/PinLock';
import useSettingsStore from '../../store/useSettingsStore';

export default function ChildHomeScreen() {
    const router = useRouter();
    const [showPinLock, setShowPinLock] = useState(false);
    const { storiesEnabled, gamesEnabled, creativeEnabled, videosEnabled } = useSettingsStore();

    const activities = [
        {
            id: 'stories',
            emoji: '📖',
            title: 'Hikayeler',
            titleEn: 'Stories',
            color: Colors.child.cardStory,
            enabled: storiesEnabled,
            route: '/(child)/stories' as const,
        },
        {
            id: 'games',
            emoji: '🧩',
            title: 'Zeka Oyunları',
            titleEn: 'Brain Games',
            color: Colors.child.cardGame,
            enabled: gamesEnabled,
            route: '/(child)/games' as const,
        },
        {
            id: 'creative',
            emoji: '🎨',
            title: 'Yaratıcı Etkinlikler',
            titleEn: 'Creative',
            color: Colors.child.cardCreative,
            enabled: creativeEnabled,
            route: '/(child)/creative' as const,
        },
        {
            id: 'videos',
            emoji: '🎬',
            title: 'Eğitici Videolar',
            titleEn: 'Videos',
            color: Colors.child.cardVideo,
            enabled: videosEnabled,
            route: '/(child)/videos' as const,
        },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                {/* ── Welcome ── */}
                <View style={styles.welcome}>
                    <Text style={styles.welcomeEmoji}>🌈</Text>
                    <Text style={styles.welcomeTitle}>Merhaba Şampiyon!</Text>
                    <Text style={styles.welcomeSub}>Eğlenceli bir aktivite seç</Text>
                </View>

                {/* ── Activity Cards ── */}
                <View style={styles.cards}>
                    {activities.map((activity) => {
                        if (!activity.enabled) return null;
                        return (
                            <TouchableOpacity
                                key={activity.id}
                                activeOpacity={0.8}
                                style={[styles.activityCard, { backgroundColor: activity.color }]}
                                onPress={() => {
                                    if (activity.route) {
                                        router.push(activity.route);
                                    }
                                }}
                            >
                                <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                                <Text style={styles.activityTitle}>{activity.title}</Text>
                                <Text style={styles.activityTitleEn}>{activity.titleEn}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Exit Button (requires PIN) ── */}
                <TouchableOpacity
                    style={styles.exitButton}
                    onPress={() => setShowPinLock(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.exitText}>🔒 Çıkış Yap (Sadece Ebeveynler)</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ── PIN Lock Modal ── */}
            <PinLock
                visible={showPinLock}
                onSuccess={() => {
                    setShowPinLock(false);
                    router.replace('/');
                }}
                onCancel={() => setShowPinLock(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.child.background },
    container: { flex: 1 },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxl,
    },

    // ── Welcome ──
    welcome: {
        alignItems: 'center',
        marginBottom: Layout.spacing.xl,
    },
    welcomeEmoji: {
        fontSize: 56,
        marginBottom: Layout.spacing.sm,
    },
    welcomeTitle: {
        ...Typography.child.hero,
        color: Colors.child.textPrimary,
        textAlign: 'center',
    },
    welcomeSub: {
        ...Typography.child.subtitle,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },

    // ── Cards ──
    cards: {
        gap: Layout.spacing.lg,
        marginBottom: Layout.spacing.xl,
    },
    activityCard: {
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.xl,
        alignItems: 'center',
        minHeight: 160,
        justifyContent: 'center',
        elevation: 4,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    activityEmoji: {
        fontSize: 56,
        marginBottom: Layout.spacing.sm,
    },
    activityTitle: {
        ...Typography.child.title,
        color: Colors.child.textPrimary,
    },
    activityTitleEn: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        marginTop: 2,
    },

    // ── Exit ──
    exitButton: {
        alignSelf: 'center',
        paddingVertical: Layout.spacing.md,
        paddingHorizontal: Layout.spacing.lg,
        borderRadius: Layout.radius.round,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    exitText: {
        ...Typography.parent.caption,
        color: Colors.child.textSecondary,
    },
});
