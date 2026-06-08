/**
 * components/reports/ComparisonView.tsx
 * Side-by-side comparison of two children's usage stats.
 * Shows total-time bars and per-category breakdown for each child.
 * Used by app/(parent)/reports.tsx when parent selects "Compare" mode.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useComparisonStats } from '../../services/api/reports';
import { DailyStats } from '../../services/api/types';

interface Props {
  childAId: string;
  childBId: string;
  childAName: string;
  childBName: string;
}

const CATEGORY_CONFIG = [
  { key: 'stories_seconds' as keyof DailyStats, label: 'StoryTime', color: '#7C5CFC' },
  { key: 'games_seconds'   as keyof DailyStats, label: 'Brain Games', color: '#FF6B6B' },
  { key: 'creative_seconds'as keyof DailyStats, label: 'Creative Zone', color: '#FFB800' },
  { key: 'videos_seconds'  as keyof DailyStats, label: 'Videos', color: '#494551' },
];

function formatSeconds(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function sumStats(stats: DailyStats[], key?: keyof DailyStats): number {
  if (key) return stats.reduce((sum, s) => sum + ((s[key] as number) || 0), 0);
  return stats.reduce((sum, s) => sum + s.total_seconds, 0);
}

function renderCategoryBlock(stats: DailyStats[], label: string, color: string, key: keyof DailyStats, maxVal: number) {
  const val = sumStats(stats, key);
  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
  return (
    <View key={key} style={styles.catRow}>
      <View style={styles.catLabelRow}>
        <View style={[styles.catDot, { backgroundColor: color }]} />
        <Text style={styles.catLabel}>{label}</Text>
      </View>
      <View style={styles.catBarBg}>
        <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.catValue}>{formatSeconds(val)}</Text>
    </View>
  );
}

export default function ComparisonView({ childAId, childBId, childAName, childBName }: Props) {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const { data, isLoading, error } = useComparisonStats([childAId, childBId], range);

  const statsA = data?.childA?.stats ?? [];
  const statsB = data?.childB?.stats ?? [];
  const totalA = sumStats(statsA);
  const totalB = sumStats(statsB);
  const maxTotal = Math.max(totalA, totalB, 1);

  const allCatValues = CATEGORY_CONFIG.flatMap((c) => [
    sumStats(statsA, c.key),
    sumStats(statsB, c.key),
  ]);
  const maxCategory = Math.max(...allCatValues, 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Compare Children</Text>

      {/* Range Toggle */}
      <View style={styles.rangeRow}>
        {(['week', 'month'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>
              {r === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={Colors.parent.primary} />
        </View>
      )}

      {error && !isLoading && (
        <Text style={styles.errorText}>Could not load comparison data.</Text>
      )}

      {!isLoading && !error && data && (
        <>
          {/* ── Total Time Bars ── */}
          <Text style={styles.sectionLabel}>Total Screen Time</Text>
          <View style={styles.childRow}>
            <Text style={styles.childName}>{childAName}</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${(totalA / maxTotal) * 100}%`, backgroundColor: '#7C5CFC' }]} />
            </View>
            <Text style={styles.childValue}>{formatSeconds(totalA)}</Text>
          </View>
          <View style={styles.childRow}>
            <Text style={styles.childName}>{childBName}</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${(totalB / maxTotal) * 100}%`, backgroundColor: '#FF6B6B' }]} />
            </View>
            <Text style={styles.childValue}>{formatSeconds(totalB)}</Text>
          </View>

          {/* ── Category Breakdown ── */}
          <Text style={styles.sectionLabel}>By Category</Text>
          {CATEGORY_CONFIG.map((cat) => renderCategoryBlock(statsA, cat.label, cat.color, cat.key, maxCategory))}
          <View style={styles.childDivider} />
          {CATEGORY_CONFIG.map((cat) => renderCategoryBlock(statsB, cat.label, cat.color, cat.key, maxCategory))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.parent.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    marginBottom: Layout.spacing.xl,
  },
  title: { ...Typography.parent.subtitle, color: Colors.parent.textPrimary, marginBottom: 12 },
  sectionLabel: {
    ...Typography.parent.caption, fontWeight: '700', color: Colors.parent.textSecondary,
    marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1,
  },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rangeBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: Colors.parent.border,
  },
  rangeBtnActive: { backgroundColor: Colors.parent.primary, borderColor: Colors.parent.primary },
  rangeBtnText: { ...Typography.parent.caption, color: Colors.parent.textSecondary },
  rangeBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },
  center: { alignItems: 'center', paddingVertical: 24 },
  errorText: { ...Typography.parent.caption, color: Colors.parent.textSecondary, textAlign: 'center' },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  childName: { ...Typography.parent.body, fontWeight: '600', color: Colors.parent.textPrimary, width: 70 },
  barBg: { flex: 1, height: 20, backgroundColor: '#F2ECF4', borderRadius: 10, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 10 },
  childValue: { ...Typography.parent.caption, color: Colors.parent.textSecondary, width: 52, textAlign: 'right' },
  childDivider: { height: 1, backgroundColor: Colors.parent.border, marginVertical: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 90 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { ...Typography.parent.caption, fontSize: 11, color: Colors.parent.textPrimary },
  catBarBg: { flex: 1, height: 12, backgroundColor: '#F2ECF4', borderRadius: 6, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 6 },
  catValue: { ...Typography.parent.caption, fontSize: 11, color: Colors.parent.textSecondary, width: 44, textAlign: 'right' },
});
