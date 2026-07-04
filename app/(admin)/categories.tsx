import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAdminCategories, createCategory, deleteCategory } from '../../services/api/admin';
import { Category } from '../../services/api/types';

export default function CategoriesScreen() {
  const { data: categories, isLoading, error, refetch } = useAdminCategories();

  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [nameError, setNameError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    setNameError('');
    setGeneralError('');

    if (!name.trim()) {
      setNameError('Category name is required');
      return;
    }

    setIsSaving(true);
    const { error: addError } = await createCategory({
      name: name.trim(),
      icon_url: iconUrl.trim() || undefined,
    });
    setIsSaving(false);

    if (addError) {
      if (addError.toLowerCase().includes('already exists')) {
        setNameError(addError);
      } else {
        setGeneralError(addError);
      }
      return;
    }

    setName('');
    setIconUrl('');
    await refetch();
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Existing content items will retain this category value.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error: delError } = await deleteCategory(cat.id);
            if (delError) {
              setGeneralError(delError);
            } else {
              await refetch();
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Category }) => (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{item.name}</Text>
        {item.icon_url && <Text style={styles.rowMeta} numberOfLines={1}>{item.icon_url}</Text>}
      </View>
      <TouchableOpacity style={styles.deleteIcon} onPress={() => handleDelete(item)}>
        <Text style={styles.deleteIconText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {generalError ? <Text style={styles.bannerError}>{generalError}</Text> : null}

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#6c63ff" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={categories ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No categories yet.</Text>}
          style={styles.list}
        />
      )}

      {/* Add Category form */}
      <View style={styles.addForm}>
        <Text style={styles.addTitle}>Add Category</Text>
        <TextInput
          style={[styles.input, nameError ? styles.inputError : null]}
          value={name}
          onChangeText={text => { setName(text); setNameError(''); }}
          placeholder="Category name *"
          placeholderTextColor="#666"
        />
        {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={iconUrl}
          onChangeText={setIconUrl}
          placeholder="Icon URL (optional)"
          placeholderTextColor="#666"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.addBtn, isSaving && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.addBtnText}>Add</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  bannerError: { backgroundColor: '#3d1a1a', color: '#ff6b6b', padding: 12, fontSize: 14, margin: 12, borderRadius: 8 },
  errorText: { color: '#ff6b6b', textAlign: 'center', marginTop: 40, fontSize: 15 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 15 },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e1e30' },
  rowMain: { flex: 1, marginRight: 12 },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  rowMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  deleteIcon: { padding: 8 },
  deleteIconText: { color: '#ff6b6b', fontSize: 16, fontWeight: '700' },
  addForm: { padding: 16, borderTopWidth: 1, borderTopColor: '#1e1e30' },
  addTitle: { color: '#ccc', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  input: {
    backgroundColor: '#1e1e30',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  inputError: { borderColor: '#ff6b6b' },
  fieldError: { color: '#ff6b6b', fontSize: 12, marginTop: 4 },
  addBtn: { marginTop: 10, backgroundColor: '#6c63ff', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  addBtnDisabled: { backgroundColor: '#444' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
