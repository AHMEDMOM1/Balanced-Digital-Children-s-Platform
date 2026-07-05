/**
 * Videos Screen — Stitch Video Gallery Design
 * Gradient background with glow blobs matching reception area aesthetic.
 */
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import OfflineBadge from '../../components/ui/OfflineBadge';
import Header from '../../components/ui/Header';
import EmptyState from '../../components/ui/EmptyState';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useVideos } from '../../services/api/videos';
import { getBiDiStyle, formatBiDiText } from '../../services/utils/bidi';

const fallbackVideoStyles = [
    { thumbBg: '#D4E7D1', titleColor: '#6750A4', borderColor: 'rgba(79, 55, 138, 0.2)', shadowColor: Colors.child.primary },
    { thumbBg: '#FFF1D6', titleColor: '#C9A74D', borderColor: 'rgba(118, 91, 0, 0.2)', shadowColor: '#765B00' },
    { thumbBg: '#E1D4FD', titleColor: '#63597C', borderColor: 'rgba(99, 89, 124, 0.2)', shadowColor: '#63597C' },
    { thumbBg: '#D8E8D4', titleColor: '#6750A4', borderColor: 'rgba(79, 55, 138, 0.2)', shadowColor: Colors.child.primary },
];

export default function VideosScreen() {
    const router = useRouter();
    const { data: videos, isLoading, isOffline, error } = useVideos();

    return (
        <LinearGradient colors={['#F2EEFF', '#FDF7FF', '#FFF6E8']} style={styles.safe}>
            {/* ── Floating Glow Blobs ── */}
            <View style={styles.blobContainer} pointerEvents="none">
                <View style={[styles.blob, styles.blobPurple]} />
                <View style={[styles.blob, styles.blobGold]} />
                <View style={[styles.blob, styles.blobSecondary]} />
            </View>

            <Header onLockPress={() => {}} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                    <OfflineBadge lastSyncAt={null} />
                {/* ── Category Header ── */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Videos</Text>
                    <Ionicons name="play-circle" size={36} color={Colors.child.primary} />
                </View>

                {/* ── Loading State ── */}
                {isLoading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={Colors.child.primary} />
                        <Text style={styles.stateText}>Loading videos...</Text>
                    </View>
                )}

                {/* ── Error State ── */}
                {error && (
                    <View style={styles.centerState}>
                        <Ionicons name="cloud-offline-outline" size={48} color={Colors.child.textSecondary} />
                        <Text style={styles.stateText}>Could not load videos</Text>
                    </View>
                )}

                {/* ── Empty State ── */}
                {!isLoading && !error && (!videos || videos.length === 0) && (
                    <EmptyState emoji="🎬" title="No videos available right now!" />
                )}

                {/* ── Offline Banner ── */}
                {isOffline && (
                    <View style={styles.offlineBanner}>
                        <Ionicons name="wifi-outline" size={16} color="#765B00" />
                        <Text style={styles.offlineText}>Showing cached content</Text>
                    </View>
                )}

                {/* ── Video Cards ── */}
                {videos?.map((video, index) => {
                    const vstyle = fallbackVideoStyles[index % fallbackVideoStyles.length];
                    return (
                        <Animated.View
                            key={video.id}
                            entering={FadeInDown.delay(index * 120).duration(500)}
                        >
                            <TouchableOpacity
                                activeOpacity={0.9}
                                style={[
                                    styles.videoCard,
                                    {
                                        borderBottomColor: vstyle.borderColor,
                                        shadowColor: vstyle.shadowColor,
                                    },
                                ]}
                                onPress={() => router.push(`/(child)/video/${video.id}`)}
                            >
                                {/* Thumbnail Area */}
                                <View style={[styles.thumbnailArea, { backgroundColor: vstyle.thumbBg }]}>
                                    {video.thumbnail_url ? (
                                        <Image source={{ uri: video.thumbnail_url }} style={styles.thumbnailImage} />
                                    ) : (
                                        <Text style={styles.thumbnailEmoji}>🎬</Text>
                                    )}
                                    {/* Play Overlay */}
                                    <View style={styles.playOverlay}>
                                        <View style={styles.playCircle}>
                                            <Ionicons name="play" size={32} color="#FFFFFF" />
                                        </View>
                                    </View>
                                </View>

                                {/* Info Area */}
                                <View style={styles.infoArea}>
                                    <Text style={[styles.videoTitle, { color: vstyle.titleColor }, getBiDiStyle(video.title)]}>
                                        {formatBiDiText(video.title)}
                                    </Text>
                                    <Text style={styles.videoDesc}>{video.category}</Text>
                                </View>
                            </TouchableOpacity>
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
        opacity: 0.4,
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
    blobSecondary: {
        width: 220,
        height: 220,
        backgroundColor: '#E1D4FD',
        top: '40%',
        right: -50,
    },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: 16,
        paddingBottom: Layout.spacing.xxxl,
        gap: 16,
        position: 'relative',
        zIndex: 1,
    },

    // ── Header ──
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    headerTitle: {
        ...Typography.child.hero,
        color: Colors.child.primary,
    },

    // ── Video Card ──
    videoCard: {
        backgroundColor: 'rgba(248,242,250,0.85)',
        borderRadius: 24,
        overflow: 'hidden',
        borderBottomWidth: 4,
        // Shadow
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    thumbnailArea: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    thumbnailEmoji: {
        fontSize: 64,
        opacity: 0.8,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoArea: {
        padding: 24,
    },
    videoTitle: {
        ...Typography.child.title,
        marginBottom: 8,
    },
    videoDesc: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
    },

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
});


