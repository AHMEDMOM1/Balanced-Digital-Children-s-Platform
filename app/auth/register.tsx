import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/api/hooks';
import { getClient } from '../../services/api/client';

const S = {
    surface: '#FDF7FF', surfaceLow: '#F8F2FA', surfaceLowest: '#FFFFFF',
    primary: '#4F378A', primaryContainer: '#EADDFF', onPrimary: '#FFFFFF',
    onSurface: '#1D1B20', onSurfaceVariant: '#494551', outlineVariant: '#CBC4D2',
    error: '#BA1A1A', success: '#2E7D32', successContainer: '#C8E6C9',
};

export default function RegisterScreen() {
    const router = useRouter();
    const auth = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'details' | 'code'>('details');
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSendOtp = async () => {
        setLocalError(null);
        if (!name.trim() || !email.trim()) return;
        setIsLoading(true);
        try {
            const supabase = getClient();
            const { error } = await supabase.auth.signInWithOtp({
                email: email.trim(),
                options: {
                    shouldCreateUser: true,
                    data: { full_name: name.trim() }
                }
            });
            if (error) throw error;
            setStep('code');
        } catch (err: any) {
            setLocalError(err.message || 'OTP delivery error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyRegistration = async () => {
        setLocalError(null);
        if (!code.trim()) return;
        setIsLoading(true);
        try {
            await auth.verifyOtp(email.trim(), code.trim());
            router.replace('/(parent)');
        } catch (err: any) {
            setLocalError(err.message || 'Registration verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={S.primary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="people" size={36} color={S.primary} />
                        </View>
                        <Text style={styles.title}>Register Family</Text>
                        <Text style={styles.subtitle}>Create your family account to get started</Text>
                    </View>

                    <View style={styles.card}>
                        {(localError || auth.error) && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color={S.error} />
                                <Text style={styles.errorText}>{localError || auth.error}</Text>
                            </View>
                        )}

                        {step === 'details' ? (
                            <View>
                                <View style={styles.field}>
                                    <Text style={styles.label}>Parent Full Name</Text>
                                    <View style={styles.inputRow}>
                                        <Ionicons name="person-outline" size={18} color={S.onSurfaceVariant} />
                                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={S.outlineVariant} />
                                    </View>
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Email Address</Text>
                                    <View style={styles.inputRow}>
                                        <Ionicons name="mail-outline" size={18} color={S.onSurfaceVariant} />
                                        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={S.outlineVariant} keyboardType="email-address" autoCapitalize="none" />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, (!name.trim() || !email.trim()) && styles.disabledBtn]}
                                    onPress={handleSendOtp}
                                    disabled={isLoading || !name.trim() || !email.trim()}
                                >
                                    {isLoading ? <ActivityIndicator color={S.onPrimary} /> : <Text style={styles.primaryBtnText}>Register with OTP</Text>}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                <View style={styles.field}>
                                    <Text style={styles.label}>6-Digit OTP Code</Text>
                                    <View style={styles.inputRow}>
                                        <Ionicons name="lock-closed-outline" size={18} color={S.onSurfaceVariant} />
                                        <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="123456" placeholderTextColor={S.outlineVariant} keyboardType="number-pad" maxLength={6} />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, !code.trim() && styles.disabledBtn]}
                                    onPress={handleVerifyRegistration}
                                    disabled={isLoading || !code.trim()}
                                >
                                    {isLoading ? <ActivityIndicator color={S.onPrimary} /> : <Text style={styles.primaryBtnText}>Verify & Create Profile</Text>}
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
    safe: { flex: 1, backgroundColor: '#F8F2FA' },
    content: { padding: 24, paddingTop: 16, flexGrow: 1 },
    backBtn: { padding: 8, alignSelf: 'flex-start', marginBottom: 8 },
    header: { alignItems: 'center', marginBottom: 24 },
    iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EADDFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title: { fontSize: 26, fontWeight: '700', color: '#4F378A', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#494551', textAlign: 'center' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#CBC4D2' },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFDAD6', padding: 12, borderRadius: 8, marginBottom: 16 },
    errorText: { fontSize: 13, color: '#BA1A1A', flex: 1 },
    field: { marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '500', color: '#494551', marginBottom: 8 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#CBC4D2', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FDF7FF' },
    input: { flex: 1, fontSize: 15, color: '#1D1B20' },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4F378A', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
    disabledBtn: { opacity: 0.5 },
    primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' }
});
