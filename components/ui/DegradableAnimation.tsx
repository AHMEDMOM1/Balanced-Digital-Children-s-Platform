import React, { isValidElement, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { fpsMonitor } from '../../services/resilience/fpsMonitor';

type ImageSource = { uri: string } | number;

interface DegradableAnimationProps {
  children: React.ReactNode;
  staticFallback?: React.ReactNode | ImageSource;
  style?: object;
}

function isImageSource(val: unknown): val is ImageSource {
  return typeof val === 'number' || (
    typeof val === 'object' && val !== null && !isValidElement(val) && 'uri' in (val as object)
  );
}

export default function DegradableAnimation({
  children,
  staticFallback,
  style,
}: DegradableAnimationProps) {
  const [degraded, setDegraded] = useState(false);
  const monitorStarted = useRef(false);

  useEffect(() => {
    if (monitorStarted.current) return;
    monitorStarted.current = true;

    if (fpsMonitor.isDegraded()) {
      setDegraded(true);
    }

    const unsubDegrade = fpsMonitor.onDegrade(() => setDegraded(true));
    const unsubRestore = fpsMonitor.onRestore(() => setDegraded(false));

    fpsMonitor.start();

    return () => {
      unsubDegrade();
      unsubRestore();
    };
  }, []);

  if (degraded && staticFallback !== undefined) {
    if (isImageSource(staticFallback)) {
      return (
        <View style={[styles.container, style]}>
          <Image source={staticFallback} style={styles.image} />
        </View>
      );
    }
    return <>{staticFallback}</>;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});
