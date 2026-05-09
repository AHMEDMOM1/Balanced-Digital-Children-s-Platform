/**
 * Creative Activities Screen
 * Displays age-appropriate creative activity flashcards.
 * Each card has an emoji illustration and a "I Did It!" button.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Header from '../../components/ui/Header';
import Card from '../../components/ui/Card';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface Activity {
    id: number;
    emoji: string;
    title: string;
    description: string;
    completed: boolean;
}

const initialActivities: Omit<Activity, 'completed'>[] = [
    { id: 1, emoji: '🎨', title: 'Elma Çiz', description: 'Kağıt ve kalem al, güzel bir elma çiz!' },
    { id: 2, emoji: '✂️', title: 'Kağıt Kar Tanesi', description: 'Beyaz kağıdı katla ve güzel bir kar tanesi kes.' },
    { id: 3, emoji: '🏗️', title: 'Lego Kule', description: 'Legolarınla en yüksek kuleyi inşa et!' },
    { id: 4, emoji: '🌸', title: 'Çiçek Baskısı', description: 'Yaprakları boyaya batır ve kağıda baskı yap.' },
    { id: 5, emoji: '📖', title: 'Hikaye Yaz', description: 'Kısa bir hikaye yaz ve aileye oku!' },
    { id: 6, emoji: '🧩', title: 'Yapboz Yap', description: 'Bir resim çiz, parçalara kes ve tekrar birleştir.' },
];

export default function CreativeScreen() {
    const router = useRouter();
    const [activities, setActivities] = useState<Activity[]>(
        initialActivities.map((a) => ({ ...a, completed: false }))
    );

    const markCompleted = (id: number) => {
        setActivities((prev) =>
            prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
        );
    };

    const completedCount = activities.filter((a) => a.completed).length;

    return (
        <SafeAreaView style={styles.safe}>
            <Header
                title="🎨 Yaratıcı Etkinlikler"
                subtitle="Eğlenerek öğren!"
                variant="child"
                showBack
                onBack={() => router.back()}
            />

            {/* ── Progress ── */}
            <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                    {completedCount}/{activities.length} etkinlik tamamlandı 🌟
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(completedCount / activities.length) * 100}%` },
                        ]}
                    />
                </View>
            </View>

            {/* ── Activity Cards ── */}
            <View style={styles.content}>
                {activities.map((activity) => (
                    <Card
                        key={activity.id}
                        variant="child"
                        color={activity.completed ? '#C8E6C9' : Colors.child.cardCreative}
                        style={styles.activityCard}
                    >
                        <View style={styles.cardRow}>
                            <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                            <View style={styles.activityInfo}>
                                <Text
                                    style={[
                                        styles.activityTitle,
                                        activity.completed && styles.completedText,
                                    ]}
                                >
                                    {activity.title}
                                </Text>
                                <Text style={styles.activityDesc}>{activity.description}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.doneButton,
                                activity.completed && styles.doneButtonCompleted,
                            ]}
                            onPress={() => markCompleted(activity.id)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.doneButtonText,
                                    activity.completed && styles.doneButtonTextCompleted,
                                ]}
                            >
                                {activity.completed ? '✅ Yaptım!' : '⭐ Yaptım!'}
                            </Text>
                        </TouchableOpacity>
                    </Card>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.child.background },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        gap: Layout.spacing.md,
        paddingBottom: Layout.spacing.xxl,
    },

    // ── Progress ──
    progressContainer: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        marginBottom: Layout.spacing.lg,
    },
    progressText: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginBottom: Layout.spacing.sm,
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.child.accent,
        borderRadius: 4,
    },

    // ── Card ──
    activityCard: {
        padding: Layout.spacing.lg,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
    },
    activityEmoji: {
        fontSize: 40,
        marginRight: Layout.spacing.md,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textPrimary,
    },
    completedText: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    activityDesc: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },

    // ── Done Button ──
    doneButton: {
        alignSelf: 'flex-end',
        paddingVertical: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.lg,
        borderRadius: Layout.radius.round,
        backgroundColor: Colors.child.accent,
    },
    doneButtonCompleted: {
        backgroundColor: '#4CAF50',
    },
    doneButtonText: {
        ...Typography.child.body,
        color: Colors.shared.white,
        fontWeight: '700',
    },
    doneButtonTextCompleted: {
        color: Colors.shared.white,
    },
});
