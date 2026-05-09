import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import useSessionStore from '../../store/useSessionStore';
import useSettingsStore from '../../store/useSettingsStore';
import PinLock from './PinLock';

export default function SessionOverlay() {
    const router = useRouter();
    const { 
        isSessionActive, 
        elapsedSeconds, 
        sessionsUsedToday, 
        tick,
        isPaused,
        endSession
    } = useSessionStore();
    
    const { dailyTimeLimitMinutes, sessionsPerDay } = useSettingsStore();
    
    const [showPinLock, setShowPinLock] = useState(false);

    // Calculate max session duration in seconds
    const maxSessionDurationSeconds = Math.floor((dailyTimeLimitMinutes * 60) / sessionsPerDay);
    
    const noSessionsLeft = sessionsUsedToday >= sessionsPerDay;
    const isTimeUp = isSessionActive && (elapsedSeconds >= maxSessionDurationSeconds || noSessionsLeft || isPaused);

    // Global Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSessionActive && !isPaused && elapsedSeconds < maxSessionDurationSeconds && !noSessionsLeft) {
            interval = setInterval(() => {
                tick();
            }, 1000);
        } else if (isSessionActive && (elapsedSeconds >= maxSessionDurationSeconds)) {
            // Automatically end the session in the store to update sessionsUsedToday
            // Only if it's not already ended and time is up
            if (!noSessionsLeft) {
               endSession();
            }
        }
        return () => clearInterval(interval);
    }, [isSessionActive, isPaused, elapsedSeconds, maxSessionDurationSeconds, noSessionsLeft, tick, endSession]);

    // If time is not up, don't render anything, let the child use the app
    if (!isTimeUp && !noSessionsLeft) return null;

    return (
        <View style={styles.overlayContainer}>
            <View style={styles.content}>
                <Text style={styles.emoji}>⏰</Text>
                <Text style={styles.title}>
                    {noSessionsLeft ? 'Bugünlük Bu Kadar!' : 'Süre Doldu!'}
                </Text>
                <Text style={styles.subtitle}>
                    Gözlerini dinlendirme zamanı geldi.
                </Text>

                <View style={styles.activitiesBox}>
                    <Text style={styles.activitiesTitle}>Ekran Dışı Etkinlik Önerileri:</Text>
                    <Text style={styles.activityItem}>🎨 Resim Çizebilirsin</Text>
                    <Text style={styles.activityItem}>🧸 Oyuncaklarınla Oynayabilirsin</Text>
                    <Text style={styles.activityItem}>🏃‍♂️ Dışarıda Koşabilirsin</Text>
                    <Text style={styles.activityItem}>📚 Kitap Okuyabilirsin</Text>
                </View>

                {noSessionsLeft && (
                    <Text style={styles.warning}>Bugünlük tüm haklarını kullandın. Yarın görüşürüz!</Text>
                )}

                <TouchableOpacity 
                    style={styles.exitButton} 
                    onPress={() => setShowPinLock(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.exitText}>🔒 Çıkış Yap (Sadece Ebeveynler)</Text>
                </TouchableOpacity>
            </View>

            <PinLock
                visible={showPinLock}
                onSuccess={() => {
                    setShowPinLock(false);
                    // End session just in case it wasn't already
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
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.child.background,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Layout.screen.paddingHorizontal,
    },
    content: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    emoji: {
        fontSize: 72,
        marginBottom: Layout.spacing.lg,
    },
    title: {
        ...Typography.child.hero,
        color: Colors.child.textPrimary,
        textAlign: 'center',
        marginBottom: Layout.spacing.sm,
    },
    subtitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginBottom: Layout.spacing.xl,
    },
    activitiesBox: {
        backgroundColor: Colors.child.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.xl,
        width: '100%',
        marginBottom: Layout.spacing.xl,
        elevation: 4,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    activitiesTitle: {
        ...Typography.child.title,
        color: Colors.child.primary,
        marginBottom: Layout.spacing.md,
        fontSize: 20,
    },
    activityItem: {
        ...Typography.child.body,
        color: Colors.child.textPrimary,
        marginBottom: Layout.spacing.sm,
    },
    warning: {
        ...Typography.child.body,
        color: Colors.child.secondary,
        textAlign: 'center',
        marginBottom: Layout.spacing.xl,
        fontFamily: Typography.fonts.bold,
    },
    exitButton: {
        paddingVertical: Layout.spacing.md,
        paddingHorizontal: Layout.spacing.lg,
        borderRadius: Layout.radius.round,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginTop: Layout.spacing.md,
    },
    exitText: {
        ...Typography.parent.caption,
        color: Colors.child.textSecondary,
    },
});
