/**
 * Sticker World Screen — Creative Sub-Activity
 * Scene decoration with draggable stickers on themed backgrounds.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

const SCENES = [
    { id: 'forest', emoji: '🌲', label: 'Forest', bg: '#D4F5D4' },
    { id: 'ocean', emoji: '🌊', label: 'Ocean', bg: '#D4E8F5' },
    { id: 'space', emoji: '🌌', label: 'Space', bg: '#2D2040' },
    { id: 'garden', emoji: '🌸', label: 'Garden', bg: '#FFE8F0' },
];

const STICKERS = [
    '🦋', '🌈', '⭐', '🎈', '🦄', '🌻',
    '🐱', '🐶', '🐻', '🎀', '💎', '🍄',
    '🏠', '☀️', '🌙', '❤️', '🎵', '🦊',
];

export default function CreativeStickersScreen() {
    const router = useRouter();
    const [selectedScene, setSelectedScene] = useState(SCENES[0]);
    const [placedStickers, setPlacedStickers] = useState<string[]>([]);

    const addSticker = (sticker: string) => {
        setPlacedStickers(prev => [...prev, sticker]);
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Sticker World</Text>
                <TouchableOpacity style={styles.clearBtn} onPress={() => setPlacedStickers([])}>
                    <Ionicons name="refresh" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Scene Preview ── */}
                <Animated.View entering={FadeIn.duration(600)}>
                    <View style={[styles.sceneCard, { backgroundColor: selectedScene.bg }]}>
                        <Text style={styles.sceneEmoji}>{selectedScene.emoji}</Text>
                        <View style={styles.stickersOverlay}>
                            {placedStickers.map((s, i) => (
                                <Text
                                    key={i}
                                    style={[
                                        styles.placedSticker,
                                        {
                                            left: `${15 + (i * 17) % 70}%`,
                                            top: `${10 + (i * 23) % 60}%`,
                                        } as any,
                                    ]}
                                >
                                    {s}
                                </Text>
                            ))}
                        </View>
                        {placedStickers.length === 0 && (
                            <Text style={[
                                styles.scenePlaceholder,
                                selectedScene.id === 'space' && { color: '#CCC' },
                            ]}>
                                Tap stickers below to decorate!
                            </Text>
                        )}
                    </View>
                </Animated.View>

                {/* ── Scene Selector ── */}
                <Text style={styles.sectionTitle}>Choose a Scene</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sceneRow}>
                    {SCENES.map(scene => (
                        <TouchableOpacity
                            key={scene.id}
                            activeOpacity={0.8}
                            style={[
                                styles.sceneChip,
                                { backgroundColor: scene.bg },
                                selectedScene.id === scene.id && styles.sceneChipActive,
                            ]}
                            onPress={() => {
                                setSelectedScene(scene);
                                setPlacedStickers([]);
                            }}
                        >
                            <Text style={styles.sceneChipEmoji}>{scene.emoji}</Text>
                            <Text style={[
                                styles.sceneChipLabel,
                                scene.id === 'space' && { color: '#EEE' },
                            ]}>
                                {scene.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── Sticker Palette ── */}
                <Text style={styles.sectionTitle}>Stickers</Text>
                <View style={styles.stickerGrid}>
                    {STICKERS.map((sticker, i) => (
                        <Animated.View
                            key={i}
                            entering={FadeInDown.delay(i * 40).duration(300)}
                        >
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={styles.stickerBtn}
                                onPress={() => addSticker(sticker)}
                            >
                                <Text style={styles.stickerEmoji}>{sticker}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#6750A4' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { ...Typography.child.title, color: '#FFFFFF' },
    clearBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        backgroundColor: '#FDF7FF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 24,
        minHeight: '100%',
    },

    // Scene
    sceneCard: {
        width: '100%',
        height: 260,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderBottomWidth: 6,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 5,
        position: 'relative',
    },
    sceneEmoji: { fontSize: 80, opacity: 0.3 },
    stickersOverlay: { ...StyleSheet.absoluteFillObject },
    placedSticker: { position: 'absolute', fontSize: 32 },
    scenePlaceholder: {
        position: 'absolute',
        bottom: 20,
        ...Typography.child.body,
        color: '#494551',
        fontStyle: 'italic',
    },

    sectionTitle: { ...Typography.child.subtitle, color: '#63597C', marginTop: 24, marginBottom: 12 },

    // Scene selector
    sceneRow: { marginBottom: 8 },
    sceneChip: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginRight: 12,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    sceneChipActive: { borderWidth: 3, borderColor: '#6750A4' },
    sceneChipEmoji: { fontSize: 20 },
    sceneChipLabel: { ...Typography.child.body, fontSize: 14, fontWeight: '600', color: '#494551' },

    // Sticker grid
    stickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    stickerBtn: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#F2ECF4',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 3,
        borderBottomColor: '#E6E0E9',
    },
    stickerEmoji: { fontSize: 28 },
});
