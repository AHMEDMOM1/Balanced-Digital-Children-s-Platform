import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import Header from '../../../components/ui/Header';
import Colors from '../../../constants/Colors';
import Typography from '../../../constants/Typography';
import Layout from '../../../constants/Layout';

const storiesData = {
    '1': {
        title: 'Kaplumbağa ve Tavşan',
        pages: [
            { text: 'Bir varmış, bir yokmuş. Ormanın birinde çok hızlı koşan bir tavşan yaşarmış.', emoji: '🐇' },
            { text: 'Tavşan her zaman hızıyla övünürmüş. Kaplumbağa ise çok yavaş yürümüş.', emoji: '🐢' },
            { text: 'Bir gün kaplumbağa tavşana yarış teklif etmiş. Tavşan gülmüş ve kabul etmiş.', emoji: '🏁' },
            { text: 'Yarış başlamış. Tavşan çok hızlı koşup uzağa gitmiş ve uyumaya karar vermiş.', emoji: '😴' },
            { text: 'Kaplumbağa hiç durmadan yavaş yavaş yürümeye devam etmiş.', emoji: '🚶' },
            { text: 'Tavşan uyandığında kaplumbağa çoktan bitiş çizgisine varmış. Yavaş ama emin adımlarla giden kazanmış!', emoji: '🏆' },
        ]
    },
    '2': {
        title: 'Aya Yolculuk',
        pages: [
            { text: 'Ali gökyüzüne bakmayı çok severmiş.', emoji: '🔭' },
            { text: 'Bir gece roket yapıp aya gitmeye karar vermiş.', emoji: '🚀' },
            { text: 'Aya ulaştığında zıplamanın çok kolay olduğunu fark etmiş!', emoji: '🌕' }
        ]
    },
    '3': {
        title: 'Çiçek Bahçesi',
        pages: [
            { text: 'Ayşe bahçesinde birbirinden güzel çiçekler yetiştiriyormuş.', emoji: '🌻' },
            { text: 'Her sabah onlara su veriyor ve onlarla konuşuyormuş.', emoji: '💧' },
            { text: 'Bir gün bahçeye rengarenk kelebekler gelmiş!', emoji: '🦋' }
        ]
    }
};

export default function StoryScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [pageIndex, setPageIndex] = useState(0);

    const story = storiesData[id as keyof typeof storiesData] || storiesData['1'];
    const isLastPage = pageIndex === story.pages.length - 1;

    const nextPage = () => {
        if (!isLastPage) {
            setPageIndex(p => p + 1);
        } else {
            router.back();
        }
    };

    const prevPage = () => {
        if (pageIndex > 0) {
            setPageIndex(p => p - 1);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <Header
                title={story.title}
                subtitle={`${pageIndex + 1} / ${story.pages.length}`}
                variant="child"
                showBack
                onBack={() => router.back()}
            />
            
            <View style={styles.content}>
                <Animated.View 
                    key={pageIndex} 
                    entering={FadeInRight.duration(500)} 
                    exiting={FadeOutLeft.duration(500)}
                    style={styles.pageContainer}
                >
                    <Text style={styles.emoji}>{story.pages[pageIndex].emoji}</Text>
                    <Text style={styles.storyText}>{story.pages[pageIndex].text}</Text>
                </Animated.View>
                
                <View style={styles.controls}>
                    {pageIndex > 0 ? (
                        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={prevPage}>
                            <Text style={styles.secondaryButtonText}>Geri</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.spacer} />
                    )}
                    
                    <TouchableOpacity style={styles.button} onPress={nextPage}>
                        <Text style={styles.buttonText}>{isLastPage ? 'Bitir' : 'İleri'}</Text>
                    </TouchableOpacity>
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
        justifyContent: 'space-between',
        paddingBottom: Layout.spacing.xxl,
    },
    pageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.child.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.xl,
        elevation: 2,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginVertical: Layout.spacing.xl,
    },
    emoji: {
        fontSize: 100,
        marginBottom: Layout.spacing.xl,
    },
    storyText: {
        ...Typography.child.title,
        color: Colors.child.textPrimary,
        textAlign: 'center',
        lineHeight: 40,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Layout.spacing.md,
    },
    button: {
        backgroundColor: Colors.child.primary,
        paddingVertical: Layout.spacing.md,
        paddingHorizontal: Layout.spacing.xl,
        borderRadius: Layout.radius.full,
        minWidth: 120,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: Colors.child.cardStory,
    },
    buttonText: {
        ...Typography.child.button,
        color: Colors.child.surface,
    },
    secondaryButtonText: {
        ...Typography.child.button,
        color: Colors.child.primary,
    },
    spacer: {
        width: 120,
    }
});
