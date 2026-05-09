/**
 * Header Component
 * Screen header with title and optional subtitle/back action.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

interface HeaderProps {
    title: string;
    subtitle?: string;
    variant?: 'parent' | 'child';
    showBack?: boolean;
    onBack?: () => void;
}

export default function Header({
    title,
    subtitle,
    variant = 'parent',
    showBack = false,
    onBack,
}: HeaderProps) {
    const isChild = variant === 'child';

    return (
        <View style={[styles.container, isChild && styles.childContainer]}>
            <View style={styles.row}>
                {showBack && onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={[styles.backIcon, isChild && styles.childBackIcon]}>
                            ←
                        </Text>
                    </TouchableOpacity>
                )}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, isChild && styles.childTitle]}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, isChild && styles.childSubtitle]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.lg,
        paddingBottom: Layout.spacing.md,
    },
    childContainer: {
        paddingTop: Layout.spacing.xl,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: Layout.spacing.md,
        padding: Layout.spacing.xs,
    },
    backIcon: {
        fontSize: 24,
        color: Colors.parent.textPrimary,
    },
    childBackIcon: {
        fontSize: 28,
        color: Colors.child.textPrimary,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        ...Typography.parent.title,
        color: Colors.parent.textPrimary,
    },
    childTitle: {
        ...Typography.child.title,
        color: Colors.child.textPrimary,
    },
    subtitle: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
        marginTop: 2,
    },
    childSubtitle: {
        ...Typography.child.body,
        color: Colors.child.textSecondary,
    },
});
