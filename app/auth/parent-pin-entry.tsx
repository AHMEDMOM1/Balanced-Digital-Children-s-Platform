import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { verifyPin, recordPinFailure, getPinLockoutState, clearPinLockout } from '../../services/api/pinAuth';
import useParentLockStore from '../../store/useParentLockStore';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    primary: '#4F378A',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
};

const PIN_LENGTH = 6;
const LOCKOUT_KEY = '@parent_pin_lockout';
const HASH_KEY = '@parent_pin_hash';

export default function ParentPinEntryScreen() {
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [errorBanner, setErrorBanner] = useState('');
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        getPinLockoutState(LOCKOUT_KEY).then(state => {
            if (state.lockUntil) setLockoutUntil(state.lockUntil);
        });
    }, []);

    // Countdown timer when locked out
    useEffect(() => {
        if (!lockoutUntil) return;
        const tick = () => {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
            if (remaining <= 0) {
                setLockoutUntil(null);
                setCountdown(0);
                setErrorBanner('');
            } else {
                setCountdown(remaining);
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    const handlePress = (digit: string) => {
        if (lockoutUntil) return;
        setErrorBanner('');
        if (pin.length < PIN_LENGTH) {
            const next = pin + digit;
            setPin(next);
            if (next.length === PIN_LENGTH) handleSubmit(next);
        }
    };

    const handleBackspace = () => {
        if (lockoutUntil) return;
        setPin(prev => prev.slice(0, -1));
        setErrorBanner('');
    };

    const handleSubmit = async (enteredPin: string) => {
        const correct = await verifyPin(enteredPin, HASH_KEY);
        if (correct) {
            await clearPinLockout(LOCKOUT_KEY);
            useParentLockStore.getState().unlock();
            console.debug('[parentPinEntry] PIN verified, navigating to /(parent)');
            router.replace('/(parent)');
        } else {
            const state = await recordPinFailure(LOCKOUT_KEY);
            setPin('');
            if (state.lockUntil) {
                setLockoutUntil(state.lockUntil);
                setErrorBanner('Too many attempts. Try again soon.');
            } else {
                setErrorBanner('Incorrect PIN. Please try again.');
            }
        }
    };

    const renderDots = () => (
        <View style={styles.dotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.dot,
                        i === pin.length && !lockoutUntil && styles.dotActive,
                        i < pin.length && styles.dotFilled,
                    ]}
                >
                    {i < pin.length ? (
                        <Text style={styles.dotChar}>•</Text>
                    ) : i === pin.length && !lockoutUntil ? (
                        <Text style={styles.cursor}>|</Text>
                    ) : null}
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>Parent PIN</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <Ionicons name="shield-checkmark" size={40} color={S.primary} style={{ marginBottom: 16 }} />
                    <Text style={styles.cardTitle}>Welcome Back</Text>
                    <Text style={styles.cardDesc}>Enter your 6-digit PIN to access parent settings.</Text>

                    {(errorBanner || lockoutUntil) ? (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={18} color={S.error} />
                            <Text style={styles.errorText}>
                                {lockoutUntil
                                    ? `Too many attempts. Try again in ${countdown}s.`
                                    : errorBanner}
                            </Text>
                        </View>
                    ) : null}

                    {renderDots()}

                    <View style={styles.keypad}>
                        {['1','2','3','4','5','6','7','8','9'].map(d => (
                            <TouchableOpacity
                                key={d}
                                style={[styles.key, lockoutUntil ? styles.keyDisabled : null]}
                                onPress={() => handlePress(d)}
                                disabled={!!lockoutUntil}
                            >
                                <Text style={styles.keyText}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.keyAction}
                            onPress={handleBackspace}
                            disabled={!!lockoutUntil}
                        >
                            <Ionicons name="backspace-outline" size={24} color={lockoutUntil ? S.outlineVariant : S.onSurfaceVariant} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.key, lockoutUntil ? styles.keyDisabled : null]}
                            onPress={() => handlePress('0')}
                            disabled={!!lockoutUntil}
                        >
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>
                        <View style={styles.keyAction} />
                    </View>

                    <TouchableOpacity
                        style={styles.forgotLink}
                        onPress={() => router.push('/auth/forgot-pin')}
                    >
                        <Text style={styles.forgotLinkText}>Forgot PIN?</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surface },
    topBar: {
        alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: S.outlineVariant,
    },
    topBarTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    content: { flex: 1, justifyContent: 'center', padding: 20 },
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant,
        padding: 32, alignItems: 'center',
    },
    cardTitle: { fontSize: 18, fontWeight: '600', color: S.onSurface, marginBottom: 8 },
    cardDesc: { fontSize: 15, color: S.onSurfaceVariant, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: S.errorContainer, padding: 12, borderRadius: 8,
        marginBottom: 16, width: '100%',
    },
    errorText: { color: S.error, fontSize: 14, flex: 1 },
    dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    dot: {
        width: 40, height: 52, borderRadius: 8,
        borderWidth: 1, borderColor: S.outlineVariant,
        backgroundColor: S.surfaceLow,
        alignItems: 'center', justifyContent: 'center',
    },
    dotActive: { borderColor: S.primary, borderWidth: 2, backgroundColor: S.surfaceLowest },
    dotFilled: { backgroundColor: S.surfaceLow },
    dotChar: { fontSize: 22, color: S.primary },
    cursor: { fontSize: 18, color: S.primary, opacity: 0.5 },
    keypad: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
        gap: 12, maxWidth: 280,
    },
    key: {
        width: 72, height: 56, borderRadius: 8,
        backgroundColor: S.surfaceLow,
        borderWidth: 1, borderColor: S.outlineVariant,
        alignItems: 'center', justifyContent: 'center',
    },
    keyDisabled: { opacity: 0.4 },
    keyText: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    keyAction: {
        width: 72, height: 56, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
    forgotLink: { marginTop: 20, paddingVertical: 8 },
    forgotLinkText: { color: S.primary, fontSize: 15, fontWeight: '600' },
});
