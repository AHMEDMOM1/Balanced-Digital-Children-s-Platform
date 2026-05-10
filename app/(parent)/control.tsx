/**
 * Parent Control Screen — SafePlay Timer
 * Manage time limits, sessions, and allowed activities.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import Header from '../../components/ui/Header';
import useSettingsStore from '../../store/useSettingsStore';

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
