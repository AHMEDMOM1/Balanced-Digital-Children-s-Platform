/**
 * Stories Screen (Placeholder)
 * Will display interactive educational stories in later weeks.
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

export default function StoriesScreen() {
    const router = useRouter();

    const sampleStories = [
        { id: 1, emoji: '🐢', title: 'Kaplumbağa ve Tavşan', category: 'Masallar' },
        { id: 2, emoji: '🌙', title: 'Aya Yolculuk', category: 'Macera' },
        { id: 3, emoji: '🌻', title: 'Çiçek Bahçesi', category: 'Doğa' },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <Header
                title="📖 Hikayeler"
                subtitle="Eğlenceli bir hikaye seç"
                variant="child"
                showBack
                onBack={() => router.back()}
            />

            <View style={styles.content}>
                {sampleStories.map((story) => (
                    <Card
                        key={story.id}
                        variant="child"
                        color={Colors.child.cardStory}
                        style={styles.storyCard}
                        onPress={() => router.push(`/(child)/story/${story.id}` as any)}
                    >
                        <Text style={styles.storyEmoji}>{story.emoji}</Text>
                        <View style={styles.storyInfo}>
                            <Text style={styles.storyTitle}>{story.title}</Text>
                            <Text style={styles.storyCategory}>{story.category}</Text>
                        </View>
                    </Card>
                ))}

                <Text style={styles.comingSoon}>
                    Yakında daha fazla hikaye eklenecek! 🌟
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
    storyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.lg,
    },
    storyEmoji: {
        fontSize: 40,
        marginRight: Layout.spacing.md,
    },
    storyInfo: {
        flex: 1,
    },
    storyTitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textPrimary,
    },
    storyCategory: {
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
