import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import useAuthStore from '../../store/useAuthStore';
import { generatePairingToken, watchForChildPaired } from '../../services/api/pairing';
import { PairingResult } from '../../services/api/types';

const S = {
  surface: '#FDF7FF', primary: '#4F378A', primaryContainer: '#EADDFF',
  onPrimary: '#FFFFFF', onSurface: '#1D1B20', onSurfaceVariant: '#494551',
  error: '#BA1A1A', errorContainer: '#FFDAD6', outline: '#CBC4D2',
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function QrPairingScreen() {
  const router = useRouter();
  const familyId = useAuthStore((s) => s.parentData?.familyId);

  const [pairingResult, setPairingResult] = useState<PairingResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCountdown = useCallback((expiresAt: string) => {
    clearCountdown();
    countdownRef.current = setInterval(() => {
      const secs = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(secs);
      if (secs === 0) {
        clearCountdown();
        handleRegenerate();
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearCountdown]);

  const handleRegenerate = useCallback(async () => {
    if (!familyId) return;
    setIsGenerating(true);
    setError(null);
    const result = await generatePairingToken(familyId);
    if (result.error) {
      setError(result.error);
      setIsGenerating(false);
    } else {
      setPairingResult(result);
      setIsGenerating(false);
      if (result.token?.expires_at) startCountdown(result.token.expires_at);
    }
  }, [familyId, startCountdown]);

  const onPaired = useCallback((childId: string) => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    // This screen is only reachable from inside the already PIN-protected
    // dashboard, so a PIN is guaranteed to already be set up. Next step is
    // collecting the child's name/age/photo, not re-checking the PIN.
    router.replace({ pathname: '/auth/child-info', params: { childId } });
  }, [router]);

  // Mount: generate initial token + subscribe to realtime
  useEffect(() => {
    if (!familyId) {
      router.replace('/auth/register');
      return;
    }

    let cancelled = false;

    generatePairingToken(familyId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else {
        setPairingResult(result);
        if (result.token?.expires_at) startCountdown(result.token.expires_at);
      }
    });

    unsubscribeRef.current = watchForChildPaired(familyId, onPaired);

    return () => {
      cancelled = true;
      clearCountdown();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  // startCountdown and onPaired are stable refs — intentional omission
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const qrPayload = pairingResult?.token
    ? JSON.stringify({
        token: pairingResult.token.token,
        family_id: familyId,
        expires_at: pairingResult.token.expires_at,
      })
    : '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pair Child's Device</Text>
        <Text style={styles.subtitle}>
          Scan this code on your child's device or enter the code manually.
        </Text>

        {/* QR Code */}
        <View
          style={styles.qrContainer}
          accessible
          accessibilityLabel="QR code — scan to pair your child's device"
        >
          {!isGenerating && qrPayload ? (
            <QRCode value={qrPayload} size={220} />
          ) : (
            <View style={styles.qrPlaceholder}>
              {isGenerating ? <ActivityIndicator size="large" color={S.primary} /> : null}
            </View>
          )}
        </View>

        {/* Manual code */}
        <Text style={styles.manualCodeLabel}>Manual code</Text>
        <Text style={styles.manualCode} accessibilityRole="text">
          {pairingResult?.displayCode ?? '---'}
        </Text>

        {/* Countdown */}
        <Text style={styles.countdown} accessibilityRole="text">
          {isGenerating ? '--:--' : formatCountdown(remainingSeconds)}
        </Text>
        <Text style={styles.countdownLabel}>remaining</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={handleRegenerate} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Regenerate button */}
        <TouchableOpacity
          style={[styles.regenBtn, isGenerating && styles.disabledBtn]}
          onPress={handleRegenerate}
          disabled={isGenerating}
          accessibilityRole="button"
          accessibilityLabel="Regenerate pairing code"
        >
          {isGenerating ? (
            <ActivityIndicator color={S.onPrimary} />
          ) : (
            <Text style={styles.regenText}>Regenerate</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.surface },
  content: { padding: 24, alignItems: 'center', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', color: S.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: S.onSurfaceVariant, textAlign: 'center', marginBottom: 32 },
  qrContainer: {
    width: 240, height: 240, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: S.outline, marginBottom: 24,
  },
  qrPlaceholder: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  manualCodeLabel: { fontSize: 12, color: S.onSurfaceVariant, marginBottom: 4 },
  manualCode: { fontSize: 36, fontWeight: '700', color: S.onSurface, letterSpacing: 4, marginBottom: 16 },
  countdown: { fontSize: 28, fontWeight: '600', color: S.primary },
  countdownLabel: { fontSize: 12, color: S.onSurfaceVariant, marginBottom: 32 },
  errorBox: {
    backgroundColor: S.errorContainer, borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 16, width: '100%',
  },
  errorText: { fontSize: 14, color: S.error, marginBottom: 8, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: S.primary, borderRadius: 8 },
  retryText: { color: S.onPrimary, fontWeight: '600', fontSize: 14 },
  regenBtn: {
    backgroundColor: S.primary, borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 32, minWidth: 200, alignItems: 'center',
  },
  disabledBtn: { opacity: 0.5 },
  regenText: { fontSize: 16, fontWeight: '600', color: S.onPrimary },
});
