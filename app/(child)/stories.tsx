/**
 * Stories Screen — Stitch Story Library Design
 * Matches child_mode_story_library with gradient background
 * and floating glow blobs like the reception area.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Header from '../../components/ui/Header';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

const stories = [
    {
        id: 1,
        emoji: '🦁',
        title: 'The Brave Little Lion',
        description: 'Join Leo on his first big adventure across the sunny savanna!',
        coverBg: '#E1D4FD',
        btnBg: Colors.child.primaryFixed,
        btnBorder: Colors.child.primaryFixedDim,
        btnTextColor: Colors.child.primary,
    },
    {
        id: 2,
        emoji: '🌙',
        title: 'Starlight Adventures',
        description: 'Sail across the Milky Way and catch falling stars before bedtime.',
        coverBg: '#4f378a',
        btnBg: Colors.child.primary,
        btnBorder: '#22005d',
        btnTextColor: Colors.child.onPrimary,
    },
    {
        id: 3,
        emoji: '🐻',
        title: 'Forest Friends',
        description: 'Discover the hidden secrets of the whispering woods.',
        coverBg: '#FFDF93',
        btnBg: '#E9DDFF',
        btnBorder: '#CDC0E9',
        btnTextColor: Colors.child.primary,
    },
];

export default function StoriesScreen() {
    const router = useRouter();

    return (
        <LinearGradient colors={['#F2EEFF', '#FDF7FF', '#FFF6E8']} style={styles.safe}>
            {/* ── Floating Glow Blobs ── */}
            <View style={styles.blobContainer} pointerEvents="none">
                <View style={[styles.blob, styles.blobPurple]} />
                <View style={[styles.blob, styles.blobGold]} />
            </View>

            <Header onLockPress={() => {}} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                {/* ── Hero Section ── */}
                <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Story Time!</Text>
                    <Text style={styles.heroSubtitle}>
                        Pick a magical adventure to read today.
                    </Text>
                </View>

                {/* ── Story Cards ── */}
                {stories.map((story, index) => (
                    <Animated.View
                        key={story.id}
                        entering={FadeInDown.delay(index * 150).duration(500)}
                    >
                        <View style={styles.storyCard}>
                            {/* Cover Illustration */}
                            <View style={[styles.coverArea, { backgroundColor: story.coverBg }]}>
                                <Text style={styles.coverEmoji}>{story.emoji}</Text>
                            </View>

                            {/* Info Area */}
                            <View style={styles.infoArea}>
                                <Text style={styles.storyTitle}>{story.title}</Text>
                                <Text style={styles.storyDesc}>{story.description}</Text>

                                {/* Read Now Button (3D) */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[
                                        styles.readBtn,
                                        {
                                            backgroundColor: story.btnBg,
                                            borderBottomColor: story.btnBorder,
                                        },
                                    ]}
                                    onPress={() => router.push(`/(child)/story/${story.id}`)}
                                >
                                    <Ionicons
                                        name="book"
                                        size={22}
                                        color={story.btnTextColor}
                                    />
                                    <Text style={[styles.readBtnText, { color: story.btnTextColor }]}>
                                        Read Now
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                ))}
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
    blobContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        overflow: 'hidden',
    },
    blob: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.45,
    },
    blobPurple: {
        width: 340,
        height: 340,
        backgroundColor: '#E9DDFF',
        top: -80,
        left: -60,
    },
    blobGold: {
        width: 400,
        height: 400,
        backgroundColor: '#FFDF93',
        bottom: -120,
        right: -80,
    },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxxl,
        gap: 20,
        position: 'relative',
        zIndex: 1,
    },

    // ── Hero ──
    heroSection: {
        alignItems: 'center',
        paddingVertical: Layout.spacing.xl,
    },
    heroTitle: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        textAlign: 'center',
    },
    heroSubtitle: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 300,
    },

    // ── Story Card ──
    storyCard: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.6)',
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
    },
    coverArea: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverEmoji: {
        fontSize: 90,
    },
    infoArea: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: 'rgba(253,247,255,0.9)',
    },
    storyTitle: {
        ...Typography.child.title,
        color: Colors.child.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    storyDesc: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 28,
    },

    // ── Read Now Button (3D) ──
    readBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: Layout.radius.full,
        borderBottomWidth: 6,
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 0,
        elevation: 6,
    },
    readBtnText: {
        ...Typography.child.subtitle,
    },
});
