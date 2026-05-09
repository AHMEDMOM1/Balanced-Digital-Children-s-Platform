/**
 * Educational Videos Screen
 * Displays parent-curated educational video cards.
 * Placeholder for future YouTube iframe integration.
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

export default function VideosScreen() {
    const router = useRouter();

    const sampleVideos = [
        { id: 1, emoji: '🔬', title: 'Bilim Dünyası', category: 'Bilim', duration: '8 dk' },
        { id: 2, emoji: '🌍', title: 'Gezegenler Turu', category: 'Uzay', duration: '12 dk' },
        { id: 3, emoji: '🎵', title: 'Neşeli Şarkılar', category: 'Müzik', duration: '5 dk' },
        { id: 4, emoji: '🐾', title: 'Hayvanlar Alemi', category: 'Doğa', duration: '10 dk' },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <Header
                title="🎬 Eğitici Videolar"
                subtitle="Babandan özel seçilmiş videolar!"
                variant="child"
                showBack
                onBack={() => router.back()}
            />

            <View style={styles.content}>
                {sampleVideos.map((video) => (
                    <Card
                        key={video.id}
                        variant="child"
                        color={Colors.child.cardVideo}
                        style={styles.videoCard}
                        onPress={() => { }}
                    >
                        {/* ── Thumbnail placeholder ── */}
                        <View style={styles.thumbnail}>
                            <Text style={styles.thumbnailEmoji}>{video.emoji}</Text>
                            <View style={styles.playButton}>
                                <Text style={styles.playIcon}>▶</Text>
                            </View>
                        </View>

                        {/* ── Video Info ── */}
                        <View style={styles.videoInfo}>
                            <Text style={styles.videoTitle}>{video.title}</Text>
                            <View style={styles.metaRow}>
                                <Text style={styles.videoCategory}>{video.category}</Text>
                                <Text style={styles.videoDuration}>⏱ {video.duration}</Text>
                            </View>
                        </View>
                    </Card>
                ))}

                <Text style={styles.comingSoon}>
                    Baban daha fazla video ekleyecek! 🎬✨
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
        paddingBottom: Layout.spacing.xxl,
    },

    videoCard: {
        padding: 0,
        overflow: 'hidden',
    },

    // ── Thumbnail ──
    thumbnail: {
        height: 120,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    thumbnailEmoji: {
        fontSize: 48,
    },
    playButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.child.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playIcon: {
        color: Colors.shared.white,
        fontSize: 16,
        marginLeft: 2,
    },

    // ── Info ──
    videoInfo: {
        padding: Layout.spacing.md,
    },
    videoTitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textPrimary,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    videoCategory: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        fontSize: 13,
    },
    videoDuration: {
        ...Typography.child.body,
        color: Colors.child.accent,
        fontSize: 13,
        fontWeight: '600',
    },

    comingSoon: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginTop: Layout.spacing.lg,
    },
});
