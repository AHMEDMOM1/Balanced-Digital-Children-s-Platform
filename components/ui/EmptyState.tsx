import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

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
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
        textAlign: 'center',
    },
    subtitle: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
        textAlign: 'center',
        fontSize: 13,
        opacity: 0.8,
    },
});
