/**
 * Parent Control Screen — SafePlay Timer
 * Manage time limits, sessions, and allowed activities.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';
import useSettingsStore from '../../store/useSettingsStore';
import useAuthStore from '../../store/useAuthStore';
import useSessionStore from '../../store/useSessionStore';
import { useRealtimeStore } from '../../store/useRealtimeStore';
import { broadcastCommand } from '../../services/realtime/familyChannel';
import { getClient } from '../../services/api/client';
import { useCategoryPreferences } from '../../services/api/hooks';
import { generateCommandId } from '../../services/utils/uuid';

const KNOWN_CATEGORIES = ['Adventure', 'Educational', 'Fantasy', 'Science', 'Fun', 'Creative'];

export default function ControlScreen() {
    const { 
        dailyTimeLimitMinutes, 
        setDailyTimeLimit,
        sessionsPerDay,
        setSessionsPerDay,
        storiesEnabled,
        toggleStories,
        gamesEnabled,
        toggleGames,
        creativeEnabled,
        toggleCreative,
        videosEnabled,
        toggleVideos
    } = useSettingsStore();

    const children = useAuthStore((s) => s.children);
    const parentData = useAuthStore((s) => s.parentData);
    const activeChild = children[0];
    const { preferences, isLoading: catLoading, toggleCategory } = useCategoryPreferences();

    const { isChildOnline, channel } = useRealtimeStore();
    const { isPaused, setPaused } = useSessionStore();

    const [remainingMinutesLive, setRemainingMinutesLive] = React.useState(dailyTimeLimitMinutes);

    const handlePauseToggle = () => {
        if (!parentData || !activeChild || !channel) return;

        const newPausedState = !isPaused;
        const command = {
            command_id: generateCommandId(),
            command_type: (newPausedState ? 'pause' : 'resume') as 'pause' | 'resume',
            sender_id: parentData.id,
            child_id: activeChild.id,
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
            child_id: activeChild.id,
            command_type: command.command_type,
            payload: command.payload
        }).then();

        // 3. Update local state
        setPaused(newPausedState);
    };

    const handleTimeUpdate = () => {
        if (!parentData || !activeChild || !channel) return;

        const command = {
            command_id: generateCommandId(),
            command_type: 'time_update' as const,
            sender_id: parentData.id,
            child_id: activeChild.id,
            payload: { remaining_minutes: remainingMinutesLive },
            created_at: new Date().toISOString()
        };

        broadcastCommand(channel, command);
        getClient().from('realtime_commands').insert({
            id: command.command_id,
            family_id: parentData.familyId,
            sender_id: parentData.id,
            child_id: activeChild.id,
            command_type: command.command_type,
            payload: command.payload
        }).then();
    };

    const ControlItem = ({ icon, title, subtitle, value, onValueChange, type = 'switch' }: any) => (
        <View style={styles.controlItem}>
            <View style={styles.controlIconCircle}>
                <Ionicons name={icon} size={22} color={Colors.parent.primary} />
            </View>
            <View style={styles.controlTextContainer}>
                <Text style={styles.controlTitle}>{title}</Text>
                <Text style={styles.controlSubtitle}>{subtitle}</Text>
            </View>
            {type === 'switch' ? (
                <Switch 
                    value={value} 
                    onValueChange={onValueChange} 
                    trackColor={{ false: '#767577', true: Colors.parent.primary }}
                    thumbColor={Colors.shared.white}
                />
            ) : (
                <View style={styles.valueRow}>
                    <TouchableOpacity onPress={() => onValueChange(Math.max(0, value - 10))}>
                        <Ionicons name="remove-circle-outline" size={28} color={Colors.parent.primary} />
                    </TouchableOpacity>
                    <Text style={styles.valueText}>{value}</Text>
                    <TouchableOpacity onPress={() => onValueChange(value + 10)}>
                        <Ionicons name="add-circle-outline" size={28} color={Colors.parent.primary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

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
                            {isPaused ? 'Resume Session' : 'Pause Session Now'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Time & Sessions</Text>
                    <View style={styles.card}>
                        <ControlItem 
                            icon="time-outline" 
                            title="Daily Time Limit" 
                            subtitle="Total minutes allowed per day" 
                            value={dailyTimeLimitMinutes} 
                            onValueChange={setDailyTimeLimit}
                            type="stepper"
                        />
                        <View style={styles.divider} />
                        <ControlItem 
                            icon="repeat-outline" 
                            title="Sessions Per Day" 
                            subtitle="Split daily time into sessions" 
                            value={sessionsPerDay} 
                            onValueChange={setSessionsPerDay}
                            type="stepper"
                        />
                        <View style={styles.divider} />
                        <ControlItem 
                            icon="hourglass-outline" 
                            title="Remaining Minutes (Live)" 
                            subtitle="Instantly update child's remaining time" 
                            value={remainingMinutesLive} 
                            onValueChange={setRemainingMinutesLive}
                            type="stepper"
                        />
                        <TouchableOpacity 
                            style={styles.sendButton} 
                            onPress={handleTimeUpdate}
                            disabled={!channel}
                        >
                            <Text style={styles.sendButtonText}>Send Time Update</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Allowed Content</Text>
                    <View style={styles.card}>
                        <ControlItem 
                            icon="book-outline" 
                            title="Stories" 
                            subtitle="Interactive educational stories" 
                            value={storiesEnabled} 
                            onValueChange={toggleStories}
                        />
                        <View style={styles.divider} />
                        <ControlItem 
                            icon="extension-puzzle-outline" 
                            title="Brain Games" 
                            subtitle="Puzzles and logic challenges" 
                            value={gamesEnabled} 
                            onValueChange={toggleGames}
                        />
                        <View style={styles.divider} />
                        <ControlItem 
                            icon="color-palette-outline" 
                            title="Creative Zone" 
                            subtitle="Drawing and art activities" 
                            value={creativeEnabled} 
                            onValueChange={toggleCreative}
                        />
                        <View style={styles.divider} />
                        <ControlItem 
                            icon="play-circle-outline" 
                            title="Videos" 
                            subtitle="Screen-time for videos" 
                            value={videosEnabled} 
                            onValueChange={toggleVideos}
                        />
                    </View>
                </View>

                {activeChild && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Category Preferences ({activeChild.name})</Text>
                        <View style={styles.card}>
                            {catLoading ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator size="small" color={Colors.parent.primary} />
                                    <Text style={styles.loadingText}>Loading preferences...</Text>
                                </View>
                            ) : (
                                KNOWN_CATEGORIES.map((category, i) => {
                                    const pref = preferences.find(
                                        (p) => p.child_id === activeChild.id && p.category === category,
                                    );
                                    const isAllowed = pref?.is_allowed ?? true;
                                    return (
                                        <React.Fragment key={category}>
                                            {i > 0 && <View style={styles.divider} />}
                                            <View style={styles.controlItem}>
                                                <View style={styles.controlIconCircle}>
                                                    <Ionicons
                                                        name={
                                                            category === 'Adventure' ? 'compass-outline' :
                                                            category === 'Educational' ? 'school-outline' :
                                                            category === 'Fantasy' ? 'rainbow-outline' :
                                                            category === 'Science' ? 'flask-outline' :
                                                            category === 'Fun' ? 'happy-outline' :
                                                            'bulb-outline'
                                                        }
                                                        size={22}
                                                        color={Colors.parent.primary}
                                                    />
                                                </View>
                                                <View style={styles.controlTextContainer}>
                                                    <Text style={styles.controlTitle}>{category}</Text>
                                                    <Text style={styles.controlSubtitle}>
                                                        {isAllowed ? 'Allowed' : 'Blocked'}
                                                    </Text>
                                                </View>
                                                <Switch
                                                    value={isAllowed}
                                                    onValueChange={(val) => { 
                                                        toggleCategory(activeChild.id, category, val); 
                                                        
                                                        if (channel && parentData) {
                                                            const command = {
                                                                command_id: generateCommandId(),
                                                                command_type: 'category_block' as const,
                                                                sender_id: parentData.id,
                                                                child_id: activeChild.id,
                                                                payload: { category: category, is_allowed: val },
                                                                created_at: new Date().toISOString()
                                                            };
                                                            broadcastCommand(channel, command);
                                                            getClient().from('realtime_commands').insert({
                                                                id: command.command_id,
                                                                family_id: parentData.familyId,
                                                                sender_id: parentData.id,
                                                                child_id: activeChild.id,
                                                                command_type: command.command_type,
                                                                payload: command.payload
                                                            }).then();
                                                        }
                                                    }}
                                                    trackColor={{ false: '#767577', true: Colors.parent.primary }}
                                                    thumbColor={Colors.shared.white}
                                                />
                                            </View>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </View>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.parent.textSecondary} />
                    <Text style={styles.infoText}>
                        Changes are applied instantly to the child's device. 
                        A session is {Math.floor(dailyTimeLimitMinutes / sessionsPerDay)} minutes long.
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
    divider: {
        height: 1,
        backgroundColor: Colors.parent.border,
        marginHorizontal: Layout.spacing.lg,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    valueText: {
        ...Typography.parent.subtitle,
        minWidth: 30,
        textAlign: 'center',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: Layout.spacing.lg,
    },
    loadingText: {
        ...Typography.parent.body,
        color: Colors.parent.textSecondary,
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
    sendButton: {
        backgroundColor: Colors.parent.primary,
        margin: Layout.spacing.lg,
        padding: Layout.spacing.md,
        borderRadius: Layout.radius.lg,
        alignItems: 'center',
    },
    sendButtonText: {
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
