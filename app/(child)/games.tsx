/**
 * Brain Games Screen — Stitch Games Gallery Design
 * Gradient background with glow blobs matching Stitch reception area aesthetic.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Header from '../../components/ui/Header';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

export default function GamesScreen() {
    const router = useRouter();

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
                {/* ── Hero Banner ── */}
                <Animated.View entering={FadeInDown.duration(500)} style={styles.heroBanner}>
                    <View style={styles.heroOverlay}>
                        <Text style={styles.heroEmoji}>🎮🧩</Text>
                    </View>
                    <View style={styles.heroTextOverlay}>
                        <Text style={styles.heroTitle}>Ready to Play?</Text>
                    </View>
                </Animated.View>

                {/* ── Bento Grid ── */}
                <View style={styles.bentoGrid}>
                    {/* Puzzle Party — Full Width (error-container / pink) */}
                    <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cardFull}
                            onPress={() => router.push('/(child)/game/1')}
                        >
                            <Ionicons name="extension-puzzle" size={64} color="rgba(147, 0, 10, 0.7)" />
                            <Text style={styles.cardFullTitle}>Puzzle Party</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Half Cards Row */}
                    <View style={styles.halfRow}>
                        {/* Shape Match — Gold */}
                        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.halfCardWrapper}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={styles.cardHalfGold}
                                onPress={() => router.push('/(child)/game/2')}
                            >
                                <Ionicons name="shapes" size={56} color="rgba(36, 26, 0, 0.7)" />
                                <Text style={styles.cardHalfTitleDark}>Shape{'\n'}Match</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Color Quest — Purple */}
                        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.halfCardWrapper}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={styles.cardHalfPurple}
                                onPress={() => router.push('/(child)/game/3')}
                            >
                                <Ionicons name="color-palette" size={56} color="rgba(100, 90, 125, 0.7)" />
                                <Text style={styles.cardHalfTitlePurple}>Color{'\n'}Quest</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </View>
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

    // Half card — Gold (Shape Match)
    cardHalfGold: {
        backgroundColor: 'rgba(255,223,147,0.85)',
        borderRadius: 16,
        paddingVertical: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        // 3D depth
        borderBottomWidth: 6,
        borderBottomColor: 'rgba(118, 91, 0, 0.2)',
        // Shadow
        shadowColor: '#FFDF93',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 5,
    },
    cardHalfTitleDark: {
        ...Typography.child.subtitle,
        color: '#241A00',
        textAlign: 'center',
    },

    // Half card — Purple (Color Quest)
    cardHalfPurple: {
        backgroundColor: 'rgba(225,212,253,0.85)',
        borderRadius: 16,
        paddingVertical: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        // 3D depth
        borderBottomWidth: 6,
        borderBottomColor: 'rgba(99, 89, 124, 0.2)',
        // Shadow
        shadowColor: '#E1D4FD',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 5,
    },
    cardHalfTitlePurple: {
        ...Typography.child.subtitle,
        color: '#645A7D',
        textAlign: 'center',
    },
});
