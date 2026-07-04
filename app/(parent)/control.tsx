/**
 * Parent Control Screen — SafePlay Timer
 * Broadcast-style actions that apply to every paired child at once.
 * Per-child time limits / content permissions live on each child's own
 * profile page (My Children → Manage).
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';
import useAuthStore from '../../store/useAuthStore';
import useSessionStore from '../../store/useSessionStore';
import { useRealtimeStore } from '../../store/useRealtimeStore';
import { broadcastCommand } from '../../services/realtime/familyChannel';
import { getClient } from '../../services/api/client';
import { generateCommandId } from '../../services/utils/uuid';

export default function ControlScreen() {
    const router = useRouter();
    const children = useAuthStore((s) => s.children);
    const parentData = useAuthStore((s) => s.parentData);

    const { isChildOnline, channel } = useRealtimeStore();
    const { isPaused, setPaused } = useSessionStore();

    const handlePauseToggle = () => {
        if (!parentData || !channel) return;

        const newPausedState = !isPaused;
        const command = {
            command_id: generateCommandId(),
            command_type: (newPausedState ? 'pause' : 'resume') as 'pause' | 'resume',
            sender_id: parentData.id,
            child_id: null, // broadcast to every paired child, not just one
            payload: {},
            created_at: new Date().toISOString()
        };

        // 1. Broadcast
        broadcastCommand(channel, command);

        // 2. Persist to DB
        getClient().from('realtime_commands').insert({
            id: command.command_id,
            family_id: parentData.familyId,
            sender_id: parentData.id,
            child_id: null,
            command_type: command.command_type,
            payload: command.payload
        }).then();

        // 3. Update local state
        setPaused(newPausedState);
    };

    return (
        <SafeAreaView style={styles.safe}>
            <Header showLock={false} title="Control Center" />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.statusSection}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: isChildOnline ? '#4CAF50' : '#F44336' }]} />
                        <Text style={styles.statusText}>{isChildOnline ? 'Child Online' : 'Child Offline'}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.pauseButton, { backgroundColor: isPaused ? '#4CAF50' : '#FF6B6B' }]}
                        onPress={handlePauseToggle}
                        disabled={!channel}
                    >
                        <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color="white" />
                        <Text style={styles.pauseButtonText}>
                            {isPaused ? 'Resume All Children' : 'Pause All Children Now'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Family</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.controlItem}
                            onPress={() => router.push('/(parent)/my-children')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.controlIconCircle}>
                                <Ionicons name="people-outline" size={22} color={Colors.parent.primary} />
                            </View>
                            <View style={styles.controlTextContainer}>
                                <Text style={styles.controlTitle}>My Children</Text>
                                <Text style={styles.controlSubtitle}>
                                    {children.length > 0
                                        ? `${children.length} child${children.length > 1 ? 'ren' : ''} linked · Add or manage devices`
                                        : 'Add your first child\'s device'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.parent.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.controlDivider} />

                        <TouchableOpacity
                            style={styles.controlItem}
                            onPress={() => router.push('/(parent)/content-library')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.controlIconCircle}>
                                <Ionicons name="library-outline" size={22} color={Colors.parent.primary} />
                            </View>
                            <View style={styles.controlTextContainer}>
                                <Text style={styles.controlTitle}>Content Library</Text>
                                <Text style={styles.controlSubtitle}>
                                    Browse and manage available content per child
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.parent.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.parent.textSecondary} />
                    <Text style={styles.infoText}>
                        Pause/Resume applies to every child's device at once. For time limits and
                        content permissions for a specific child, open their profile under My Children.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.parent.background },
    container: { flex: 1 },
    content: {
        paddingHorizontal: Layout.screen.paddingHorizontal,
        paddingTop: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxl,
    },
    section: {
        marginBottom: Layout.spacing.xl,
    },
    sectionTitle: {
        ...Typography.parent.subtitle,
        color: Colors.parent.textPrimary,
        marginBottom: Layout.spacing.md,
    },
    card: {
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.xl,
        borderWidth: 1,
        borderColor: Colors.parent.border,
        overflow: 'hidden',
    },
    controlItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.lg,
    },
    controlIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.parent.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    controlTextContainer: {
        flex: 1,
    },
    controlTitle: {
        ...Typography.parent.body,
        fontWeight: '700',
        color: Colors.parent.textPrimary,
    },
    controlSubtitle: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        marginTop: 2,
    },
    controlDivider: {
        height: 1,
        backgroundColor: Colors.parent.border,
        marginHorizontal: Layout.spacing.lg,
    },

    statusSection: {
        marginBottom: Layout.spacing.xl,
        backgroundColor: Colors.parent.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.lg,
        borderWidth: 1,
        borderColor: Colors.parent.border,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    statusText: {
        ...Typography.parent.body,
        fontWeight: '600',
    },
    pauseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Layout.spacing.md,
        borderRadius: Layout.radius.lg,
        gap: 10,
    },
    pauseButtonText: {
        color: 'white',
        ...Typography.parent.body,
        fontWeight: 'bold',
    },

    infoBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: Colors.parent.inputBg,
        padding: Layout.spacing.lg,
        borderRadius: Layout.radius.lg,
        marginTop: Layout.spacing.md,
    },
    infoText: {
        ...Typography.parent.caption,
        color: Colors.parent.textSecondary,
        flex: 1,
        lineHeight: 18,
    },
});
