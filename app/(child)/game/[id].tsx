import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import Header from '../../../components/ui/Header';
import Colors from '../../../constants/Colors';
import Typography from '../../../constants/Typography';
import Layout from '../../../constants/Layout';

// A simple interactive counting game
export default function GameScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    
    // Game State
    const [level, setLevel] = useState(1);
    const [won, setWon] = useState(false);
    
    // The target number to count
    const targetCount = level + 1; // 2, 3, 4, 5
    const emojis = Array(targetCount).fill('🍎');
    
    // Choices
    const generateChoices = (target: number) => {
        const choices = new Set<number>();
        choices.add(target);
        while(choices.size < 3) {
            let rnd = Math.floor(Math.random() * 8) + 1;
            choices.add(rnd);
        }
        return Array.from(choices).sort(() => Math.random() - 0.5);
    };
    
    const [choices, setChoices] = useState(generateChoices(targetCount));

    const handleAnswer = (choice: number) => {
        if (choice === targetCount) {
            if (level < 4) {
                setLevel(l => l + 1);
                setChoices(generateChoices(level + 2));
            } else {
                setWon(true);
            }
        }
    };

    if (won) {
        return (
            <SafeAreaView style={styles.safe}>
                <Header title="Harika!" subtitle="Çok iyi iş çıkardın" variant="child" showBack onBack={() => router.back()} />
                <View style={styles.center}>
                    <Animated.Text entering={BounceIn.duration(1000)} style={styles.hugeEmoji}>
                        🎉
                    </Animated.Text>
                    <Text style={styles.wonText}>Kazandın!</Text>
                    <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                        <Text style={styles.buttonText}>Geri Dön</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <Header
                title={id === '1' ? 'Sayıları Say' : 'Oyun Zamanı'}
                subtitle="Kaç tane elma var?"
                variant="child"
                showBack
                onBack={() => router.back()}
            />
            
            <View style={styles.content}>
                <Animated.View key={level} entering={FadeInDown} style={styles.itemsContainer}>
                    {emojis.map((emoji, index) => (
                        <Animated.Text key={index} entering={BounceIn.delay(index * 100)} style={styles.itemEmoji}>
                            {emoji}
                        </Animated.Text>
                    ))}
                </Animated.View>
                
                <View style={styles.choicesContainer}>
                    {choices.map((choice, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.choiceCard}
                            onPress={() => handleAnswer(choice)}
                        >
                            <Text style={styles.choiceText}>{choice}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.child.background },
    content: {
        flex: 1,
        padding: Layout.screen.paddingHorizontal,
        justifyContent: 'space-around',
    },
    itemsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Layout.spacing.lg,
    },
    itemEmoji: {
        fontSize: 64,
    },
    choicesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Layout.spacing.xl,
    },
    choiceCard: {
        backgroundColor: Colors.child.primary,
        width: 80,
        height: 80,
        borderRadius: Layout.radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    choiceText: {
        ...Typography.child.hero,
        color: Colors.child.surface,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hugeEmoji: {
        fontSize: 120,
        marginBottom: Layout.spacing.xl,
    },
    wonText: {
        ...Typography.child.hero,
        color: Colors.child.textPrimary,
        marginBottom: Layout.spacing.xxl,
    },
    button: {
        backgroundColor: Colors.child.primary,
        paddingVertical: Layout.spacing.md,
        paddingHorizontal: Layout.spacing.xl,
        borderRadius: Layout.radius.full,
    },
    buttonText: {
        ...Typography.child.button,
        color: Colors.child.surface,
    }
});
