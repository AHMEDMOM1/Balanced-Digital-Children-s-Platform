import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { connectivityManager } from '../../services/resilience/connectivityManager';
import { timeSync } from '../../services/resilience/timeSync';
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

interface OfflineBadgeProps {
  lastSyncAt?: number | null;
}

export default function OfflineBadge({ lastSyncAt: propLastSyncAt }: OfflineBadgeProps) {
  const [visible, setVisible] = useState(false);
  const [elapsedText, setElapsedText] = useState('');

  useEffect(() => {
    const unsub = connectivityManager.subscribe((state) => {
      setVisible(state === 'offline');
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Prefer explicitly passed timestamp, fall back to timeSync's last successful fetch
    const syncAt = propLastSyncAt ?? timeSync.getLastSyncAt() ?? null;
    if (!visible || !syncAt) {
      setElapsedText('');
      return;
    }

    const update = () => {
      const diffSec = Math.floor((Date.now() - syncAt) / 1000);
      if (diffSec < 60) {
        setElapsedText('Last synced less than a minute ago');
      } else if (diffSec < 3600) {
        setElapsedText(`Last synced ${Math.floor(diffSec / 60)} min ago`);
      } else {
        setElapsedText(`Last synced ${Math.floor(diffSec / 3600)}h ago`);
      }
    };

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [visible, propLastSyncAt]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>
        {elapsedText || 'You are offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.child.error ?? '#E53935',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#fff',
  },
});
