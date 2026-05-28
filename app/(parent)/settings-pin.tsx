/**
 * Change PIN Screen — Stitch parent_settings_change_pin Design
 * - Centered card with PIN entry fields (Current, New, Confirm)
 * - Numeric keypad with backspace and Next
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useSettingsStore from '../../store/useSettingsStore';

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

export default function SettingsPinScreen() {
    const router = useRouter();
    const { pinCode, setPinCode } = useSettingsStore();
    const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
    const [currentInput, setCurrentInput] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');

    const activeInput = step === 'current' ? currentInput : step === 'new' ? newPin : confirmPin;

    const handlePress = (digit: string) => {
        setError('');
        if (step === 'current' && currentInput.length < 4) {
            setCurrentInput(prev => prev + digit);
        } else if (step === 'new' && newPin.length < 4) {
            setNewPin(prev => prev + digit);
        } else if (step === 'confirm' && confirmPin.length < 4) {
            setConfirmPin(prev => prev + digit);
        }
    };

    const handleBackspace = () => {
        if (step === 'current') setCurrentInput(prev => prev.slice(0, -1));
        else if (step === 'new') setNewPin(prev => prev.slice(0, -1));
        else setConfirmPin(prev => prev.slice(0, -1));
    };

    const handleNext = () => {
        if (step === 'current') {
            if (currentInput === pinCode) {
                setStep('new');
            } else {
                setError('Incorrect PIN');
                setCurrentInput('');
            }
        } else if (step === 'new') {
            if (newPin.length === 4) setStep('confirm');
        } else if (step === 'confirm') {
            if (confirmPin === newPin) {
                setPinCode(newPin);
                router.back();
            } else {
                setError('PINs do not match');
                setConfirmPin('');
            }
        }
    };

    const renderDots = (value: string, active: boolean) => (
        <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map(i => (
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
                <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={S.primary} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Security Settings</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    {/* Header */}
                    <Text style={styles.cardTitle}>Change Parent PIN</Text>
                    <Text style={styles.cardDesc}>
                        Enter your current PIN to authenticate, then set a new one.
                    </Text>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* PIN Fields */}
                    <View style={styles.pinSection}>
                        <Text style={styles.pinLabel}>Current PIN</Text>
                        {renderDots(currentInput, step === 'current')}
                    </View>

                    <View style={[styles.pinSection, step !== 'new' && step !== 'confirm' && styles.dimmed]}>
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
                            <TouchableOpacity key={d} style={styles.key} onPress={() => handlePress(d)}>
                                <Text style={styles.keyText}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.keyAction} onPress={handleBackspace}>
                            <Ionicons name="backspace-outline" size={24} color={S.onSurfaceVariant} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.key} onPress={() => handlePress('0')}>
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.keyAction} onPress={handleNext}>
                            <Text style={[styles.keyText, { color: S.primary, fontWeight: '700' }]}>Next</Text>
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
    topBarBtn: { padding: 8, borderRadius: 99 },
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
    dotsRow: { flexDirection: 'row', gap: 16 },
    dot: {
        width: 48, height: 56, borderRadius: 8,
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
