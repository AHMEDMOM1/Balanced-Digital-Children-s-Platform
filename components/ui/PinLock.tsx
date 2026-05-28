/**
 * PIN Lock Component — SafePlay Timer Design
 * Parental access screen with shield icon and clean white keypad card.
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
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

    const renderKey = (label: string | React.ReactNode, onPress: () => void, isSpecial = false) => (
        <TouchableOpacity
            key={typeof label === 'string' ? label : Math.random().toString()}
            onPress={onPress}
            activeOpacity={0.6}
            style={styles.key}
        >
            {typeof label === 'string' ? (
                <Text style={styles.keyText}>{label}</Text>
            ) : (
                label
            )}
        </TouchableOpacity>
    );

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={32} color={Colors.shared.white} />
                        </View>
                        <Text style={styles.title}>Parental Access</Text>
                        <Text style={styles.subtitle}>Enter your 4-digit PIN to access dashboard.</Text>
                    </View>

                    {renderDots()}

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
                            {renderKey(<Ionicons name="finger-print" size={28} color={Colors.pin.keypadText} />, () => {})}
                            {renderKey('0', () => handleKeyPress('0'))}
                            {renderKey(<Ionicons name="backspace-outline" size={28} color={Colors.pin.keypadText} />, handleDelete)}
                        </View>
                    </View>

                    <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>Forgot PIN?</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.pin.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        backgroundColor: Colors.pin.cardBg,
        width: '90%',
        maxWidth: 400,
        borderRadius: Layout.radius.xxxl,
        padding: Layout.spacing.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: Colors.pin.cardBorder,
    },
    header: {
        alignItems: 'center',
        marginBottom: Layout.spacing.xl,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.pin.dot,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Layout.spacing.lg,
    },
    title: {
        ...Typography.parent.title,
        color: Colors.pin.keypadText,
        marginBottom: Layout.spacing.sm,
    },
    subtitle: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
        textAlign: 'center',
        paddingHorizontal: Layout.spacing.md,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: Layout.pin.dotSpacing,
        marginBottom: Layout.spacing.xxl,
    },
    dot: {
        width: Layout.pin.dotSize,
        height: Layout.pin.dotSize,
        borderRadius: Layout.pin.dotSize / 2,
        backgroundColor: Colors.pin.dotEmpty,
    },
    dotFilled: {
        backgroundColor: Colors.pin.dot,
    },
    dotError: {
        backgroundColor: Colors.shared.error,
    },
    keypad: {
        gap: Layout.pin.keySpacing,
        width: '100%',
        paddingHorizontal: Layout.spacing.md,
    },
    keyRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    key: {
        width: Layout.pin.keySize,
        height: Layout.pin.keySize,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyText: {
        ...Typography.parent.title,
        color: Colors.pin.keypadText,
    },
    cancelButton: {
        marginTop: Layout.spacing.xl,
    },
    cancelText: {
        ...Typography.parent.body,
        color: Colors.pin.dot,
        fontWeight: '600',
    },
});
