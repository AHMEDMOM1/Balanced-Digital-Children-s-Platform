/**
 * Brain Games Screen — Stitch Games Gallery Design
 * Gradient background with glow blobs matching Stitch reception area aesthetic.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DegradableAnimation from '../../components/ui/DegradableAnimation';
import OfflineBadge from '../../components/ui/OfflineBadge';
import Header from '../../components/ui/Header';
import EmptyState from '../../components/ui/EmptyState';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useGames } from '../../services/api/games';

const gameCardStyles = [
    { bg: 'rgba(255,218,214,0.85)', icon: 'extension-puzzle', borderColor: 'rgba(186, 26, 26, 0.2)', titleColor: '#93000A' },
    { bg: 'rgba(255,223,147,0.85)', icon: 'shapes', borderColor: 'rgba(118, 91, 0, 0.2)', titleColor: '#241A00' },
    { bg: 'rgba(225,212,253,0.85)', icon: 'color-palette', borderColor: 'rgba(99, 89, 124, 0.2)', titleColor: '#645A7D' },
];

export default function GamesScreen() {
    const router = useRouter();
    const { data: games, isLoading, isOffline, error } = useGames();

    return (
        <LinearGradient colors={['#FFF0F0', '#FDF7FF', '#F2EEFF']} style={styles.safe}>
            {/* ── Floating Glow Blobs ── */}
            <View style={styles.blobContainer} pointerEvents="none">
                <View style={[styles.blob, styles.blobPink]} />
                <View style={[styles.blob, styles.blobPurple]} />
                <View style={[styles.blob, styles.blobGold]} />
            </View>

            <Header onLockPress={() => {}} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                    <OfflineBadge lastSyncAt={null} />
                {/* ── Hero Banner ── */}
                <DegradableAnimation
                    staticFallback={
                        <View style={styles.heroBanner}>
                            <View style={styles.heroOverlay}>
                                <Text style={styles.heroEmoji}>🎮🧩</Text>
                            </View>
                            <View style={styles.heroTextOverlay}>
                                <Text style={styles.heroTitle}>Ready to Play?</Text>
                            </View>
                        </View>
                    }
                >
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.heroBanner}>
                        <View style={styles.heroOverlay}>
                            <Text style={styles.heroEmoji}>🎮🧩</Text>
                        </View>
                        <View style={styles.heroTextOverlay}>
                            <Text style={styles.heroTitle}>Ready to Play?</Text>
                        </View>
                    </Animated.View>
                </DegradableAnimation>

                {/* ── Loading State ── */}
                {isLoading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={Colors.child.primary} />
                        <Text style={styles.stateText}>Loading games...</Text>
                    </View>
                )}

                {/* ── Error State ── */}
                {error && (
                    <View style={styles.centerState}>
                        <Ionicons name="cloud-offline-outline" size={48} color={Colors.child.textSecondary} />
                        <Text style={styles.stateText}>Could not load games</Text>
                    </View>
                )}

                {/* ── Empty State ── */}
                {!isLoading && !error && (!games || games.length === 0) && (
                    <EmptyState emoji="🎨" title="No games available right now!" />
                )}

                {/* ── Offline Banner ── */}
                {isOffline && (
                    <View style={styles.offlineBanner}>
                        <Ionicons name="wifi-outline" size={16} color="#765B00" />
                        <Text style={styles.offlineText}>Showing cached content</Text>
                    </View>
                )}

                {/* ── Bento Grid ── */}
                {games && games.length > 0 && (
                    <View style={styles.bentoGrid}>
                        {/* First game — Full Width */}
                        {games[0] && (
                            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    style={styles.cardFull}
                                    onPress={() => router.push(`/(child)/game/${games[0].id}`)}
                                >
                                    <Ionicons name={gameCardStyles[0].icon as any} size={64} color="rgba(147, 0, 10, 0.7)" />
                                    <Text style={styles.cardFullTitle}>{games[0].title}</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {/* Remaining games in half-cards row */}
                        {games.length > 1 && (
                            <View style={styles.halfRow}>
                                {games.slice(1, 3).map((game, i) => {
                                    const cardStyle = gameCardStyles[i + 1] || gameCardStyles[0];
                                    return (
                                        <Animated.View
                                            key={game.id}
                                            entering={FadeInDown.delay(300 + i * 100).duration(500)}
                                            style={styles.halfCardWrapper}
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.85}
                                                style={[styles.cardHalf, { backgroundColor: cardStyle.bg, borderBottomColor: cardStyle.borderColor }]}
                                                onPress={() => router.push(`/(child)/game/${game.id}`)}
                                            >
                                                <Ionicons name={cardStyle.icon as any} size={56} color={cardStyle.titleColor.replace('#', 'rgba(') + ', 0.7)'} />
                                                <Text style={[styles.cardHalfTitle, { color: cardStyle.titleColor }]}>{game.title}</Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        )}
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
        opacity: 0.4,
    },
    blobPink: {
        width: 300,
        height: 300,
        backgroundColor: '#FFDAD6',
        top: -60,
        right: -40,
    },
    blobPurple: {
        width: 260,
        height: 260,
        backgroundColor: '#E9DDFF',
        bottom: 100,
        left: -80,
    },
    blobGold: {
        width: 350,
        height: 350,
        backgroundColor: '#FFDF93',
        bottom: -120,
        right: -60,
    },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: 28,
        paddingBottom: Layout.spacing.xxxl,
        gap: 20,
        position: 'relative',
        zIndex: 1,
    },

    // ── Hero Banner ──
    heroBanner: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,218,214,0.7)',
        position: 'relative',
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 5,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.15,
    },
    heroEmoji: {
        fontSize: 120,
    },
    heroTextOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(253, 247, 255, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTitle: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        textAlign: 'center',
    },

    // ── Bento Grid ──
    bentoGrid: {
        gap: 20,
    },

    // Full-width card (Puzzle Party — pink/error-container)
    cardFull: {
        width: '100%',
        backgroundColor: 'rgba(255,218,214,0.85)',
        borderRadius: 16,
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        // 3D depth
        borderBottomWidth: 6,
        borderBottomColor: 'rgba(186, 26, 26, 0.2)',
        // Shadow
        shadowColor: '#FFDAD6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 5,
    },
    cardFullTitle: {
        ...Typography.child.title,
        color: '#93000A',
    },

    // Half cards row
    halfRow: {
        flexDirection: 'row',
        gap: 20,
    },
    halfCardWrapper: {
        flex: 1,
    },

    // States
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

    // Half card — Unified
    cardHalf: {
        borderRadius: 16,
        paddingVertical: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        borderBottomWidth: 6,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 5,
    },
    cardHalfTitle: {
        ...Typography.child.subtitle,
        textAlign: 'center',
    },
});


