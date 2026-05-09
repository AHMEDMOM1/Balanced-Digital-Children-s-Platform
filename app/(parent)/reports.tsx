/**
 * Parent Reports Screen (Placeholder)
 * Will show usage charts and analytics in later weeks.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/ui/Header';
import Card from '../../components/ui/Card';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

export default function ReportsScreen() {
    return (
        <SafeAreaView style={styles.safe}>
            <Header
                title="Raporlar 📊"
                subtitle="Çocuğunuzun kullanımını ayrıntılı olarak izleyin"
                variant="parent"
            />

            {/* ── Weekly Overview Placeholder ── */}
            <Card style={styles.card}>
                <Text style={styles.cardTitle}>📅 Haftalık Görünüm</Text>
                <View style={styles.chartPlaceholder}>
                    <View style={styles.barRow}>
                        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(
                            (day, i) => (
                                <View key={day} style={styles.barItem}>
                                    <View
                                        style={[
                                            styles.bar,
                                            { height: [30, 45, 20, 55, 35, 40, 25][i] },
                                        ]}
                                    />
                                    <Text style={styles.barLabel}>{day}</Text>
                                </View>
                            )
                        )}
                    </View>
                </View>
                <Text style={styles.placeholderNote}>
                    Uygulama kullanılmaya başlandığında burada gerçek veriler görünecektir
                </Text>
            </Card>

            {/* ── Content Breakdown Placeholder ── */}
            <Card style={styles.card}>
                <Text style={styles.cardTitle}>📂 Etkinlik Dağılımı</Text>
                <View style={styles.breakdownRow}>
                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownColor, { backgroundColor: Colors.child.cardStory }]} />
                        <Text style={styles.breakdownLabel}>Hikayeler</Text>
                        <Text style={styles.breakdownValue}>—%</Text>
                    </View>
                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownColor, { backgroundColor: Colors.child.cardGame }]} />
                        <Text style={styles.breakdownLabel}>Oyunlar</Text>
                        <Text style={styles.breakdownValue}>—%</Text>
                    </View>
                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownColor, { backgroundColor: Colors.child.cardCreative }]} />
                        <Text style={styles.breakdownLabel}>Yaratıcılık</Text>
                        <Text style={styles.breakdownValue}>—%</Text>
                    </View>
                </View>
            </Card>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.parent.background },

    card: {
        marginHorizontal: Layout.screen.paddingHorizontal,
        marginBottom: Layout.spacing.lg,
    },
    cardTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
        marginBottom: Layout.spacing.md,
    },

    // ── Chart Placeholder ──
    chartPlaceholder: {
        alignItems: 'center',
        paddingVertical: Layout.spacing.md,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Layout.spacing.sm,
        height: 70,
    },
    barItem: {
        alignItems: 'center',
        gap: 4,
    },
    bar: {
        width: 28,
        backgroundColor: Colors.parent.primary,
        borderRadius: 4,
        opacity: 0.3,
    },
    barLabel: {
        fontSize: 9,
        fontFamily: Typography.fonts.regular,
        color: Colors.parent.textSecondary,
    },
    placeholderNote: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        textAlign: 'center',
        marginTop: Layout.spacing.md,
        fontStyle: 'italic',
    },

    // ── Breakdown ──
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    breakdownItem: {
        alignItems: 'center',
        gap: 4,
    },
    breakdownColor: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    breakdownLabel: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
    },
    breakdownValue: {
        ...Typography.parent.label,
        color: Colors.parent.textPrimary,
    },
});
