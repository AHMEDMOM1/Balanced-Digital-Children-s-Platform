/**
 * Creative Screen — Stitch "Create & Imagine" Activity Picker
 * Gradient background with glow blobs matching reception area aesthetic.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DegradableAnimation from '../../components/ui/DegradableAnimation';
import OfflineBadge from '../../components/ui/OfflineBadge';
import Header from '../../components/ui/Header';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useCreative } from '../../services/api/creative';
import EmptyState from '../../components/ui/EmptyState';
import { getBiDiStyle, isArabic } from '../../services/utils/bidi';

const activityIcons: Record<string, string> = {
    'Art': 'color-palette',
    'Building': 'hardware-chip',
    'Music': 'musical-notes',
    'Writing': 'document-text',
};

const activityRoutes: Record<string, string> = {
    'Magic Canvas': '/(child)/creative-canvas',
    'Build-a-Bot Workshop': '/(child)/creative-bot',
    'Sticker World': '/(child)/creative-stickers',
    'Story Creator': '/(child)/creative-story',
};

const activityColorStyles: Record<string, { bg: string; iconCircle: string; titleColor: string; border: string; glow: string }> = {
    'Art': { bg: 'rgba(255,223,147,0.85)', iconCircle: 'rgba(255, 255, 255, 0.5)', titleColor: '#241A00', border: '#E7C365', glow: 'rgba(255, 255, 255, 0.3)' },
    'Building': { bg: 'rgba(225,212,253,0.85)', iconCircle: 'rgba(255, 255, 255, 0.5)', titleColor: '#645A7D', border: '#CDC0E9', glow: 'rgba(255, 255, 255, 0.3)' },
    'Music': { bg: 'rgba(255,218,214,0.85)', iconCircle: 'rgba(255, 255, 255, 0.5)', titleColor: '#93000A', border: 'rgba(186, 26, 26, 0.2)', glow: 'rgba(255, 255, 255, 0.3)' },
    'Writing': { bg: 'rgba(216,232,212,0.85)', iconCircle: 'rgba(255, 255, 255, 0.5)', titleColor: '#1B5E20', border: 'rgba(27, 94, 32, 0.2)', glow: 'rgba(255, 255, 255, 0.3)' },
};

export default function CreativeScreen() {
    const router = useRouter();
    const { data: activities, isLoading, isOffline, error } = useCreative();

    return (
        <LinearGradient colors={['#FFF8E8', '#FDF7FF', '#F2EEFF']} style={styles.safe}>
            {/* ── Floating Glow Blobs ── */}
            <View style={styles.blobContainer} pointerEvents="none">
                <View style={[styles.blob, styles.blobGold]} />
                <View style={[styles.blob, styles.blobPurple]} />
                <View style={[styles.blob, styles.blobSecondary]} />
            </View>

            <Header onLockPress={() => {}} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                    <OfflineBadge lastSyncAt={null} />
                {/* ── Hero Section ── */}
                <DegradableAnimation
                    staticFallback={
                        <View style={styles.heroSection}>
                            <Text style={styles.heroTitle}>Create & Imagine</Text>
                            <Text style={styles.heroSubtitle}>
                                Pick a tool and start bringing your ideas to life!
                            </Text>
                        </View>
                    }
                >
                    <Animated.View entering={FadeInDown.duration(400)} style={styles.heroSection}>
                        <Text style={styles.heroTitle}>Create & Imagine</Text>
                        <Text style={styles.heroSubtitle}>
                            Pick a tool and start bringing your ideas to life!
                        </Text>
                    </Animated.View>
                </DegradableAnimation>

                {/* ── Loading State ── */}
                {isLoading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color="#765B00" />
                        <Text style={styles.stateText}>Loading activities...</Text>
                    </View>
                )}

                {/* ── Error State ── */}
                {error && (
                    <View style={styles.centerState}>
                        <Ionicons name="cloud-offline-outline" size={48} color={Colors.child.textSecondary} />
                        <Text style={styles.stateText}>Could not load activities</Text>
                    </View>
                )}

                {/* ── Empty State ── */}
                {!isLoading && !error && (!activities || activities.length === 0) && (
                    <EmptyState emoji="🎨" title="Time to play outside!" />
                )}

                {/* ── Offline Banner ── */}
                {isOffline && (
                    <View style={styles.offlineBanner}>
                        <Ionicons name="wifi-outline" size={16} color="#765B00" />
                        <Text style={styles.offlineText}>Showing cached content</Text>
                    </View>
                )}

                {/* ── Bento Grid ── */}
                {activities && activities.length > 0 && (
                    <View style={styles.bentoGrid}>
                        {activities.map((activity, index) => {
                            const category = activity.category || 'Art';
                            const cStyle = activityColorStyles[category] || activityColorStyles['Art'];
                            const icon = activityIcons[category] || 'color-palette';
                            const route = activityRoutes[activity.title] || '/(child)/creative-canvas';

                            return (
                                <Animated.View
                                    key={activity.id}
                                    entering={FadeInDown.delay(150 + index * 150).duration(500)}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        style={[styles.activityCard, { backgroundColor: cStyle.bg, borderBottomColor: cStyle.border }]}
                                        onPress={() => router.push(route as any)}
                                    >
                                        <View style={[styles.glowBlob, { backgroundColor: cStyle.glow }]} />

                                        <View style={[styles.iconCircle, { backgroundColor: cStyle.iconCircle }]}>
                                            <Ionicons name={icon as any} size={36} color={cStyle.titleColor} />
                                        </View>

                                        <View style={styles.cardTextArea}>
                                            <Text style={[styles.activityTitle, { color: cStyle.titleColor }, getBiDiStyle(activity.title)]}>
                                                {activity.title}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
    blobContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        overflow: 'hidden',
    },
    blob: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.45,
    },
    blobGold: {
        width: 380,
        height: 380,
        backgroundColor: '#FFDF93',
        top: -100,
        left: -80,
    },
    blobPurple: {
        width: 320,
        height: 320,
        backgroundColor: '#E9DDFF',
        bottom: -60,
        right: -60,
    },
    blobSecondary: {
        width: 200,
        height: 200,
        backgroundColor: '#E1D4FD',
        top: '30%',
        right: -40,
    },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: 24,
        paddingBottom: Layout.spacing.xxxl,
        position: 'relative',
        zIndex: 1,
    },

    // ── Hero ──
    heroSection: {
        marginBottom: 24,
    },
    heroTitle: {
        ...Typography.child.hero,
        color: '#765B00', // tertiary golden
    },
    heroSubtitle: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        marginTop: 8,
    },

    // ── Bento Grid ──
    bentoGrid: {
        gap: 20,
    },

    // ── Shared ──
    cardTextArea: {
        marginTop: 16,
    },

    // ── Magic Canvas Card (Gold) ──
    canvasCard: {
        backgroundColor: 'rgba(255,223,147,0.85)',
        borderRadius: 32,
        padding: 24,
        minHeight: 200,
        overflow: 'hidden',
        // 3D depth
        borderBottomWidth: 6,
        borderBottomColor: '#E7C365',
        // Shadow
        shadowColor: '#FFDF93',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 6,
    },
    glowBlobTopRight: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    iconCircleGold: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvasTitle: {
        ...Typography.child.title,
        color: '#241A00',
    },
    canvasDesc: {
        ...Typography.child.body,
        color: '#594400',
        opacity: 0.9,
        marginTop: 4,
    },

    // ── Build-a-Bot Card (Purple Secondary) ──
    botCard: {
        backgroundColor: 'rgba(225,212,253,0.85)',
        borderRadius: 32,
        padding: 24,
        minHeight: 200,
        overflow: 'hidden',
        // 3D depth
        borderBottomWidth: 6,
        borderBottomColor: '#CDC0E9',
        // Shadow
        shadowColor: '#E1D4FD',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 6,
    },
    glowBlobBottomRight: {
        position: 'absolute',
        bottom: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    iconCirclePurple: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    botTitle: {
        ...Typography.child.title,
        color: '#645A7D',
    },
    botDesc: {
        ...Typography.child.body,
        color: '#645A7D',
        opacity: 0.9,
        marginTop: 4,
    },

    // ── States ──
    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Layout.spacing.xxxl,
        gap: 16,
    },
    stateText: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
    },
    emptyEmoji: {
        fontSize: 64,
    },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFF1D6',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: Layout.radius.full,
    },
    offlineText: {
        ...Typography.child.body,
        fontSize: 13,
        color: '#765B00',
    },

    // ── Activity Cards ──
    activityCard: {
        borderRadius: 32,
        padding: 24,
        minHeight: 200,
        overflow: 'hidden',
        borderBottomWidth: 6,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 6,
    },
    glowBlob: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityTitle: {
        ...Typography.child.title,
    },
    activityDesc: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        opacity: 0.9,
        marginTop: 4,
    },

    // ── Sticker World Card (Deep Purple) ──
    stickerCard: {
        backgroundColor: 'rgba(103,80,164,0.95)',
        borderRadius: 32,
        padding: 24,
        minHeight: 200,
        overflow: 'hidden',
        // 3D depth
        borderBottomWidth: 6,
        borderBottomColor: '#4F378A',
        // Shadow
        shadowColor: '#6750A4',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 6,
    },
    glowCenter: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -128 }, { translateY: -128 }],
        width: 256,
        height: 256,
        borderRadius: 128,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    stickerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        zIndex: 1,
    },
    iconCircleDeepPurple: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stickerTextCol: {
        flex: 1,
    },
    stickerTitle: {
        ...Typography.child.title,
        color: '#FFFFFF',
    },
    stickerDesc: {
        ...Typography.child.body,
        color: '#E0D2FF',
        marginTop: 4,
    },
    stickerBtnRow: {
        alignItems: 'flex-end',
        marginTop: 24,
        zIndex: 1,
    },
    startPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: Layout.radius.full,
    },
    startPillText: {
        ...Typography.child.subtitle,
        color: '#FFFFFF',
    },
});


