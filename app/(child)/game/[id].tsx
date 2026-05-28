/**
 * Game Screen — SafePlay Timer Counting Game
 * Matches the Stitch child_mode_brain_games design:
 * - Soft pink background (#FFE0E0)
 * - 3D home/help buttons with border-bottom effect
 * - Star progress in a pill
 * - Apple counting area with white card
 * - 3D answer buttons with depth shadow
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../../constants/Colors';
import Typography from '../../../constants/Typography';
import Layout from '../../../constants/Layout';

export default function GameScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    // Game State
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [won, setWon] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);

    // The target number to count
    const targetCount = level + 2; // Level 1 -> 3, Level 2 -> 4, Level 3 -> 5

    // Choices
    const [choices, setChoices] = useState<number[]>([]);

    useEffect(() => {
        const generateChoices = (target: number) => {
            const choicesSet = new Set<number>();
            choicesSet.add(target);
            while (choicesSet.size < 4) {
                let rnd = Math.floor(Math.random() * 8) + 1;
                choicesSet.add(rnd);
            }
            return Array.from(choicesSet).sort((a, b) => a - b);
        };
        setChoices(generateChoices(targetCount));
        setSelectedAnswer(null);
        setShowFeedback(false);
    }, [level]);

    const handleAnswer = (choice: number) => {
        setSelectedAnswer(choice);
        setShowFeedback(true);

        if (choice === targetCount) {
            setScore(s => s + 1);
            setTimeout(() => {
                if (level < 5) {
                    setLevel(l => l + 1);
                } else {
                    setWon(true);
                }
            }, 800);
        } else {
            setTimeout(() => {
                setShowFeedback(false);
                setSelectedAnswer(null);
            }, 600);
        }
    };

    // ── Win Screen ──
    if (won) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.winCenter}>
                    <Animated.Text entering={BounceIn.duration(1000)} style={styles.hugeEmoji}>
                        🌟
                    </Animated.Text>
                    <Text style={styles.wonTitle}>Amazing Job!</Text>
                    <Text style={styles.wonSubtitle}>You are a counting master!</Text>

                    {/* Stars earned */}
                    <View style={styles.wonStarsRow}>
                        {[1, 2, 3, 4, 5].map(s => (
                            <Animated.View key={s} entering={BounceIn.delay(s * 200)}>
                                <Ionicons
                                    name="star"
                                    size={36}
                                    color={s <= score ? Colors.child.tertiaryFixedDim : Colors.child.starEmpty}
                                />
                            </Animated.View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.homeBtn3D} onPress={() => router.back()}>
                        <Ionicons name="home" size={24} color={Colors.child.onPrimary} />
                        <Text style={styles.homeBtnText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Specialized Game Header ── */}
            <View style={styles.header}>
                {/* Home Button (3D) */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerBtn3D}
                    activeOpacity={0.7}
                >
                    <Ionicons name="home" size={28} color={Colors.child.primary} />
                </TouchableOpacity>

                {/* Stars Progress Pill */}
                <View style={styles.starsPill}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <Ionicons
                            key={s}
                            name="star"
                            size={24}
                            color={s <= score ? Colors.child.tertiaryFixedDim : Colors.child.surfaceVariant}
                        />
                    ))}
                </View>

                {/* Help Button (3D) */}
                <TouchableOpacity style={styles.headerBtn3D} activeOpacity={0.7}>
                    <Ionicons name="help-circle-outline" size={28} color={Colors.child.primary} />
                </TouchableOpacity>
            </View>

            {/* ── Main Game Canvas ── */}
            <View style={styles.content}>
                {/* Question */}
                <View style={styles.questionSection}>
                    <Text style={styles.question}>How many apples?</Text>
                    <Text style={styles.subQuestion}>Count them all!</Text>
                </View>

                {/* Interactive Game Area */}
                <Animated.View key={level} entering={FadeInDown.duration(500)} style={styles.gameCard}>
                    <View style={styles.itemsGrid}>
                        {Array(targetCount)
                            .fill(0)
                            .map((_, index) => (
                                <Animated.View
                                    key={index}
                                    entering={BounceIn.delay(index * 100)}
                                    style={styles.appleWrapper}
                                >
                                    <View style={styles.appleCircle}>
                                        <Text style={styles.appleEmoji}>🍎</Text>
                                    </View>
                                </Animated.View>
                            ))}
                    </View>

                    {/* Decorative blur elements */}
                    <View style={styles.gameDecor1} />
                    <View style={styles.gameDecor2} />
                </Animated.View>

                {/* Answer Buttons (3D Style) */}
                <View style={styles.answersRow}>
                    {choices.map(choice => {
                        const isSelected = selectedAnswer === choice;
                        const isCorrect = choice === targetCount;
                        const showCorrect = showFeedback && isSelected && isCorrect;
                        const showWrong = showFeedback && isSelected && !isCorrect;

                        return (
                            <TouchableOpacity
                                key={choice}
                                onPress={() => !showFeedback && handleAnswer(choice)}
                                activeOpacity={0.8}
                                style={[
                                    styles.answerBtn,
                                    showCorrect && styles.answerBtnCorrect,
                                    showWrong && styles.answerBtnWrong,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.answerText,
                                        showCorrect && styles.answerTextCorrect,
                                    ]}
                                >
                                    {choice}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#FFE0E0', // Soft pink — matches Stitch
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingVertical: Layout.spacing.md,
    },
    headerBtn3D: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.child.surfaceContainerLowest,
        alignItems: 'center',
        justifyContent: 'center',
        // 3D depth effect with bottom border
        borderBottomWidth: 6,
        borderBottomColor: Colors.child.primary,
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    starsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.child.surfaceContainerLowest,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: Layout.radius.full,
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },

    // ── Content ──
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.xl,
        justifyContent: 'space-between',
        paddingBottom: Layout.spacing.xxl,
    },
    questionSection: {
        alignItems: 'center',
        marginBottom: Layout.spacing.lg,
    },
    question: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        marginBottom: 4,
    },
    subQuestion: {
        ...Typography.child.subtitle,
        color: Colors.child.textSecondary,
    },

    // ── Game Card ──
    gameCard: {
        backgroundColor: Colors.child.surfaceContainerLowest,
        width: '100%',
        borderRadius: 24,
        padding: 28,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 4,
        borderColor: Colors.child.surfaceVariant,
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 25,
        elevation: 6,
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 24,
        paddingVertical: 16,
    },
    appleWrapper: {
        padding: 4,
    },
    appleCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    appleEmoji: {
        fontSize: 44,
    },
    gameDecor1: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.child.tertiaryFixedDim,
        opacity: 0.15,
    },
    gameDecor2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.child.primaryFixed,
        opacity: 0.15,
    },

    // ── Answer Buttons (3D) ──
    answersRow: {
        flexDirection: 'row',
        gap: 16,
        justifyContent: 'center',
        marginTop: Layout.spacing.xxl,
    },
    answerBtn: {
        width: 72,
        height: 72,
        backgroundColor: Colors.child.surfaceContainerLowest,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        // 3D depth
        borderBottomWidth: 6,
        borderBottomColor: Colors.child.outline,
        // Shadow
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    answerBtnCorrect: {
        backgroundColor: Colors.child.primary,
        borderBottomColor: '#3A2570',
    },
    answerBtnWrong: {
        backgroundColor: Colors.child.errorContainer,
        borderBottomColor: Colors.child.error,
    },
    answerText: {
        ...Typography.child.hero,
        fontSize: 28,
        color: Colors.child.textPrimary,
    },
    answerTextCorrect: {
        color: Colors.child.onPrimary,
    },

    // ── Win Screen ──
    winCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Layout.screen.paddingHorizontal,
    },
    hugeEmoji: {
        fontSize: 100,
        marginBottom: Layout.spacing.xl,
    },
    wonTitle: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        marginBottom: 8,
    },
    wonSubtitle: {
        ...Typography.child.subtitle,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        marginBottom: Layout.spacing.xl,
    },
    wonStarsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: Layout.spacing.xxxl,
    },
    homeBtn3D: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: Colors.child.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: Layout.radius.full,
        borderBottomWidth: 6,
        borderBottomColor: '#3A2570',
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 0,
        elevation: 6,
    },
    homeBtnText: {
        ...Typography.child.button,
        color: Colors.child.onPrimary,
    },
});
