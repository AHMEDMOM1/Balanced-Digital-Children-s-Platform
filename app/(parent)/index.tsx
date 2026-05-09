/**
 * Parent Home Screen
 * Dashboard with welcome header, quick stats, and action buttons.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/ui/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import useSettingsStore from '../../store/useSettingsStore';
import useSessionStore from '../../store/useSessionStore';

export default function ParentHomeScreen() {
    const { dailyTimeLimitMinutes, sessionsPerDay } = useSettingsStore();
    const { sessionsUsedToday, elapsedSeconds, isPaused } = useSessionStore();
    const setPaused = useSessionStore((s) => s.setPaused);

    const minutesUsed = Math.floor(elapsedSeconds / 60);
    const sessionsRemaining = Math.max(0, sessionsPerDay - sessionsUsedToday);
    const timePercentage = dailyTimeLimitMinutes > 0
        ? Math.min(100, Math.round((minutesUsed / dailyTimeLimitMinutes) * 100))
        : 0;

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <Header
                    title="Hoş Geldiniz 👋"
                    subtitle="Ebeveyn Kontrol Paneli"
                    variant="parent"
                />

                {/* ── Quick Stats ── */}
                <View style={styles.statsRow}>
                    <Card style={styles.statCard}>
                        <Text style={styles.statEmoji}>⏱️</Text>
                        <Text style={styles.statValue}>{minutesUsed}/{dailyTimeLimitMinutes}</Text>
                        <Text style={styles.statLabel}>Bugünkü Dakika</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${timePercentage}%` }]} />
                        </View>
                    </Card>

                    <Card style={styles.statCard}>
                        <Text style={styles.statEmoji}>🎮</Text>
                        <Text style={styles.statValue}>{sessionsRemaining}</Text>
                        <Text style={styles.statLabel}>Kalan Seans</Text>
                        <Text style={styles.statSub}>Toplam seans: {sessionsPerDay}</Text>
                    </Card>
                </View>

                {/* ── Status Banner ── */}
                <Card
                    style={[
                        styles.statusCard,
                        isPaused ? styles.statusPaused : styles.statusActive,
                    ]}
                >
                    <View style={styles.statusRow}>
                        <Text style={styles.statusEmoji}>{isPaused ? '⏸️' : '✅'}</Text>
                        <View style={styles.statusTextContainer}>
                            <Text style={styles.statusTitle}>
                                {isPaused ? 'Erişim Duraklatıldı' : 'Erişim Açık'}
                            </Text>
                            <Text style={styles.statusSub}>
                                {isPaused
                                    ? 'Çocuğun erişimi geçici olarak durduruldu'
                                    : 'Çocuk uygulamayı sınırlar dahilinde kullanabilir'}
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* ── Quick Actions ── */}
                <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
                <View style={styles.actionsRow}>
                    <Button
                        title={isPaused ? '▶️ Erişimi Başlat' : '⏸️ Duraklat'}
                        variant={isPaused ? 'parent' : 'danger'}
                        size="medium"
                        onPress={() => setPaused(!isPaused)}
                        style={styles.actionButton}
                    />
                    <Button
                        title="📊 Raporlar"
                        variant="outline"
                        size="medium"
                        onPress={() => { }}
                        style={styles.actionButton}
                    />
                </View>

                {/* ── Today's Summary ── */}
                <Card style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>📋 Günün Özeti</Text>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryEmoji}>📖</Text>
                            <Text style={styles.summaryItemLabel}>Hikayeler</Text>
                            <Text style={styles.summaryItemValue}>— dk</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryEmoji}>🧩</Text>
                            <Text style={styles.summaryItemLabel}>Oyunlar</Text>
                            <Text style={styles.summaryItemValue}>— dk</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryEmoji}>🎨</Text>
                            <Text style={styles.summaryItemLabel}>Yaratıcılık</Text>
                            <Text style={styles.summaryItemValue}>— dk</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryEmoji}>🎬</Text>
                            <Text style={styles.summaryItemLabel}>Videolar</Text>
                            <Text style={styles.summaryItemValue}>— dk</Text>
                        </View>
                    </View>
                </Card>

                <View style={{ height: Layout.spacing.xxl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.parent.background },
    container: { flex: 1 },

    // ── Stats ──
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: Layout.screen.paddingHorizontal,
        gap: Layout.spacing.md,
        marginBottom: Layout.spacing.lg,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Layout.spacing.lg,
    },
    statEmoji: { fontSize: 28, marginBottom: Layout.spacing.sm },
    statValue: {
        ...Typography.parent.title,
        color: Colors.parent.textPrimary,
    },
    statLabel: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        marginTop: 2,
    },
    statSub: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: Colors.parent.border,
        borderRadius: 3,
        marginTop: Layout.spacing.sm,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.parent.primary,
        borderRadius: 3,
    },

    // ── Status ──
    statusCard: {
        marginHorizontal: Layout.screen.paddingHorizontal,
        marginBottom: Layout.spacing.lg,
    },
    statusActive: {
        borderLeftWidth: 4,
        borderLeftColor: Colors.shared.success,
    },
    statusPaused: {
        borderLeftWidth: 4,
        borderLeftColor: Colors.shared.warning,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusEmoji: { fontSize: 28, marginRight: Layout.spacing.md },
    statusTextContainer: { flex: 1 },
    statusTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
    },
    statusSub: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        marginTop: 2,
    },

    // ── Actions ──
    sectionTitle: {
        ...Typography.parent.label,
        color: Colors.parent.textPrimary,
        paddingHorizontal: Layout.screen.paddingHorizontal,
        marginBottom: Layout.spacing.md,
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: Layout.screen.paddingHorizontal,
        gap: Layout.spacing.md,
        marginBottom: Layout.spacing.lg,
    },
    actionButton: { flex: 1 },

    // ── Summary ──
    summaryCard: {
        marginHorizontal: Layout.screen.paddingHorizontal,
    },
    summaryTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
        marginBottom: Layout.spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryEmoji: { fontSize: 24, marginBottom: 4 },
    summaryItemLabel: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
    },
    summaryItemValue: {
        ...Typography.parent.label,
        color: Colors.parent.textPrimary,
        marginTop: 2,
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.parent.border,
    },
});
