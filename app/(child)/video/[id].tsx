/**
 * Video Player Screen — Individual Video View
 * Matches Stitch video gallery card style with immersive player.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Colors from '../../../constants/Colors';
import Typography from '../../../constants/Typography';
import Layout from '../../../constants/Layout';
import { useContentById, useVideos } from '../../../services/api/hooks';
import { getBiDiStyle, formatBiDiText } from '../../../services/utils/bidi';
import useAuthStore from '../../../store/useAuthStore';
import { useSessionWriter } from '../../../services/api/sessions';
import YoutubePlayer from 'react-native-youtube-iframe';

const styleOptions = [
    { bg: '#D4E7D1', titleColor: '#6750A4' },
    { bg: '#FFF1D6', titleColor: '#C9A74D' },
    { bg: '#E1D4FD', titleColor: '#63597C' },
    { bg: '#D8E8D4', titleColor: '#6750A4' },
];

function extractYouTubeId(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function VideoPlayerScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [isPlaying, setIsPlaying] = useState(false);
    const { data: video, isLoading, error } = useContentById(id || '1');
    const { data: relatedVideos } = useVideos();
    const videoStyle = styleOptions[parseInt(id || '1') % styleOptions.length] || styleOptions[0];
    const childData = useAuthStore((s) => s.childData);
    const mountTimeRef = useRef(Date.now());
    const { openSession, closeSession } = useSessionWriter(
        childData?.id ?? '',
        childData?.familyId ?? '',
        'video',
        id ?? undefined
    );

    useEffect(() => {
        if (!childData?.id) return;
        mountTimeRef.current = Date.now();
        openSession();
        return () => {
            const elapsed = Math.round((Date.now() - mountTimeRef.current) / 1000);
            closeSession(elapsed);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* ── Loading State ── */}
                {isLoading && (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color={Colors.child.primary} />
                        <Text style={styles.stateText}>Loading video...</Text>
                    </View>
                )}

                {/* ── Error State ── */}
                {error && (
                    <View style={styles.centerState}>
                        <Ionicons name="cloud-offline-outline" size={48} color={Colors.child.textSecondary} />
                        <Text style={styles.stateText}>Could not load video</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
                            <Text style={styles.retryBtnText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Video Content ── */}
                {!isLoading && !error && video && (
                    <>
                        {/* ── Player Area ── */}
                        <Animated.View entering={FadeIn.duration(500)}>
                            {extractYouTubeId(video.url) ? (
                                <View style={{ height: 280, backgroundColor: '#000', borderRadius: 24, overflow: 'hidden' }}>
                                    <TouchableOpacity
                                        style={styles.backFloating}
                                        onPress={() => router.back()}
                                    >
                                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                                    </TouchableOpacity>
                                    <YoutubePlayer
                                        height={280}
                                        videoId={extractYouTubeId(video.url) as string}
                                        play={isPlaying}
                                        onChangeState={(event: string) => {
                                            if (event === 'ended') setIsPlaying(false);
                                        }}
                                    />
                                </View>
                            ) : (
                                <View style={[styles.playerArea, { backgroundColor: videoStyle.bg }]}>
                                    {video.thumbnail_url ? (
                                        <Image source={{ uri: video.thumbnail_url }} style={styles.playerThumbImage} />
                                    ) : (
                                        <Text style={styles.playerEmoji}>🎬</Text>
                                    )}
                                    <TouchableOpacity
                                        style={styles.backFloating}
                                        onPress={() => router.back()}
                                    >
                                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                                    </TouchableOpacity>
                                    <View style={styles.playOverlay}>
                                        <View style={styles.playCircle}>
                                            <Ionicons name="play" size={48} color="#FFF" />
                                        </View>
                                    </View>
                                </View>
                            )}
                        </Animated.View>

                        {/* ── Video Info ── */}
                        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.infoCard}>
                            <Text style={[styles.videoTitle, { color: videoStyle.titleColor }, getBiDiStyle(video.title)]}>
                                {formatBiDiText(video.title)}
                            </Text>
                            <Text style={styles.videoDesc}>{video.category}</Text>

                            <View style={styles.metaRow}>
                                <View style={styles.metaPill}>
                                    <Ionicons name="star" size={16} color="#C9A74D" />
                                    <Text style={styles.metaText}>Ages {video.min_age}-{video.max_age}</Text>
                                </View>
                            </View>
                        </Animated.View>

                        {/* ── Related Videos ── */}
                        {relatedVideos && relatedVideos.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Watch Next</Text>
                                {relatedVideos.filter((v) => v.id !== video.id).slice(0, 3).map((item, i) => (
                                    <Animated.View key={item.id} entering={FadeInDown.delay(400 + i * 100).duration(400)}>
                                        <TouchableOpacity
                                            style={styles.relatedCard}
                                            activeOpacity={0.85}
                                            onPress={() => router.push(`/(child)/video/${item.id}`)}
                                        >
                                            <View style={styles.relatedThumb}>
                                                {item.thumbnail_url ? (
                                                    <Image source={{ uri: item.thumbnail_url }} style={styles.relatedThumbImage} />
                                                ) : (
                                                    <Text style={styles.relatedEmoji}>🎬</Text>
                                                )}
                                            </View>
                                            <View style={styles.relatedInfo}>
                                                <Text style={[styles.relatedTitle, getBiDiStyle(item.title)]}>{formatBiDiText(item.title)}</Text>
                                                <Text style={styles.relatedDuration}>{item.category}</Text>
                                            </View>
                                            <Ionicons name="play-circle" size={32} color={Colors.child.primary} />
                                        </TouchableOpacity>
                                    </Animated.View>
                                ))}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FDF7FF' },
    content: { paddingBottom: 40 },

    centerState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        gap: 16,
    },
    stateText: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
    },
    retryBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: Layout.radius.full,
        backgroundColor: Colors.child.primary,
    },
    retryBtnText: {
        ...Typography.child.subtitle,
        color: Colors.child.onPrimary,
    },

    // Player
    playerArea: {
        height: 280,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
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
    playerThumbImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    playCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
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
        overflow: 'hidden',
    },
    relatedThumbImage: {
        width: '100%',
        height: '100%',
    },
    relatedEmoji: { fontSize: 28 },
    relatedInfo: { flex: 1 },
    relatedTitle: { ...Typography.child.subtitle, color: '#494551', fontSize: 16 },
    relatedDuration: { ...Typography.child.body, fontSize: 13, color: '#7A7582', marginTop: 2 },
});
