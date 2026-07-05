/**
 * Entry Screen — Welcome & routing hub.
 *
 * First launch (no device_role saved):
 *   → Beautiful welcome screen with two options:
 *     1. "Register via Email" → parent flow
 *     2. "Scan QR Code" → child flow
 *
 * Returning parent (device_role = 'parent'):
 *   → Not authenticated → /auth/login
 *   → Authenticated, no PIN → /auth/setup-pin
 *   → Authenticated, has PIN → /auth/parent-pin-entry
 *
 * Returning child (device_role = 'child'):
 *   → Not paired → /auth/child-scan
 *   → Paired → /(child) directly (no PIN ever)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import useAuthStore from '../store/useAuthStore';
import usePairingStore from '../store/usePairingStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Where a parent device should land based on current auth/PIN state.
async function routeParent(isAuthenticated: boolean): Promise<'/auth/login' | '/auth/setup-pin' | '/auth/parent-pin-entry'> {
    if (!isAuthenticated) return '/auth/login';
    const parentPinHash = await AsyncStorage.getItem('@parent_pin_hash');
    return parentPinHash ? '/auth/parent-pin-entry' : '/auth/setup-pin';
}

export default function IndexScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ hub?: string }>();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const authIsLoading = useAuthStore((s) => s.isLoading);

    const [isReady, setIsReady] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    // On mount: load state, then route or show welcome.
    // `?hub=1` (set by the parent/child layouts' back-button handler) means
    // the user explicitly navigated back here to switch sections — show the
    // picker instead of auto-bouncing back into the section they just left.
    useEffect(() => {
        if (params.hub === '1') {
            setShowWelcome(true);
            setIsReady(true);
            return;
        }

        (async () => {
            await usePairingStore.getState().loadPairingState();
            const { deviceRole, pairingState } = usePairingStore.getState();

            if (deviceRole === 'child') {
                if (pairingState !== null) {
                    router.replace('/(child)');
                } else {
                    router.replace('/auth/child-scan');
                }
                return;
            }

            if (deviceRole === 'parent') {
                router.replace('/(parent)');
                return;
            }

            // First launch — show welcome
            setShowWelcome(true);
            setIsReady(true);
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Parent card: resume an existing session/PIN if there is one, otherwise
    // start the normal first-time registration flow.
    const handleEmailRegister = async () => {
        await usePairingStore.getState().saveDeviceRole('parent');
        router.replace('/(parent)');
    };

    // Child card: resume an existing pairing if there is one, otherwise scan.
    const handleScanQR = async () => {
        await usePairingStore.getState().saveDeviceRole('child');
        const { pairingState } = usePairingStore.getState();
        router.replace(pairingState !== null ? '/(child)' : '/auth/child-scan');
    };

    // Loading
    if (!isReady || authIsLoading) {
        return (
            <LinearGradient
                colors={['#F2EEFF', '#FDF7FF', '#FFF1D6']}
                locations={[0, 0.5, 1]}
                style={styles.loadingContainer}
            >
                <ActivityIndicator size="large" color="#4F378A" />
            </LinearGradient>
        );
    }

    // Welcome screen
    if (showWelcome) {
        return (
            <LinearGradient
                colors={['#F2EEFF', '#FDF7FF', '#FFF1D6']}
                locations={[0, 0.5, 1]}
                style={styles.container}
            >
                {/* ── Floating Glow Blobs ── */}
                <View style={styles.blobLayer} pointerEvents="none">
                    <View style={[styles.blob, styles.blobPurple]} />
                    <View style={[styles.blob, styles.blobGold]} />
                    <View style={[styles.blob, styles.blobPink]} />
                </View>

                <View style={styles.content}>
                    {/* ── Mascot + Title ── */}
                    <Animated.View entering={ZoomIn.duration(700)} style={styles.mascotWrap}>
                        <View style={styles.mascotRing}>
                            <Image
                                source={require('../assets/mascot.png')}
                                style={styles.mascotImage}
                                resizeMode="contain"
                            />
                        </View>
                        {/* Floating decorative badges */}
                        <Animated.View entering={FadeIn.delay(600).duration(400)} style={[styles.floatingBadge, styles.badgeStar]}>
                            <Ionicons name="star" size={22} color="#765B00" />
                        </Animated.View>
                        <Animated.View entering={FadeIn.delay(800).duration(400)} style={[styles.floatingBadge, styles.badgeHeart]}>
                            <Ionicons name="heart" size={20} color="#9C4146" />
                        </Animated.View>
                        <Animated.View entering={FadeIn.delay(1000).duration(400)} style={[styles.floatingBadge, styles.badgeShield]}>
                            <Ionicons name="shield-checkmark" size={20} color="#4F378A" />
                        </Animated.View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.titleArea}>
                        <Text style={styles.appName}>SafePlay Timer</Text>
                        <Text style={styles.tagline}>A safe & fun digital space for your child</Text>
                    </Animated.View>

                    {/* ── Action Buttons ── */}
                    <View style={styles.actionsArea}>
                        {/* Register via Email — Parent */}
                        <Animated.View entering={FadeInUp.delay(500).duration(600)}>
                            <TouchableOpacity
                                style={styles.primaryCard}
                                onPress={handleEmailRegister}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={['#4F378A', '#7B5DC0']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.cardGradient}
                                >
                                    <View style={styles.cardIconWrap}>
                                        <Ionicons name="mail" size={28} color="#FFFFFF" />
                                    </View>
                                    <View style={styles.cardTextWrap}>
                                        <Text style={styles.cardTitle}>Register via Email</Text>
                                        <Text style={styles.cardDesc}>
                                            For parents — sign up to manage your child's device
                                        </Text>
                                    </View>
                                    <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.7)" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Scan QR — Child */}
                        <Animated.View entering={FadeInUp.delay(700).duration(600)}>
                            <TouchableOpacity
                                style={styles.secondaryCard}
                                onPress={handleScanQR}
                                activeOpacity={0.88}
                            >
                                <View style={styles.secondaryInner}>
                                    <View style={styles.qrIconWrap}>
                                        <Ionicons name="qr-code" size={28} color="#765B00" />
                                    </View>
                                    <View style={styles.cardTextWrap}>
                                        <Text style={styles.secondaryTitle}>Scan QR Code</Text>
                                        <Text style={styles.secondaryDesc}>
                                            For child's device — scan the code from parent's phone
                                        </Text>
                                    </View>
                                    <Ionicons name="arrow-forward-circle-outline" size={28} color="#765B00" />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* ── Footer ── */}
                    <Animated.View entering={FadeIn.delay(1000).duration(500)} style={styles.footer}>
                        <View style={styles.footerLine} />
                        <View style={styles.footerContent}>
                            <Ionicons name="lock-closed" size={14} color="#9A929E" />
                            <Text style={styles.footerText}>All data is encrypted and secure</Text>
                        </View>
                    </Animated.View>
                </View>
            </LinearGradient>
        );
    }

    // Fallback
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F378A" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Blobs ──
    blobLayer: {
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
        width: 350,
        height: 350,
        backgroundColor: '#E9DDFF',
        top: '-8%',
        left: '-15%',
    },
    blobGold: {
        width: 420,
        height: 420,
        backgroundColor: '#FFDF93',
        bottom: '-12%',
        right: '-15%',
    },
    blobPink: {
        width: 220,
        height: 220,
        backgroundColor: '#FFD6E0',
        top: '35%',
        right: '5%',
    },

    // ── Content ──
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        zIndex: 1,
    },

    // ── Mascot ──
    mascotWrap: {
        alignItems: 'center',
        marginBottom: 12,
        position: 'relative',
    },
    mascotRing: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6750A4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 10,
        borderWidth: 3,
        borderColor: 'rgba(233,221,255,0.6)',
    },
    mascotImage: {
        width: '88%',
        height: '88%',
    },
    floatingBadge: {
        position: 'absolute',
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 5,
    },
    badgeStar: {
        top: 2,
        right: SCREEN_WIDTH * 0.18,
        backgroundColor: '#FFDF93',
    },
    badgeHeart: {
        bottom: 10,
        left: SCREEN_WIDTH * 0.16,
        backgroundColor: '#FFD6E0',
    },
    badgeShield: {
        top: 30,
        left: SCREEN_WIDTH * 0.14,
        backgroundColor: '#E9DDFF',
    },

    // ── Title ──
    titleArea: {
        alignItems: 'center',
        marginBottom: 36,
    },
    appName: {
        fontSize: 34,
        fontWeight: '800',
        color: '#4F378A',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: '#7A7582',
        textAlign: 'center',
        lineHeight: 24,
    },

    // ── Cards ──
    actionsArea: {
        gap: 14,
        marginBottom: 20,
    },
    primaryCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#4F378A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 14,
    },
    cardIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTextWrap: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
    },

    secondaryCard: {
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#765B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1.5,
        borderColor: 'rgba(255,223,147,0.5)',
    },
    secondaryInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 14,
    },
    qrIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#FFF6E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1D1B20',
        marginBottom: 4,
    },
    secondaryDesc: {
        fontSize: 13,
        color: '#7A7582',
        lineHeight: 18,
    },

    // ── Footer ──
    footer: {
        alignItems: 'center',
        marginTop: 8,
    },
    footerLine: {
        width: 60,
        height: 2,
        backgroundColor: 'rgba(203,196,210,0.4)',
        borderRadius: 1,
        marginBottom: 12,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        color: '#9A929E',
    },
});
