/**
 * PIN Lock Component
 * A full-screen modal overlay requiring a 4-digit PIN to exit child mode.
 */
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Vibration,
    Platform,
} from 'react-native';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import useSettingsStore from '../../store/useSettingsStore';

interface PinLockProps {
    visible: boolean;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function PinLock({ visible, onSuccess, onCancel }: PinLockProps) {
    const [enteredPin, setEnteredPin] = useState('');
    const [error, setError] = useState(false);
    const correctPin = useSettingsStore((s) => s.pinCode);

    const handleKeyPress = useCallback(
        (key: string) => {
            if (enteredPin.length >= 4) return;

            const newPin = enteredPin + key;
            setEnteredPin(newPin);
            setError(false);

            if (newPin.length === 4) {
                if (newPin === correctPin) {
                    setTimeout(() => {
                        setEnteredPin('');
                        onSuccess();
                    }, 200);
                } else {
                    setError(true);
                    if (Platform.OS !== 'web') {
                        Vibration.vibrate(200);
                    }
                    setTimeout(() => {
                        setEnteredPin('');
                        setError(false);
                    }, 600);
                }
            }
        },
        [enteredPin, correctPin, onSuccess]
    );

    const handleDelete = useCallback(() => {
        setEnteredPin((prev) => prev.slice(0, -1));
        setError(false);
    }, []);

    const handleCancel = useCallback(() => {
        setEnteredPin('');
        setError(false);
        onCancel();
    }, [onCancel]);

    const renderDots = () => {
        return (
            <View style={styles.dotsRow}>
                {[0, 1, 2, 3].map((i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i < enteredPin.length && styles.dotFilled,
                            error && styles.dotError,
                        ]}
                    />
                ))}
            </View>
        );
    };

    const renderKey = (label: string, onPress: () => void) => (
        <TouchableOpacity
            key={label}
            onPress={onPress}
            activeOpacity={0.6}
            style={styles.key}
        >
            <Text style={styles.keyText}>{label}</Text>
        </TouchableOpacity>
    );

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    return (
        <Modal visible={visible} animationType="fade" transparent={false}>
            <View style={styles.container}>
                <Text style={styles.title}>🔒</Text>
                <Text style={styles.subtitle}>Çıkmak için PIN kodunu girin</Text>
                <Text style={styles.subtitleEn}>Enter PIN to exit child mode</Text>

                {renderDots()}

                {error && (
                    <Text style={styles.errorText}>Hatalı Kod! Tekrar deneyin</Text>
                )}

                <View style={styles.keypad}>
                    <View style={styles.keyRow}>
                        {keys.slice(0, 3).map((k) => renderKey(k, () => handleKeyPress(k)))}
                    </View>
                    <View style={styles.keyRow}>
                        {keys.slice(3, 6).map((k) => renderKey(k, () => handleKeyPress(k)))}
                    </View>
                    <View style={styles.keyRow}>
                        {keys.slice(6, 9).map((k) => renderKey(k, () => handleKeyPress(k)))}
                    </View>
                    <View style={styles.keyRow}>
                        {renderKey('✕', handleCancel)}
                        {renderKey('0', () => handleKeyPress('0'))}
                        {renderKey('⌫', handleDelete)}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.pin.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Layout.spacing.xl,
    },
    title: {
        fontSize: 48,
        marginBottom: Layout.spacing.md,
    },
    subtitle: {
        ...Typography.parent.subtitle,
        color: Colors.shared.white,
        marginBottom: 4,
    },
    subtitleEn: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        marginBottom: Layout.spacing.xl,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: Layout.pin.dotSpacing,
        marginBottom: Layout.spacing.xl,
    },
    dot: {
        width: Layout.pin.dotSize,
        height: Layout.pin.dotSize,
        borderRadius: Layout.pin.dotSize / 2,
        backgroundColor: Colors.pin.dotEmpty,
        borderWidth: 2,
        borderColor: Colors.pin.dotEmpty,
    },
    dotFilled: {
        backgroundColor: Colors.pin.dot,
        borderColor: Colors.pin.dot,
    },
    dotError: {
        backgroundColor: Colors.shared.error,
        borderColor: Colors.shared.error,
    },
    errorText: {
        ...Typography.parent.caption,
        color: Colors.shared.error,
        marginBottom: Layout.spacing.md,
    },
    keypad: {
        gap: Layout.pin.keySpacing,
    },
    keyRow: {
        flexDirection: 'row',
        gap: Layout.pin.keySpacing,
    },
    key: {
        width: Layout.pin.keySize,
        height: Layout.pin.keySize,
        borderRadius: Layout.pin.keySize / 2,
        backgroundColor: Colors.pin.keypad,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyText: {
        ...Typography.parent.title,
        color: Colors.pin.keypadText,
    },
});
