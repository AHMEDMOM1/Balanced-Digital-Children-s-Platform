/**
 * Video Player Screen — Individual Video View
 * Matches Stitch video gallery card style with immersive player.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Colors from '../../../constants/Colors';
import Typography from '../../../constants/Typography';
import Layout from '../../../constants/Layout';

const VIDEO_DATA: Record<string, { emoji: string; title: string; description: string; bg: string; titleColor: string }> = {
    '1': { emoji: '🦁🐘🦒', title: 'Animal Kingdom', description: 'Discover amazing animals from around the world! Learn fun facts about lions, elephants, and giraffes in their natural habitat.', bg: '#D4E7D1', titleColor: '#6750A4' },
    '2': { emoji: '🎵🔢🎶', title: 'Number Songs', description: 'Sing along with catchy tunes and learn to count all the way to 100! Music makes learning numbers super fun.', bg: '#FFF1D6', titleColor: '#C9A74D' },
    '3': { emoji: '🧪🪐⚗️', title: 'Science Fun', description: 'Watch amazing science experiments that you can try at home. From volcanos to slime, science is awesome!', bg: '#E1D4FD', titleColor: '#63597C' },
    '4': { emoji: '📖🌳👦', title: 'Story Time', description: 'Relax and enjoy our favorite bedtime tales. Beautiful stories with magical characters and happy endings.', bg: '#D8E8D4', titleColor: '#6750A4' },
};

const RELATED = [
    { emoji: '🎨', title: 'Colors & Shapes', duration: '5 min' },
    { emoji: '🐾', title: 'Pet Friends', duration: '8 min' },
    { emoji: '🚀', title: 'Space Journey', duration: '6 min' },
];

export default function VideoPlayerScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [isPlaying, setIsPlaying] = useState(false);
    const video = VIDEO_DATA[id || '1'] || VIDEO_DATA['1'];

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* ── Player Area ── */}
                <Animated.View entering={FadeIn.duration(500)}>
                    <View style={[styles.playerArea, { backgroundColor: video.bg }]}>
                        <TouchableOpacity
                            style={styles.backFloating}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </TouchableOpacity>

                        <Text style={styles.playerEmoji}>{video.emoji}</Text>

                        <TouchableOpacity
                            style={styles.playBtn}
                            onPress={() => setIsPlaying(!isPlaying)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={40}
                                color="#FFF"
                            />
                        </TouchableOpacity>

                        <View style={styles.playerOverlay} />
                    </View>
                </Animated.View>

                {/* ── Video Info ── */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.infoCard}>
                    <Text style={[styles.videoTitle, { color: video.titleColor }]}>
                        {video.title}
                    </Text>
                    <Text style={styles.videoDesc}>{video.description}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaPill}>
                            <Ionicons name="time-outline" size={16} color="#63597C" />
                            <Text style={styles.metaText}>10 min</Text>
                        </View>
                        <View style={styles.metaPill}>
                            <Ionicons name="star" size={16} color="#C9A74D" />
                            <Text style={styles.metaText}>Ages 3-6</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* ── Related Videos ── */}
                <Text style={styles.sectionTitle}>Watch Next</Text>
                {RELATED.map((item, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(400 + i * 100).duration(400)}>
                        <TouchableOpacity style={styles.relatedCard} activeOpacity={0.85}>
                            <View style={styles.relatedThumb}>
                                <Text style={styles.relatedEmoji}>{item.emoji}</Text>
                            </View>
                            <View style={styles.relatedInfo}>
                                <Text style={styles.relatedTitle}>{item.title}</Text>
                                <Text style={styles.relatedDuration}>{item.duration}</Text>
                            </View>
                            <Ionicons name="play-circle" size={32} color={Colors.child.primary} />
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FDF7FF' },
    content: { paddingBottom: 40 },

    // Player
    playerArea: {
        height: 280,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    backFloating: {
        position: 'absolute',
        top: 16,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    playerEmoji: { fontSize: 72, opacity: 0.6 },
    playBtn: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    playerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.15)',
        zIndex: 1,
    },

    // Info
    infoCard: {
        marginHorizontal: 20,
        marginTop: -24,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        borderBottomWidth: 4,
        borderBottomColor: 'rgba(79,55,138,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        zIndex: 20,
    },
    videoTitle: { ...Typography.child.title, marginBottom: 8 },
    videoDesc: { ...Typography.child.body, color: '#494551', lineHeight: 28 },
    metaRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F2ECF4',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 99,
    },
    metaText: { ...Typography.child.body, fontSize: 14, color: '#63597C', fontWeight: '600' },

    // Related
    sectionTitle: { ...Typography.child.subtitle, color: '#63597C', marginHorizontal: 20, marginTop: 28, marginBottom: 12 },
    relatedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        backgroundColor: '#F8F2FA',
        borderRadius: 20,
        padding: 12,
        borderBottomWidth: 3,
        borderBottomColor: '#E6E0E9',
    },
    relatedThumb: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: '#E1D4FD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    relatedEmoji: { fontSize: 28 },
    relatedInfo: { flex: 1 },
    relatedTitle: { ...Typography.child.subtitle, color: '#494551', fontSize: 16 },
    relatedDuration: { ...Typography.child.body, fontSize: 13, color: '#7A7582', marginTop: 2 },
});
