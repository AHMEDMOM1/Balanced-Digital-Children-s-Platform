import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAdminContentList } from '../../services/api/admin';
import { ContentType, ContentItemExtended, AdminListQuery } from '../../services/api/types';

const CONTENT_TYPES: Array<{ label: string; value: ContentType | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Video', value: 'video' },
  { label: 'Story', value: 'story' },
  { label: 'Creative', value: 'creative' },
  { label: 'Game', value: 'game' },
];

export default function AdminIndex() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<ContentType | undefined>(undefined);
  const [titleSearch, setTitleSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query: AdminListQuery = { page, typeFilter, titleSearch: debouncedSearch };
  const { data, error, isLoading, refetch } = useAdminContentList(query);

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  const handleSearchChange = useCallback((text: string) => {
    setTitleSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
    }, 300);
  }, []);

  const handleTypeFilter = useCallback((value: ContentType | undefined) => {
    setTypeFilter(value);
    setPage(1);
  }, []);

  const renderItem = useCallback(({ item }: { item: ContentItemExtended }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/content-edit/${item.id}` as any)}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rowMeta}>
          {item.type} · {item.category} · Age {item.min_age}–{item.max_age}
        </Text>
      </View>
      <Text style={styles.rowDate}>
        {new Date(item.created_at ?? '').toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  ), [router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/content-new' as any)}
        >
          <Text style={styles.btnPrimaryText}>+ New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push('/categories' as any)}
        >
          <Text style={styles.btnSecondaryText}>Categories</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by title…"
        placeholderTextColor="#888"
        value={titleSearch}
        onChangeText={handleSearchChange}
      />

      {/* Type filter */}
      <View style={styles.filterRow}>
        {CONTENT_TYPES.map(({ label, value }) => (
          <TouchableOpacity
            key={label}
            style={[styles.filterChip, typeFilter === value && styles.filterChipActive]}
            onPress={() => handleTypeFilter(value)}
          >
            <Text style={[styles.filterChipText, typeFilter === value && styles.filterChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#6c63ff" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No content items found.</Text>}
        />
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 0 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <Text style={styles.pageBtnText}>← Prev</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <Text style={styles.pageBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  actionBar: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 8 },
  btnPrimary: { backgroundColor: '#6c63ff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: { borderWidth: 1, borderColor: '#6c63ff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  btnSecondaryText: { color: '#6c63ff', fontWeight: '600', fontSize: 15 },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1e1e30',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e1e30' },
  filterChipActive: { backgroundColor: '#6c63ff' },
  filterChipText: { color: '#aaa', fontSize: 13 },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e30',
  },
  rowMain: { flex: 1, marginRight: 8 },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  rowMeta: { color: '#888', fontSize: 13 },
  rowDate: { color: '#666', fontSize: 12 },
  loader: { flex: 1, marginTop: 60 },
  errorText: { color: '#ff6b6b', textAlign: 'center', marginTop: 40, marginHorizontal: 16, fontSize: 15 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 15 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: '#1e1e30' },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#6c63ff', borderRadius: 8 },
  pageBtnDisabled: { backgroundColor: '#333' },
  pageBtnText: { color: '#fff', fontWeight: '600' },
  pageInfo: { color: '#aaa', fontSize: 14 },
});
