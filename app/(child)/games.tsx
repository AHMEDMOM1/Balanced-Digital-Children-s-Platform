/**
 * Brain Games Screen — Stitch Games Gallery Design
 * Gradient background with glow blobs matching Stitch reception area aesthetic.
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
import EmptyState from '../../components/ui/EmptyState';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useGames } from '../../services/api/games';
import type { GameItem } from '../../services/api/types';
import { getBiDiStyle, formatBiDiText } from '../../services/utils/bidi';

const gameStyles: Record<string, { bg: string; icon: string; borderColor: string; titleColor: string }> = {
    counting: { bg: 'rgba(255,218,214,0.85)', icon: 'calculator', borderColor: 'rgba(186, 26, 26, 0.2)', titleColor: '#93000A' },
    matching: { bg: 'rgba(255,223,147,0.85)', icon: 'shapes', borderColor: 'rgba(118, 91, 0, 0.2)', titleColor: '#241A00' },
    memory: { bg: 'rgba(225,212,253,0.85)', icon: 'grid', borderColor: 'rgba(99, 89, 124, 0.2)', titleColor: '#645A7D' },
};

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

                {/* ── Game Cards ── */}
                {(games as GameItem[])?.map((game, index) => {
                    const gs = gameStyles[game.game_type || 'counting'] || gameStyles.counting;
                    return (
                        <Animated.View
                            key={game.id}
                            entering={FadeInDown.delay(index * 120).duration(500)}
                        >
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={[styles.gameCard, { backgroundColor: gs.bg, borderBottomColor: gs.borderColor }]}
                                onPress={() => router.push(`/(child)/game/${game.id}`)}
                            >
                                <View style={styles.gameIconArea}>
                                    <Ionicons name={gs.icon as any} size={48} color={gs.titleColor.replace('#', 'rgba(') + ', 0.7)'} />
                                </View>
                                <View style={styles.gameInfoArea}>
                                    <Text style={[styles.gameTitle, { color: gs.titleColor }, getBiDiStyle(game.title)]}>
                                        {formatBiDiText(game.title)}
                                    </Text>
                                    <Text style={styles.gameBadge}>
                                        {game.game_type === 'counting' ? '🔢 Count' : game.game_type === 'memory' ? '🧠 Memory' : '🎯 Match'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color={gs.titleColor} />
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

    // ── Game Cards ──
    gameCard: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderBottomWidth: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    gameIconArea: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gameInfoArea: {
        flex: 1,
        gap: 4,
    },
    gameTitle: {
        ...Typography.child.title,
        fontSize: 17,
    },
    gameBadge: {
        ...Typography.child.body,
        fontSize: 13,
        color: '#666',
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
});


