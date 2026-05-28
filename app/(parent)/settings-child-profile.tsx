/**
 * Child Profile Screen — Stitch Design
 * - Child avatar with name badge
 * - Age & birthday info
 * - Screen time usage stats (daily/weekly)
 * - Content permissions toggles
 * - Daily time limit slider
 * - Remove child danger zone
 */
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

// Demo child data keyed by initial
const CHILD_DATA: Record<string, {
    name: string; age: number; birthday: string;
    avatar: string; color: string;
    dailyAvg: string; weeklyTotal: string; favActivity: string;
}> = {
    L: {
        name: 'Leo Jenkins', age: 8, birthday: 'March 15, 2018',
        avatar: 'L', color: '#C9A74D',
        dailyAvg: '1h 23m', weeklyTotal: '9h 41m', favActivity: 'Games',
    },
    M: {
        name: 'Mia Jenkins', age: 5, birthday: 'July 22, 2021',
        avatar: 'M', color: '#E1D4FD',
        dailyAvg: '45m', weeklyTotal: '5h 15m', favActivity: 'Stories',
    },
};

export default function SettingsChildProfileScreen() {
    const router = useRouter();
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const child = CHILD_DATA[childId ?? 'L'] ?? CHILD_DATA['L'];

    // Content permission toggles
    const [stories, setStories] = useState(true);
    const [games, setGames] = useState(true);
    const [creative, setCreative] = useState(true);
    const [videos, setVideos] = useState(child.name.includes('Leo'));

    // Time limit (minutes)
    const [timeLimit, setTimeLimit] = useState(child.name.includes('Leo') ? 60 : 45);

    const adjustTime = (delta: number) => {
        setTimeLimit(prev => Math.max(15, Math.min(120, prev + delta)));
    };

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
                    <View style={[styles.heroAvatar, { backgroundColor: child.color }]}>
                        <Text style={styles.heroAvatarText}>{child.avatar}</Text>
                    </View>
                    <Text style={styles.heroName}>{child.name}</Text>
                    <View style={styles.heroBadgeRow}>
                        <View style={styles.heroBadge}>
                            <Ionicons name="calendar-outline" size={14} color={S.primary} />
                            <Text style={styles.heroBadgeText}>Age {child.age}</Text>
                        </View>
                        <View style={styles.heroBadge}>
                            <Ionicons name="gift-outline" size={14} color={S.primary} />
                            <Text style={styles.heroBadgeText}>{child.birthday}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Usage Statistics ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="stats-chart" size={20} color={S.primary} />
                        <Text style={styles.cardSectionTitle}>Usage Statistics</Text>
                    </View>
                    <View style={styles.cardDivider} />

                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Ionicons name="today-outline" size={22} color={S.primary} />
                            <Text style={styles.statValue}>{child.dailyAvg}</Text>
                            <Text style={styles.statLabel}>Daily Average</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="calendar-outline" size={22} color={S.primary} />
                            <Text style={styles.statValue}>{child.weeklyTotal}</Text>
                            <Text style={styles.statLabel}>This Week</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="star-outline" size={22} color={S.tertiaryContainer} />
                            <Text style={styles.statValue}>{child.favActivity}</Text>
                            <Text style={styles.statLabel}>Favorite</Text>
                        </View>
                    </View>
                </View>

                {/* ── Content Permissions ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={S.primary} />
                        <Text style={styles.cardSectionTitle}>Content Permissions</Text>
                    </View>
                    <View style={styles.cardDivider} />

                    <ToggleRow icon="book-outline" label="Stories" value={stories} onToggle={() => setStories(!stories)} />
                    <View style={styles.thinDivider} />
                    <ToggleRow icon="game-controller-outline" label="Games" value={games} onToggle={() => setGames(!games)} />
                    <View style={styles.thinDivider} />
                    <ToggleRow icon="brush-outline" label="Creative Activities" value={creative} onToggle={() => setCreative(!creative)} />
                    <View style={styles.thinDivider} />
                    <ToggleRow icon="videocam-outline" label="Videos" value={videos} onToggle={() => setVideos(!videos)} />
                </View>

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
});
