/**
 * Story Screen — SafePlay Timer Story Viewer
 * Matches the Stitch child_mode_story_viewer design:
 * - Large illustration card with purple background
 * - 3D navigation buttons (back/forward)
 * - Page dots progress indicator
 * - Floating close and audio buttons
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../../constants/Colors';
import Typography from '../../../constants/Typography';
import Layout from '../../../constants/Layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const storiesData: Record<string, { title: string; pages: { text: string; emoji: string }[] }> = {
    '1': {
        title: 'The Little Explorer',
        pages: [
            { text: 'Once upon a time, in a cozy forest filled with twinkling fireflies, there lived a curious little bear named Pip.', emoji: '🐻' },
            { text: 'Pip loved adventures more than anything. Every morning, he would put on his tiny backpack and set out to explore.', emoji: '🎒' },
            { text: 'Pip found a glowing rock under the big oak tree. "I wonder if it\'s magic?" he whispered to his friend, Luna the owl.', emoji: '🦉' },
            { text: 'Luna hooted softly. "Magic is everywhere, Pip, if you know where to look." They decided to follow the glow.', emoji: '✨' },
            { text: 'The glow led them to a hidden door in the hillside. It was covered in colorful flowers that sang in the wind.', emoji: '🌸' },
        ]
    },
    '2': {
        title: 'Luna\'s Night Sky',
        pages: [
            { text: 'When the sun goes down, Luna the owl wakes up. She stretches her soft wings and looks at the beautiful stars.', emoji: '🌙' },
            { text: '"Tonight I will count every star!" said Luna. She flew up high, higher than the tallest tree.', emoji: '⭐' },
            { text: 'She found a shooting star and made a wish. "I wish for a friend to share the night sky with."', emoji: '🌠' },
        ]
    },
    '3': {
        title: 'The Garden Friends',
        pages: [
            { text: 'In a sunny garden, there lived a sunflower named Sunny. She was the tallest flower of all.', emoji: '🌻' },
            { text: 'One day, a tiny seed fell beside her. "Hello! I\'m Daisy!" said the seed. Sunny smiled warmly.', emoji: '🌱' },
            { text: 'Day by day, Sunny shared her sunshine, and Daisy grew taller. They became the best of friends.', emoji: '🌼' },
        ]
    },
};

export default function StoryScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [pageIndex, setPageIndex] = useState(0);

    const story = storiesData[id as string] || storiesData['1'];
    const currentPage = story.pages[pageIndex];
    const isLastPage = pageIndex === story.pages.length - 1;
    const isFirstPage = pageIndex === 0;

    const nextPage = () => {
        if (!isLastPage) setPageIndex(p => p + 1);
        else router.back();
    };

    const prevPage = () => {
        if (pageIndex > 0) setPageIndex(p => p - 1);
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Story Header (Floating) ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close" size={28} color={Colors.child.primary} />
                </TouchableOpacity>

                <View style={styles.titlePill}>
                    <Ionicons name="book" size={20} color={Colors.child.secondary} />
                    <Text style={styles.titleText} numberOfLines={1}>{story.title}</Text>
                </View>

                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                    <Ionicons name="volume-high" size={28} color={Colors.child.primary} />
                </TouchableOpacity>
            </View>

            {/* ── Main Story Canvas ── */}
            <View style={styles.content}>
                <Animated.View
                    key={pageIndex}
                    entering={FadeInRight.duration(400)}
                    exiting={FadeOutLeft.duration(300)}
                    style={styles.bookCard}
                >
                    {/* Illustration Area */}
                    <View style={styles.illustrationArea}>
                        <Text style={styles.illustrationEmoji}>{currentPage.emoji}</Text>

                        {/* Page Badge */}
                        <View style={styles.pageBadge}>
                            <Text style={styles.pageBadgeText}>
                                Page {pageIndex + 1} of {story.pages.length}
                            </Text>
                        </View>
                    </View>

                    {/* Text Area */}
                    <View style={styles.textArea}>
                        <Text style={styles.storyText}>{currentPage.text}</Text>
                    </View>
                </Animated.View>

                {/* ── Navigation Controls ── */}
                <View style={styles.navControls}>
                    {/* Previous Button */}
                    <TouchableOpacity
                        onPress={prevPage}
                        disabled={isFirstPage}
                        activeOpacity={0.7}
                        style={[
                            styles.prevButton,
                            isFirstPage && styles.disabledButton,
                        ]}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={36}
                            color={isFirstPage ? Colors.child.outlineVariant : Colors.child.outline}
                        />
                    </TouchableOpacity>

                    {/* Progress Dots */}
                    <View style={styles.dotsRow}>
                        {story.pages.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === pageIndex && styles.activeDot,
                                ]}
                            />
                        ))}
                    </View>

                    {/* Next Button (Primary — Large & Purple) */}
                    <TouchableOpacity
                        onPress={nextPage}
                        activeOpacity={0.8}
                        style={styles.nextButton}
                    >
                        <Ionicons
                            name={isLastPage ? "checkmark" : "chevron-forward"}
                            size={40}
                            color={Colors.child.onPrimary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Decorative Background Blurs ── */}
            <View style={styles.decorContainer} pointerEvents="none">
                <View style={[styles.decorBlob, styles.decorBlob1]} />
                <View style={[styles.decorBlob, styles.decorBlob2]} />
                <View style={[styles.decorBlob, styles.decorBlob3]} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: Colors.child.background,
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.md,
        paddingBottom: Layout.spacing.sm,
        zIndex: 10,
    },
    headerButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.child.surface,
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow matching Stitch child-card shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 5,
    },
    titlePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: Colors.child.surface,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: Layout.radius.full,
        maxWidth: SCREEN_WIDTH * 0.5,
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 5,
    },
    titleText: {
        ...Typography.child.subtitle,
        fontSize: 16,
        color: Colors.child.secondary,
    },

    // ── Content ──
    content: {
        flex: 1,
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.xl,
        justifyContent: 'space-between',
        zIndex: 10,
    },

    // ── Book Card ──
    bookCard: {
        flex: 1,
        backgroundColor: '#E8E0FF',
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.5)',
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
        elevation: 8,
    },
    illustrationArea: {
        flex: 1,
        backgroundColor: '#F8F2FA',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minHeight: 220,
    },
    illustrationEmoji: {
        fontSize: 100,
    },
    pageBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: Layout.radius.full,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    pageBadgeText: {
        ...Typography.child.subtitle,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.child.primary,
    },
    textArea: {
        paddingVertical: 24,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8E0FF',
    },
    storyText: {
        ...Typography.child.title,
        fontSize: 22,
        color: Colors.child.textPrimary,
        textAlign: 'center',
        lineHeight: 34,
    },

    // ── Navigation ──
    navControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Layout.spacing.xl,
        paddingHorizontal: Layout.spacing.sm,
    },
    prevButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.child.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: Colors.child.outlineVariant,
        // 3D effect
        shadowColor: Colors.child.outlineVariant,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 6,
    },
    disabledButton: {
        opacity: 0.4,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(203, 196, 210, 0.5)',
    },
    activeDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.child.primary,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    nextButton: {
        width: 80,
        height: 80,
        borderRadius: 28,
        backgroundColor: Colors.child.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: Colors.child.primaryContainer,
        // 3D effect
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 8,
    },

    // ── Decorative Blobs ──
    decorContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
    },
    decorBlob: {
        position: 'absolute',
        borderRadius: 9999,
        opacity: 0.15,
    },
    decorBlob1: {
        top: '10%',
        left: '5%',
        width: 120,
        height: 120,
        backgroundColor: Colors.child.secondaryContainer,
    },
    decorBlob2: {
        bottom: '20%',
        right: '10%',
        width: 180,
        height: 180,
        backgroundColor: Colors.child.primaryContainer,
        opacity: 0.1,
    },
    decorBlob3: {
        top: '40%',
        right: '5%',
        width: 90,
        height: 90,
        backgroundColor: Colors.child.tertiaryContainer,
        opacity: 0.2,
    },
});
