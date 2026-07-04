/**
 * app/(parent)/reports.tsx — Phase 3
 * Live Reports & Charts screen using real data from Supabase.
 * Replaces all static placeholder values with hooks from services/api/reports.ts
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';
import OfflineBadge from '../../components/ui/OfflineBadge';
import ComparisonView from '../../components/reports/ComparisonView';
import useAuthStore from '../../store/useAuthStore';
import { useDailyStats, useLiveTodayStats } from '../../services/api/reports';
import { DailyStats, ReportRange } from '../../services/api/types';
import { captureAndShare } from '../../services/export/captureReport';
import { getClient } from '../../services/api/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function calcDailyAvg(stats: DailyStats[], range: ReportRange): number {
  if (!stats || stats.length === 0) return 0;
  const total = stats.reduce((sum, s) => sum + s.total_seconds, 0);
  const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;
  return Math.round(total / days);
}

const RANGES: { label: string; value: ReportRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

const CATEGORY_CONFIG = [
  { key: 'stories_seconds' as keyof DailyStats, label: 'StoryTime', color: '#7C5CFC' },
  { key: 'games_seconds'   as keyof DailyStats, label: 'Brain Games', color: '#FF6B6B' },
  { key: 'creative_seconds'as keyof DailyStats, label: 'Creative Zone', color: '#FFB800' },
  { key: 'videos_seconds'  as keyof DailyStats, label: 'Videos', color: '#494551' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const [range, setRange] = useState<ReportRange>('week');
  const children = useAuthStore((s) => s.children);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const selectedChild = children[selectedChildIndex] ?? children[0] ?? null;
  const childId = selectedChild?.id ?? null;
  const [showComparison, setShowComparison] = useState(false);
  const reportViewRef = useRef<View>(null!);
  const [isExporting, setIsExporting] = useState(false);
  const [showContentDetail, setShowContentDetail] = useState(false);
  const [contentDetails, setContentDetails] = useState<Array<{ title: string; type: string; total_seconds: number }>>([])
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const { data: stats, isLoading, error } = useDailyStats(childId, range);
  const { todayStats, isLive } = useLiveTodayStats(childId);

  // Merge live today data if range is 'today'
  const displayStats = range === 'today' && todayStats ? [todayStats] : (stats ?? []);

  const totalSeconds = displayStats.reduce((sum, s) => sum + s.total_seconds, 0);
  const dailyAvg = calcDailyAvg(displayStats, range);

  const categoryTotals = CATEGORY_CONFIG.map((cat) => ({
    ...cat,
    value: displayStats.reduce((sum, s) => sum + ((s[cat.key] as number) || 0), 0),
  }));
  const maxCategory = Math.max(...categoryTotals.map((c) => c.value), 1);

  // Bar chart data (last 7 days for week, last 30 for month, 1 for today)
  const barData = displayStats.slice(-7);
  const maxBar = Math.max(...barData.map((s) => s.total_seconds), 1);

  return (
    <SafeAreaView style={styles.safe}>
      <Header showLock={false} title="Reports" />

      <OfflineBadge lastSyncAt={null} />

      {/* ── Export Button ── */}
      <TouchableOpacity
        style={styles.exportBtn}
        onPress={async () => {
          setIsExporting(true);
          await captureAndShare(reportViewRef);
          setIsExporting(false);
        }}
        disabled={isExporting}
      >
        {isExporting
          ? <ActivityIndicator size="small" color={Colors.parent.primary} />
          : <Ionicons name="share-outline" size={20} color={Colors.parent.primary} />
        }
        <Text style={styles.exportBtnText}>{isExporting ? 'Exporting...' : 'Export'}</Text>
      </TouchableOpacity>

      <View ref={reportViewRef} collapsable={false}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Child Selector (visible only when parent has 2+ children) ── */}
        {children.length > 1 && (
          <View style={styles.childSelectorRow}>
            <Ionicons name="person-outline" size={16} color={Colors.parent.textSecondary} />
            {children.map((child, i) => (
              <TouchableOpacity
                key={child.id}
                style={[styles.childSelectorBtn, selectedChildIndex === i && styles.childSelectorBtnActive]}
                onPress={() => setSelectedChildIndex(i)}
              >
                <Text style={[styles.childSelectorText, selectedChildIndex === i && styles.childSelectorTextActive]}>
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Time Range Picker ── */}
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.rangeBtn, range === r.value && styles.rangeBtnActive]}
              onPress={() => setRange(r.value)}
            >
              <Text style={[styles.rangeBtnText, range === r.value && styles.rangeBtnTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Live Indicator ── */}
        {isLive && range === 'today' && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <View style={styles.stateCenter}>
            <ActivityIndicator size="large" color={Colors.parent.primary} />
            <Text style={styles.stateText}>Loading report data...</Text>
          </View>
        )}

        {/* ── Error ── */}
        {error && !isLoading && (
          <View style={styles.stateCenter}>
            <Ionicons name="cloud-offline-outline" size={48} color={Colors.parent.textSecondary} />
            <Text style={styles.stateText}>Could not load reports. Check your connection.</Text>
          </View>
        )}

        {/* ── Empty State ── */}
        {!isLoading && !error && displayStats.length === 0 && (
          <View style={styles.stateCenter}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.parent.textSecondary} />
            <Text style={styles.stateText}>No activity recorded for this period.</Text>
          </View>
        )}

        {/* ── Data Views ── */}
        {!isLoading && !error && displayStats.length > 0 && (
          <>
            {/* ── Summary Stats ── */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="stats-chart" size={18} color={Colors.parent.primary} />
                  <Text style={styles.cardLabel}>Total Time</Text>
                </View>
                <Text style={styles.cardValue}>{formatSeconds(totalSeconds)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="today" size={18} color={Colors.parent.primary} />
                  <Text style={styles.cardLabel}>Daily Avg</Text>
                </View>
                <Text style={styles.cardValue}>{formatSeconds(dailyAvg)}</Text>
              </View>
            </View>

            {/* ── Bar Chart ── */}
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Usage History</Text>
              <View style={styles.barChart}>
                {barData.map((day) => {
                  const heightPct = maxBar > 0 ? (day.total_seconds / maxBar) : 0;
                  const barHeight = Math.max(4, Math.round(heightPct * 120));
                  const label = range === 'today'
                    ? 'Today'
                    : new Date(day.stat_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                  return (
                    <View key={day.stat_date} style={styles.barContainer}>
                      <LinearGradient
                        colors={['#9D7CFF', Colors.parent.primary]}
                        style={[styles.bar, { height: barHeight }]}
                      />
                      <Text style={styles.barLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Category Breakdown ── */}
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>Activity Breakdown</Text>
              {categoryTotals.map((cat) => (
                <View key={cat.key} style={styles.breakdownItem}>
                  <View style={styles.breakdownTextRow}>
                    <Text style={styles.breakdownTitle}>{cat.label}</Text>
                    <Text style={styles.breakdownValue}>{formatSeconds(cat.value)}</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(cat.value / maxCategory) * 100}%`,
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* ── Content Detail (per-item) ── */}
            <TouchableOpacity
              style={styles.detailToggle}
              onPress={async () => {
                const next = !showContentDetail;
                setShowContentDetail(next);
                if (next && contentDetails.length === 0 && childId) {
                  setIsLoadingDetail(true);
                  try {
                    const { from, to } = (() => {
                      const today = new Date();
                      if (range === 'today') {
                        const s = today.toLocaleDateString('en-CA');
                        return { from: s, to: s };
                      }
                      if (range === 'week') {
                        const f = new Date(today);
                        f.setDate(today.getDate() - 6);
                        return { from: f.toLocaleDateString('en-CA'), to: today.toLocaleDateString('en-CA') };
                      }
                      const f = new Date(today);
                      f.setDate(today.getDate() - 29);
                      return { from: f.toLocaleDateString('en-CA'), to: today.toLocaleDateString('en-CA') };
                    })();
                    const client = getClient();
                    const { data: sessions } = await client
                      .from('sessions')
                      .select('activity_type, elapsed_seconds, content_item_id, content_items!inner(title, type)')
                      .eq('child_id', childId)
                      .gte('started_at', `${from}T00:00:00`)
                      .lte('started_at', `${to}T23:59:59`)
                      .in('status', ['completed', 'paused']);
                    if (sessions && sessions.length > 0) {
                      const map = new Map<string, { title: string; type: string; total_seconds: number }>();
                      sessions.forEach((s: any) => {
                        const key = s.content_item_id || s.activity_type;
                        const title = s.content_items?.title || s.activity_type;
                        const type = s.content_items?.type || s.activity_type;
                        const existing = map.get(key);
                        if (existing) {
                          existing.total_seconds += s.elapsed_seconds || 0;
                        } else {
                          map.set(key, { title, type, total_seconds: s.elapsed_seconds || 0 });
                        }
                      });
                      setContentDetails(
                        [...map.values()].sort((a, b) => b.total_seconds - a.total_seconds)
                      );
                    }
                  } catch {} finally {
                    setIsLoadingDetail(false);
                  }
                }
              }}
            >
              <Ionicons
                name={showContentDetail ? 'chevron-up-outline' : 'list-outline'}
                size={20}
                color={Colors.parent.primary}
              />
              <Text style={styles.detailToggleText}>
                {showContentDetail ? 'Hide Content Detail' : 'View Content Detail'}
              </Text>
            </TouchableOpacity>

            {showContentDetail && (
              <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Content Watched / Played</Text>
                {isLoadingDetail && (
                  <ActivityIndicator size="small" color={Colors.parent.primary} style={{ marginVertical: 16 }} />
                )}
                {!isLoadingDetail && contentDetails.length === 0 && (
                  <Text style={styles.stateText}>No individual content data for this period.</Text>
                )}
                {!isLoadingDetail && contentDetails.map((item, idx) => {
                  const emoji = item.type === 'story' ? '📖' : item.type === 'game' ? '🎮' : item.type === 'video' ? '🎬' : '🎨';
                  const maxDetail = Math.max(...contentDetails.map(d => d.total_seconds), 1);
                  return (
                    <View key={idx} style={styles.detailItem}>
                      <View style={styles.detailItemHeader}>
                        <Text style={styles.detailEmoji}>{emoji}</Text>
                        <Text style={styles.detailTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.detailValue}>{formatSeconds(item.total_seconds)}</Text>
                      </View>
                      <View style={styles.progressBg}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${(item.total_seconds / maxDetail) * 100}%`,
                              backgroundColor: item.type === 'story' ? '#7C5CFC' : item.type === 'game' ? '#FF6B6B' : item.type === 'video' ? '#494551' : '#FFB800',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
        {/* ── Child Comparison (visible only if parent has 2+ children) ── */}
        {children.length >= 2 && (
          <>
            <TouchableOpacity
              style={styles.compareToggle}
              onPress={() => setShowComparison((prev) => !prev)}
            >
              <Ionicons
                name={showComparison ? 'close-circle-outline' : 'git-compare-outline'}
                size={20}
                color={Colors.parent.primary}
              />
              <Text style={styles.compareToggleText}>
                {showComparison ? 'Hide Comparison' : 'Compare Children'}
              </Text>
            </TouchableOpacity>
            {showComparison && children[1] && (
              <ComparisonView
                childAId={children[0].id}
                childBId={children[1].id}
                childAName={children[0].name}
                childBName={children[1].name}
              />
            )}
          </>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.parent.background },
  container: { flex: 1 },
  content: {
    paddingHorizontal: Layout.screen.paddingHorizontal,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.parent.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.parent.border,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  rangeBtnActive: {
    backgroundColor: Colors.parent.primary,
  },
  rangeBtnText: {
    ...Typography.parent.caption,
    fontWeight: '600',
    color: Colors.parent.textSecondary,
  },
  rangeBtnTextActive: {
    color: '#FFFFFF',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveText: {
    ...Typography.parent.caption,
    color: '#22C55E',
    fontWeight: '700',
  },
  stateCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  stateText: {
    ...Typography.parent.body,
    color: Colors.parent.textSecondary,
    textAlign: 'center',
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
  cardLabel: { ...Typography.parent.caption, color: Colors.parent.textSecondary },
  cardValue: { ...Typography.parent.title, fontSize: 20, marginBottom: 4 },
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
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
  },
  barContainer: { flex: 1, alignItems: 'center', gap: 8 },
  bar: { width: 28, borderRadius: 8, opacity: 0.9 },
  barLabel: { ...Typography.parent.caption, fontSize: 10, color: Colors.parent.textSecondary },
  breakdownCard: {
    backgroundColor: Colors.parent.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.parent.border,
  },
  breakdownItem: { marginBottom: Layout.spacing.lg },
  breakdownTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownTitle: { ...Typography.parent.body, fontWeight: '600', color: Colors.parent.textPrimary },
  breakdownValue: { ...Typography.parent.body, color: Colors.parent.textSecondary },
  progressBg: { height: 16, backgroundColor: '#F2ECF4', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8 },
  compareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    backgroundColor: Colors.parent.surface,
    marginBottom: 16,
    marginTop: 8,
  },
  compareToggleText: {
    ...Typography.parent.body,
    fontWeight: '600',
    color: Colors.parent.primary,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    backgroundColor: Colors.parent.surface,
    marginHorizontal: Layout.screen.paddingHorizontal,
    marginBottom: 4,
  },
  exportBtnText: {
    ...Typography.parent.caption,
    fontWeight: '700',
    color: Colors.parent.primary,
  },
  childSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  childSelectorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    backgroundColor: Colors.parent.surface,
  },
  childSelectorBtnActive: {
    backgroundColor: Colors.parent.primary,
    borderColor: Colors.parent.primary,
  },
  childSelectorText: {
    ...Typography.parent.caption,
    fontWeight: '600',
    color: Colors.parent.textSecondary,
  },
  childSelectorTextActive: {
    color: '#FFFFFF',
  },
  detailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    backgroundColor: Colors.parent.surface,
    marginBottom: 16,
    marginTop: 8,
  },
  detailToggleText: {
    ...Typography.parent.body,
    fontWeight: '600',
    color: Colors.parent.primary,
  },
  detailCard: {
    backgroundColor: Colors.parent.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    marginBottom: Layout.spacing.xl,
  },
  detailItem: {
    marginBottom: Layout.spacing.md,
  },
  detailItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailEmoji: {
    fontSize: 16,
  },
  detailTitle: {
    flex: 1,
    ...Typography.parent.body,
    fontWeight: '500',
    color: Colors.parent.textPrimary,
  },
  detailValue: {
    ...Typography.parent.body,
    color: Colors.parent.textSecondary,
  },
});
