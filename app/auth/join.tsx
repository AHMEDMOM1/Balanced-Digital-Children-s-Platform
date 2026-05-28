import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFamilyCode } from '../../services/api/hooks';
import type { AgeGroup } from '../../services/api/types';

const S = {
    surface: '#FDF7FF', surfaceLow: '#F8F2FA', surfaceLowest: '#FFFFFF',
    primary: '#4F378A', primaryContainer: '#EADDFF', onPrimary: '#FFFFFF',
    onSurface: '#1D1B20', onSurfaceVariant: '#494551', outlineVariant: '#CBC4D2',
    error: '#BA1A1A', childPrimary: '#FF6B6B', childBg: '#FFF5F5',
};

const AGE_OPTIONS: { label: string; value: AgeGroup }[] = [
    { label: '2-4 years', value: '2-4' },
    { label: '5-7 years', value: '5-7' },
    { label: '8-10 years', value: '8-10' },
];

export default function JoinScreen() {
    const router = useRouter();
    const { redeem, error, isGenerating } = useFamilyCode();
    const [familyCode, setFamilyCode] = useState('');
    const [childName, setChildName] = useState('');
    const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleJoin = async () => {
        setLocalError(null);
        if (!familyCode.trim() || !childName.trim() || !ageGroup) return;
        try {
            await redeem(familyCode.trim().toUpperCase(), childName.trim(), ageGroup);
            router.replace('/(child)');
        } catch (err: any) {
            setLocalError(err.message || 'Failed to link device');
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
                            <Ionicons name="happy" size={44} color={S.childPrimary} />
                        </View>
                        <Text style={styles.title}>Welcome!</Text>
                        <Text style={styles.subtitle}>
                            Enter the code from your parent to link your device
                        </Text>
                    </View>

                    <View style={styles.card}>
                        {(localError || error) && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color={S.error} />
                                <Text style={styles.errorText}>{localError || error}</Text>
                            </View>
                        )}

                        <View style={styles.field}>
                            <Text style={styles.label}>Family Code</Text>
                            <TextInput
                                style={styles.codeInput}
                                value={familyCode}
                                onChangeText={(t) => setFamilyCode(t.toUpperCase())}
                                placeholder="ABC123"
                                placeholderTextColor={S.outlineVariant}
                                maxLength={6}
                                autoCapitalize="characters"
                                textAlign="center"
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Child's Full Name</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="happy-outline" size={18} color={S.onSurfaceVariant} />
                                <TextInput
                                    style={styles.input}
                                    value={childName}
                                    onChangeText={setChildName}
                                    placeholder="Your name"
                                    placeholderTextColor={S.outlineVariant}
                                />
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Age Group</Text>
                            <View style={styles.ageGroupRow}>
                                {AGE_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.ageChip, ageGroup === opt.value && styles.ageChipSelected]}
                                        onPress={() => setAgeGroup(opt.value)}
                                    >
                                        <Text style={[styles.ageChipText, ageGroup === opt.value && styles.ageChipTextSelected]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, (!familyCode || !childName || !ageGroup) && styles.disabledBtn]}
                            onPress={handleJoin}
                            disabled={isGenerating || !familyCode || !childName || !ageGroup}
                        >
                            {isGenerating ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="link-outline" size={20} color="#FFF" />
                                    <Text style={styles.primaryBtnText}>Link Device</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.childBg },
    content: { padding: 24, paddingTop: 16, flexGrow: 1, justifyContent: 'center' },
    backBtn: { padding: 8, alignSelf: 'flex-start', marginBottom: 8 },
    header: { alignItems: 'center', marginBottom: 28 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFE0E0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: S.onSurface, marginBottom: 8 },
    subtitle: { fontSize: 15, color: S.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
    card: { backgroundColor: S.surfaceLowest, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: S.outlineVariant, marginBottom: 20 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFDAD6', padding: 12, borderRadius: 8, marginBottom: 16 },
    errorText: { fontSize: 13, color: S.error, flex: 1 },
    field: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '500', color: S.onSurfaceVariant, marginBottom: 8 },
    codeInput: { borderWidth: 2, borderColor: S.primary, borderRadius: 12, borderStyle: 'dashed', paddingVertical: 16, fontSize: 28, fontWeight: '700', color: S.primary, letterSpacing: 8, backgroundColor: S.primaryContainer, textAlign: 'center' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: S.outlineVariant, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: S.surface },
    input: { flex: 1, fontSize: 15, color: S.onSurface },
    ageGroupRow: { flexDirection: 'row', gap: 8 },
    ageChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: S.outlineVariant, alignItems: 'center', backgroundColor: S.surface },
    ageChipSelected: { backgroundColor: S.primaryContainer, borderColor: S.primary },
    ageChipText: { fontSize: 13, color: S.onSurfaceVariant, fontWeight: '500' },
    ageChipTextSelected: { color: S.primary, fontWeight: '700' },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: S.childPrimary, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
    disabledBtn: { opacity: 0.5 },
    primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
