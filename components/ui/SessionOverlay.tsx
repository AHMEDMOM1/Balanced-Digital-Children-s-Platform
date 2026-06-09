/**
 * Session Overlay Component — SafePlay Timer Design
 * Full-screen PAGE (not overlay) when time expires.
 * Matches the design: moon illustration at top, activity suggestions grid, Parent Exit at bottom.
 */
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import useSessionStore from '../../store/useSessionStore';
import useSettingsStore from '../../store/useSettingsStore';
import PinLock from './PinLock';
import { getBiDiStyle, isArabic } from '../../services/utils/bidi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MOON_SIZE = Math.min(SCREEN_WIDTH * 0.55, 260);

export default function SessionOverlay() {
    const router = useRouter();
    const {
        isSessionActive,
        elapsedSeconds,
        sessionsUsedToday,
        tick,
        isPaused,
        endSession,
    } = useSessionStore();

    const { dailyTimeLimitMinutes, sessionsPerDay } = useSettingsStore();

    const [showPinLock, setShowPinLock] = useState(false);

    // Calculate max session duration in seconds
    const maxSessionDurationSeconds = Math.floor(
        (dailyTimeLimitMinutes * 60) / sessionsPerDay
    );

    const noSessionsLeft = sessionsUsedToday >= sessionsPerDay;
    const isTimeUp =
        isSessionActive &&
        (elapsedSeconds >= maxSessionDurationSeconds || noSessionsLeft);

    // Global Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (
            isSessionActive &&
            !isPaused &&
            elapsedSeconds < maxSessionDurationSeconds &&
            !noSessionsLeft
        ) {
            interval = setInterval(() => {
                tick();
            }, 1000);
        } else if (
            isSessionActive &&
            elapsedSeconds >= maxSessionDurationSeconds
        ) {
            if (!noSessionsLeft) {
                endSession();
            }
        }
        return () => clearInterval(interval);
    }, [
        isSessionActive,
        isPaused,
        elapsedSeconds,
        maxSessionDurationSeconds,
        noSessionsLeft,
        tick,
        endSession,
    ]);

    if (!isTimeUp && !noSessionsLeft) return null;

    // ─── Activity Suggestion Card ───
    const ActivityCard = ({
        icon,
        title,
        accentColor,
        bgColor,
    }: {
        icon: any;
        title: string;
        accentColor: string;
        bgColor: string;
    }) => (
        <View style={[styles.activityCard]}>
            <View style={[styles.activityIconCircle, { backgroundColor: bgColor }]}>
                <Ionicons name={icon} size={30} color={accentColor} />
            </View>
            <Text style={styles.activityCardTitle}>{title}</Text>
            {/* Colored bottom accent bar */}
            <View style={[styles.cardAccentBar, { backgroundColor: accentColor }]} />
        </View>
    );

    return (
        <View style={styles.page}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Moon Illustration ─── */}
                <View style={styles.moonWrapper}>
                    <View style={styles.moonCircle}>
                        <Image
                            source={require('../../assets/time_up_moon.png')}
                            style={styles.moonImage}
                            resizeMode="cover"
                        />
                    </View>
                </View>

                {/* ─── Title ─── */}
                <Text style={[styles.title, getBiDiStyle("It's time to relax! 🌟"), !isArabic("It's time to relax! 🌟") && { textAlign: 'center' }]}>It's time to relax! 🌟</Text>

                {/* ─── Suggestions Card ─── */}
                <View style={styles.suggestionsCard}>
                    <Text style={[styles.suggestionsTitle, getBiDiStyle("How about we...")]}>How about we...</Text>

                    <View style={styles.grid}>
                        <View style={styles.gridRow}>
                            <ActivityCard
                                icon="color-palette-outline"
                                title={"Draw a\npicture"}
                                accentColor="#7C5CFC"
                                bgColor="#EDE7FF"
                            />
                            <ActivityCard
                                icon="extension-puzzle-outline"
                                title={"Play with\ntoys"}
                                accentColor="#FFB800"
                                bgColor="#FFF4D1"
                            />
                        </View>
                        <View style={styles.gridRow}>
                            <ActivityCard
                                icon="leaf-outline"
                                title="Go outside"
                                accentColor="#4CAF50"
                                bgColor="#E8F5E9"
                            />
                            <ActivityCard
                                icon="book-outline"
                                title="Read a book"
                                accentColor="#7C5CFC"
                                bgColor="#EDE7FF"
                            />
                        </View>
                    </View>
                </View>

                {/* ─── Parent Exit Button ─── */}
                <TouchableOpacity
                    style={styles.exitButton}
                    onPress={() => setShowPinLock(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="lock-closed"
                        size={18}
                        color={Colors.child.textSecondary}
                    />
                    <Text style={styles.exitText}>Parent Exit</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ─── PIN Lock Modal ─── */}
            <PinLock
                visible={showPinLock}
                onSuccess={() => {
                    setShowPinLock(false);
                    if (isSessionActive) {
                        endSession();
                    }
                    router.replace('/');
                }}
                onCancel={() => setShowPinLock(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    /* ─── Full Page Container ─── */
    page: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        backgroundColor: Colors.child.background,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: 48,
        paddingBottom: 40,
    },

    /* ─── Moon Illustration ─── */
    moonWrapper: {
        marginBottom: Layout.spacing.lg,
    },
    moonCircle: {
        width: MOON_SIZE,
        height: MOON_SIZE,
        borderRadius: MOON_SIZE / 2,
        borderWidth: 4,
        borderColor: 'rgba(203, 196, 210, 0.4)',
        overflow: 'hidden',
        backgroundColor: '#e9ddff',
    },
    moonImage: {
        width: '100%',
        height: '100%',
    },

    /* ─── Title ─── */
    title: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        marginBottom: Layout.spacing.xl,
        fontSize: 28,
    },

    /* ─── Suggestions Card ─── */
    suggestionsCard: {
        backgroundColor: Colors.child.surfaceContainer,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    suggestionsTitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textPrimary,
        marginBottom: 20,
        fontSize: 18,
    },

    /* ─── Grid ─── */
    grid: {
        width: '100%',
        gap: 14,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 14,
    },

    /* ─── Activity Card ─── */
    activityCard: {
        flex: 1,
        backgroundColor: Colors.child.surface,
        borderRadius: 16,
        paddingTop: 18,
        paddingBottom: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 130,
        overflow: 'hidden',
        // Subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    activityIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    activityCardTitle: {
        ...Typography.child.body,
        fontSize: 15,
        textAlign: 'center',
        color: Colors.child.textPrimary,
        fontWeight: '600',
        lineHeight: 20,
    },
    cardAccentBar: {
        position: 'absolute',
        bottom: 0,
        left: 16,
        right: 16,
        height: 4,
        borderRadius: 2,
    },

    /* ─── Parent Exit ─── */
    exitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 999,
        backgroundColor: Colors.child.surfaceContainerHigh,
        marginTop: 'auto',
        marginBottom: 8,
    },
    exitText: {
        ...Typography.parent.button,
        color: Colors.child.textSecondary,
    },
});
