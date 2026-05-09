/**
 * Entry Screen — Role Selection
 * User picks between Parent Mode and Child Mode.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import Layout from '../constants/Layout';
import Button from '../components/ui/Button';

export default function IndexScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* ── Logo / Branding ── */}
            <View style={styles.branding}>
                <Text style={styles.emoji}>🌟</Text>
                <Text style={styles.title}>Dengeli Çocuklar</Text>
                <Text style={styles.titleEn}>Balanced Kids</Text>
                <Text style={styles.subtitle}>Çocuklarınız için güvenli ve eğlenceli dijital ortam</Text>
            </View>

            {/* ── Mode Selection ── */}
            <View style={styles.buttons}>
                <Button
                    title="👨‍👩‍👧 Ebeveyn Modu — Parent Mode"
                    variant="parent"
                    size="large"
                    onPress={() => router.push('/(parent)')}
                    style={styles.parentButton}
                />

                <Button
                    title="🧒 Çocuk Modu — Child Mode"
                    variant="child"
                    size="large"
                    onPress={() => router.push('/(child)')}
                    style={styles.childButton}
                />
            </View>

            {/* ── Footer ── */}
            <Text style={styles.footer}>
                Bağımlılık yapmayan eğitim platformu
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.parent.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Layout.screen.paddingHorizontal,
    },
    branding: {
        alignItems: 'center',
        marginBottom: Layout.spacing.xxl,
    },
    emoji: {
        fontSize: 72,
        marginBottom: Layout.spacing.md,
    },
    title: {
        ...Typography.child.title,
        color: Colors.parent.secondary,
        marginBottom: 4,
    },
    titleEn: {
        ...Typography.parent.subtitle,
        color: Colors.parent.primary,
        marginBottom: Layout.spacing.sm,
    },
    subtitle: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
        textAlign: 'center',
    },
    buttons: {
        width: '100%',
        maxWidth: 360,
        gap: Layout.spacing.lg,
    },
    parentButton: {
        width: '100%',
    },
    childButton: {
        width: '100%',
    },
    footer: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        marginTop: Layout.spacing.xxl,
        textAlign: 'center',
    },
});
