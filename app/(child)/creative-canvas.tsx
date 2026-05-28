/**
 * Creative Canvas Screen — Magic Canvas Drawing Activity
 * Placeholder route for the drawing canvas sub-activity.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';

const PALETTE = ['#FF6B6B', '#FF9F43', '#FFDF93', '#4ECB71', '#54A0FF', '#6750A4', '#2D3436'];

export default function CreativeCanvasScreen() {
    const router = useRouter();
    const [paths, setPaths] = useState<{ d: string; color: string; width: number }[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [selectedColor, setSelectedColor] = useState(PALETTE[5]);
    const [strokeWidth, setStrokeWidth] = useState(4);

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
            const { locationX, locationY } = e.nativeEvent;
            setCurrentPath(`M${locationX},${locationY}`);
        },
        onPanResponderMove: (e) => {
            const { locationX, locationY } = e.nativeEvent;
            setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
        },
        onPanResponderRelease: () => {
            if (currentPath) {
                setPaths(prev => [...prev, { d: currentPath, color: selectedColor, width: strokeWidth }]);
                setCurrentPath('');
            }
        },
    });

    const handleClear = () => {
        setPaths([]);
        setCurrentPath('');
    };
    const handleUndo = () => setPaths(prev => prev.slice(0, -1));

    return (
        <SafeAreaView style={styles.safe}>
            {/* ── Top Bar ── */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.child.primary} />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Magic Canvas</Text>
                <View style={styles.topActions}>
                    <TouchableOpacity style={styles.topBtn} onPress={handleUndo}>
                        <Ionicons name="arrow-undo" size={22} color={Colors.child.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topBtn} onPress={handleClear}>
                        <Ionicons name="trash-outline" size={22} color={Colors.child.error} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Canvas ── */}
            <View style={styles.canvasContainer} {...panResponder.panHandlers}>
                <Svg style={StyleSheet.absoluteFill}>
                    {paths.map((p, i) => (
                        <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                    {currentPath ? (
                        <Path d={currentPath} stroke={selectedColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ) : null}
                </Svg>
            </View>

            {/* ── Color Palette ── */}
            <View style={styles.toolbar}>
                <View style={styles.colorRow}>
                    {PALETTE.map(color => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.colorDot,
                                { backgroundColor: color },
                                selectedColor === color && styles.colorDotActive,
                            ]}
                            onPress={() => setSelectedColor(color)}
                        />
                    ))}
                </View>
                <View style={styles.sizeRow}>
                    {[2, 4, 8, 12].map(size => (
                        <TouchableOpacity
                            key={size}
                            style={[styles.sizeDot, strokeWidth === size && styles.sizeDotActive]}
                            onPress={() => setStrokeWidth(size)}
                        >
                            <View style={[styles.sizeInner, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FDF7FF' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    topBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2ECF4', alignItems: 'center', justifyContent: 'center' },
    topTitle: { ...Typography.child.title, color: Colors.child.primary },
    topActions: { flexDirection: 'row', gap: 8 },
    canvasContainer: { flex: 1, marginHorizontal: 20, marginBottom: 12, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E6E0E9', overflow: 'hidden' },
    toolbar: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
    colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
    colorDot: { width: 36, height: 36, borderRadius: 18 },
    colorDotActive: { borderWidth: 3, borderColor: '#1D1B20', transform: [{ scale: 1.2 }] },
    sizeRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    sizeDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2ECF4', alignItems: 'center', justifyContent: 'center' },
    sizeDotActive: { backgroundColor: '#E1D4FD' },
    sizeInner: { backgroundColor: '#1D1B20' },
});
