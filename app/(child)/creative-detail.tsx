import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useContentById } from '../../services/api/hooks';
import { getBiDiStyle } from '../../services/utils/bidi';

export default function CreativeDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: activity, isLoading, error } = useContentById(id);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color={Colors.child.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !activity) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centerState}>
                    <Text style={styles.errorText}>Could not load activity</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn3D} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={28} color={Colors.child.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(500)} style={styles.imageContainer}>
                    {activity.assets_url ? (
                        <Image source={{ uri: activity.assets_url }} style={styles.activityImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="color-palette-outline" size={64} color={Colors.child.primary} />
                        </View>
                    )}
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.textContainer}>
                    <Text style={[styles.title, getBiDiStyle(activity.title)]}>{activity.title}</Text>
                    <Text style={[styles.instructions, getBiDiStyle(activity.content_text || '')]}>
                        {activity.content_text}
                    </Text>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#FDF7FF',
    },
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Layout.screen.paddingHorizontal,
    },
    errorText: {
        ...Typography.child.subtitle,
        color: Colors.child.textSecondary,
        marginBottom: Layout.spacing.xl,
    },
    backBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: Colors.child.primary,
        borderRadius: Layout.radius.full,
    },
    backBtnText: {
        ...Typography.child.button,
        color: Colors.child.onPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
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
        borderBottomWidth: 6,
        borderBottomColor: Colors.child.primary,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.lg,
        paddingBottom: Layout.spacing.xxxl,
    },
    imageContainer: {
        width: '100%',
        height: 250,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: Colors.child.surfaceContainerLowest,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
        marginBottom: Layout.spacing.xl,
    },
    activityImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E1D4FD',
    },
    textContainer: {
        backgroundColor: Colors.child.surfaceContainerLowest,
        padding: 24,
        borderRadius: 24,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    title: {
        ...Typography.child.hero,
        color: Colors.child.primary,
        marginBottom: Layout.spacing.md,
    },
    instructions: {
        ...Typography.child.body,
        color: Colors.child.textPrimary,
        lineHeight: 28,
    },
});
