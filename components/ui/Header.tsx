/**
 * Header Component — SafePlay Timer Style
 * Purple top bar with clock and lock icons.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
    title?: string;
    showLock?: boolean;
    onLockPress?: () => void;
}

export default function Header({
    title = 'SafePlay Timer',
    showLock = true,
    onLockPress,
}: HeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top + Layout.spacing.sm }]}>
            <View style={styles.content}>
                <Ionicons name="time-outline" size={24} color={Colors.header.icon} />
                <Text style={styles.title}>{title}</Text>
                {showLock ? (
                    <TouchableOpacity onPress={onLockPress} style={styles.lockButton}>
                        <Ionicons name="lock-closed-outline" size={24} color={Colors.header.icon} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.header.background,
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingBottom: Layout.spacing.md,
        borderBottomLeftRadius: Layout.radius.xl,
        borderBottomRightRadius: Layout.radius.xl,
        // Elevation/Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        ...Typography.child.subtitle,
        color: Colors.header.text,
        textAlign: 'center',
        flex: 1,
    },
    lockButton: {
        padding: Layout.spacing.xs,
    },
    placeholder: {
        width: 32,
    },
});
