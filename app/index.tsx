/**
 * Entry Screen — SafePlay Timer "Child Reception Area"
 * Matches Stitch child_reception_area_cute_green_mascot design:
 * - Soft gradient background (lavender → warm peach)
 * - Floating glow blobs (primary-fixed, tertiary-fixed, secondary-fixed)
 * - Large mascot circle with floating decorative icons
 * - 3D "Start Playing" button with border-b-8 depth
 * - "Parent Login" link at bottom
 */
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import Layout from '../constants/Layout';

export default function IndexScreen() {
    const router = useRouter();

    return (
        <LinearGradient
            colors={['#F2EEFF', '#FDF7FF', '#FFF1D6']}
            locations={[0, 0.5, 1]}
            style={styles.container}
        >
            {/* ── Floating Glow Blobs (matching the HTML reference) ── */}
            <View style={styles.blobLayer} pointerEvents="none">
                <View style={[styles.blob, styles.blobPurpleTopLeft]} />
                <View style={[styles.blob, styles.blobGoldBottomRight]} />
                <View style={[styles.blob, styles.blobSecondaryMidRight]} />
            </View>

            {/* ── Content ── */}
            <View style={styles.content}>
                {/* ── Title ── */}
                <Animated.View entering={FadeInDown.duration(600)} style={styles.titleArea}>
                    <Text style={styles.title}>Ready to Play?</Text>
                    <Text style={styles.subtitle}>Tap the big button to start!</Text>
                </Animated.View>

                {/* ── Mascot ── */}
                <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.mascotContainer}>
                    {/* Decorative circle behind mascot */}
                    <View style={styles.mascotCircle}>
                        <Image
                            source={require('../assets/mascot.png')}
                            style={styles.mascotImage}
                            resizeMode="contain"
                        />
                    </View>
                    {/* Floating star icon — top right */}
                    <Animated.View
                        entering={FadeIn.delay(800).duration(500)}
                        style={[styles.floatingIcon, styles.starIcon]}
                    >
                        <Ionicons name="star" size={28} color="#765B00" />
                    </Animated.View>
                    {/* Floating toy icon — bottom left */}
                    <Animated.View
                        entering={FadeIn.delay(1000).duration(500)}
                        style={[styles.floatingIcon, styles.toyIcon]}
                    >
                        <Ionicons name="car-sport" size={28} color="#4F378A" />
                    </Animated.View>
                </Animated.View>

                {/* ── Start Playing Button (3D) ── */}
                <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.buttonWrapper}>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => router.push('/(child)')}
                        activeOpacity={0.85}
                    >
                        {/* 3D border-bottom highlight */}
                        <View style={styles.btnDepthBorder} />
                        {/* Top shine border */}
                        <View style={styles.btnTopShine} />
                        {/* Content */}
                        <View style={styles.btnContent}>
                            <Ionicons name="play-circle" size={40} color={Colors.shared.white} />
                            <Text style={styles.startButtonText}>Start Playing</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Parent Access ── */}
                <Animated.View entering={FadeIn.delay(900).duration(500)}>
                    <TouchableOpacity
                        style={styles.parentLink}
                        onPress={() => router.push('/auth/login')}
                    >
                        <Ionicons name="shield-checkmark-outline" size={20} color="#7A7582" />
                        <Text style={styles.parentLinkText}>Parent Login</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // ── Glow Blobs ──
    blobLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        overflow: 'hidden',
    },
    blob: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.5,
    },
    blobPurpleTopLeft: {
        width: 380,
        height: 380,
        backgroundColor: '#E9DDFF', // primary-fixed
        top: '-10%',
        left: '-10%',
    },
    blobGoldBottomRight: {
        width: 480,
        height: 480,
        backgroundColor: '#FFDF93', // tertiary-fixed
        bottom: '-10%',
        right: '-10%',
    },
    blobSecondaryMidRight: {
        width: 260,
        height: 260,
        backgroundColor: '#E9DDFF', // secondary-fixed
        top: '20%',
        right: '10%',
    },

    // ── Content ──
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Layout.screen.paddingHorizontal,
        zIndex: 1,
    },

    // ── Title ──
    titleArea: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        marginBottom: 8,
    },
    subtitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textSecondary,
    },

    // ── Mascot ──
    mascotContainer: {
        width: 280,
        height: 280,
        position: 'relative',
        marginBottom: 48,
    },
    mascotCircle: {
        width: '100%',
        height: '100%',
        borderRadius: 140,
        backgroundColor: '#E6E0E9', // surface-container-highest
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        // Subtle shadow like the reference
        shadowColor: '#6750A4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    mascotImage: {
        width: '92%',
        height: '92%',
    },
    floatingIcon: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
    },
    starIcon: {
        top: -8,
        right: -8,
        backgroundColor: '#FFDF93', // tertiary-fixed
    },
    toyIcon: {
        bottom: 12,
        left: -12,
        backgroundColor: '#E9DDFF', // primary-fixed
    },

    // ── Start Button (3D) ──
    buttonWrapper: {
        width: '100%',
        paddingHorizontal: 16,
        marginBottom: 32,
    },
    startButton: {
        width: '100%',
        backgroundColor: Colors.child.primary,
        borderRadius: 32,
        paddingVertical: 22,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    btnDepthBorder: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
        borderRadius: 32,
        borderBottomWidth: 8,
        borderBottomColor: 'rgba(0,0,0,0.2)',
    },
    btnTopShine: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '100%',
        borderRadius: 32,
        borderTopWidth: 4,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        zIndex: 1,
    },
    startButtonText: {
        ...Typography.child.title,
        color: Colors.shared.white,
        fontSize: 24,
    },

    // ── Parent Link ──
    parentLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    parentLinkText: {
        ...Typography.parent.subtitle,
        color: '#7A7582', // outline color
    },
});
