/**
 * Story Creator Screen — Creative Sub-Activity
 * Allows children to generate a story based on selected keywords.
 * Demonstrates bilingual content generation and proper RTL/BiDi handling.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { getBiDiStyle, isArabic } from '../../services/utils/bidi';

const KEYWORDS = [
    { id: 'rabbit', label: 'Rabbit', labelAr: 'أرنب' },
    { id: 'forest', label: 'Forest', labelAr: 'غابة' },
    { id: 'carrot', label: 'Carrot', labelAr: 'جزرة' },
    { id: 'friend', label: 'Friend', labelAr: 'صديق' },
    { id: 'magic', label: 'Magic', labelAr: 'سحر' },
    { id: 'star', label: 'Star', labelAr: 'نجمة' },
];

export default function CreativeStoryScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [story, setStory] = useState<string | null>(null);

    const toggleKeyword = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
        );
    };

    const handleGenerate = () => {
        if (selected.length === 0) return;
        setIsGenerating(true);
        // Simulate AI generation
        setTimeout(() => {
            const hasRabbit = selected.includes('rabbit');
            const hasForest = selected.includes('forest');
            
            let storyAr = "كان هناك أرنب (rabbit) صغير يعيش في الغابة (forest). ";
            storyAr += "في كل يوم، كان يبحث عن الجزرة (carrot) السحرية. ";
            storyAr += "وبمساعدة صديق (friend) جديد، وجد النجمة (star) الساطعة.";
            
            setStory(storyAr);
            setIsGenerating(false);
        }, 1500);
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.child.primary} />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Story Creator</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {!story ? (
                    <>
                        <Text style={styles.sectionTitle}>Pick keywords for your story:</Text>
                        <View style={styles.grid}>
                            {KEYWORDS.map((kw, i) => (
                                <TouchableOpacity
                                    key={kw.id}
                                    style={[
                                        styles.kwCard,
                                        selected.includes(kw.id) && styles.kwCardSelected
                                    ]}
                                    onPress={() => toggleKeyword(kw.id)}
                                >
                                    <Text style={[styles.kwLabel, selected.includes(kw.id) && styles.kwLabelSelected]}>{kw.label}</Text>
                                    <Text style={[styles.kwLabelAr, selected.includes(kw.id) && styles.kwLabelSelected]}>{kw.labelAr}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.genBtn, selected.length === 0 && styles.disabledBtn]}
                            onPress={handleGenerate}
                            disabled={selected.length === 0 || isGenerating}
                        >
                            {isGenerating ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.genBtnText}>Generate Story ✨</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <Animated.View entering={FadeIn} style={styles.storyResult}>
                        <Text style={styles.resultTitle}>Your Magical Story</Text>
                        <View style={styles.storyCard}>
                            <Text style={[styles.storyText, getBiDiStyle(story)]}>
                                {story}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.resetBtn} onPress={() => setStory(null)}>
                            <Text style={styles.resetBtnText}>Create Another Story</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FDF7FF' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2ECF4', alignItems: 'center', justifyContent: 'center' },
    topTitle: { ...Typography.child.title, color: '#63597C' },
    content: { padding: 20 },
    sectionTitle: { ...Typography.child.subtitle, marginBottom: 20, color: '#4B4263' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    kwCard: {
        width: '47%',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E1D4FD',
        alignItems: 'center',
    },
    kwCardSelected: {
        backgroundColor: '#6750A4',
        borderColor: '#4F378A',
    },
    kwLabel: { ...Typography.child.body, fontWeight: '700', color: '#6750A4' },
    kwLabelAr: { ...Typography.child.body, color: '#6750A4', fontSize: 16 },
    kwLabelSelected: { color: '#FFF' },
    genBtn: {
        backgroundColor: '#4F378A',
        padding: 18,
        borderRadius: Layout.radius.full,
        alignItems: 'center',
        shadowColor: '#4F378A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledBtn: { backgroundColor: '#CCC', shadowOpacity: 0 },
    genBtnText: { ...Typography.child.button, color: '#FFF' },
    storyResult: { gap: 20 },
    resultTitle: { ...Typography.child.title, color: '#4F378A', textAlign: 'center' },
    storyCard: {
        backgroundColor: '#FFF',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E1D4FD',
        minHeight: 200,
    },
    storyText: {
        ...Typography.child.body,
        fontSize: 20,
        lineHeight: 32,
        color: '#1D1B20',
    },
    resetBtn: {
        padding: 16,
        alignItems: 'center',
    },
    resetBtnText: { ...Typography.child.body, color: '#6750A4', fontWeight: '600' },
});
