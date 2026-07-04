import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendForgotPinOtp, verifyForgotPinOtp, updateParentPinHash } from '../../services/api/pinAuth';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    primary: '#4F378A',
    onPrimary: '#FFFFFF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
};

const PIN_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 600; // 10 minutes
const MAX_OTP_FAILURES = 3;

type Step = 'email' | 'otp' | 'new-pin';

export default function ForgotPinScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const [otpFailures, setOtpFailures] = useState(0);
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [pinStep, setPinStep] = useState<'new' | 'confirm'>('new');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const otpStartedAt = useRef<number | null>(null);

    // OTP countdown timer
    useEffect(() => {
        if (step !== 'otp') return;
        otpStartedAt.current = Date.now();
        setOtpCountdown(OTP_EXPIRY_SECONDS);

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - (otpStartedAt.current ?? Date.now())) / 1000);
            const remaining = OTP_EXPIRY_SECONDS - elapsed;
            if (remaining <= 0) {
                setOtpCountdown(0);
                clearInterval(interval);
            } else {
                setOtpCountdown(remaining);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [step]);

    const formatCountdown = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // ── Step 1: Email ──────────────────────────────────────────────────────────

    const handleSendOtp = async () => {
        setError('');
        if (!email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await sendForgotPinOtp(email);
            if (!result.allowed) {
                setError(result.reason === 'delivery_error'
                    ? 'Failed to send email. Please try again.'
                    : 'Too many attempts. Please wait before requesting again.');
                return;
            }
            setOtpToken('');
            setOtpFailures(0);
            setStep('otp');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Step 2: OTP ────────────────────────────────────────────────────────────

    const handleVerifyOtp = async () => {
        setError('');
        if (otpToken.length < 6) {
            setError('Please enter the 6-digit code from your email.');
            return;
        }
        if (otpCountdown === 0) {
            setError('Code expired. Please request a new one.');
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await verifyForgotPinOtp(email, otpToken);
            if (!result.valid) {
                const nextFailures = otpFailures + 1;
                if (nextFailures >= MAX_OTP_FAILURES) {
                    // Too many OTP failures — restart from email step
                    setOtpFailures(0);
                    setOtpToken('');
                    setStep('email');
                    setError('Too many incorrect codes. Please request a new one.');
                } else {
                    setOtpFailures(nextFailures);
                    setOtpToken('');
                    setError(`Incorrect code. ${MAX_OTP_FAILURES - nextFailures} attempt(s) remaining.`);
                }
                return;
            }
            setNewPin('');
            setConfirmPin('');
            setPinStep('new');
            setStep('new-pin');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Step 3: New PIN (6-dot keypad) ─────────────────────────────────────────

    const handlePinPress = (digit: string) => {
        setError('');
        if (pinStep === 'new' && newPin.length < PIN_LENGTH) {
            setNewPin(prev => prev + digit);
        } else if (pinStep === 'confirm' && confirmPin.length < PIN_LENGTH) {
            setConfirmPin(prev => prev + digit);
        }
    };

    const handlePinBackspace = () => {
        if (pinStep === 'new') setNewPin(prev => prev.slice(0, -1));
        else setConfirmPin(prev => prev.slice(0, -1));
    };

    const handlePinNext = async () => {
        if (pinStep === 'new') {
            if (newPin.length === PIN_LENGTH) setPinStep('confirm');
            return;
        }
        if (pinStep === 'confirm') {
            if (confirmPin !== newPin) {
                setError('PINs do not match.');
                setConfirmPin('');
                return;
            }
            setIsSubmitting(true);
            try {
                await updateParentPinHash(newPin, email);
                router.replace('/(parent)');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const renderPinDots = (value: string, active: boolean) => (
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
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={S.onSurface} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Reset PIN</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                {/* Step indicators */}
                <View style={styles.stepRow}>
                    {(['email', 'otp', 'new-pin'] as Step[]).map((s, idx) => (
                        <View key={s} style={styles.stepItem}>
                            <View style={[styles.stepDot, step === s && styles.stepDotActive, (['email','otp','new-pin'] as Step[]).indexOf(step) > idx && styles.stepDotDone]}>
                                <Text style={[styles.stepNum, (step === s || (['email','otp','new-pin'] as Step[]).indexOf(step) > idx) && { color: '#fff' }]}>{idx + 1}</Text>
                            </View>
                            {idx < 2 && <View style={styles.stepLine} />}
                        </View>
                    ))}
                </View>

                {/* Error banner */}
                {error ? (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={18} color={S.error} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* ── Step 1: Email ── */}
                {step === 'email' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Enter your email</Text>
                        <Text style={styles.cardDesc}>
                            We'll send a one-time code to your registered email address.
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="your@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleSendOtp}
                        />
                        <TouchableOpacity
                            style={[styles.button, isSubmitting && styles.buttonDisabled]}
                            onPress={handleSendOtp}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.buttonText}>{isSubmitting ? 'Sending…' : 'Send Code'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Step 2: OTP ── */}
                {step === 'otp' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Enter verification code</Text>
                        <Text style={styles.cardDesc}>
                            Enter the 6-digit code sent to {email}.
                        </Text>
                        {otpCountdown > 0 ? (
                            <Text style={styles.countdown}>Code expires in {formatCountdown(otpCountdown)}</Text>
                        ) : (
                            <Text style={[styles.countdown, { color: S.error }]}>Code expired</Text>
                        )}
                        <TextInput
                            style={styles.input}
                            value={otpToken}
                            onChangeText={t => setOtpToken(t.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="123456"
                            keyboardType="number-pad"
                            maxLength={6}
                            returnKeyType="done"
                            onSubmitEditing={handleVerifyOtp}
                        />
                        <TouchableOpacity
                            style={[styles.button, isSubmitting && styles.buttonDisabled]}
                            onPress={handleVerifyOtp}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.buttonText}>{isSubmitting ? 'Verifying…' : 'Verify Code'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.linkRow} onPress={() => { setStep('email'); setError(''); }}>
                            <Text style={styles.link}>Didn't receive it? Go back</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Step 3: New PIN ── */}
                {step === 'new-pin' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Create new PIN</Text>
                        <Text style={styles.cardDesc}>Choose a new 6-digit PIN for parent access.</Text>

                        <View style={styles.pinSection}>
                            <Text style={styles.pinLabel}>New PIN</Text>
                            {renderPinDots(newPin, pinStep === 'new')}
                        </View>

                        <View style={[styles.pinSection, pinStep !== 'confirm' && styles.dimmed]}>
                            <Text style={styles.pinLabel}>Confirm New PIN</Text>
                            {renderPinDots(confirmPin, pinStep === 'confirm')}
                        </View>

                        <View style={styles.keypad}>
                            {['1','2','3','4','5','6','7','8','9'].map(d => (
                                <TouchableOpacity
                                    key={d}
                                    style={styles.key}
                                    onPress={() => handlePinPress(d)}
                                    disabled={isSubmitting}
                                >
                                    <Text style={styles.keyText}>{d}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.keyAction} onPress={handlePinBackspace} disabled={isSubmitting}>
                                <Ionicons name="backspace-outline" size={24} color={S.onSurfaceVariant} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.key}
                                onPress={() => handlePinPress('0')}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.keyText}>0</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.keyAction} onPress={handlePinNext} disabled={isSubmitting}>
                                <Text style={[styles.keyText, { color: S.primary, fontWeight: '700' }]}>
                                    {isSubmitting ? '…' : 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surface },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: S.outlineVariant,
    },
    backBtn: { width: 40, alignItems: 'flex-start' },
    topBarTitle: { fontSize: 20, fontWeight: '700', color: S.onSurface },
    content: { flexGrow: 1, padding: 20 },
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    stepItem: { flexDirection: 'row', alignItems: 'center' },
    stepDot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: S.surfaceLow, borderWidth: 1, borderColor: S.outlineVariant,
        alignItems: 'center', justifyContent: 'center',
    },
    stepDotActive: { backgroundColor: S.primary, borderColor: S.primary },
    stepDotDone: { backgroundColor: S.primary, borderColor: S.primary },
    stepNum: { fontSize: 12, fontWeight: '700', color: S.onSurfaceVariant },
    stepLine: { width: 32, height: 1, backgroundColor: S.outlineVariant, marginHorizontal: 4 },
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: S.errorContainer, padding: 12, borderRadius: 8, marginBottom: 16,
    },
    errorText: { color: S.error, fontSize: 14, flex: 1 },
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant,
        padding: 28, alignItems: 'stretch',
    },
    cardTitle: { fontSize: 18, fontWeight: '700', color: S.onSurface, marginBottom: 8 },
    cardDesc: { fontSize: 14, color: S.onSurfaceVariant, lineHeight: 20, marginBottom: 20 },
    countdown: { fontSize: 13, color: S.onSurfaceVariant, marginBottom: 12, textAlign: 'center' },
    input: {
        borderWidth: 1, borderColor: S.outlineVariant, borderRadius: 8,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
        color: S.onSurface, backgroundColor: S.surfaceLowest,
        marginBottom: 16,
    },
    button: {
        backgroundColor: S.primary, paddingVertical: 14, borderRadius: 8,
        alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: S.onPrimary, fontSize: 16, fontWeight: '700' },
    linkRow: { alignItems: 'center', marginTop: 16 },
    link: { color: S.primary, fontSize: 14, fontWeight: '500' },
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
        gap: 12, marginTop: 8, alignSelf: 'center',
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
