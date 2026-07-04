import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/api/hooks';

const S = {
    surface: '#FDF7FF', surfaceLow: '#F8F2FA', surfaceLowest: '#FFFFFF',
    primary: '#4F378A', primaryContainer: '#EADDFF', onPrimary: '#FFFFFF',
    onPrimaryContainer: '#21005D', onSurface: '#1D1B20', onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2', error: '#BA1A1A',
};

export default function LoginScreen() {
    const router = useRouter();
    const auth = useAuth();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'email' | 'code'>('email');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSendOtp = async () => {
        setLocalError(null);
        if (!email.trim()) return;
        setIsActionLoading(true);
        try {
            await auth.sendOtp(email.trim());
            setStep('code');
        } catch (err: any) {
            setLocalError(err.message || 'Failed to send OTP code');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLocalError(null);
        if (!code.trim()) return;
        setIsActionLoading(true);
        try {
            await auth.verifyOtp(email.trim(), code.trim());
            // PIN gates entry to the dashboard; pairing a child happens later
            // from inside the dashboard ("Add Child"), not before it.
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            const parentPinHash = await AsyncStorage.getItem('@parent_pin_hash');
            router.replace(parentPinHash ? '/(parent)' : '/auth/setup-pin');
        } catch (err: any) {
            setLocalError(err.message || 'OTP token is invalid or expired');
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={40} color={S.primary} />
                        </View>
                        <Text style={styles.title}>SafePlay Timer</Text>
                        <Text style={styles.subtitle}>Sign in to manage your child's device safely</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Parent Authorization</Text>
                        <View style={styles.divider} />

                        {(localError || auth.error) && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color={S.error} />
                                <Text style={styles.errorText}>{localError || auth.error}</Text>
                            </View>
                        )}

                        {step === 'email' ? (
                            <View style={styles.field}>
                                <Text style={styles.label}>Email Address</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="mail-outline" size={18} color={S.onSurfaceVariant} />
                                    <TextInput
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="sarah.jenkins@example.com"
                                        placeholderTextColor={S.outlineVariant}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.primaryBtn, !email.trim() && styles.disabledBtn]}
                                    onPress={handleSendOtp}
                                    disabled={isActionLoading || !email.trim()}
                                >
                                    {isActionLoading ? <ActivityIndicator color={S.onPrimary} /> : <Text style={styles.primaryBtnText}>Send Verification Code</Text>}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.field}>
                                <Text style={styles.label}>Verification Code</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="lock-closed-outline" size={18} color={S.onSurfaceVariant} />
                                    <TextInput
                                        style={styles.input}
                                        value={code}
                                        onChangeText={setCode}
                                        placeholder="12345678"
                                        placeholderTextColor={S.outlineVariant}
                                        keyboardType="number-pad"
                                        maxLength={8}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.primaryBtn, !code.trim() && styles.disabledBtn]}
                                    onPress={handleVerifyOtp}
                                    disabled={isActionLoading || !code.trim()}
                                >
                                    {isActionLoading ? <ActivityIndicator color={S.onPrimary} /> : <Text style={styles.primaryBtnText}>Confirm & Log In</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.backLink} onPress={() => setStep('email')}>
                                    <Text style={styles.backLinkText}>Change email address</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surfaceLow },
    content: { padding: 24, paddingTop: 40, flexGrow: 1, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 32 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: S.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: S.primary, marginBottom: 8 },
    subtitle: { fontSize: 15, color: S.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
    card: { backgroundColor: S.surfaceLowest, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: S.outlineVariant, marginBottom: 20 },
    cardTitle: { fontSize: 20, fontWeight: '600', color: S.onSurface },
    divider: { height: 1, backgroundColor: S.outlineVariant, marginVertical: 16 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFDAD6', padding: 12, borderRadius: 8, marginBottom: 16 },
    errorText: { fontSize: 13, color: S.error, flex: 1 },
    field: { marginBottom: 10 },
    label: { fontSize: 13, fontWeight: '500', color: S.onSurfaceVariant, marginBottom: 8 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: S.outlineVariant, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: S.surface, marginBottom: 16 },
    input: { flex: 1, fontSize: 15, color: S.onSurface },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: S.primary, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
    disabledBtn: { opacity: 0.5 },
    primaryBtnText: { fontSize: 16, fontWeight: '600', color: S.onPrimary },
    backLink: { marginTop: 16, alignItems: 'center' },
    backLinkText: { color: S.primary, fontSize: 14, fontWeight: '500' }
});
