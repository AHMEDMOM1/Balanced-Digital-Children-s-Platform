/**
 * Parent Settings Screen
 * Controls for screen time, sessions, content filters, and PIN management.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/ui/Header';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import useSettingsStore from '../../store/useSettingsStore';

export default function SettingsScreen() {
    const settings = useSettingsStore();
    const [showPinEdit, setShowPinEdit] = useState(false);
    const [newPin, setNewPin] = useState('');

    const timeOptions = [15, 30, 45, 60, 90, 120];
    const sessionOptions = [1, 2, 3, 4, 5];
    const sessionDuration = Math.round(settings.dailyTimeLimitMinutes / settings.sessionsPerDay);

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <Header
                    title="Ayarlar ⚙️"
                    subtitle="Çocuğunuzun dijital deneyimini kontrol edin"
                    variant="parent"
                />

                {/* ── Screen Time ── */}
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>⏱️ Günlük Ekran Süresi</Text>
                    <Text style={styles.cardDescription}>
                        Çocuğunuzun günde en fazla ne kadar zaman geçirebileceğini seçin
                    </Text>
                    <View style={styles.optionsRow}>
                        {timeOptions.map((min) => (
                            <Button
                                key={min}
                                title={`${min} dk`}
                                variant={settings.dailyTimeLimitMinutes === min ? 'parent' : 'outline'}
                                size="small"
                                onPress={() => settings.setDailyTimeLimit(min)}
                                style={styles.optionButton}
                            />
                        ))}
                    </View>
                    <Text style={styles.currentValue}>
                        Geçerli Ayar: {settings.dailyTimeLimitMinutes} dakika
                    </Text>
                </Card>

                {/* ── Sessions ── */}
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>🎮 Günlük Seans Sayısı</Text>
                    <Text style={styles.cardDescription}>
                        Çocuğunuzun günde kaç seans yapabileceğini belirleyin
                    </Text>
                    <View style={styles.optionsRow}>
                        {sessionOptions.map((count) => (
                            <Button
                                key={count}
                                title={`${count}`}
                                variant={settings.sessionsPerDay === count ? 'parent' : 'outline'}
                                size="small"
                                onPress={() => settings.setSessionsPerDay(count)}
                                style={styles.sessionButton}
                            />
                        ))}
                    </View>
                    <Text style={styles.currentValue}>
                        Her seans için yaklaşık süre: {sessionDuration} dakika
                    </Text>
                </Card>

                {/* ── Content Filters ── */}
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>🔍 İçerik Filtreleme</Text>
                    <Text style={styles.cardDescription}>
                        Çocuğunuzun hangi içerik türlerine erişebileceğini seçin
                    </Text>

                    <View style={styles.filterRow}>
                        <View style={styles.filterInfo}>
                            <Text style={styles.filterEmoji}>📖</Text>
                            <Text style={styles.filterLabel}>Eğitici Hikayeler</Text>
                        </View>
                        <Switch
                            value={settings.storiesEnabled}
                            onValueChange={settings.toggleStories}
                            trackColor={{ false: Colors.parent.border, true: Colors.parent.primary }}
                            thumbColor={Colors.shared.white}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.filterRow}>
                        <View style={styles.filterInfo}>
                            <Text style={styles.filterEmoji}>🧩</Text>
                            <Text style={styles.filterLabel}>Zeka ve Mantık Oyunları</Text>
                        </View>
                        <Switch
                            value={settings.gamesEnabled}
                            onValueChange={settings.toggleGames}
                            trackColor={{ false: Colors.parent.border, true: Colors.parent.primary }}
                            thumbColor={Colors.shared.white}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.filterRow}>
                        <View style={styles.filterInfo}>
                            <Text style={styles.filterEmoji}>🎨</Text>
                            <Text style={styles.filterLabel}>Yaratıcı Etkinlikler</Text>
                        </View>
                        <Switch
                            value={settings.creativeEnabled}
                            onValueChange={settings.toggleCreative}
                            trackColor={{ false: Colors.parent.border, true: Colors.parent.primary }}
                            thumbColor={Colors.shared.white}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.filterRow}>
                        <View style={styles.filterInfo}>
                            <Text style={styles.filterEmoji}>🎬</Text>
                            <Text style={styles.filterLabel}>Eğitici Videolar</Text>
                        </View>
                        <Switch
                            value={settings.videosEnabled}
                            onValueChange={settings.toggleVideos}
                            trackColor={{ false: Colors.parent.border, true: Colors.parent.primary }}
                            thumbColor={Colors.shared.white}
                        />
                    </View>
                </Card>

                {/* ── PIN Management ── */}
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>🔒 PIN Kodu</Text>
                    <Text style={styles.cardDescription}>
                        Çocuğun uygulamadan çıkış yapması için gereken gizli kod
                    </Text>
                    <View style={styles.pinDisplay}>
                        <Text style={styles.pinValue}>
                            {settings.pinCode.split('').map(() => '●').join(' ')}
                        </Text>
                    </View>
                    <Text style={styles.pinHint}>
                        Geçerli Kod: {settings.pinCode}
                    </Text>
                </Card>

                <View style={{ height: Layout.spacing.xxl * 2 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.parent.background },
    container: { flex: 1 },

    card: {
        marginHorizontal: Layout.screen.paddingHorizontal,
        marginBottom: Layout.spacing.lg,
    },
    cardTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
        marginBottom: 4,
    },
    cardDescription: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        marginBottom: Layout.spacing.md,
    },
    currentValue: {
        ...Typography.parent.caption,
        color: Colors.parent.primary,
        marginTop: Layout.spacing.md,
        textAlign: 'center',
    },

    // ── Options Row ──
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Layout.spacing.sm,
    },
    optionButton: {
        minWidth: 55,
    },
    sessionButton: {
        minWidth: 48,
    },

    // ── Content Filters ──
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Layout.spacing.md,
    },
    filterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Layout.spacing.md,
    },
    filterEmoji: { fontSize: 24 },
    filterLabel: {
        ...Typography.parent.body,
        color: Colors.parent.textPrimary,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.parent.border,
    },

    // ── PIN ──
    pinDisplay: {
        alignItems: 'center',
        paddingVertical: Layout.spacing.md,
    },
    pinValue: {
        ...Typography.parent.title,
        color: Colors.parent.textPrimary,
        letterSpacing: 8,
    },
    pinHint: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        textAlign: 'center',
    },
});
