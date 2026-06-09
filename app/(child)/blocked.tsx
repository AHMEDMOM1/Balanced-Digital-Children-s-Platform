import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { getBiDiStyle, isArabic } from '../../services/utils/bidi';

export default function BlockedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🌳</Text>
        <Text style={[styles.title, getBiDiStyle("اذهب العب في الخارج!"), !isArabic("اذهب العب في الخارج!") && { textAlign: 'center' }]}>اذهب العب في الخارج!</Text>
        <Text style={[styles.subtitle, getBiDiStyle("تم إيقاف هذا القسم من قِبَل أحد الوالدين"), !isArabic("تم إيقاف هذا القسم من قِبَل أحد الوالدين") && { textAlign: 'center' }]}>تم إيقاف هذا القسم من قِبَل أحد الوالدين</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.replace('/(child)/')}
        >
          <Text style={[styles.buttonText, getBiDiStyle("العودة للرئيسية")]}>العودة للرئيسية</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF8E1', // warm light yellow
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5D4037',
  },
  subtitle: {
    fontSize: 16,
    color: '#8D6E63',
    marginTop: 12,
  },
  button: {
    marginTop: 40,
    backgroundColor: '#FFC107',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4037',
  },
});
