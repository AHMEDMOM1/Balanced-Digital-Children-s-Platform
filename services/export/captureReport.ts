/**
 * services/export/captureReport.ts
 * Captures a React Native View as a PNG and triggers the OS share sheet.
 * Used by the Export button in app/(parent)/reports.tsx.
 */
import { RefObject } from 'react';
import { View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

/**
 * Captures the view referenced by `viewRef` and opens the share sheet.
 * Returns true on success, false if sharing is unavailable or capture fails.
 */
export async function captureAndShare(viewRef: RefObject<View>): Promise<boolean> {
  try {
    if (!viewRef.current) return false;

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) return false;

    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Weekly Report',
    });

    return true;
  } catch {
    return false;
  }
}
