/**
 * Parent Settings Screen — Stitch "Dual-Horizon" Design
 * Matches Stitch parent_settings_profile_preferences:
 * - Clean surface background (#FDF7FF)
 * - Profile card with avatar circle, name, email, Edit button
 * - Grouped setting items in bordered cards with chevrons
 * - Section titles, dividers, and Stitch color tokens
 * - Footer with version + tagline
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';
import useAuthStore from '../../store/useAuthStore';

// Stitch palette constants
const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceHigh: '#ECE6EE',
    surfaceHighest: '#E6E0E9',
    surfaceLowest: '#FFFFFF',
    primary: '#4F378A',
    primaryContainer: '#6750A4',
    onPrimary: '#FFFFFF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    outline: '#7A7582',
    secondaryContainer: '#E1D4FD',
    tertiaryContainer: '#C9A74D',
    errorContainer: '#FFDAD6',
    error: '#BA1A1A',
    onError: '#FFFFFF',
};

export default function SettingsScreen() {
    const router = useRouter();
    const parentData = useAuthStore((s) => s.parentData);

    const SettingsItem = ({ icon, title, value, onPress, danger = false, showChevron = true }: any) => (
        <TouchableOpacity
            style={styles.settingsItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconCircle, danger && styles.dangerIconCircle]}>
                <Ionicons name={icon} size={20} color={danger ? S.error : S.primary} />
            </View>
            <View style={styles.itemTextCol}>
                <Text style={[styles.settingsTitle, danger && styles.dangerText]}>{title}</Text>
            </View>
            {value && <Text style={styles.settingsValue}>{value}</Text>}
            {showChevron && (
                <Ionicons name="chevron-forward" size={18} color={S.outline} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top App Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={S.primary} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Parental Control</Text>
                <TouchableOpacity style={styles.topBarBtn}>
                    <Ionicons name="settings-outline" size={22} color={S.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                {/* ── Page Header ── */}
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>Settings</Text>
                    <Text style={styles.pageSubtitle}>
                        Manage your profile, security, and app preferences.
                    </Text>
                </View>

                {/* ── Profile Card ── */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarCircle}>
                        <Ionicons name="person" size={36} color={S.primary} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{parentData?.name ?? 'Parent'}</Text>
                        <Text style={styles.profileEmail}>{parentData?.email ?? ''}</Text>
                    </View>
                    <TouchableOpacity style={styles.editPill} onPress={() => router.push('/(parent)/settings-profile' as any)}>
                        <Ionicons name="pencil" size={14} color={S.primary} />
                        <Text style={styles.editPillText}>Edit</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Security Section ── */}
                <Text style={styles.sectionLabel}>Security</Text>
                <View style={styles.card}>
                    <SettingsItem
                        icon="lock-closed-outline"
                        title="Change PIN"
                        value="••••••"
                        onPress={() => router.push('/(parent)/settings-pin' as any)}
                    />
                    <View style={styles.divider} />
                    <SettingsItem
                        icon="finger-print-outline"
                        title="Biometric Auth"
                        value="Enabled"
                        onPress={() => {}}
                    />
                </View>

                {/* ── Preferences Section ── */}
                <Text style={styles.sectionLabel}>Preferences</Text>
                <View style={styles.card}>
                    <SettingsItem
                        icon="notifications-outline"
                        title="Notifications"
                        onPress={() => router.push('/(parent)/settings-notifications' as any)}
                    />
                    <View style={styles.divider} />
                    <SettingsItem
                        icon="globe-outline"
                        title="App Language"
                        value="English"
                        onPress={() => router.push('/(parent)/settings-language' as any)}
                    />
                </View>

                {/* ── Support & Legal Section ── */}
                <Text style={styles.sectionLabel}>Support & Legal</Text>
                <View style={styles.card}>
                    <SettingsItem
                        icon="help-buoy-outline"
                        title="Help & Support"
                        onPress={() => router.push('/(parent)/settings-help' as any)}
                    />
                    <View style={styles.divider} />
                    <SettingsItem
                        icon="document-text-outline"
                        title="Privacy Policy"
                        onPress={() => router.push('/(parent)/settings-privacy' as any)}
                    />
                    <View style={styles.divider} />
                    <SettingsItem
                        icon="information-circle-outline"
                        title="Terms of Service"
                        onPress={() => {}}
                    />
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

                {/* ── Logout ── */}
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={() => router.replace('/')}
                >
                    <Ionicons name="log-out-outline" size={20} color={S.error} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <Text style={styles.versionText}>SafePlay Timer v1.0.0</Text>
                    <Text style={styles.footerNote}>Made with ❤️ for balanced digital childhoods.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: S.surface,
    },

    // ── Top App Bar ──
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: S.outlineVariant,
    },
    topBarBtn: {
        padding: 8,
        borderRadius: 99,
    },
    topBarTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: S.onSurface,
        fontFamily: 'Inter_700Bold',
    },

    content: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },

    // ── Page Header ──
    pageHeader: {
        marginBottom: 24,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: S.onSurface,
        fontFamily: 'Inter_700Bold',
    },
    pageSubtitle: {
        fontSize: 15,
        lineHeight: 22,
        color: S.onSurfaceVariant,
        marginTop: 4,
        fontFamily: 'Inter_400Regular',
    },

    // ── Profile Card ──
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: S.surfaceLowest,
        borderWidth: 1,
        borderColor: S.outlineVariant,
        borderRadius: 16,
        padding: 16,
        marginBottom: 28,
    },
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: S.surfaceHighest,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        color: S.onSurface,
        fontFamily: 'Inter_600SemiBold',
    },
    profileEmail: {
        fontSize: 13,
        color: S.onSurfaceVariant,
        marginTop: 2,
        fontFamily: 'Inter_400Regular',
    },
    editPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: S.surfaceLow,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    editPillText: {
        fontSize: 13,
        fontWeight: '700',
        color: S.primary,
        fontFamily: 'Inter_700Bold',
    },

    // ── Section Label ──
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: S.onSurface,
        marginBottom: 10,
        fontFamily: 'Inter_600SemiBold',
    },

    // ── Card ──
    card: {
        backgroundColor: S.surfaceLowest,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: S.outlineVariant,
        overflow: 'hidden',
        marginBottom: 24,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: S.surfaceLow,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dangerIconCircle: {
        backgroundColor: S.errorContainer,
    },
    itemTextCol: {
        flex: 1,
    },
    settingsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: S.onSurface,
        fontFamily: 'Inter_600SemiBold',
    },
    dangerText: {
        color: S.error,
    },
    settingsValue: {
        fontSize: 13,
        color: S.onSurfaceVariant,
        marginRight: 8,
        fontFamily: 'Inter_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: S.outlineVariant,
        marginHorizontal: 16,
    },

    // ── Danger Zone ──
    dangerCard: {
        borderWidth: 1,
        borderColor: S.errorContainer,
        borderRadius: 12,
        padding: 20,
        backgroundColor: S.surfaceLowest,
        marginBottom: 20,
    },
    dangerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: S.error,
        marginBottom: 6,
        fontFamily: 'Inter_600SemiBold',
    },
    dangerDesc: {
        fontSize: 13,
        color: S.onSurfaceVariant,
        lineHeight: 18,
        marginBottom: 16,
        fontFamily: 'Inter_400Regular',
    },
    deleteBtn: {
        backgroundColor: S.errorContainer,
        borderWidth: 1,
        borderColor: S.error,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 24,
        alignSelf: 'flex-start',
    },
    deleteBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#93000A',
        fontFamily: 'Inter_600SemiBold',
    },

    // ── Logout ──
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: S.outlineVariant,
        backgroundColor: S.surfaceLowest,
        marginBottom: 32,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: S.error,
        fontFamily: 'Inter_600SemiBold',
    },

    // ── Footer ──
    footer: {
        alignItems: 'center',
    },
    versionText: {
        fontSize: 13,
        fontWeight: '700',
        color: S.onSurfaceVariant,
        fontFamily: 'Inter_700Bold',
    },
    footerNote: {
        fontSize: 13,
        color: S.onSurfaceVariant,
        marginTop: 4,
        fontFamily: 'Inter_400Regular',
    },
});
