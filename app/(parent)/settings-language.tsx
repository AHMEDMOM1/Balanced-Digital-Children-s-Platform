/**
 * App Language Screen — Stitch parent_settings_app_language Design
 * - Language list with radio selection (EN, AR, TR)
 * - Search bar, Save Changes button
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const S = {
    surface: '#FDF7FF',
    surfaceLow: '#F8F2FA',
    surfaceLowest: '#FFFFFF',
    surfaceHighest: '#E6E0E9',
    primary: '#4F378A',
    primaryContainer: '#6750A4',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#E0D2FF',
    onSurface: '#1D1B20',
    onSurfaceVariant: '#494551',
    outlineVariant: '#CBC4D2',
    outline: '#7A7582',
    surfaceContainer: '#F2ECF4',
};

const languages = [
    { code: 'EN', label: 'English' },
    { code: 'AR', label: 'Arabic' },
    { code: 'TR', label: 'Türkçe' },
];

export default function SettingsLanguageScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState('EN');
    const [search, setSearch] = useState('');

    const filtered = languages.filter(l =>
        l.label.toLowerCase().includes(search.toLowerCase()) ||
        l.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={S.onSurfaceVariant} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Parental Control</Text>
                <TouchableOpacity style={styles.topBarBtn}>
                    <Ionicons name="settings-outline" size={22} color={S.onSurfaceVariant} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>App Language</Text>
                    <Text style={styles.cardDesc}>Select the primary language for the parental dashboard.</Text>

                    {/* Search */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={S.outline} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search languages..."
                            placeholderTextColor={S.outline}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    {/* Language List */}
                    <View style={styles.langList}>
                        {filtered.map(lang => {
                            const isSelected = lang.code === selected;
                            return (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[styles.langItem, isSelected && styles.langItemSelected]}
                                    onPress={() => setSelected(lang.code)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.langLeft}>
                                        <View style={[styles.langBadge, isSelected && styles.langBadgeSelected]}>
                                            <Text style={[styles.langBadgeText, isSelected && { color: S.onPrimaryContainer }]}>
                                                {lang.code}
                                            </Text>
                                        </View>
                                        <Text style={styles.langLabel}>{lang.label}</Text>
                                    </View>
                                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                                        {isSelected && <View style={styles.radioDot} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Save Button */}
                    <View style={styles.saveRow}>
                        <TouchableOpacity style={styles.saveBtn} onPress={() => router.back()}>
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: S.surface },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: S.outlineVariant,
    },
    topBarBtn: { padding: 8, borderRadius: 99 },
    topBarTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface },
    content: { padding: 20, paddingBottom: 40 },
    card: {
        backgroundColor: S.surfaceLowest, borderRadius: 12,
        borderWidth: 1, borderColor: S.outlineVariant, padding: 24,
    },
    cardTitle: { fontSize: 18, fontWeight: '600', color: S.onSurface, marginBottom: 8 },
    cardDesc: { fontSize: 15, color: S.onSurfaceVariant, marginBottom: 20, lineHeight: 22 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: S.outlineVariant, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20,
        backgroundColor: S.surface,
    },
    searchInput: { flex: 1, fontSize: 15, color: S.onSurface },
    langList: { gap: 8, marginBottom: 24 },
    langItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderRadius: 8,
        borderWidth: 1, borderColor: S.outlineVariant, backgroundColor: S.surface,
    },
    langItemSelected: {
        borderColor: S.primary, backgroundColor: S.surfaceLow,
    },
    langLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    langBadge: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: S.surfaceHighest,
        alignItems: 'center', justifyContent: 'center',
    },
    langBadgeSelected: { backgroundColor: S.primaryContainer },
    langBadgeText: { fontSize: 13, fontWeight: '600', color: S.onSurfaceVariant },
    langLabel: { fontSize: 15, color: S.onSurface },
    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: S.outlineVariant,
        alignItems: 'center', justifyContent: 'center',
    },
    radioSelected: { borderColor: S.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: S.primary },
    saveRow: {
        borderTopWidth: 1, borderTopColor: S.outlineVariant,
        paddingTop: 16, alignItems: 'flex-end',
    },
    saveBtn: {
        backgroundColor: S.primary, paddingHorizontal: 24, paddingVertical: 10,
        borderRadius: 8,
    },
    saveBtnText: { fontSize: 18, fontWeight: '600', color: S.onPrimary },
});
