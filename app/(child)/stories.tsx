/**
 * Stories Screen — Stitch Story Library Design
 * Matches child_mode_story_library with gradient background
 * and floating glow blobs like the reception area.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Header from '../../components/ui/Header';
import EmptyState from '../../components/ui/EmptyState';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useStories } from '../../services/api/stories';

const fallbackColors = [
    { coverBg: '#E1D4FD', btnBg: Colors.child.primaryFixed, btnBorder: Colors.child.primaryFixedDim, btnTextColor: Colors.child.primary },
    { coverBg: '#4f378a', btnBg: Colors.child.primary, btnBorder: '#22005d', btnTextColor: Colors.child.onPrimary },
    { coverBg: '#FFDF93', btnBg: '#E9DDFF', btnBorder: '#CDC0E9', btnTextColor: Colors.child.primary },
];

export default function StoriesScreen() {
    const router = useRouter();
    const { data: stories, isLoading, isOffline, error } = useStories();

    return (
        <LinearGradient colors={['#F2EEFF', '#FDF7FF', '#FFF6E8']} style={styles.safe}>
            {/* ── Floating Glow Blobs ── */}
            <View style={styles.blobContainer} pointerEvents="none">
                <View style={[styles.blob, styles.blobPurple]} />
                <View style={[styles.blob, styles.blobGold]} />
            </View>

            <Header onLockPress={() => {}} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                {/* ── Hero Section ── */}
                <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Story Time!</Text>
                    <Text style={styles.heroSubtitle}>
                        Pick a magical adventure to read today.
                    </Text>
                </View>

                {/* ── Loading State ── */}
                {isLoading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={Colors.child.primary} />
                        <Text style={styles.stateText}>Loading stories...</Text>
                    </View>
                )}

                {/* ── Error State ── */}
                {error && (
                    <View style={styles.centerState}>
                        <Ionicons name="cloud-offline-outline" size={48} color={Colors.child.textSecondary} />
                        <Text style={styles.stateText}>Could not load stories</Text>
                    </View>
                )}

                {/* ── Empty State ── */}
                {!isLoading && !error && (!stories || stories.length === 0) && (
                    <EmptyState emoji="🌳" title="Time to play outside!" />
                )}

                {/* ── Offline Banner ── */}
                {isOffline && (
                    <View style={styles.offlineBanner}>
                        <Ionicons name="wifi-outline" size={16} color="#765B00" />
                        <Text style={styles.offlineText}>Showing cached content</Text>
                    </View>
                )}

                {/* ── Story Cards ── */}
                {stories?.map((story, index) => {
                    const colors = fallbackColors[index % fallbackColors.length];
                    return (
                        <Animated.View
                            key={story.id}
                            entering={FadeInDown.delay(index * 150).duration(500)}
                        >
                            <View style={styles.storyCard}>
                                {/* Cover Illustration */}
                                <View style={[styles.coverArea, { backgroundColor: colors.coverBg }]}>
                                    <Text style={styles.coverEmoji}>{story.thumbnail_url || '📖'}</Text>
                                </View>

                                {/* Info Area */}
                                <View style={styles.infoArea}>
                                    <Text style={styles.storyTitle}>{story.title}</Text>
                                    <Text style={styles.storyCategory}>{story.category}</Text>

                                    {/* Read Now Button (3D) */}
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[
                                            styles.readBtn,
                                            {
                                                backgroundColor: colors.btnBg,
                                                borderBottomColor: colors.btnBorder,
                                            },
                                        ]}
                                        onPress={() => router.push(`/(child)/story/${story.id}`)}
                                    >
                                        <Ionicons
                                            name="book"
                                            size={22}
                                            color={colors.btnTextColor}
                                        />
                                        <Text style={[styles.readBtnText, { color: colors.btnTextColor }]}>
                                            Read Now
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    );
                })}
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
    blobPurple: {
        width: 340,
        height: 340,
        backgroundColor: '#E9DDFF',
        top: -80,
        left: -60,
    },
    blobGold: {
        width: 400,
        height: 400,
        backgroundColor: '#FFDF93',
        bottom: -120,
        right: -80,
    },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxxl,
        gap: 20,
        position: 'relative',
        zIndex: 1,
    },

    // ── Hero ──
    heroSection: {
        alignItems: 'center',
        paddingVertical: Layout.spacing.xl,
    },
    heroTitle: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        textAlign: 'center',
    },
    heroSubtitle: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 300,
    },

    // ── Story Card ──
    storyCard: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.6)',
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
    },
    coverArea: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverEmoji: {
        fontSize: 90,
    },
    infoArea: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: 'rgba(253,247,255,0.9)',
    },
    storyTitle: {
        ...Typography.child.title,
        color: Colors.child.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    storyDesc: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 28,
    },

    storyCategory: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
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

    // ── Read Now Button (3D) ──
    readBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: Layout.radius.full,
        borderBottomWidth: 6,
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 0,
        elevation: 6,
    },
    readBtnText: {
        ...Typography.child.subtitle,
    },
});
