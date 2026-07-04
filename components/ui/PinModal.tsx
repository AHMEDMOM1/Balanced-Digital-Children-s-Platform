import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifyPin } from '../../services/api/pinAuth';

interface PinModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    correctPin?: string; // kept for interface compatibility, verification uses stored hash
}

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    primary: '#4F378A',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    error: '#BA1A1A',
};

const PIN_LENGTH = 6;

export default function PinModal({ visible, onClose, onSuccess }: PinModalProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handlePress = async (digit: string) => {
        setError('');
        if (pin.length < PIN_LENGTH) {
            const newPin = pin + digit;
            setPin(newPin);
            if (newPin.length === PIN_LENGTH) {
                const correct = await verifyPin(newPin, '@parent_pin_hash');
                if (correct) {
                    onSuccess();
                    setTimeout(() => {
                        setPin('');
                        onClose();
                    }, 300);
                } else {
                    setError('Incorrect PIN');
                    setPin('');
                }
            }
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => { setPin(''); setError(''); onClose(); }}>
                        <Ionicons name="close" size={24} color={S.onSurfaceVariant} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Parent Unlock</Text>
                    <Text style={styles.desc}>Enter PIN to start playing</Text>

                    {error ? <Text style={styles.errorText}>{error}</Text> : <View style={{ height: 20, marginBottom: 12 }} />}

                    <View style={styles.dotsRow}>
                        {[0, 1, 2, 3, 4, 5].map(i => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === pin.length && styles.dotActive,
                                    i > pin.length && styles.dotDisabled,
                                    i < pin.length && styles.dotFilled,
                                ]}
                            >
                                {i < pin.length ? <Text style={styles.dotChar}>•</Text> : null}
                            </View>
                        ))}
                    </View>

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
                        <View style={styles.keyAction} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center', padding: 20,
    },
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 16,
        padding: 32, alignItems: 'center', width: '100%', maxWidth: 360,
        position: 'relative',
    },
    closeBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
    title: { fontSize: 20, fontWeight: '700', color: S.primary, marginBottom: 8 },
    desc: { fontSize: 15, color: S.onSurfaceVariant, marginBottom: 16 },
    errorText: { color: S.error, fontSize: 14, fontWeight: '600', marginBottom: 12 },
    dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    dot: {
        width: 36, height: 52, borderRadius: 8,
        borderWidth: 1, borderColor: S.outlineVariant,
        alignItems: 'center', justifyContent: 'center',
    },
    dotActive: { borderColor: S.primary, borderWidth: 2, backgroundColor: S.surfaceLowest },
    dotDisabled: { backgroundColor: S.surfaceLow },
    dotFilled: { backgroundColor: S.surfaceLow },
    dotChar: { fontSize: 22, color: S.primary },
    keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    key: {
        width: 68, height: 56, borderRadius: 8,
        backgroundColor: S.surfaceLow, borderWidth: 1, borderColor: S.outlineVariant,
        alignItems: 'center', justifyContent: 'center',
    },
    keyText: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    keyAction: { width: 68, height: 56, alignItems: 'center', justifyContent: 'center' },
});
