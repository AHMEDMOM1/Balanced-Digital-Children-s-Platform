import React from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import useSessionStore from '../../store/useSessionStore';

const PauseOverlay = () => {
  const isPauseOverlayVisible = useSessionStore((state) => state.isPauseOverlayVisible);

  if (!isPauseOverlayVisible) {
    return null;
  }

  return (
    <TouchableWithoutFeedback pointerEvents="auto" onPress={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🐻</Text>
          <Text style={styles.titleAr}>وقت الراحة!</Text>
          <Text style={styles.titleEn}>Time for a break!</Text>
          <Text style={styles.subtitle}>طلب منك أحد الوالدين التوقف مؤقتاً</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  titleAr: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  titleEn: {
    fontSize: 20,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

export default PauseOverlay;
