/**
 * Child Profile Screen — Stitch Design
 * - Child avatar with name badge
 * - Age & birthday info
 * - Screen time usage stats (daily/weekly)
 * - Content permissions toggles (live DB mutations via Supabase)
 * - Daily time limit slider
 * - Remove child danger zone
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryPreferences } from '../../services/api/hooks';
import useAuthStore from '../../store/useAuthStore';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    surfaceHighest: '#E6E0E9',
    primary: '#4F378A',
    primaryContainer: '#EADDFF',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#21005D',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    outline: '#7A7582',
    tertiaryContainer: '#C9A74D',
    secondaryContainer: '#E1D4FD',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',
    success: '#2E7D32',
    successContainer: '#C8E6C9',
};

export default function SettingsChildProfileScreen() {
    const router = useRouter();
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const children = useAuthStore((s) => s.children);
    const child = children.find((c) => c.id === childId);

    const { preferences, isLoading, toggleCategory } = useCategoryPreferences();

    // Derive toggle states from preferences
    const storyCategories = preferences.filter((p: any) => p.is_allowed && ['Adventure', 'Fantasy', 'Education', 'Mystery', 'Science', 'Slice of Life'].includes(p.category));
    const gameCategories = preferences.filter((p: any) => p.is_allowed && ['Puzzles', 'Education', 'Creative', 'Music'].includes(p.category));
    const videoCategories = preferences.filter((p: any) => p.is_allowed && ['Science', 'Music', 'Health', 'Education', 'Creative'].includes(p.category));
    const creativeCategories = preferences.filter((p: any) => p.is_allowed && ['Art', 'Building', 'Music', 'Writing'].includes(p.category));

    const storiesEnabled = storyCategories.length > 0;
    const gamesEnabled = gameCategories.length > 0;
    const videosEnabled = videoCategories.length > 0;
    const creativeEnabled = creativeCategories.length > 0;

    // Time limit (minutes)
    const [timeLimit, setTimeLimit] = useState(45);

    const adjustTime = (delta: number) => {
        setTimeLimit(prev => Math.max(15, Math.min(120, prev + delta)));
    };

    const handleToggle = async (contentType: string, enabled: boolean) => {
        if (!childId) return;
        await toggleCategory(childId, contentType, enabled);
    };

    if (!child) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color={S.primary} />
                    <Text style={styles.stateText}>Loading child profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={S.primary} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Child Profile</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Avatar & Identity ── */}
                <View style={styles.heroSection}>
                    <View style={[styles.heroAvatar, { backgroundColor: child.age_group === '2-4' ? '#C9A74D' : '#E1D4FD' }]}>
                        <Text style={styles.heroAvatarText}>{child.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                    <Text style={styles.heroName}>{child.name}</Text>
                    <View style={styles.heroBadgeRow}>
                        <View style={styles.heroBadge}>
                            <Ionicons name="calendar-outline" size={14} color={S.primary} />
                            <Text style={styles.heroBadgeText}>Age Group: {child.age_group}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Loading state for preferences ── */}
                {isLoading && (
                    <View style={styles.card}>
                        <View style={styles.centerState}>
                            <ActivityIndicator size="small" color={S.primary} />
                            <Text style={styles.stateText}>Loading preferences...</Text>
                        </View>
                    </View>
                )}

                {/* ── Content Permissions (live DB mutations) ── */}
                {!isLoading && (
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={S.primary} />
                            <Text style={styles.cardSectionTitle}>Content Permissions</Text>
                        </View>
                        <View style={styles.cardDivider} />

                        <ToggleRow icon="book-outline" label="Stories" value={storiesEnabled} onToggle={() => handleToggle('stories', !storiesEnabled)} />
                        <View style={styles.thinDivider} />
                        <ToggleRow icon="game-controller-outline" label="Games" value={gamesEnabled} onToggle={() => handleToggle('games', !gamesEnabled)} />
                        <View style={styles.thinDivider} />
                        <ToggleRow icon="brush-outline" label="Creative Activities" value={creativeEnabled} onToggle={() => handleToggle('creative', !creativeEnabled)} />
                        <View style={styles.thinDivider} />
                        <ToggleRow icon="videocam-outline" label="Videos" value={videosEnabled} onToggle={() => handleToggle('videos', !videosEnabled)} />
                    </View>
                )}

                {/* ── Daily Time Limit ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="time-outline" size={20} color={S.primary} />
                        <Text style={styles.cardSectionTitle}>Daily Time Limit</Text>
                    </View>
                    <View style={styles.cardDivider} />

                    <View style={styles.timeLimitRow}>
                        <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTime(-15)}>
                            <Ionicons name="remove" size={22} color={S.primary} />
                        </TouchableOpacity>

                        <View style={styles.timeDisplay}>
                            <Text style={styles.timeValue}>{timeLimit}</Text>
                            <Text style={styles.timeUnit}>minutes</Text>
                        </View>

                        <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTime(15)}>
                            <Ionicons name="add" size={22} color={S.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.timeBar}>
                        <View style={[styles.timeBarFill, { width: `${((timeLimit - 15) / 105) * 100}%` }]} />
                    </View>
                    <View style={styles.timeLabels}>
                        <Text style={styles.timeLabelText}>15 min</Text>
                        <Text style={styles.timeLabelText}>120 min</Text>
                    </View>
                </View>

                {/* ── Danger Zone ── */}
                <View style={styles.dangerCard}>
                    <Text style={styles.dangerTitle}>Remove Child Profile</Text>
                    <Text style={styles.dangerDesc}>
                        Permanently remove this child profile and all associated usage data. This action cannot be undone.
                    </Text>
                    <TouchableOpacity style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={16} color={S.onErrorContainer} />
                        <Text style={styles.deleteBtnText}>Remove Profile</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/** Reusable toggle row component */
function ToggleRow({ icon, label, value, onToggle }: {
    icon: string; label: string; value: boolean; onToggle: () => void;
}) {
    return (
        <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
                <Ionicons name={icon as any} size={20} color={S.onSurfaceVariant} />
                <Text style={styles.toggleLabel}>{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: S.surfaceHighest, true: S.primary }}
                thumbColor={value ? S.onPrimary : S.outline}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surfaceLow },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: S.outlineVariant, backgroundColor: S.surface,
    },
    topBarBtn: { padding: 8, borderRadius: 99 },
    topBarTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    content: { padding: 20, paddingBottom: 40 },

    // Hero
    heroSection: { alignItems: 'center', paddingVertical: 24 },
    heroAvatar: {
        width: 88, height: 88, borderRadius: 44,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 4, borderColor: S.surfaceLowest,
        marginBottom: 12,
    },
    heroAvatarText: { fontSize: 36, fontWeight: '700', color: S.onSurface },
    heroName: { fontSize: 24, fontWeight: '700', color: S.onSurface, marginBottom: 8 },
    heroBadgeRow: { flexDirection: 'row', gap: 12 },
    heroBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: S.primaryContainer, paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 16,
    },
    heroBadgeText: { fontSize: 13, fontWeight: '500', color: S.onPrimaryContainer },

    // Card
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant,
        padding: 20, marginBottom: 16,
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardSectionTitle: { fontSize: 18, fontWeight: '600', color: S.onSurface },
    cardDivider: { height: 1, backgroundColor: S.outlineVariant, marginVertical: 12 },
    thinDivider: { height: 1, backgroundColor: S.outlineVariant, marginVertical: 4 },

    // Stats grid
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    statBox: {
        flex: 1, alignItems: 'center', paddingVertical: 16,
        backgroundColor: S.surfaceLow, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant,
    },
    statValue: { fontSize: 18, fontWeight: '700', color: S.onSurface, marginTop: 8 },
    statLabel: { fontSize: 11, color: S.onSurfaceVariant, marginTop: 2 },

    // Toggle rows
    toggleRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12,
    },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleLabel: { fontSize: 15, fontWeight: '500', color: S.onSurface },

    // Time limit
    timeLimitRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24,
        paddingVertical: 12,
    },
    timeBtn: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 2, borderColor: S.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    timeDisplay: { alignItems: 'center' },
    timeValue: { fontSize: 36, fontWeight: '700', color: S.primary },
    timeUnit: { fontSize: 13, color: S.onSurfaceVariant },
    timeBar: {
        height: 8, backgroundColor: S.surfaceHighest, borderRadius: 4,
        marginTop: 16, overflow: 'hidden',
    },
    timeBarFill: {
        height: '100%', backgroundColor: S.primary, borderRadius: 4,
    },
    timeLabels: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 4,
    },
    timeLabelText: { fontSize: 11, color: S.onSurfaceVariant },

    // Danger
    dangerCard: {
        borderWidth: 1, borderColor: S.errorContainer, borderRadius: 12,
        padding: 20, backgroundColor: S.surfaceLowest, marginTop: 4,
    },
    dangerTitle: { fontSize: 18, fontWeight: '600', color: S.error, marginBottom: 4 },
    dangerDesc: { fontSize: 13, color: S.onSurfaceVariant, lineHeight: 18, marginBottom: 16 },
    deleteBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: S.errorContainer, borderWidth: 1, borderColor: S.error,
        borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start',
    },
    deleteBtnText: { fontSize: 15, fontWeight: '600', color: S.onErrorContainer },

    // ── States ──
    centerState: {
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 48, gap: 16,
    },
    stateText: {
        fontSize: 15, color: S.onSurfaceVariant, textAlign: 'center',
    },
});
