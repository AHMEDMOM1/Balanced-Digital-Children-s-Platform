/**
 * app/(parent)/content-library.tsx
 * Content Library screen — Parents can browse the curated content library
 * and toggle individual items on/off per child.
 *
 * Category tabs at the top, per-item toggle switches, and bulk enable/disable.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Switch, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';
import useAuthStore from '../../store/useAuthStore';
import {
  useContentLibrary,
  toggleContentPreference,
  bulkToggleCategory,
  type ContentLibraryItem,
} from '../../services/api/contentLibrary';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_TABS = [
  { key: 'all', label: 'الكل', labelEn: 'All', icon: 'grid-outline' as const },
  { key: 'story', label: 'قصص', labelEn: 'Stories', icon: 'book-outline' as const },
  { key: 'game', label: 'ألعاب', labelEn: 'Games', icon: 'game-controller-outline' as const },
  { key: 'video', label: 'فيديو', labelEn: 'Videos', icon: 'play-circle-outline' as const },
  { key: 'creative', label: 'إبداع', labelEn: 'Creative', icon: 'color-palette-outline' as const },
];

const SOURCE_BADGE_CONFIG = {
  owned: { label: 'Owned', color: '#10B981', bg: '#D1FAE5' },
  youtube: { label: 'YouTube', color: '#EF4444', bg: '#FEE2E2' },
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ContentLibraryScreen() {
  const children = useAuthStore((s) => s.children);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const selectedChild = children[selectedChildIndex] ?? children[0] ?? null;
  const childId = selectedChild?.id ?? null;

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filter = useMemo(() => ({
    type: activeTab === 'all' ? undefined : activeTab as any,
    searchQuery: searchQuery.trim() || undefined,
  }), [activeTab, searchQuery]);

  const { items, isLoading, error, refetch } = useContentLibrary(childId, filter);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ContentLibraryItem[]>();
    items.forEach((item) => {
      const cat = item.category || 'uncategorized';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    });
    return groups;
  }, [items]);

  // Stats
  const enabledCount = items.filter((i) => i.preference?.enabled !== false).length;
  const totalCount = items.length;

  // ── Toggle Handlers ──

  const handleToggleItem = useCallback(async (contentId: string, newValue: boolean) => {
    if (!childId) return;
    await toggleContentPreference(childId, contentId, newValue);
    refetch();
  }, [childId, refetch]);

  const handleBulkToggle = useCallback(async (category: string, enabled: boolean) => {
    if (!childId) return;
    await bulkToggleCategory(childId, category, enabled);
    refetch();
  }, [childId, refetch]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header showLock={false} title="Content Library" />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Child Selector ── */}
        {children.length > 1 && (
          <View style={styles.childSelectorRow}>
            <Ionicons name="person-outline" size={16} color={Colors.parent.textSecondary} />
            {children.map((child, i) => (
              <TouchableOpacity
                key={child.id}
                style={[styles.childBtn, selectedChildIndex === i && styles.childBtnActive]}
                onPress={() => setSelectedChildIndex(i)}
              >
                <Text style={[styles.childBtnText, selectedChildIndex === i && styles.childBtnTextActive]}>
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Summary Card ── */}
        <LinearGradient
          colors={['#E9DDFF', '#F2EEFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryIconRow}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="library-outline" size={24} color={Colors.parent.primary} />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryTitle}>
                {selectedChild?.name ?? 'Child'}'s Library
              </Text>
              <Text style={styles.summarySubtitle}>
                {enabledCount} of {totalCount} items enabled
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.summaryProgressBg}>
            <View
              style={[
                styles.summaryProgressFill,
                { width: totalCount > 0 ? `${(enabledCount / totalCount) * 100}%` : '0%' },
              ]}
            />
          </View>
        </LinearGradient>

        {/* ── Search Bar ── */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={Colors.parent.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search content..."
            placeholderTextColor={Colors.parent.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.parent.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Category Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabRow}
        >
          {CATEGORY_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? '#FFFFFF' : Colors.parent.textSecondary}
              />
              <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                {tab.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Loading ── */}
        {isLoading && (
          <View style={styles.stateCenter}>
            <ActivityIndicator size="large" color={Colors.parent.primary} />
            <Text style={styles.stateText}>Loading content library...</Text>
          </View>
        )}

        {/* ── Error ── */}
        {error && !isLoading && (
          <View style={styles.stateCenter}>
            <Ionicons name="cloud-offline-outline" size={48} color={Colors.parent.textSecondary} />
            <Text style={styles.stateText}>Could not load content library.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Empty State ── */}
        {!isLoading && !error && items.length === 0 && (
          <View style={styles.stateCenter}>
            <Ionicons name="library-outline" size={48} color={Colors.parent.textSecondary} />
            <Text style={styles.stateText}>
              {searchQuery ? 'No content matches your search.' : 'No content items available yet.'}
            </Text>
          </View>
        )}

        {/* ── Content Groups ── */}
        {!isLoading && !error && items.length > 0 && (
          <>
            {[...groupedItems.entries()].map(([category, categoryItems]) => (
              <View key={category} style={styles.groupCard}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    <Text style={styles.groupTitle}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{categoryItems.length}</Text>
                    </View>
                  </View>
                  <View style={styles.groupHeaderRight}>
                    <TouchableOpacity
                      style={styles.bulkBtn}
                      onPress={() => handleBulkToggle(category, true)}
                    >
                      <Text style={styles.bulkBtnText}>Enable All</Text>
                    </TouchableOpacity>
                    <Text style={styles.bulkSeparator}>|</Text>
                    <TouchableOpacity
                      style={styles.bulkBtn}
                      onPress={() => handleBulkToggle(category, false)}
                    >
                      <Text style={[styles.bulkBtnText, { color: Colors.shared.error }]}>Disable All</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items */}
                {categoryItems.map((item, idx) => {
                  const isEnabled = item.preference?.enabled !== false;
                  const sourceBadge = SOURCE_BADGE_CONFIG[item.source_type ?? 'owned'];

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.itemRow,
                        idx < categoryItems.length - 1 && styles.itemRowBorder,
                        !isEnabled && styles.itemRowDisabled,
                      ]}
                    >
                      {/* Thumbnail / Emoji */}
                      <View style={[styles.itemThumb, { backgroundColor: isEnabled ? '#E9DDFF' : '#F2ECF4' }]}>
                        <Text style={styles.itemThumbText}>
                          {item.type === 'story' ? '📖' : item.type === 'game' ? '🎮' : item.type === 'video' ? '🎬' : '🎨'}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, !isEnabled && styles.itemTitleDisabled]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.itemMeta}>
                          {/* Source badge */}
                          <View style={[styles.sourceBadge, { backgroundColor: sourceBadge.bg }]}>
                            <Text style={[styles.sourceBadgeText, { color: sourceBadge.color }]}>
                              {sourceBadge.label}
                            </Text>
                          </View>
                          {/* Sub-category */}
                          {item.sub_category && (
                            <Text style={styles.subCategory}>{item.sub_category}</Text>
                          )}
                          {/* Age range */}
                          <Text style={styles.ageRange}>
                            {item.min_age}–{item.max_age} yrs
                          </Text>
                        </View>
                      </View>

                      {/* Toggle */}
                      <Switch
                        value={isEnabled}
                        onValueChange={(val) => handleToggleItem(item.id, val)}
                        trackColor={{ false: '#CBC4D2', true: '#CFBCFF' }}
                        thumbColor={isEnabled ? Colors.parent.primary : '#F4F3F4'}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </>
        )}

        {/* ── Info Box ── */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.parent.textSecondary} />
          <Text style={styles.infoText}>
            Disabled items will not appear in your child's content feed. Changes
            are synced to the child's device in real time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.parent.background },
  container: { flex: 1 },
  content: {
    paddingHorizontal: Layout.screen.paddingHorizontal,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxxl,
  },

  // ── Child Selector ──
  childSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  childBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    backgroundColor: Colors.parent.surface,
  },
  childBtnActive: {
    backgroundColor: Colors.parent.primary,
    borderColor: Colors.parent.primary,
  },
  childBtnText: {
    ...Typography.parent.caption,
    fontWeight: '600',
    color: Colors.parent.textSecondary,
  },
  childBtnTextActive: {
    color: '#FFFFFF',
  },

  // ── Summary Card ──
  summaryCard: {
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryTitle: {
    ...Typography.parent.subtitle,
    color: Colors.parent.textPrimary,
  },
  summarySubtitle: {
    ...Typography.parent.caption,
    color: Colors.parent.textSecondary,
    marginTop: 2,
  },
  summaryProgressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: Colors.parent.primary,
    borderRadius: 4,
  },

  // ── Search ──
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.parent.inputBg,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.parent.border,
  },
  searchInput: {
    flex: 1,
    ...Typography.parent.body,
    color: Colors.parent.textPrimary,
    padding: 0,
  },

  // ── Category Tabs ──
  tabScroll: {
    marginBottom: Layout.spacing.lg,
    flexGrow: 0,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    backgroundColor: Colors.parent.surface,
  },
  tabBtnActive: {
    backgroundColor: Colors.parent.primary,
    borderColor: Colors.parent.primary,
  },
  tabBtnText: {
    ...Typography.parent.caption,
    fontWeight: '600',
    color: Colors.parent.textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  // ── State Center ──
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
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: Colors.parent.primary,
  },
  retryBtnText: {
    ...Typography.parent.button,
    color: '#FFFFFF',
  },

  // ── Group Card ──
  groupCard: {
    backgroundColor: Colors.parent.surface,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    borderColor: Colors.parent.border,
    marginBottom: Layout.spacing.lg,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.lg,
    backgroundColor: Colors.parent.inputBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.parent.border,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    ...Typography.parent.subtitle,
    color: Colors.parent.textPrimary,
  },
  countBadge: {
    backgroundColor: Colors.parent.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    ...Typography.parent.caption,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 11,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bulkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  bulkBtnText: {
    ...Typography.parent.caption,
    fontWeight: '700',
    color: Colors.parent.primary,
    fontSize: 11,
  },
  bulkSeparator: {
    ...Typography.parent.caption,
    color: Colors.parent.border,
  },

  // ── Item Row ──
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.parent.border,
  },
  itemRowDisabled: {
    opacity: 0.55,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumbText: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    ...Typography.parent.body,
    fontWeight: '600',
    color: Colors.parent.textPrimary,
  },
  itemTitleDisabled: {
    color: Colors.parent.textSecondary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subCategory: {
    ...Typography.parent.caption,
    color: Colors.parent.textSecondary,
    fontSize: 11,
  },
  ageRange: {
    ...Typography.parent.caption,
    color: Colors.parent.textSecondary,
    fontSize: 11,
  },

  // ── Info Box ──
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.parent.inputBg,
    padding: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    marginTop: Layout.spacing.md,
  },
  infoText: {
    ...Typography.parent.caption,
    color: Colors.parent.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
