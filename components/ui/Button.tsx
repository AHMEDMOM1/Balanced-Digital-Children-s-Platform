/**
 * Custom Button Component
 * Supports child (large/playful) and parent (professional) variants.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'child' | 'parent' | 'outline' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export default function Button({
    title,
    onPress,
    variant = 'parent',
    size = 'medium',
    disabled = false,
    style,
    textStyle,
    icon,
}: ButtonProps) {
    const buttonStyles = [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        disabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`text_${variant}`],
        styles[`textSize_${size}`],
        disabled && styles.textDisabled,
        textStyle,
    ];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            style={buttonStyles}
        >
            {icon && icon}
            <Text style={textStyles}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Layout.spacing.sm,
        borderRadius: Layout.radius.md,
    },

    // ── Variants ───────────────────────────────
    child: {
        backgroundColor: Colors.child.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: Layout.radius.xl,
        elevation: 4,
        shadowColor: Colors.child.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    parent: {
        backgroundColor: Colors.parent.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    outline: {
        backgroundColor: 'transparent',
        paddingVertical: 13,
        paddingHorizontal: 24,
        borderWidth: 1.5,
        borderColor: Colors.parent.primary,
    },
    danger: {
        backgroundColor: Colors.shared.error,
        paddingVertical: 14,
        paddingHorizontal: 24,
    },

    // ── Sizes ──────────────────────────────────
    size_small: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    size_medium: {},
    size_large: {
        paddingVertical: 18,
        paddingHorizontal: 36,
    },

    disabled: {
        opacity: 0.5,
    },

    // ── Text ───────────────────────────────────
    text: {
        fontFamily: Typography.fonts.semiBold,
        textAlign: 'center',
    },
    text_child: {
        color: Colors.shared.white,
        ...Typography.child.button,
    },
    text_parent: {
        color: Colors.shared.white,
        ...Typography.parent.button,
    },
    text_outline: {
        color: Colors.parent.primary,
        ...Typography.parent.button,
    },
    text_danger: {
        color: Colors.shared.white,
        ...Typography.parent.button,
    },

    textSize_small: { fontSize: 14 },
    textSize_medium: {},
    textSize_large: { fontSize: 18 },

    textDisabled: {
        opacity: 0.7,
    },
});
