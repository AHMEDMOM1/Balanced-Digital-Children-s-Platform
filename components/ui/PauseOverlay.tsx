import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useSessionStore from '../../store/useSessionStore';
import useSettingsStore from '../../store/useSettingsStore';
import PinModal from './PinModal';

const ACTIVITIES = [
  {
    icon: 'color-palette-outline' as const,
    label: 'Draw a picture',
    bg: '#E9DDFF',
    iconColor: '#4F378A',
    border: '#CFC4EC',
  },
  {
    icon: 'extension-puzzle-outline' as const,
    label: 'Play with toys',
    bg: '#FFDF93',
    iconColor: '#765B00',
    border: '#E7C365',
  },
  {
    icon: 'leaf-outline' as const,
    label: 'Go outside',
    bg: '#E6F9E6',
    iconColor: '#2E6B2E',
    border: '#C2F0C2',
  },
  {
    icon: 'book-outline' as const,
    label: 'Read a book',
    bg: '#F5EFF7',
    iconColor: '#63597C',
    border: '#CDC0E9',
  },
];

const PauseOverlay = () => {
  const isPauseOverlayVisible = useSessionStore((state) => state.isPauseOverlayVisible);
  const setPaused = useSessionStore((state) => state.setPaused);
  const pinCode = useSettingsStore((state) => state.pinCode);
  const [showPin, setShowPin] = useState(false);

  if (!isPauseOverlayVisible) return null;

  return (
    <View style={styles.overlay}>
      {/* Soft background orbs */}
      <View style={[styles.orb, styles.orbTopLeft]} />
      <View style={[styles.orb, styles.orbBottomRight]} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero illustration */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroGlow} />
          <Image
            source={require('../../assets/time_up_moon.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Headline */}
        <Text style={styles.headline}>It's time to relax! 🌟</Text>

        {/* Suggestions bento box */}
        <View style={styles.bentoBox}>
          <Text style={styles.bentoTitle}>How about we...</Text>
          <View style={styles.grid}>
            {ACTIVITIES.map((a) => (
              <View key={a.label} style={[styles.activityCard, { borderBottomColor: a.border }]}>
                <View style={[styles.activityIconCircle, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={32} color={a.iconColor} />
                </View>
                <Text style={styles.activityLabel}>{a.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Parent Exit — fixed at bottom */}
      <View style={styles.exitBar}>
        <TouchableOpacity style={styles.exitButton} onPress={() => setShowPin(true)} activeOpacity={0.8}>
          <Ionicons name="lock-closed-outline" size={18} color="#494551" />
          <Text style={styles.exitText}>Parent Exit</Text>
        </TouchableOpacity>
      </View>

      <PinModal
        visible={showPin}
        onClose={() => setShowPin(false)}
        onSuccess={() => {
          setShowPin(false);
          setPaused(false);
        }}
        correctPin={pinCode}
      />
    </View>
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
    backgroundColor: '#FDF7FF',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
  orbTopLeft: {
    width: 380,
    height: 380,
    backgroundColor: '#CDC0E9',
    top: '-10%',
    left: '-10%',
  },
  orbBottomRight: {
    width: 320,
    height: 320,
    backgroundColor: '#E7C365',
    bottom: '-10%',
    right: '-10%',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  heroWrapper: {
    width: 192,
    height: 192,
    marginBottom: 32,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    inset: 0,
    width: '110%',
    height: '110%',
    borderRadius: 999,
    backgroundColor: 'rgba(79,55,138,0.08)',
    transform: [{ scale: 1.1 }],
  },
  heroImage: {
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4F378A',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 36,
  },
  bentoBox: {
    width: '100%',
    backgroundColor: '#F8F2FA',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E0E9',
    shadowColor: '#4F378A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  bentoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#494551',
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  activityCard: {
    width: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1B20',
    textAlign: 'center',
  },
  exitBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#ECE6EE',
    borderWidth: 1,
    borderColor: '#CBC4D2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  exitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#494551',
  },
});

export default PauseOverlay;
