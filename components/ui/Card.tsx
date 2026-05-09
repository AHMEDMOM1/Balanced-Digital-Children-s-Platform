/**
 * Card Component
 * A flexible container with elevation and optional press handling.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

interface CardProps {
    children: React.ReactNode;
    variant?: 'parent' | 'child';
    onPress?: () => void;
    style?: ViewStyle;
    color?: string;
}

export default function Card({
    children,
    variant = 'parent',
    onPress,
    style,
    color,
}: CardProps) {
    const cardStyles = [
        styles.base,
        variant === 'child' ? styles.child : styles.parent,
        color ? { backgroundColor: color } : null,
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={cardStyles}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
    base: {
        borderRadius: Layout.radius.lg,
        padding: Layout.spacing.lg,
    },
    parent: {
        backgroundColor: Colors.parent.surface,
        borderWidth: 1,
        borderColor: Colors.parent.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    child: {
        backgroundColor: Colors.child.surface,
        borderRadius: Layout.radius.xl,
        elevation: 4,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
});
