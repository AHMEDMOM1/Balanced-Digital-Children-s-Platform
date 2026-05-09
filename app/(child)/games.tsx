/**
 * Brain Games Screen (Placeholder)
 * Will display interactive logic/puzzle games in later weeks.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Header from '../../components/ui/Header';
import Card from '../../components/ui/Card';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

export default function GamesScreen() {
    const router = useRouter();

    const sampleGames = [
        { id: 1, emoji: '🔢', title: 'Sayıları Say', level: 'Kolay' },
        { id: 2, emoji: '🧠', title: 'Şekilleri Hatırla', level: 'Orta' },
        { id: 3, emoji: '🎯', title: 'Farkları Bul', level: 'Eğlenceli' },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <Header
                title="🧩 Zeka Oyunları"
                subtitle="Zihnini geliştir!"
                variant="child"
                showBack
                onBack={() => router.back()}
            />

            <View style={styles.content}>
                {sampleGames.map((game) => (
                    <Card
                        key={game.id}
                        variant="child"
                        color={Colors.child.cardGame}
                        style={styles.gameCard}
                        onPress={() => router.push(`/(child)/game/${game.id}`)}
                    >
                        <Text style={styles.gameEmoji}>{game.emoji}</Text>
                        <View style={styles.gameInfo}>
                            <Text style={styles.gameTitle}>{game.title}</Text>
                            <Text style={styles.gameLevel}>Seviye: {game.level}</Text>
                        </View>
                    </Card>
                ))}

                <Text style={styles.comingSoon}>
                    Yeni oyunlar yakında! 🧠✨
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.child.background },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        gap: Layout.spacing.md,
    },
    gameCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.lg,
    },
    gameEmoji: {
        fontSize: 40,
        marginRight: Layout.spacing.md,
    },
    gameInfo: {
        flex: 1,
    },
    gameTitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textPrimary,
    },
    gameLevel: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        fontSize: 14,
        marginTop: 2,
    },
    comingSoon: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginTop: Layout.spacing.lg,
    },
});
