import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { getBiDiStyle, isArabic, formatBiDiText } from '../../services/utils/bidi';

interface EmptyStateProps {
    emoji?: string;
    title?: string;
    subtitle?: string;
    icon?: keyof typeof Ionicons.glyphMap;
}

export default function EmptyState({
    emoji = '🌳',
    title = 'Time to play outside!',
    subtitle,
    icon,
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            {icon ? (
                <Ionicons name={icon} size={64} color={Colors.child.textSecondary} />
            ) : (
                <Text style={styles.emoji}>{emoji}</Text>
            )}
            <Text style={[styles.title, getBiDiStyle(title), !isArabic(title) && { textAlign: 'center' }]}>{formatBiDiText(title)}</Text>
            {subtitle && <Text style={[styles.subtitle, getBiDiStyle(subtitle), !isArabic(subtitle) && { textAlign: 'center' }]}>{formatBiDiText(subtitle)}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Layout.spacing.xxxl,
        gap: 16,
    },
    emoji: {
        fontSize: 64,
    },
    title: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        alignSelf: 'stretch',
    },
    subtitle: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        fontSize: 13,
        opacity: 0.8,
        alignSelf: 'stretch',
    },
});
