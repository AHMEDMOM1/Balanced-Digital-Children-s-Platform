import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { saveChildInfo } from '../../services/api/childInfo';
import useAuthStore from '../../store/useAuthStore';
import type { AgeGroup } from '../../services/api/types';

const S = {
    surface: '#FDF7FF', surfaceLow: '#F8F2FA', surfaceLowest: '#FFFFFF',
    primary: '#4F378A', primaryContainer: '#EADDFF', onPrimary: '#FFFFFF',
    onSurface: '#1D1B20', onSurfaceVariant: '#494551', outlineVariant: '#CBC4D2',
    error: '#BA1A1A',
};

const AGE_OPTIONS: { label: string; value: AgeGroup }[] = [
    { label: '2-4 years', value: '2-4' },
    { label: '5-7 years', value: '5-7' },
    { label: '8-10 years', value: '8-10' },
];

const AVATAR_COLORS = ['#C9A74D', '#E1D4FD', '#FFB4A2', '#9AD1D4', '#B5E8B0', '#F6C5DA'];

export default function ChildInfoScreen() {
    const router = useRouter();
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const [name, setName] = useState('');
    const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
    const [avatarColor, setAvatarColor] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = !!name.trim() && !!ageGroup && !!childId;

    const handleSave = async () => {
        if (!canSubmit || !childId) return;
        setError(null);
        setIsSaving(true);
        try {
            const result = await saveChildInfo(childId, name.trim(), ageGroup!, avatarColor);
            if (!result.success) {
                setError(result.error || 'Could not save child info. Please try again.');
                return;
            }
            // Refresh the children list in the store so the dashboard shows the new name immediately
            await useAuthStore.getState().initialize();
            router.replace('/(parent)');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="happy" size={40} color={S.primary} />
                        </View>
                        <Text style={styles.title}>Tell us about your child</Text>
                        <Text style={styles.subtitle}>Their device is paired — just a couple of details left</Text>
                    </View>

                    <View style={styles.card}>
                        {error && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color={S.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <View style={styles.field}>
                            <Text style={styles.label}>Child's Name</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="person-outline" size={18} color={S.onSurfaceVariant} />
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="e.g. Leo"
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

                        <View style={styles.field}>
                            <Text style={styles.label}>Avatar Color (optional)</Text>
                            <View style={styles.avatarRow}>
                                {AVATAR_COLORS.map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.avatarSwatch,
                                            { backgroundColor: color },
                                            avatarColor === color && styles.avatarSwatchSelected,
                                        ]}
                                        onPress={() => setAvatarColor(avatarColor === color ? null : color)}
                                    >
                                        {avatarColor === color && (
                                            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, !canSubmit && styles.disabledBtn]}
                            onPress={handleSave}
                            disabled={isSaving || !canSubmit}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={S.onPrimary} />
                            ) : (
                                <Text style={styles.primaryBtnText}>Finish Setup</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surfaceLow },
    content: { padding: 24, paddingTop: 40, flexGrow: 1, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 28 },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: S.primaryContainer,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    title: { fontSize: 24, fontWeight: '700', color: S.primary, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: S.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
    card: { backgroundColor: S.surfaceLowest, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: S.outlineVariant },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFDAD6', padding: 12, borderRadius: 8, marginBottom: 16 },
    errorText: { fontSize: 13, color: S.error, flex: 1 },
    field: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '500', color: S.onSurfaceVariant, marginBottom: 8 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: S.outlineVariant,
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: S.surface,
    },
    input: { flex: 1, fontSize: 15, color: S.onSurface },
    ageGroupRow: { flexDirection: 'row', gap: 8 },
    ageChip: {
        flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: S.outlineVariant,
        alignItems: 'center', backgroundColor: S.surface,
    },
    ageChipSelected: { backgroundColor: S.primaryContainer, borderColor: S.primary },
    ageChipText: { fontSize: 13, color: S.onSurfaceVariant, fontWeight: '500' },
    ageChipTextSelected: { color: S.primary, fontWeight: '700' },
    avatarRow: { flexDirection: 'row', gap: 12 },
    avatarSwatch: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'transparent',
    },
    avatarSwatchSelected: { borderColor: S.primary },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: S.primary, borderRadius: 12, paddingVertical: 14, marginTop: 8,
    },
    disabledBtn: { opacity: 0.5 },
    primaryBtnText: { fontSize: 16, fontWeight: '600', color: S.onPrimary },
});
