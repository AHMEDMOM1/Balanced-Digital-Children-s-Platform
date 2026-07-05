/**
 * Story Screen — SafePlay Timer Story Viewer
 * Matches the Stitch child_mode_story_viewer design:
 * - Large illustration card with purple background
 * - 3D navigation buttons (back/forward)
 * - Page dots progress indicator
 * - Floating close and audio buttons
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../../constants/Colors';
import Typography from '../../../constants/Typography';
import Layout from '../../../constants/Layout';
import { useStory, logStoryActivity } from '../../../services/api/hooks';
import useAuthStore from '../../../store/useAuthStore';
import { getBiDiStyle, isArabic, formatBiDiText } from '../../../services/utils/bidi';
import { useSessionWriter } from '../../../services/api/sessions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StoryPage {
    text: string;
    image: string | null;
}

const emojis = ['📖', '🌟', '🦋', '🌈', '💫', '🎉', '✨', '🌸', '🦊', '🌙'];

function splitContentToPages(
    contentText: string | undefined,
    pageImages: string[] | undefined,
): StoryPage[] {
    const pages: StoryPage[] = [];

    if (!contentText || contentText.trim().length === 0) {
        pages.push({ text: 'This story is coming soon!', image: null });
        return pages;
    }

    const paragraphs = contentText.split('\n\n').filter(p => p.trim().length > 0);
    paragraphs.forEach((text, i) => {
        const image = pageImages && i < pageImages.length ? pageImages[i] : null;
        pages.push({ text: text.trim(), image });
    });

    return pages;
}

export default function StoryScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [pageIndex, setPageIndex] = useState(0);
    const { data: content, isLoading, error } = useStory(id as string);
    const childData = useAuthStore((s) => s.childData);
    const mountTimeRef = useRef(Date.now());
    const { openSession, closeSession } = useSessionWriter(
        childData?.id ?? '',
        childData?.familyId ?? '',
        'story',
        id as string
    );

    useEffect(() => {
        mountTimeRef.current = Date.now();
        if (childData?.id) openSession();
        return () => {
            const elapsed = Math.round((Date.now() - mountTimeRef.current) / 1000);
            if (childData?.id) closeSession(elapsed);
            if (childData?.id && id) {
                logStoryActivity({
                    childId: childData.id,
                    storyId: id as string,
                    durationSeconds: Math.floor(elapsed),
                }).catch(() => {});
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childData?.id, id]);

    const storyTitle = content?.title || 'Story Time';
    const pages = splitContentToPages(content?.content_text, content?.page_images);
    const currentPage = pages[pageIndex];
    const isLastPage = pageIndex === pages.length - 1;
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
            {/* ── Loading State ── */}
            {isLoading && (
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color={Colors.child.primary} />
                </View>
            )}

            {/* ── Error State ── */}
            {error && (
                <View style={styles.centerState}>
                    <Ionicons name="cloud-offline-outline" size={48} color={Colors.child.textSecondary} />
                    <Text style={styles.stateText}>Could not load story</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
                        <Text style={styles.retryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Story Content ── */}
            {!isLoading && !error && (
                <>
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
                            <Text style={[styles.titleText, getBiDiStyle(storyTitle)]} numberOfLines={2}>{formatBiDiText(storyTitle)}</Text>
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
                                {currentPage.image ? (
                                    <Image
                                        source={{ uri: currentPage.image }}
                                        style={styles.pageImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={styles.illustrationEmoji}>
                                        {emojis[pageIndex % emojis.length]}
                                    </Text>
                                )}

                                {/* Page Badge */}
                                <View style={styles.pageBadge}>
                                    <Text style={styles.pageBadgeText}>
                                        Page {pageIndex + 1} of {pages.length}
                                    </Text>
                                </View>
                            </View>

                            {/* Text Area */}
                            <View style={styles.textArea}>
                                <Text style={[styles.storyText, getBiDiStyle(currentPage.text), !isArabic(currentPage.text) && { textAlign: 'center' }]}>
                                    {formatBiDiText(currentPage.text)}
                                </Text>
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
                        {pages.map((_, i) => (
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
                </>
            )}

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

    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: Layout.spacing.xxl,
    },
    stateText: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
    },
    retryBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: Layout.radius.full,
        backgroundColor: Colors.child.primary,
    },
    retryBtnText: {
        ...Typography.child.subtitle,
        color: Colors.child.onPrimary,
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
        maxWidth: SCREEN_WIDTH * 0.6,
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
    pageImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
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
