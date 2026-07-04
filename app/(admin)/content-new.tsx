import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createContentItem, useAdminCategories } from '../../services/api/admin';
import { ContentType, Category } from '../../services/api/types';

const CONTENT_TYPES: ContentType[] = ['video', 'story', 'creative', 'game'];

interface FormErrors {
  title?: string;
  type?: string;
  category?: string;
  min_age?: string;
  max_age?: string;
  thumbnail_url?: string;
  url?: string;
  config_json?: string;
  general?: string;
}

function SelectModal<T extends string>({
  visible,
  title,
  options,
  getLabel,
  getValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: T[];
  getLabel: (o: T) => string;
  getValue: (o: T) => string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={modal.backdrop} onPress={onClose} activeOpacity={1}>
        <View style={modal.sheet}>
          <Text style={modal.title}>{title}</Text>
          {options.map(opt => (
            <TouchableOpacity
              key={getValue(opt)}
              style={modal.option}
              onPress={() => { onSelect(getValue(opt)); onClose(); }}
            >
              <Text style={modal.optionText}>{getLabel(opt)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
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

export default function ContentNew() {
  const router = useRouter();
  const { data: categories, isLoading: catsLoading } = useAdminCategories();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ContentType | ''>('');
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
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!type) e.type = 'Type is required';
    if (!category) e.category = 'Category is required';
    const minAgeNum = Number(minAge);
    const maxAgeNum = Number(maxAge);
    if (!minAge || !Number.isInteger(minAgeNum) || minAgeNum < 0 || minAgeNum > 17) e.min_age = 'Minimum age must be 0–17';
    if (!maxAge || !Number.isInteger(maxAgeNum) || maxAgeNum < 1 || maxAgeNum > 18) e.max_age = 'Maximum age must be 1–18';
    if (!e.min_age && !e.max_age && maxAgeNum < minAgeNum) e.max_age = 'Maximum age must be ≥ minimum age';
    if (!thumbnailUrl.trim()) e.thumbnail_url = 'Thumbnail URL is required';
    if (type === 'video' && !url.trim()) e.url = 'URL is required for video';
    if (type === 'game' && configJson.trim()) {
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

    const { error } = await createContentItem({
      title: title.trim(),
      type: type as ContentType,
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
      setErrors({ general: error });
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {errors.general && <Text style={styles.bannerError}>{errors.general}</Text>}

        <Field label="Title" error={errors.title}>
          <TextInput style={[styles.input, errors.title && styles.inputError]} value={title} onChangeText={setTitle} placeholder="Enter title" placeholderTextColor="#666" />
        </Field>

        <Field label="Type" error={errors.type}>
          <TouchableOpacity
            style={[styles.selectBtn, errors.type && styles.inputError]}
            onPress={() => setShowTypeModal(true)}
          >
            <Text style={type ? styles.selectBtnValue : styles.selectBtnPlaceholder}>
              {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Select type…'}
            </Text>
            <Text style={styles.selectChevron}>▾</Text>
          </TouchableOpacity>
        </Field>

        <Field label="Category" error={errors.category}>
          {catsLoading ? (
            <ActivityIndicator color="#6c63ff" style={{ padding: 12 }} />
          ) : (
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
          )}
        </Field>

        <View style={styles.row}>
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

        {type === 'video' && <>
          <Field label="Video URL *" error={errors.url}>
            <TextInput style={[styles.input, errors.url && styles.inputError]} value={url} onChangeText={setUrl} placeholder="https://…" placeholderTextColor="#666" autoCapitalize="none" />
          </Field>
          <Field label="Duration (seconds)">
            <TextInput style={styles.input} value={durationSeconds} onChangeText={setDurationSeconds} keyboardType="numeric" placeholder="Optional" placeholderTextColor="#666" />
          </Field>
        </>}

        {type === 'story' && (
          <Field label="Content Text">
            <TextInput style={[styles.input, styles.multiline]} value={contentText} onChangeText={setContentText} placeholder="Story content…" placeholderTextColor="#666" multiline numberOfLines={6} textAlignVertical="top" />
          </Field>
        )}

        {type === 'creative' && (
          <Field label="Assets URL">
            <TextInput style={styles.input} value={assetsUrl} onChangeText={setAssetsUrl} placeholder="https://…" placeholderTextColor="#666" autoCapitalize="none" />
          </Field>
        )}

        {type === 'game' && <>
          <Field label="Game Type">
            <TextInput style={styles.input} value={gameType} onChangeText={setGameType} placeholder="Optional" placeholderTextColor="#666" />
          </Field>
          <Field label="Config JSON" error={errors.config_json}>
            <TextInput style={[styles.input, styles.multiline, errors.config_json && styles.inputError]} value={configJson} onChangeText={setConfigJson} placeholder={'{\n  "key": "value"\n}'} placeholderTextColor="#666" multiline numberOfLines={5} textAlignVertical="top" autoCapitalize="none" autoCorrect={false} />
          </Field>
        </>}

        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      <SelectModal
        visible={showTypeModal}
        title="Select Type"
        options={CONTENT_TYPES}
        getLabel={t => t.charAt(0).toUpperCase() + t.slice(1)}
        getValue={t => t}
        onSelect={v => { setType(v as ContentType); setErrors(e => ({ ...e, type: undefined })); }}
        onClose={() => setShowTypeModal(false)}
      />

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
  bannerError: { backgroundColor: '#3d1a1a', color: '#ff6b6b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  row: { flexDirection: 'row' },
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
});
