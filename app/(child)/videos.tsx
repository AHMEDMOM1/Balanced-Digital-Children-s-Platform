/**
 * Videos Screen — Stitch Video Gallery Design
 * Gradient background with glow blobs matching reception area aesthetic.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Header from '../../components/ui/Header';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

const videos = [
    {
        id: 1,
        emoji: '🦁🐘🦒',
        title: 'Animal Kingdom',
        description: 'Learn about lions, tigers, and bears!',
        thumbBg: '#D4E7D1',
        titleColor: '#6750A4',
        borderColor: 'rgba(79, 55, 138, 0.2)',
        shadowColor: Colors.child.primary,
    },
    {
        id: 2,
        emoji: '🎵🔢🎶',
        title: 'Number Songs',
        description: 'Sing along and count to 100.',
        thumbBg: '#FFF1D6',
        titleColor: '#C9A74D',
        borderColor: 'rgba(118, 91, 0, 0.2)',
        shadowColor: '#765B00',
    },
    {
        id: 3,
        emoji: '🧪🪐⚗️',
        title: 'Science Fun',
        description: 'Exciting experiments you can watch.',
        thumbBg: '#E1D4FD',
        titleColor: '#63597C',
        borderColor: 'rgba(99, 89, 124, 0.2)',
        shadowColor: '#63597C',
    },
    {
        id: 4,
        emoji: '📖🌳👦',
        title: 'Story Time',
        description: 'Relax with our favorite bedtime tales.',
        thumbBg: '#D8E8D4',
        titleColor: '#6750A4',
        borderColor: 'rgba(79, 55, 138, 0.2)',
        shadowColor: Colors.child.primary,
    },
];

export default function VideosScreen() {
    const router = useRouter();

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
                {/* ── Category Header ── */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Videos</Text>
                    <Ionicons name="play-circle" size={36} color={Colors.child.primary} />
                </View>

                {/* ── Video Cards ── */}
                {videos.map((video, index) => (
                    <Animated.View
                        key={video.id}
                        entering={FadeInDown.delay(index * 120).duration(500)}
                    >
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={[
                                styles.videoCard,
                                {
                                    borderBottomColor: video.borderColor,
                                    shadowColor: video.shadowColor,
                                },
                            ]}
                            onPress={() => router.push(`/(child)/video/${video.id}`)}
                        >
                            {/* Thumbnail Area */}
                            <View style={[styles.thumbnailArea, { backgroundColor: video.thumbBg }]}>
                                <Text style={styles.thumbnailEmoji}>{video.emoji}</Text>
                                {/* Play Overlay */}
                                <View style={styles.playOverlay}>
                                    <View style={styles.playCircle}>
                                        <Ionicons name="play" size={32} color="#FFFFFF" />
                                    </View>
                                </View>
                            </View>

                            {/* Info Area */}
                            <View style={styles.infoArea}>
                                <Text style={[styles.videoTitle, { color: video.titleColor }]}>
                                    {video.title}
                                </Text>
                                <Text style={styles.videoDesc}>{video.description}</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
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
});
