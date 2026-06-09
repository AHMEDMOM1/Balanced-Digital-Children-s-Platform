import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { pinRecoveryManager } from '../../services/resilience/pinRecoveryManager';

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

type Step = 'email' | 'verification' | 'security_question' | 'new_pin';

export default function ForgotPinScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [answer, setAnswer] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSendEmail = async () => {
        setError('');
        if (!email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await pinRecoveryManager.attempt(email);
            if (!result.allowed) {
                setError(result.reason ?? 'Too many attempts. Try again later.');
                return;
            }
            pinRecoveryManager.generateToken(email);
            setStep('verification');
        } catch {
            setError('If the email is registered, a recovery link has been sent.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyToken = async () => {
        setError('');
        if (token.length < 6) {
            setError('Please enter the verification code.');
            return;
        }
        setIsSubmitting(true);
        try {
            const valid = await pinRecoveryManager.verifyEmail(token);
            if (!valid) {
                setError('Invalid or expired verification code. Please request a new one.');
                return;
            }
            setStep('security_question');
        } catch {
            setError('Verification failed. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAnswerQuestion = async () => {
        setError('');
        if (answer.length < 1) {
            setError('Please answer the security question.');
            return;
        }
        setIsSubmitting(true);
        try {
            const valid = await pinRecoveryManager.verifySecurityQuestion(answer);
            if (!valid) {
                setError('Incorrect answer.');
                return;
            }
            setStep('new_pin');
        } catch {
            setError('Failed to verify. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetNewPin = async () => {
        setError('');
        if (newPin.length < 4 || newPin !== confirmPin) {
            setError(newPin !== confirmPin ? 'PINs do not match.' : 'PIN must be at least 4 digits.');
            return;
        }
        setIsSubmitting(true);
        try {
            const success = await pinRecoveryManager.resetPin(newPin);
            if (success) {
                alert('PIN reset successfully!');
                router.replace('/auth/login');
            } else {
                setError('Failed to reset PIN. Try again.');
            }
        } catch {
            setError('Failed to reset PIN. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: S.surfaceLowest }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={S.onSurface} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Reset PIN</Text>
                </View>

                {error ? (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={18} color="#B3261E" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {step === 'email' && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Registered Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={[styles.button, isSubmitting && { opacity: 0.6 }]}
                            onPress={handleSendEmail}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.buttonText}>Send Recovery Link</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'verification' && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Verification Code</Text>
                        <TextInput
                            style={styles.input}
                            value={token}
                            onChangeText={setToken}
                            placeholder="Enter code from email"
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={[styles.button, isSubmitting && { opacity: 0.6 }]}
                            onPress={handleVerifyToken}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.buttonText}>Verify</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSendEmail}>
                            <Text style={styles.link}>Resend code</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'security_question' && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Security Question</Text>
                        <Text style={styles.questionText}>What is your favorite pet's name?</Text>
                        <TextInput
                            style={styles.input}
                            value={answer}
                            onChangeText={setAnswer}
                            placeholder="Your answer"
                        />
                        <TouchableOpacity
                            style={[styles.button, isSubmitting && { opacity: 0.6 }]}
                            onPress={handleAnswerQuestion}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.buttonText}>Submit Answer</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 'new_pin' && (
                    <View style={styles.section}>
                        <Text style={styles.label}>New PIN</Text>
                        <TextInput
                            style={styles.input}
                            value={newPin}
                            onChangeText={setNewPin}
                            placeholder="Enter new PIN"
                            keyboardType="number-pad"
                            secureTextEntry
                            maxLength={6}
                        />
                        <TextInput
                            style={styles.input}
                            value={confirmPin}
                            onChangeText={setConfirmPin}
                            placeholder="Confirm new PIN"
                            keyboardType="number-pad"
                            secureTextEntry
                            maxLength={6}
                        />
                        <TouchableOpacity
                            style={[styles.button, isSubmitting && { opacity: 0.6 }]}
                            onPress={handleSetNewPin}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.buttonText}>Reset PIN</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, flexGrow: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
    title: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FCE4EC', padding: 12, borderRadius: 8, marginBottom: 16,
    },
    errorText: { color: '#B3261E', fontSize: 14, flex: 1 },
    section: { gap: 16 },
    label: { fontSize: 14, fontWeight: '600', color: S.onSurfaceVariant },
    input: {
        borderWidth: 1, borderColor: S.outlineVariant, borderRadius: 8,
        padding: 14, fontSize: 16, color: S.onSurface, backgroundColor: S.surfaceLowest,
    },
    button: {
        backgroundColor: S.primary, paddingVertical: 14, borderRadius: 8,
        alignItems: 'center', marginTop: 8,
    },
    buttonText: { color: S.onPrimary, fontSize: 16, fontWeight: '600' },
    link: { color: S.primary, fontSize: 14, textAlign: 'center', marginTop: 8 },
    questionText: { fontSize: 16, color: S.onSurface, fontWeight: '500' },
});
