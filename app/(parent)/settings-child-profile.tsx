/**
 * Child Profile Screen — Stitch Design
 * - Child avatar with name badge
 * - Coarse content kill-switches + daily time limit (per-child, parent_settings)
 * - Fine-grained category preferences (per-child, category_preferences)
 * - Remove child danger zone
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryPreferences } from '../../services/api/hooks';
import { getChildSettings, upsertChildSettings, ChildSettings } from '../../services/api/childSettings';
import useAuthStore from '../../store/useAuthStore';
import { useRealtimeStore } from '../../store/useRealtimeStore';
import { broadcastCommand } from '../../services/realtime/familyChannel';
import { getClient } from '../../services/api/client';
import { generateCommandId } from '../../services/utils/uuid';

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
};

const KNOWN_CATEGORIES = ['Adventure', 'Educational', 'Fantasy', 'Science', 'Fun', 'Creative'];

export default function SettingsChildProfileScreen() {
    const router = useRouter();
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const children = useAuthStore((s) => s.children);
    const parentData = useAuthStore((s) => s.parentData);
    const child = children.find((c) => c.id === childId);
    const { channel } = useRealtimeStore();

    const { preferences, isLoading: catLoading, toggleCategory } = useCategoryPreferences();

    const [settings, setSettings] = useState<ChildSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(true);

    useEffect(() => {
        if (!childId) return;
        getChildSettings(childId).then(({ data }) => {
            setSettings(data);
            setSettingsLoading(false);
        });
    }, [childId]);

    const broadcastSettingsSync = useCallback((payload: Record<string, unknown>) => {
        if (!channel || !parentData || !childId) return;
        const commandId = generateCommandId();
        broadcastCommand(channel, {
            command_id: commandId,
            command_type: 'settings_sync',
            sender_id: parentData.id,
            child_id: childId,
            payload,
            created_at: new Date().toISOString(),
        });
        getClient().from('realtime_commands').insert({
            id: commandId,
            family_id: parentData.familyId,
            sender_id: parentData.id,
            child_id: childId,
            command_type: 'settings_sync',
            payload,
        }).then();
    }, [channel, parentData, childId]);

    const adjustTime = (delta: number) => {
        if (!settings || !childId || !parentData) return;
        const next = Math.max(15, Math.min(120, settings.daily_time_limit_minutes + delta));
        setSettings({ ...settings, daily_time_limit_minutes: next });
        upsertChildSettings(parentData.id, childId, { daily_time_limit_minutes: next });
        broadcastSettingsSync({ daily_limit_minutes: next });
    };

    const handleCoarseToggle = (field: keyof ChildSettings, enabled: boolean) => {
        if (!settings || !childId || !parentData) return;
        setSettings({ ...settings, [field]: enabled });
        upsertChildSettings(parentData.id, childId, { [field]: enabled });
        const payloadKey = field; // matches SettingsSyncPayload field names
        broadcastSettingsSync({ [payloadKey]: enabled });
    };

    const handleCategoryToggle = (category: string, enabled: boolean) => {
        if (!childId || !parentData || !channel) return;
        toggleCategory(childId, category, enabled);
        const commandId = generateCommandId();
        broadcastCommand(channel, {
            command_id: commandId,
            command_type: 'category_block',
            sender_id: parentData.id,
            child_id: childId,
            payload: { category, is_allowed: enabled },
            created_at: new Date().toISOString(),
        });
        getClient().from('realtime_commands').insert({
            id: commandId,
            family_id: parentData.familyId,
            sender_id: parentData.id,
            child_id: childId,
            command_type: 'category_block',
            payload: { category, is_allowed: enabled },
        }).then();
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

                {/* ── Content Permissions — coarse, per-child, parent_settings ── */}
                {settingsLoading || !settings ? (
                    <View style={styles.card}>
                        <View style={styles.centerState}>
                            <ActivityIndicator size="small" color={S.primary} />
                            <Text style={styles.stateText}>Loading settings...</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={S.primary} />
                            <Text style={styles.cardSectionTitle}>Content Permissions</Text>
                        </View>
                        <View style={styles.cardDivider} />

                        <ToggleRow icon="book-outline" label="Stories" value={settings.stories_enabled} onToggle={() => handleCoarseToggle('stories_enabled', !settings.stories_enabled)} />
                        <View style={styles.thinDivider} />
                        <ToggleRow icon="game-controller-outline" label="Games" value={settings.games_enabled} onToggle={() => handleCoarseToggle('games_enabled', !settings.games_enabled)} />
                        <View style={styles.thinDivider} />
                        <ToggleRow icon="brush-outline" label="Creative Activities" value={settings.creative_enabled} onToggle={() => handleCoarseToggle('creative_enabled', !settings.creative_enabled)} />
                        <View style={styles.thinDivider} />
                        <ToggleRow icon="videocam-outline" label="Videos" value={settings.videos_enabled} onToggle={() => handleCoarseToggle('videos_enabled', !settings.videos_enabled)} />
                    </View>
                )}

                {/* ── Category Preferences — fine-grained, per-child, category_preferences ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="list-outline" size={20} color={S.primary} />
                        <Text style={styles.cardSectionTitle}>Category Preferences</Text>
                    </View>
                    <View style={styles.cardDivider} />

                    {catLoading ? (
                        <View style={styles.centerState}>
                            <ActivityIndicator size="small" color={S.primary} />
                            <Text style={styles.stateText}>Loading preferences...</Text>
                        </View>
                    ) : (
                        KNOWN_CATEGORIES.map((category, i) => {
                            const pref = preferences.find((p) => p.child_id === childId && p.category === category);
                            const isAllowed = pref?.is_allowed ?? true;
                            return (
                                <React.Fragment key={category}>
                                    {i > 0 && <View style={styles.thinDivider} />}
                                    <ToggleRow
                                        icon="pricetag-outline"
                                        label={category}
                                        value={isAllowed}
                                        onToggle={() => handleCategoryToggle(category, !isAllowed)}
                                    />
                                </React.Fragment>
                            );
                        })
                    )}
                </View>

                {/* ── Daily Time Limit — per-child, parent_settings ── */}
                {settings && (
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
                                <Text style={styles.timeValue}>{settings.daily_time_limit_minutes}</Text>
                                <Text style={styles.timeUnit}>minutes</Text>
                            </View>

                            <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTime(15)}>
                                <Ionicons name="add" size={22} color={S.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.timeBar}>
                            <View style={[styles.timeBarFill, { width: `${((settings.daily_time_limit_minutes - 15) / 105) * 100}%` }]} />
                        </View>
                        <View style={styles.timeLabels}>
                            <Text style={styles.timeLabelText}>15 min</Text>
                            <Text style={styles.timeLabelText}>120 min</Text>
                        </View>
                    </View>
                )}

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
