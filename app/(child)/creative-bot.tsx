/**
 * Build-a-Bot Screen — Creative Sub-Activity
 * Drag-and-drop robot assembly placeholder with 3D part cards.
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

const PARTS = [
    { id: 'head', emoji: '🤖', label: 'Head' },
    { id: 'body', emoji: '🦾', label: 'Body' },
    { id: 'legs', emoji: '🦿', label: 'Legs' },
    { id: 'arms', emoji: '🙌', label: 'Arms' },
    { id: 'eyes', emoji: '👀', label: 'Eyes' },
    { id: 'hat', emoji: '🎩', label: 'Hat' },
];

export default function CreativeBotScreen() {
    const router = useRouter();
    const [selectedParts, setSelectedParts] = useState<string[]>([]);

    const togglePart = (id: string) => {
        setSelectedParts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.child.primary} />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Build-a-Bot</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={() => setSelectedParts([])}>
                    <Ionicons name="refresh" size={22} color="#63597C" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Robot Preview ── */}
                <Animated.View entering={FadeIn.duration(600)} style={styles.previewCard}>
                    <Text style={styles.previewLabel}>Your Robot</Text>
                    <View style={styles.previewBot}>
                        {selectedParts.length === 0 ? (
                            <Text style={styles.previewPlaceholder}>Tap parts below to build!</Text>
                        ) : (
                            <Text style={styles.previewEmoji}>
                                {selectedParts.map(id => PARTS.find(p => p.id === id)?.emoji || '').join(' ')}
                            </Text>
                        )}
                    </View>
                </Animated.View>

                {/* ── Parts Grid ── */}
                <Text style={styles.sectionTitle}>Choose Parts</Text>
                <View style={styles.partsGrid}>
                    {PARTS.map((part, i) => (
                        <Animated.View
                            key={part.id}
                            entering={FadeInDown.delay(i * 100).duration(400)}
                            style={styles.partCardWrapper}
                        >
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[
                                    styles.partCard,
                                    selectedParts.includes(part.id) && styles.partCardSelected,
                                ]}
                                onPress={() => togglePart(part.id)}
                            >
                                <Text style={styles.partEmoji}>{part.emoji}</Text>
                                <Text style={[
                                    styles.partLabel,
                                    selectedParts.includes(part.id) && styles.partLabelSelected,
                                ]}>
                                    {part.label}
                                </Text>
                                {selectedParts.includes(part.id) && (
                                    <View style={styles.checkBadge}>
                                        <Ionicons name="checkmark" size={14} color="#FFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FDF7FF' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2ECF4', alignItems: 'center', justifyContent: 'center' },
    topTitle: { ...Typography.child.title, color: '#63597C' },
    resetBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E1D4FD', alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

    // Preview
    previewCard: {
        backgroundColor: '#E1D4FD',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        borderBottomWidth: 6,
        borderBottomColor: '#CDC0E9',
        shadowColor: '#E1D4FD',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 5,
    },
    previewLabel: { ...Typography.child.subtitle, color: '#4B4263', marginBottom: 16 },
    previewBot: { minHeight: 80, alignItems: 'center', justifyContent: 'center' },
    previewPlaceholder: { ...Typography.child.body, color: '#7A7582', fontStyle: 'italic' },
    previewEmoji: { fontSize: 48 },

    sectionTitle: { ...Typography.child.subtitle, color: '#63597C', marginTop: 8 },

    // Parts Grid
    partsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    partCardWrapper: { width: '47%' },
    partCard: {
        backgroundColor: '#F2ECF4',
        borderRadius: 20,
        paddingVertical: 24,
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 4,
        borderBottomColor: '#E6E0E9',
        position: 'relative',
    },
    partCardSelected: {
        backgroundColor: '#6750A4',
        borderBottomColor: '#4F378A',
    },
    partEmoji: { fontSize: 40 },
    partLabel: { ...Typography.child.subtitle, color: '#494551', fontSize: 16 },
    partLabelSelected: { color: '#FFFFFF' },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4ECB71',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
