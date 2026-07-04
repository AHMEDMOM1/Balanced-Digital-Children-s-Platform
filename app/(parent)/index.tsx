/**
 * Parent Home Screen — SafePlay Timer Dashboard
 * Professional overview of child usage with quick actions and activity history.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';
import useSettingsStore from '../../store/useSettingsStore';
import useSessionStore from '../../store/useSessionStore';
import useAuthStore from '../../store/useAuthStore';
import { useRealtimeStore } from '../../store/useRealtimeStore';
import { useTodaysSessions } from '../../services/api/sessions';

export default function ParentHomeScreen() {
    const router = useRouter();
    const { dailyTimeLimitMinutes, sessionsPerDay } = useSettingsStore();
    const { sessionsUsedToday, elapsedSeconds, isPaused, setPaused } = useSessionStore();
    const { parentData, children } = useAuthStore();
    const { isChildOnline, latestHeartbeat } = useRealtimeStore();

    const firstChild = children[0];
    const { sessions, isLoading: sessionsLoading, error: sessionsError, summary } = useTodaysSessions(
        firstChild?.id ?? '',
        parentData?.familyId ?? '',
        0
    );

    const minutesUsed = Math.floor(elapsedSeconds / 60);
    const sessionsRemaining = Math.max(0, sessionsPerDay - sessionsUsedToday);
    const progress = Math.min(1, minutesUsed / dailyTimeLimitMinutes);

    return (
        <SafeAreaView style={styles.safe}>
            <Header showLock={false} />
            
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>
                        Hello, {parentData?.name?.split(' ')[0] ?? 'there'}
                    </Text>
                    <Text style={styles.welcomeSubtitle}>
                        {firstChild
                            ? `Here is the daily overview for ${firstChild.name}'s device.`
                            : 'Add a child to start tracking their activity.'}
                    </Text>
                </View>

                {!firstChild && (
                    <TouchableOpacity
                        style={styles.addChildCard}
                        onPress={() => router.push('/auth/qr-pairing')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.iconCircle}>
                            <Ionicons name="qr-code-outline" size={24} color={Colors.parent.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addChildTitle}>No child linked yet</Text>
                            <Text style={styles.addChildSubtitle}>Tap to pair your child's device</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.parent.primary} />
                    </TouchableOpacity>
                )}

                {/* ── Time Today Card ── */}
                <View style={styles.mainCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="time" size={24} color={Colors.parent.primary} />
                        </View>
                        <Text style={styles.cardTitle}>Time Today</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Daily Limit: {dailyTimeLimitMinutes} min</Text>
                        </View>
                    </View>

                    <View style={styles.timeDisplay}>
                        <Text style={styles.timeValue}>{minutesUsed}</Text>
                        <Text style={styles.timeUnit}> / {dailyTimeLimitMinutes} min</Text>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                </View>

                {/* ── Secondary Stats ── */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: '#F2ECF4' }]}>
                            <Ionicons name="layers-outline" size={20} color={Colors.parent.primary} />
                        </View>
                        <Text style={styles.statValue}>{sessionsRemaining}</Text>
                        <Text style={styles.statLabel}>Sessions Left</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: '#FFF4D1' }]}>
                            <Ionicons name="star" size={20} color="#FFB800" />
                        </View>
                        <Text style={styles.statValue}>Brain Games</Text>
                        <Text style={styles.statLabel}>Last App</Text>
                    </View>
                </View>

                {/* ── Child Live Status ── */}
                {firstChild && (
                    <View style={styles.childStatusCard}>
                        <View style={styles.childStatusRow}>
                            <View style={[styles.statusDot, { backgroundColor: isChildOnline ? '#22C55E' : '#94A3B8' }]} />
                            <Text style={styles.childStatusText}>
                                {isChildOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                        {isChildOnline && latestHeartbeat && (
                            <Text style={styles.childActivityText}>
                                {latestHeartbeat.current_activity
                                    ? `${latestHeartbeat.current_activity} · ${Math.floor(latestHeartbeat.elapsed_seconds / 60)}m`
                                    : `Active · ${Math.floor(latestHeartbeat.elapsed_seconds / 60)}m`}
                            </Text>
                        )}
                    </View>
                )}

                {/* ── Quick Actions ── */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.primaryAction]} 
                        onPress={() => setPaused(!isPaused)}
                    >
                        <Ionicons name={isPaused ? "play" : "pause"} size={20} color={Colors.shared.white} />
                        <Text style={styles.primaryActionText}>{isPaused ? 'Resume Session' : 'Pause Session'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(parent)/reports')}>
                        <Ionicons name="bar-chart-outline" size={20} color={Colors.parent.primary} />
                        <Text style={styles.secondaryActionText}>View Reports</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(parent)/control')}>
                        <Ionicons name="settings-outline" size={20} color={Colors.parent.primary} />
                        <Text style={styles.secondaryActionText}>Edit Rules</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Daily Summary (US3) ── */}
                {summary.totalSeconds > 0 && (
                    <View style={styles.mainCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="bar-chart-outline" size={24} color={Colors.parent.primary} />
                            </View>
                            <Text style={styles.cardTitle}>Today's Breakdown</Text>
                        </View>
                        {(Object.entries(summary.byType) as [string, number][])
                            .filter(([, secs]) => secs > 0)
                            .map(([type, secs]) => (
                                <View key={type} style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                                    <Text style={styles.summaryValue}>{Math.floor(secs / 60)}m</Text>
                                </View>
                            ))}
                        <View style={[styles.summaryRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.parent.border, paddingTop: 8 }]}>
                            <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Total</Text>
                            <Text style={[styles.summaryValue, { fontWeight: '700' }]}>{Math.floor(summary.totalSeconds / 60)}m</Text>
                        </View>
                    </View>
                )}

                {/* ── Recent Activity (FR-005) ── */}
                <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.activityList}>
                    {sessionsLoading && (
                        <ActivityItem icon="hourglass-outline" title="Loading sessions…" subtitle="" />
                    )}
                    {!sessionsLoading && sessionsError && (
                        <ActivityItem
                            icon="cloud-offline-outline"
                            title="Activity history unavailable"
                            subtitle="We'll show this once it's back online."
                        />
                    )}
                    {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                        <ActivityItem icon="moon-outline" title="No activity yet today" subtitle="" />
                    )}
                    {!sessionsLoading && !sessionsError && sessions.map((s) => (
                        <ActivityItem
                            key={s.id}
                            icon={s.ended_at ? 'stop-circle' : 'play-circle'}
                            title={s.activity_type.charAt(0).toUpperCase() + s.activity_type.slice(1)}
                            subtitle={new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            tag={s.status === 'active' ? 'Live' : undefined}
                            value={s.elapsed_seconds > 0 ? `${Math.floor(s.elapsed_seconds / 60)}m` : undefined}
                        />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function ActivityItem({ icon, title, subtitle, tag, value }: any) {
    return (
        <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
                <Ionicons name={icon} size={24} color={Colors.parent.textSecondary} />
            </View>
            <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{title}</Text>
                <Text style={styles.activitySubtitle}>{subtitle}</Text>
            </View>
            {tag && (
                <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>{tag}</Text>
                </View>
            )}
            {value && <Text style={styles.activityValue}>{value}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.parent.background },
    container: { flex: 1 },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxl,
    },
    welcomeSection: {
        marginBottom: Layout.spacing.xl,
    },
    welcomeTitle: {
        ...Typography.parent.title,
        fontSize: 24,
        color: Colors.parent.primary,
        marginBottom: 4,
    },
    welcomeSubtitle: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
    },
    addChildCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Layout.spacing.md,
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.lg,
        borderWidth: 1,
        borderColor: Colors.parent.border,
        marginBottom: Layout.spacing.lg,
    },
    addChildTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
    },
    addChildSubtitle: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        marginTop: 2,
    },
    mainCard: {
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.lg,
        borderWidth: 1,
        borderColor: Colors.parent.border,
        marginBottom: Layout.spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.lg,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F2ECF4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
        flex: 1,
    },
    badge: {
        backgroundColor: Colors.parent.inputBg,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: Layout.radius.full,
    },
    badgeText: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        fontWeight: '600',
    },
    timeDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: Layout.spacing.md,
    },
    timeValue: {
        ...Typography.parent.title,
        fontSize: 40,
        color: Colors.parent.primary,
    },
    timeUnit: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
        marginLeft: 4,
    },
    progressContainer: {
        height: 10,
        backgroundColor: Colors.parent.inputBg,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.parent.primary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Layout.spacing.md,
        marginBottom: Layout.spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.md,
        borderWidth: 1,
        borderColor: Colors.parent.border,
    },
    statIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Layout.spacing.md,
    },
    statValue: {
        ...Typography.parent.title,
        fontSize: 22,
        marginBottom: 2,
    },
    statLabel: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
    },
    sectionTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
        marginBottom: Layout.spacing.md,
    },
    actionsContainer: {
        gap: Layout.spacing.md,
        marginBottom: Layout.spacing.xxl,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: Layout.radius.lg,
    },
    primaryAction: {
        backgroundColor: Colors.parent.primary,
    },
    primaryActionText: {
        ...Typography.parent.button,
        color: Colors.shared.white,
    },
    secondaryAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: Layout.radius.lg,
        backgroundColor: Colors.parent.surface,
        borderWidth: 1,
        borderColor: Colors.parent.border,
    },
    secondaryActionText: {
        ...Typography.parent.button,
        color: Colors.parent.primary,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    seeAll: {
        ...Typography.parent.caption,
        color: Colors.parent.primary,
        fontWeight: '600',
    },
    activityList: {
        gap: Layout.spacing.md,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.parent.surface,
        padding: 12,
        borderRadius: Layout.radius.lg,
        borderWidth: 1,
        borderColor: Colors.parent.border,
    },
    activityIcon: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: Colors.parent.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        ...Typography.parent.body,
        fontWeight: '600',
        color: Colors.parent.textPrimary,
    },
    activitySubtitle: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
    },
    activeTag: {
        backgroundColor: '#E8E0FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    activeTagText: {
        ...Typography.parent.caption,
        fontSize: 11,
        color: Colors.parent.primary,
        fontWeight: '700',
    },
    activityValue: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    summaryLabel: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
    },
    summaryValue: {
        ...Typography.parent.body,
        color: Colors.parent.textPrimary,
    },
    childStatusCard: {
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.lg,
        padding: Layout.spacing.md,
        borderWidth: 1,
        borderColor: Colors.parent.border,
        marginBottom: Layout.spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Layout.spacing.md,
    },
    childStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    childStatusText: {
        ...Typography.parent.body,
        fontWeight: '600',
        color: Colors.parent.textPrimary,
    },
    childActivityText: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        textTransform: 'capitalize',
    },
});
