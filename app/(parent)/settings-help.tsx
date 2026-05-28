/**
 * Help & Support Screen — Stitch parent_settings_help_support Design
 * - FAQ accordion items
 * - "Need more help?" support card
 * - Legal & Policies links
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    primary: '#4F378A',
    primaryContainer: '#6750A4',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#E0D2FF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    outline: '#7A7582',
};

const faqs = [
    { q: 'How do I set screen time limits?', a: 'Go to Control panel → Time Settings and configure your daily limits per child profile.' },
    { q: 'Can I block specific apps?', a: 'Yes, navigate to Control → App Restrictions to manage allowed and blocked applications.' },
    { q: 'How do I review activity reports?', a: 'Open the Reports tab to see daily and weekly usage summaries with breakdowns per activity.' },
];

const legalLinks = [
    { title: 'Privacy Policy', route: '/(parent)/settings-privacy' },
    { title: 'Terms of Service', route: null },
    { title: 'Data Processing Agreement', route: null },
];

export default function SettingsHelpScreen() {
    const router = useRouter();
    const [expanded, setExpanded] = useState<number | null>(null);

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
                {/* Page Header */}
                <Text style={styles.pageTitle}>Help & Support</Text>
                <Text style={styles.pageDesc}>
                    Find answers to common questions or reach out to our support team for assistance.
                </Text>

                {/* ── Need More Help? Card ── */}
                <View style={styles.supportCard}>
                    <View style={styles.supportHeader}>
                        <Ionicons name="headset" size={22} color={S.onPrimaryContainer} />
                        <Text style={styles.supportTitle}>Need more help?</Text>
                    </View>
                    <Text style={styles.supportDesc}>
                        Our support team is available 24/7 to assist you with any technical issues or account questions.
                    </Text>
                    <TouchableOpacity style={styles.chatBtn}>
                        <Ionicons name="chatbubble-ellipses" size={18} color={S.onSurface} />
                        <Text style={styles.chatBtnText}>Chat with Support</Text>
                    </TouchableOpacity>
                </View>

                {/* ── FAQ Section ── */}
                <View style={styles.faqSection}>
                    <View style={styles.faqHeaderRow}>
                        <Ionicons name="help-circle-outline" size={20} color={S.primary} />
                        <Text style={styles.faqSectionTitle}>Frequently Asked Questions</Text>
                    </View>

                    <View style={styles.faqCard}>
                        {faqs.map((faq, i) => (
                            <View key={i}>
                                {i > 0 && <View style={styles.divider} />}
                                <TouchableOpacity
                                    style={styles.faqItem}
                                    onPress={() => setExpanded(expanded === i ? null : i)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                                    <Ionicons
                                        name={expanded === i ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={S.onSurfaceVariant}
                                    />
                                </TouchableOpacity>
                                {expanded === i && (
                                    <View style={styles.faqAnswer}>
                                        <Text style={styles.faqAnswerText}>{faq.a}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Legal & Policies ── */}
                <View style={styles.legalSection}>
                    <View style={styles.legalHeaderRow}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={S.primary} />
                        <Text style={styles.legalSectionTitle}>Legal & Policies</Text>
                    </View>

                    <View style={styles.legalCard}>
                        {legalLinks.map((link, i) => (
                            <View key={i}>
                                {i > 0 && <View style={styles.divider} />}
                                <TouchableOpacity
                                    style={styles.legalItem}
                                    onPress={() => link.route && router.push(link.route as any)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.legalLinkText}>{link.title}</Text>
                                    <Ionicons name="arrow-forward" size={18} color={S.primary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
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
    pageTitle: { fontSize: 22, fontWeight: '700', color: S.primary, marginBottom: 4 },
    pageDesc: { fontSize: 15, color: S.onSurfaceVariant, lineHeight: 22, marginBottom: 24 },

    // Support Card
    supportCard: {
        backgroundColor: S.primaryContainer, borderRadius: 16, padding: 24, marginBottom: 24,
    },
    supportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    supportTitle: { fontSize: 18, fontWeight: '600', color: S.onPrimaryContainer },
    supportDesc: { fontSize: 15, color: S.onPrimaryContainer, opacity: 0.85, lineHeight: 22, marginBottom: 16 },
    chatBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start',
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
    },
    chatBtnText: { fontSize: 15, fontWeight: '600', color: S.onPrimary },

    // FAQ
    faqSection: { marginBottom: 24 },
    faqHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    faqSectionTitle: { fontSize: 18, fontWeight: '600', color: S.onSurface },
    faqCard: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant, overflow: 'hidden',
    },
    faqItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16,
    },
    faqQuestion: { fontSize: 15, fontWeight: '500', color: S.onSurface, flex: 1, marginRight: 8 },
    faqAnswer: { paddingHorizontal: 16, paddingBottom: 16 },
    faqAnswerText: { fontSize: 14, color: S.onSurfaceVariant, lineHeight: 20 },
    divider: { height: 1, backgroundColor: S.outlineVariant },

    // Legal
    legalSection: {},
    legalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    legalSectionTitle: { fontSize: 18, fontWeight: '600', color: S.onSurface },
    legalCard: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant, overflow: 'hidden',
    },
    legalItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16,
    },
    legalLinkText: { fontSize: 15, color: S.primary },
});
