import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useSettingsStore from '../../store/useSettingsStore';
import { getClient } from '../../services/api/client';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    primary: '#4F378A',
    onPrimary: '#FFFFFF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    outline: '#7A7582',
};

const PIN_LENGTH = 6;

export default function SetupPinScreen() {
    const router = useRouter();
    const setPinCode = useSettingsStore((s) => s.setPinCode);
    const [step, setStep] = useState<'new' | 'confirm'>('new');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Prevent back navigation to force PIN setup
    React.useEffect(() => {
        const onBackPress = () => true;
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const handlePress = (digit: string) => {
        setError('');
        if (step === 'new' && newPin.length < PIN_LENGTH) {
            setNewPin(prev => prev + digit);
        } else if (step === 'confirm' && confirmPin.length < PIN_LENGTH) {
            setConfirmPin(prev => prev + digit);
        }
    };

    const handleBackspace = () => {
        if (step === 'new') setNewPin(prev => prev.slice(0, -1));
        else setConfirmPin(prev => prev.slice(0, -1));
    };

    const handleNext = async () => {
        if (step === 'new') {
            if (newPin.length === PIN_LENGTH) setStep('confirm');
            return;
        }

        if (step === 'confirm') {
            if (confirmPin !== newPin) {
                setError('PINs do not match');
                setConfirmPin('');
                return;
            }

            setIsSaving(true);
            try {
                const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPin);
                await AsyncStorage.setItem('@parent_pin_hash', hash);
                // Clear the legacy plaintext pin — migration complete
                setPinCode('');
                // Fire-and-forget cloud sync — needs the real parent email, not ''
                const { data: { user } } = await getClient().auth.getUser();
                if (user?.email) {
                    getClient()
                        .rpc('update_parent_pin_hash', { p_email: user.email, p_new_hash: hash })
                        .then(({ error: syncErr }) => {
                            if (syncErr) console.warn('[setupPin] cloud sync warn:', syncErr.message);
                        });
                }
                console.debug('[setupPin] parent PIN hash stored');
                router.replace('/(parent)');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const renderDots = (value: string, active: boolean) => (
        <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4, 5].map(i => (
                <View
                    key={i}
                    style={[
                        styles.dot,
                        active && i === value.length && styles.dotActive,
                        !active && styles.dotDisabled,
                        i < value.length && styles.dotFilled,
                    ]}
                >
                    {i < value.length ? (
                        <Text style={[styles.dotChar, active && { color: S.primary }]}>•</Text>
                    ) : active && i === value.length ? (
                        <Text style={styles.cursor}>|</Text>
                    ) : null}
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <View style={{ width: 38 }} />
                <Text style={styles.topBarTitle}>Setup PIN</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    {/* Header */}
                    <Text style={styles.cardTitle}>Create Parent PIN</Text>
                    <Text style={styles.cardDesc}>
                        This 6-digit PIN will be used to access parent settings.
                    </Text>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* PIN Fields */}
                    <View style={styles.pinSection}>
                        <Text style={styles.pinLabel}>New PIN</Text>
                        {renderDots(newPin, step === 'new')}
                    </View>

                    <View style={[styles.pinSection, step !== 'confirm' && styles.dimmed]}>
                        <Text style={styles.pinLabel}>Confirm New PIN</Text>
                        {renderDots(confirmPin, step === 'confirm')}
                    </View>

                    {/* Numeric Keypad */}
                    <View style={styles.keypad}>
                        {['1','2','3','4','5','6','7','8','9'].map(d => (
                            <TouchableOpacity key={d} style={styles.key} onPress={() => handlePress(d)} disabled={isSaving}>
                                <Text style={styles.keyText}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.keyAction} onPress={handleBackspace} disabled={isSaving}>
                            <Ionicons name="backspace-outline" size={24} color={S.onSurfaceVariant} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.key} onPress={() => handlePress('0')} disabled={isSaving}>
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.keyAction} onPress={handleNext} disabled={isSaving}>
                            <Text style={[styles.keyText, { color: S.primary, fontWeight: '700' }]}>
                                {isSaving ? '…' : 'Next'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FDF7FF' },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: S.outlineVariant,
    },
    topBarTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant,
        padding: 32, alignItems: 'center',
    },
    cardTitle: { fontSize: 18, fontWeight: '600', color: S.onSurface, marginBottom: 8 },
    cardDesc: { fontSize: 15, color: S.onSurfaceVariant, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    errorText: { color: '#BA1A1A', fontSize: 14, fontWeight: '600', marginBottom: 12 },
    pinSection: { marginBottom: 20, alignItems: 'center' },
    pinLabel: { fontSize: 13, color: S.onSurfaceVariant, marginBottom: 8 },
    dimmed: { opacity: 0.4 },
    dotsRow: { flexDirection: 'row', gap: 10 },
    dot: {
        width: 40, height: 52, borderRadius: 8,
        borderWidth: 1, borderColor: S.outlineVariant,
        backgroundColor: S.surfaceLow,
        alignItems: 'center', justifyContent: 'center',
    },
    dotActive: { borderColor: S.primary, borderWidth: 2, backgroundColor: S.surfaceLowest },
    dotDisabled: { backgroundColor: S.surfaceLowest },
    dotFilled: { backgroundColor: S.surfaceLow },
    dotChar: { fontSize: 22, color: S.primary },
    cursor: { fontSize: 18, color: S.primary, opacity: 0.5 },
    keypad: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
        gap: 12, marginTop: 16, maxWidth: 280,
    },
    key: {
        width: 72, height: 56, borderRadius: 8,
        backgroundColor: S.surfaceLow,
        borderWidth: 1, borderColor: S.outlineVariant,
        alignItems: 'center', justifyContent: 'center',
    },
    keyText: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    keyAction: {
        width: 72, height: 56, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
});
