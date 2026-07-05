import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useAdminContentItem,
  updateContentItem,
  deleteContentItem,
  useAdminCategories,
} from '../../../services/api/admin';
import { Category } from '../../../services/api/types';

interface FormErrors {
  title?: string;
  category?: string;
  min_age?: string;
  max_age?: string;
  thumbnail_url?: string;
  url?: string;
  config_json?: string;
  general?: string;
}

function CategoryModal({
  visible,
  categories,
  onSelect,
  onClose,
}: {
  visible: boolean;
  categories: Category[];
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={modal.backdrop} onPress={onClose} activeOpacity={1}>
        <View style={modal.sheet}>
          <Text style={modal.title}>Select Category</Text>
          {categories.length === 0 ? (
            <Text style={modal.emptyText}>No categories available</Text>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={c => c.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modal.option}
                  onPress={() => { onSelect(item.name); onClose(); }}
                >
                  <Text style={modal.optionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function ContentEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: item, error: loadError, isLoading } = useAdminContentItem(id ?? '');
  const { data: categories } = useAdminCategories();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [url, setUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [contentText, setContentText] = useState('');
  const [assetsUrl, setAssetsUrl] = useState('');
  const [gameType, setGameType] = useState('');
  const [configJson, setConfigJson] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title ?? '');
    setCategory(item.category ?? '');
    setMinAge(String(item.min_age ?? ''));
    setMaxAge(String(item.max_age ?? ''));
    setThumbnailUrl(item.thumbnail_url ?? '');
    setUrl((item as any).url ?? '');
    setDurationSeconds(String((item as any).duration_seconds ?? ''));
    setContentText((item as any).content_text ?? '');
    setAssetsUrl((item as any).assets_url ?? '');
    setGameType((item as any).game_type ?? '');
    const cfg = (item as any).config_json;
    setConfigJson(cfg && typeof cfg === 'object' ? JSON.stringify(cfg, null, 2) : (cfg ?? ''));
  }, [item]);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!category) e.category = 'Category is required';
    const minAgeNum = Number(minAge);
    const maxAgeNum = Number(maxAge);
    if (!minAge || !Number.isInteger(minAgeNum) || minAgeNum < 0 || minAgeNum > 17) e.min_age = 'Minimum age must be 0–17';
    if (!maxAge || !Number.isInteger(maxAgeNum) || maxAgeNum < 1 || maxAgeNum > 18) e.max_age = 'Maximum age must be 1–18';
    if (!e.min_age && !e.max_age && maxAgeNum < minAgeNum) e.max_age = 'Maximum age must be ≥ minimum age';
    if (!thumbnailUrl.trim()) e.thumbnail_url = 'Thumbnail URL is required';
    if (item?.type === 'video' && !url.trim()) e.url = 'URL is required for video';
    if (item?.type === 'game' && configJson.trim()) {
      try { JSON.parse(configJson); } catch { e.config_json = 'Config must be valid JSON'; }
    }
    return e;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSaving(true);
    setSaveSuccess(false);

    const { error } = await updateContentItem(id ?? '', {
      title: title.trim(),
      category,
      min_age: Number(minAge),
      max_age: Number(maxAge),
      thumbnail_url: thumbnailUrl.trim(),
      url: url.trim() || undefined,
      duration_seconds: durationSeconds ? Number(durationSeconds) : undefined,
      content_text: contentText || undefined,
      assets_url: assetsUrl.trim() || undefined,
      game_type: gameType || undefined,
      config_json: configJson as any,
    });

    setIsSaving(false);

    if (error) {
      const isAuthError = error.toLowerCase().includes('unauthorized');
      setErrors({
        general: isAuthError
          ? 'Authentication error: your session may have expired. Please log in again.'
          : `Network error: ${error}`,
      });
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => router.back(), 800);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Content',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const { error } = await deleteContentItem(id ?? '');
            setIsDeleting(false);
            if (error) {
              setErrors({ general: error });
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#6c63ff" />
      </SafeAreaView>
    );
  }

  if (loadError || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorCenter}>{loadError ?? 'Content item not found.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {errors.general && <Text style={styles.bannerError}>{errors.general}</Text>}
        {saveSuccess && <Text style={styles.bannerSuccess}>Saved!</Text>}

        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Type</Text>
          <Text style={styles.readOnlyValue}>{item.type}</Text>
        </View>

        <Field label="Title" error={errors.title}>
          <TextInput style={[styles.input, errors.title && styles.inputError]} value={title} onChangeText={setTitle} placeholder="Enter title" placeholderTextColor="#666" />
        </Field>

        <Field label="Category" error={errors.category}>
          <TouchableOpacity
            style={[styles.selectBtn, errors.category && styles.inputError]}
            onPress={() => setShowCatModal(true)}
            disabled={!categories || categories.length === 0}
          >
            <Text style={category ? styles.selectBtnValue : styles.selectBtnPlaceholder}>
              {category || ((!categories || categories.length === 0) ? 'No categories available' : 'Select category…')}
            </Text>
            <Text style={styles.selectChevron}>▾</Text>
          </TouchableOpacity>
        </Field>

        <View style={styles.rowLayout}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Field label="Min Age" error={errors.min_age}>
              <TextInput style={[styles.input, errors.min_age && styles.inputError]} value={minAge} onChangeText={setMinAge} keyboardType="numeric" placeholder="0–17" placeholderTextColor="#666" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Max Age" error={errors.max_age}>
              <TextInput style={[styles.input, errors.max_age && styles.inputError]} value={maxAge} onChangeText={setMaxAge} keyboardType="numeric" placeholder="1–18" placeholderTextColor="#666" />
            </Field>
          </View>
        </View>

        <Field label="Thumbnail URL" error={errors.thumbnail_url}>
          <TextInput style={[styles.input, errors.thumbnail_url && styles.inputError]} value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="https://…" placeholderTextColor="#666" autoCapitalize="none" />
        </Field>

        {item.type === 'video' && <>
          <Field label="Video URL *" error={errors.url}>
            <TextInput style={[styles.input, errors.url && styles.inputError]} value={url} onChangeText={setUrl} placeholder="https://…" placeholderTextColor="#666" autoCapitalize="none" />
          </Field>
          <Field label="Duration (seconds)">
            <TextInput style={styles.input} value={durationSeconds} onChangeText={setDurationSeconds} keyboardType="numeric" placeholder="Optional" placeholderTextColor="#666" />
          </Field>
        </>}

        {item.type === 'story' && (
          <Field label="Content Text">
            <TextInput style={[styles.input, styles.multiline]} value={contentText} onChangeText={setContentText} placeholder="Story content…" placeholderTextColor="#666" multiline numberOfLines={6} textAlignVertical="top" />
          </Field>
        )}

        {item.type === 'creative' && (
          <Field label="Assets URL">
            <TextInput style={styles.input} value={assetsUrl} onChangeText={setAssetsUrl} placeholder="https://…" placeholderTextColor="#666" autoCapitalize="none" />
          </Field>
        )}

        {item.type === 'game' && <>
          <Field label="Game Type">
            <TextInput style={styles.input} value={gameType} onChangeText={setGameType} placeholder="Optional" placeholderTextColor="#666" />
          </Field>
          <Field label="Config JSON" error={errors.config_json}>
            <TextInput style={[styles.input, styles.multiline, errors.config_json && styles.inputError]} value={configJson} onChangeText={setConfigJson} placeholder={'{\n  "key": "value"\n}'} placeholderTextColor="#666" multiline numberOfLines={5} textAlignVertical="top" autoCapitalize="none" autoCorrect={false} />
          </Field>
        </>}

        <TouchableOpacity
          style={[styles.saveBtn, (isSaving || isDeleting) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving || isDeleting}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, (isSaving || isDeleting) && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={isSaving || isDeleting}
        >
          {isDeleting
            ? <ActivityIndicator color="#ff6b6b" />
            : <Text style={styles.deleteBtnText}>Delete</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      <CategoryModal
        visible={showCatModal}
        categories={categories ?? []}
        onSelect={v => { setCategory(v); setErrors(e => ({ ...e, category: undefined })); }}
        onClose={() => setShowCatModal(false)}
      />
    </SafeAreaView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
      {error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: { color: '#ccc', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  error: { color: '#ff6b6b', fontSize: 12, marginTop: 4 },
});

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1e1e30', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  title: { color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2a2a40' },
  optionText: { color: '#fff', fontSize: 16 },
  emptyText: { color: '#666', textAlign: 'center', paddingVertical: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  scroll: { padding: 16, paddingBottom: 40 },
  errorCenter: { color: '#ff6b6b', textAlign: 'center', marginTop: 60, fontSize: 15 },
  bannerError: { backgroundColor: '#3d1a1a', color: '#ff6b6b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  bannerSuccess: { backgroundColor: '#1a3d1a', color: '#6bff6b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14, textAlign: 'center' },
  readOnlyField: { marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  readOnlyLabel: { color: '#888', fontSize: 13 },
  readOnlyValue: { color: '#aaa', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  rowLayout: { flexDirection: 'row' },
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
  multiline: { minHeight: 100 },
  selectBtn: {
    backgroundColor: '#1e1e30',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBtnValue: { color: '#fff', fontSize: 15 },
  selectBtnPlaceholder: { color: '#666', fontSize: 15 },
  selectChevron: { color: '#888', fontSize: 14 },
  saveBtn: { marginTop: 8, backgroundColor: '#6c63ff', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#444' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { marginTop: 12, borderWidth: 1, borderColor: '#ff6b6b', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  deleteBtnDisabled: { borderColor: '#555' },
  deleteBtnText: { color: '#ff6b6b', fontSize: 16, fontWeight: '600' },
});
