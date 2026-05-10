/**
 * Privacy Policy Screen — Stitch parent_settings_privacy_policy Design
 * - Full privacy policy document in a bordered card
 * - Sections: Introduction, Data Collection, Child Privacy, Data Usage, Third-Party Sharing
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    primary: '#4F378A',
    onPrimary: '#FFFFFF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
};

export default function SettingsPrivacyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={S.primary} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Parental Control</Text>
                <TouchableOpacity style={styles.topBarBtn}>
                    <Ionicons name="settings-outline" size={22} color={S.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    {/* Title */}
                    <Text style={styles.docTitle}>Privacy Policy</Text>
                    <Text style={styles.lastUpdated}>Last Updated: October 26, 2023</Text>
                    <View style={styles.hrLine} />

                    {/* 1. Introduction */}
                    <Text style={styles.sectionHeading}>1. Introduction</Text>
                    <Text style={styles.bodyText}>
                        Welcome to the Parental Control dashboard. We are committed to protecting your privacy and the privacy of your children. This Privacy Policy outlines how we collect, use, and safeguard your information when you use our services.
                    </Text>

                    {/* 2. Data Collection */}
                    <Text style={styles.sectionHeading}>2. Data Collection</Text>
                    <Text style={styles.bodyText}>
                        We collect information that you provide directly to us when setting up profiles, configuring settings, and interacting with the dashboard. This includes account credentials, usage metrics, and configuration preferences.
                    </Text>
                    <Text style={styles.bodyText}>
                        Additionally, we may automatically collect telemetry data regarding app performance and crash reports to improve the stability of our platform.
                    </Text>

                    {/* 3. Child Privacy */}
                    <Text style={styles.sectionHeading}>3. Child Privacy</Text>
                    <Text style={styles.bodyText}>
                        We adhere to strict guidelines regarding the collection of data from minors. Any data collected from a child's device is solely used to provide the parental monitoring and control features requested by the parent or guardian. We do not use this data for marketing or behavioral profiling.
                    </Text>

                    {/* 4. Data Usage */}
                    <Text style={styles.sectionHeading}>4. Data Usage</Text>
                    <Text style={styles.bodyText}>The data we collect is utilized to:</Text>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletItem}>•  Facilitate accurate usage tracking and reporting.</Text>
                        <Text style={styles.bulletItem}>•  Enforce configured time limits and content restrictions.</Text>
                        <Text style={styles.bulletItem}>•  Provide customer support and technical assistance.</Text>
                        <Text style={styles.bulletItem}>•  Enhance the security and integrity of our services.</Text>
                    </View>

                    {/* 5. Third-Party Sharing */}
                    <Text style={styles.sectionHeading}>5. Third-Party Sharing</Text>
                    <Text style={styles.bodyText}>
                        We do not sell your personal data or your child's data to third parties. We may share information with trusted service providers who assist us in operating our platform, subject to strict confidentiality agreements.
                    </Text>

                    <View style={styles.hrLine} />
                    <Text style={[styles.bodyText, { textAlign: 'center' }]}>
                        If you have any questions regarding this policy, please contact our support team.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surfaceLow },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: S.outlineVariant, backgroundColor: S.surface,
    },
    topBarBtn: { padding: 8, borderRadius: 99 },
    topBarTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    content: { padding: 20, paddingBottom: 40 },
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant, padding: 28,
    },
    docTitle: { fontSize: 24, fontWeight: '700', color: S.onSurface },
    lastUpdated: { fontSize: 13, color: S.onSurfaceVariant, marginTop: 4, marginBottom: 16 },
    hrLine: { height: 1, backgroundColor: S.outlineVariant, marginVertical: 20 },
    sectionHeading: { fontSize: 18, fontWeight: '600', color: S.primary, marginBottom: 8, marginTop: 12 },
    bodyText: { fontSize: 15, color: S.onSurfaceVariant, lineHeight: 24, marginBottom: 12 },
    bulletList: { paddingLeft: 12, marginBottom: 12 },
    bulletItem: { fontSize: 15, color: S.onSurfaceVariant, lineHeight: 26 },
});
