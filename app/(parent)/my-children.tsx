/**
 * My Children Screen — Stitch design, consistent with settings-profile.tsx
 * Lists paired children and lets the parent start pairing a new one.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/useAuthStore';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    surfaceHighest: '#E6E0E9',
    primary: '#4F378A',
    primaryContainer: '#EADDFF',
    onPrimary: '#FFFFFF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    tertiaryContainer: '#C9A74D',
    secondaryContainer: '#E1D4FD',
};

const AVATAR_COLORS = [S.tertiaryContainer, S.secondaryContainer, '#FFB4A2', '#9AD1D4'];

export default function MyChildrenScreen() {
    const router = useRouter();
    const children = useAuthStore((s) => s.children);

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={S.primary} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>My Children</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Add Child ── */}
                <TouchableOpacity
                    style={styles.addChildBtn}
                    onPress={() => router.push('/auth/qr-pairing')}
                    activeOpacity={0.88}
                >
                    <View style={styles.addChildIconCircle}>
                        <Ionicons name="qr-code" size={24} color={S.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addChildTitle}>Add Child</Text>
                        <Text style={styles.addChildSubtitle}>Show a QR code for their device to scan</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={S.primary} />
                </TouchableOpacity>

                {/* ── Children List ── */}
                <Text style={styles.sectionLabel}>Linked Devices</Text>
                <View style={styles.card}>
                    {children.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="happy-outline" size={36} color={S.outlineVariant} />
                            <Text style={styles.emptyText}>
                                No children linked yet. Tap "Add Child" above to pair a device.
                            </Text>
                        </View>
                    ) : (
                        children.map((child, i) => (
                            <View key={child.id} style={[styles.childRow, i > 0 && styles.childRowDivider]}>
                                <View style={[styles.childAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                                    <Text style={styles.childAvatarText}>
                                        {child.name?.charAt(0)?.toUpperCase() || '?'}
                                    </Text>
                                </View>
                                <View style={styles.childInfo}>
                                    <Text style={styles.childName}>{child.name || 'Unnamed child'}</Text>
                                    <Text style={styles.childAge}>Age group: {child.age_group}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => router.push({ pathname: '/(parent)/settings-child-profile' as any, params: { childId: child.id } })}
                                >
                                    <Text style={styles.manageLink}>Manage</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
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

    addChildBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: S.surfaceLowest, borderRadius: 16,
        borderWidth: 1, borderColor: S.outlineVariant,
        padding: 16, marginBottom: 24,
    },
    addChildIconCircle: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: S.primaryContainer,
        alignItems: 'center', justifyContent: 'center',
    },
    addChildTitle: { fontSize: 16, fontWeight: '700', color: S.onSurface },
    addChildSubtitle: { fontSize: 13, color: S.onSurfaceVariant, marginTop: 2 },

    sectionLabel: { fontSize: 16, fontWeight: '600', color: S.onSurface, marginBottom: 10 },
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant,
        overflow: 'hidden',
    },
    childRow: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
    },
    childRowDivider: { borderTopWidth: 1, borderTopColor: S.outlineVariant },
    childAvatar: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
    },
    childAvatarText: { fontSize: 18, fontWeight: '700', color: S.onSurface },
    childInfo: { flex: 1 },
    childName: { fontSize: 15, fontWeight: '600', color: S.onSurface },
    childAge: { fontSize: 13, color: S.onSurfaceVariant, marginTop: 2 },
    manageLink: { fontSize: 13, fontWeight: '600', color: S.primary },

    emptyState: { alignItems: 'center', padding: 32, gap: 12 },
    emptyText: { fontSize: 14, color: S.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
});
