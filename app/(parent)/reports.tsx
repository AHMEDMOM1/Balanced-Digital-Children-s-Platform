/**
 * Parent Reports Screen — SafePlay Timer Analytics
 * Detailed usage reports with charts and trend analysis.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';

export default function ReportsScreen() {
    return (
        <SafeAreaView style={styles.safe}>
            <Header showLock={false} title="Reports" />
            
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>Weekly Report</Text>
                    <View style={styles.dateSelector}>
                        <Text style={styles.dateText}>May 01 - May 07</Text>
                        <Ionicons name="chevron-down" size={16} color={Colors.parent.primary} />
                    </View>
                </View>

                {/* ── Summary Stats ── */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="stats-chart" size={18} color={Colors.parent.primary} />
                            <Text style={styles.cardLabel}>Total Time</Text>
                        </View>
                        <Text style={styles.cardValue}>14h 30m</Text>
                        <View style={styles.trendRow}>
                            <Ionicons name="arrow-up-circle" size={14} color={Colors.shared.error} />
                            <Text style={[styles.trendText, { color: Colors.shared.error }]}>+12% vs last week</Text>
                        </View>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="today" size={18} color={Colors.parent.primary} />
                            <Text style={styles.cardLabel}>Daily Avg</Text>
                        </View>
                        <Text style={styles.cardValue}>2h 05m</Text>
                        <View style={styles.trendRow}>
                            <Ionicons name="arrow-down-circle" size={14} color={Colors.shared.success} />
                            <Text style={[styles.trendText, { color: Colors.shared.success }]}>-5% vs last week</Text>
                        </View>
                    </View>
                </View>

                {/* ── Usage Chart Placeholder ── */}
                <View style={styles.chartCard}>
                    <Text style={styles.sectionTitle}>Usage History</Text>
                    <View style={styles.barChart}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                            <View key={day} style={styles.barContainer}>
                                <View style={[styles.bar, { height: [60, 90, 40, 110, 70, 120, 80][i] }]} />
                                <Text style={styles.barLabel}>{day}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Activity Breakdown ── */}
                <View style={styles.breakdownCard}>
                    <Text style={styles.sectionTitle}>Activity Breakdown</Text>
                    
                    <BreakdownItem title="Brain Games" value="5h 20m" percent={0.4} color="#FF6B6B" />
                    <BreakdownItem title="StoryTime" value="4h 10m" percent={0.3} color="#7C5CFC" />
                    <BreakdownItem title="Creative Zone" value="3h 15m" percent={0.2} color="#FFB800" />
                    <BreakdownItem title="Videos" value="1h 45m" percent={0.1} color="#494551" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function BreakdownItem({ title, value, percent, color }: any) {
    return (
        <View style={styles.breakdownItem}>
            <View style={styles.breakdownTextRow}>
                <Text style={styles.breakdownTitle}>{title}</Text>
                <Text style={styles.breakdownValue}>{value}</Text>
            </View>
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${percent * 100}%`, backgroundColor: color }]} />
            </View>
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
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Layout.spacing.xl,
    },
    pageTitle: {
        ...Typography.parent.title,
        fontSize: 22,
        color: Colors.parent.primary,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.parent.surface,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: Layout.radius.md,
        borderWidth: 1,
        borderColor: Colors.parent.border,
    },
    dateText: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        fontWeight: '600',
    },
    summaryRow: {
        flexDirection: 'row',
        gap: Layout.spacing.md,
        marginBottom: Layout.spacing.xl,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.lg,
        padding: Layout.spacing.md,
        borderWidth: 1,
        borderColor: Colors.parent.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    cardLabel: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
    },
    cardValue: {
        ...Typography.parent.title,
        fontSize: 20,
        marginBottom: 4,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendText: {
        ...Typography.parent.caption,
        fontSize: 10,
        fontWeight: '700',
    },
    chartCard: {
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.lg,
        borderWidth: 1,
        borderColor: Colors.parent.border,
        marginBottom: Layout.spacing.xl,
    },
    sectionTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
        marginBottom: Layout.spacing.xl,
    },
    barChart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 140,
        paddingTop: Layout.spacing.md,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    bar: {
        width: '70%',
        backgroundColor: Colors.parent.primary,
        borderRadius: 6,
        opacity: 0.85,
    },
    barLabel: {
        ...Typography.parent.caption,
        fontSize: 10,
        color: Colors.parent.textSecondary,
    },
    breakdownCard: {
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.lg,
        borderWidth: 1,
        borderColor: Colors.parent.border,
    },
    breakdownItem: {
        marginBottom: Layout.spacing.lg,
    },
    breakdownTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownTitle: {
        ...Typography.parent.body,
        fontWeight: '600',
        color: Colors.parent.textPrimary,
    },
    breakdownValue: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
    },
    progressBg: {
        height: 12,
        backgroundColor: Colors.parent.inputBg,
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
});
