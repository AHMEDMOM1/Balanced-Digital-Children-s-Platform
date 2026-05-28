/**
 * Account Profile Screen — Stitch parent_settings_account_profile Design
 * - Avatar with edit button, Personal Information form
 * - Linked Child Profiles section
 * - Delete Account danger zone
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    surfaceHighest: '#E6E0E9',
    primary: '#4F378A',
    primaryContainer: '#6750A4',
    onPrimary: '#FFFFFF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    tertiaryContainer: '#C9A74D',
    secondaryContainer: '#E1D4FD',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',
};

export default function SettingsProfileScreen() {
    const router = useRouter();
    const [name, setName] = useState('Sarah Jenkins');
    const [email, setEmail] = useState('sarah.jenkins@example.com');

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={S.primary} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Parental Control</Text>
                <TouchableOpacity style={styles.topBarBtn}>
                    <Ionicons name="settings-outline" size={22} color={S.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Page Header */}
                <Text style={styles.pageTitle}>Account Profile</Text>
                <Text style={styles.pageDesc}>
                    Manage your personal information and linked family members.
                </Text>

                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarOuter}>
                        <View style={styles.avatarCircle}>
                            <Ionicons name="person" size={44} color={S.primary} />
                        </View>
                        <TouchableOpacity style={styles.editAvatarBtn}>
                            <Ionicons name="pencil" size={14} color={S.onPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Personal Information ── */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>Personal Information</Text>
                    <View style={styles.cardDivider} />

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Full Name</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Email Address</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.saveBtnRow}>
                        <TouchableOpacity style={styles.saveBtn}>
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Linked Child Profiles ── */}
                <View style={styles.card}>
                    <View style={styles.childHeader}>
                        <Text style={styles.cardSectionTitle}>Linked Child Profiles</Text>
                        <TouchableOpacity style={styles.addProfileBtn}>
                            <Ionicons name="add" size={16} color={S.primary} />
                            <Text style={styles.addProfileText}>Add Profile</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.cardDivider} />

                    {/* Child 1 */}
                    <View style={styles.childRow}>
                        <View style={[styles.childAvatar, { backgroundColor: S.tertiaryContainer }]}>
                            <Text style={styles.childAvatarText}>L</Text>
                        </View>
                        <View style={styles.childInfo}>
                            <Text style={styles.childName}>Leo Jenkins</Text>
                            <Text style={styles.childAge}>Age 8</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/(parent)/settings-child-profile' as any, params: { childId: 'L' } })}>
                            <Text style={styles.manageLink}>Manage</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Child 2 */}
                    <View style={styles.childRow}>
                        <View style={[styles.childAvatar, { backgroundColor: S.secondaryContainer }]}>
                            <Text style={styles.childAvatarText}>M</Text>
                        </View>
                        <View style={styles.childInfo}>
                            <Text style={styles.childName}>Mia Jenkins</Text>
                            <Text style={styles.childAge}>Age 5</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/(parent)/settings-child-profile' as any, params: { childId: 'M' } })}>
                            <Text style={styles.manageLink}>Manage</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Danger Zone ── */}
                <View style={styles.dangerCard}>
                    <Text style={styles.dangerTitle}>Delete Account</Text>
                    <Text style={styles.dangerDesc}>
                        Permanently remove your account and all associated data, including linked child profiles. This action cannot be undone.
                    </Text>
                    <TouchableOpacity style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surface },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: S.outlineVariant,
    },
    topBarBtn: { padding: 8, borderRadius: 99 },
    topBarTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    content: { padding: 20, paddingBottom: 40 },
    pageTitle: { fontSize: 24, fontWeight: '700', color: S.onSurface },
    pageDesc: { fontSize: 15, color: S.onSurfaceVariant, marginTop: 4, marginBottom: 20, lineHeight: 22 },

    // Avatar
    avatarSection: { alignItems: 'center', paddingVertical: 24 },
    avatarOuter: { position: 'relative' },
    avatarCircle: {
        width: 96, height: 96, borderRadius: 48, backgroundColor: S.surfaceHighest,
        borderWidth: 4, borderColor: S.surfaceLowest,
        alignItems: 'center', justifyContent: 'center',
    },
    editAvatarBtn: {
        position: 'absolute', bottom: 0, right: 0,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: S.primary, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: S.surface,
    },

    // Card
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant,
        padding: 24, marginBottom: 20,
    },
    cardSectionTitle: { fontSize: 18, fontWeight: '600', color: S.onSurface },
    cardDivider: { height: 1, backgroundColor: S.outlineVariant, marginVertical: 12 },

    // Form fields
    field: { marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '500', color: S.onSurfaceVariant, marginBottom: 6 },
    fieldInput: {
        borderWidth: 1, borderColor: S.outlineVariant, borderRadius: 4,
        paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
        color: S.onSurface, backgroundColor: S.surface,
    },
    saveBtnRow: { alignItems: 'flex-end', paddingTop: 8 },
    saveBtn: {
        backgroundColor: S.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8,
    },
    saveBtnText: { fontSize: 15, fontWeight: '600', color: S.onPrimary },

    // Child Profiles
    childHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    addProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addProfileText: { fontSize: 13, fontWeight: '600', color: S.primary },
    childRow: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        borderWidth: 1, borderColor: S.outlineVariant, borderRadius: 4,
        backgroundColor: S.surface, marginTop: 8,
    },
    childAvatar: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
    },
    childAvatarText: { fontSize: 18, fontWeight: '700', color: S.onSurface },
    childInfo: { flex: 1 },
    childName: { fontSize: 15, fontWeight: '600', color: S.onSurface },
    childAge: { fontSize: 13, color: S.onSurfaceVariant },
    manageLink: { fontSize: 13, fontWeight: '500', color: S.primary },

    // Danger zone
    dangerCard: {
        borderWidth: 1, borderColor: S.errorContainer, borderRadius: 12,
        padding: 24, backgroundColor: S.surfaceLowest, marginTop: 12,
    },
    dangerTitle: { fontSize: 18, fontWeight: '600', color: S.error, marginBottom: 4 },
    dangerDesc: { fontSize: 13, color: S.onSurfaceVariant, lineHeight: 18, marginBottom: 16 },
    deleteBtn: {
        backgroundColor: S.errorContainer, borderWidth: 1, borderColor: S.error,
        borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, alignSelf: 'flex-start',
    },
    deleteBtnText: { fontSize: 15, fontWeight: '600', color: S.onErrorContainer },
});
