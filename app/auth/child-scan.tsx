import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import {
  parseQrPayload,
  isTokenExpired,
  parseManualCode,
  consumePairingToken,
  consumePairingTokenByCode,
} from '../../services/api/childPairing';
import usePairingStore from '../../store/usePairingStore';
import { ChildPairingState } from '../../services/api/types';

const S = {
  surface: '#FDF7FF',
  surfaceLow: '#F8F2FA',
  surfaceLowest: '#FFFFFF',
  primary: '#4F378A',
  onSurface: '#1D1B20',
  onSurfaceVariant: '#494551',
  outlineVariant: '#CBC4D2',
  error: '#BA1A1A',
};

function errorMessage(code: string | null | undefined): string {
  switch (code) {
    case 'invalid_token':
      return 'This code is invalid, expired, or already used. Ask the parent for a new code.';
    case 'parent_not_found':
      return 'Something went wrong. Please try again.';
    default:
      return 'Connection error. Check your internet and try again.';
  }
}

export default function ChildScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const isScanning = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const savePairingStateFromResult = async (
    childId: string,
    familyId: string,
    parentId: string
  ) => {
    const state: ChildPairingState = {
      child_id: childId,
      family_id: familyId,
      parent_id: parentId,
      paired_at: new Date().toISOString(),
    };
    await usePairingStore.getState().savePairingState(state);
  };

  const handleScan = async (event: { data: string }) => {
    if (isScanning.current || isSubmitting) return;
    isScanning.current = true;
    setError(null);

    const payload = parseQrPayload(event.data);
    if (!payload) {
      setError('Invalid QR code. Please try again.');
      isScanning.current = false;
      return;
    }

    if (isTokenExpired(payload)) {
      setError('Code has expired. Ask the parent for a new code.');
      isScanning.current = false;
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await consumePairingToken(payload.token, payload.family_id);
      if (result.success && result.child_id && result.family_id) {
        // family_id IS the parent's own id by this app's convention (see
        // services/auth.ts buildAuthStateFromSession) — consume_pairing_token
        // never returns a separate parent_id, so use family_id for both.
        await savePairingStateFromResult(result.child_id, result.family_id, result.family_id);
        router.replace('/(child)');
      } else {
        setError(errorMessage(result.error));
        isScanning.current = false;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    const stripped = parseManualCode(manualCode.replace(/-/g, ''));
    if (!stripped) {
      setError('Enter exactly 6 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await consumePairingTokenByCode(stripped);
      if (result.success && result.child_id && result.family_id) {
        // family_id IS the parent's own id by this app's convention (see
        // services/auth.ts buildAuthStateFromSession) — consume_pairing_token
        // never returns a separate parent_id, so use family_id for both.
        await savePairingStateFromResult(result.child_id, result.family_id, result.family_id);
        router.replace('/(child)');
      } else {
        setError(errorMessage(result.error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatManualDisplay = (raw: string) => {
    const chars = raw.replace(/[\s-]/g, '').toUpperCase().slice(0, 6);
    if (chars.length <= 3) return chars;
    return chars.slice(0, 3) + '-' + chars.slice(3);
  };

  const handleManualInput = (text: string) => {
    const chars = text.replace(/[\s-]/g, '').toUpperCase().slice(0, 6);
    setManualCode(chars);
    setError(null);
  };

  const permissionGranted = permission?.granted === true;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={{ width: 38 }} />
        <Text style={styles.topBarTitle}>Link to Parent</Text>
        <View style={{ width: 38 }} />
      </View>

      {isSubmitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator size="large" color={S.primary} />
          <Text style={styles.submittingText}>Creating account…</Text>
        </View>
      )}

      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => setError(null)}>
          <Ionicons name="alert-circle-outline" size={18} color={S.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Ionicons name="close-outline" size={18} color={S.error} />
        </TouchableOpacity>
      )}

      {mode === 'camera' && (
        <View style={styles.cameraContainer}>
          {permissionGranted ? (
            <>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={isSubmitting ? undefined : handleScan}
              />
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>Point camera at the QR code</Text>
              </View>
            </>
          ) : (
            <View style={styles.noCameraBox}>
              <Ionicons name="camera-outline" size={48} color={S.onSurfaceVariant} />
              <Text style={styles.noCameraText}>Camera not available</Text>
              {permission && !permission.granted && !permission.canAskAgain ? null : (
                <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
                  <Text style={styles.grantButtonText}>Allow Camera Access</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => { setMode('manual'); setError(null); }}
          >
            <Ionicons name="keypad-outline" size={18} color={S.primary} />
            <Text style={styles.switchModeText}>Enter code manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'manual' && (
        <ScrollView contentContainerStyle={styles.manualContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enter Pairing Code</Text>
            <Text style={styles.cardDesc}>
              Enter the 6-character code shown on the parent's screen.
            </Text>

            <TextInput
              style={styles.codeInput}
              value={formatManualDisplay(manualCode)}
              onChangeText={handleManualInput}
              autoCapitalize="characters"
              maxLength={7}
              placeholder="ABC-123"
              placeholderTextColor={S.outlineVariant}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.submitButton, manualCode.length < 6 && styles.submitButtonDisabled]}
              onPress={handleManualSubmit}
              disabled={isSubmitting || manualCode.length < 6}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Connecting…' : 'Connect to Parent'}
              </Text>
            </TouchableOpacity>

            {permissionGranted && (
              <TouchableOpacity
                style={styles.switchModeButton}
                onPress={() => { setMode('camera'); setError(null); isScanning.current = false; }}
              >
                <Ionicons name="camera-outline" size={18} color={S.primary} />
                <Text style={styles.switchModeText}>Switch to camera</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
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
  topBarTitle: { fontSize: 22, fontWeight: '700', color: S.onSurface },

  submittingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(253,247,255,0.92)',
    zIndex: 10, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  submittingText: { fontSize: 16, color: S.primary, fontWeight: '600' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFDAD6', paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 16, marginTop: 12, borderRadius: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: S.error },

  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  scanFrame: {
    width: 220, height: 220,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  scanHint: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '500' },
  noCameraBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32,
  },
  noCameraText: { fontSize: 16, color: S.onSurfaceVariant },
  grantButton: {
    paddingVertical: 12, paddingHorizontal: 24,
    backgroundColor: S.primary, borderRadius: 24,
  },
  grantButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  switchModeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 16, paddingHorizontal: 20,
    backgroundColor: S.surface,
    borderTopWidth: 1, borderTopColor: S.outlineVariant,
  },
  switchModeText: { color: S.primary, fontSize: 15, fontWeight: '600' },

  manualContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: S.surfaceLowest, borderRadius: 12,
    borderWidth: 1, borderColor: S.outlineVariant,
    padding: 32, alignItems: 'center', gap: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: S.onSurface },
  cardDesc: { fontSize: 15, color: S.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  codeInput: {
    fontSize: 32, fontWeight: '700', letterSpacing: 4,
    color: S.onSurface, textAlign: 'center',
    borderWidth: 2, borderColor: S.primary, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 24, width: '100%',
  },
  submitButton: {
    backgroundColor: S.primary, borderRadius: 24,
    paddingVertical: 16, paddingHorizontal: 32, width: '100%',
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
