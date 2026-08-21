import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';

import { ITEMS, collectibleImage, type CollectibleVariant, type Item } from '@/data/collectibles';
import { useResponsiveLayout } from '@/ui/layout/responsive';

export function WallPlacementFlight({ item, variant, onComplete }: { item: Item; variant: Exclude<CollectibleVariant, 'plush'>; onComplete: () => void }) {
  const { width, height } = useResponsiveLayout();
  const progress = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  const itemIndex = Math.max(0, ITEMS.findIndex((candidate) => candidate.id === item.id));
  const row = Math.floor(itemIndex / 5);
  const column = itemIndex % 5;
  const roomHeight = Math.max(520, height - 74);
  const targetCenterX = width * (0.07 + (column + 0.5) * 0.86 / 5);
  const targetCenterY = 74 + roomHeight * 0.07 + row * roomHeight * 0.1849 + 53;
  const startCenterX = width / 2;
  const startCenterY = height * 0.55;

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 0.18, duration: 360, useNativeDriver: typeof document === 'undefined' }),
      Animated.timing(progress, { toValue: 1, duration: 1550, useNativeDriver: typeof document === 'undefined' }),
      Animated.delay(650),
    ]);
    let completed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const completeFlight = () => {
      if (completed) return;
      completed = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      onCompleteRef.current();
    };
    fallbackTimer = setTimeout(completeFlight, 3200);
    animation.start(({ finished }) => { if (finished) completeFlight(); });
    return () => { if (fallbackTimer) clearTimeout(fallbackTimer); animation.stop(); };
  }, [progress]);

  const flightX = progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [startCenterX - 42, startCenterX - 42, targetCenterX - 42] });
  const flightY = progress.interpolate({ inputRange: [0, 0.18, 0.68, 1], outputRange: [startCenterY - 46, startCenterY - 92, targetCenterY - 92, targetCenterY - 46] });
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.status}><Text style={styles.statusText}>ぬいキーが壁へ移動中…</Text></View>
      <Animated.View style={[styles.trail, { opacity: progress.interpolate({ inputRange: [0, 0.18, 0.82, 1], outputRange: [0, 0.92, 0.72, 0] }), transform: [{ translateX: flightX }, { translateY: flightY }, { scale: progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.6, 1.25, 0.85] }) }] }]} />
      <Animated.View style={[styles.item, { transform: [{ translateX: flightX }, { translateY: flightY }, { scale: progress.interpolate({ inputRange: [0, 0.18, 0.82, 1], outputRange: [1.35, 1.55, 1.08, 1] }) }, { rotate: progress.interpolate({ inputRange: [0, 0.45, 0.75, 1], outputRange: ['-7deg', '8deg', '-4deg', '0deg'] }) }] }]}>
        <Image source={collectibleImage(item, variant)} resizeMode="contain" style={[styles.image, variant === 'key-small' && styles.smallImage]} />
      </Animated.View>
      <Animated.View style={[styles.burst, { left: targetCenterX - 38, top: targetCenterY - 38, opacity: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, 0, 1] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0.3, 0.3, 1.35] }) }] }]}><Text style={styles.burstText}>✦</Text></Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 60, overflow: 'hidden' },
  status: { position: 'absolute', top: 84, left: 72, right: 72, minHeight: 38, borderRadius: 18, backgroundColor: 'rgba(83,58,101,0.94)', alignItems: 'center', justifyContent: 'center', zIndex: 6, borderWidth: 1, borderColor: '#E9C7DA' },
  statusText: { color: '#FFF8E9', fontSize: 14, lineHeight: 20, fontWeight: '900', letterSpacing: 0.4 },
  item: { position: 'absolute', left: 0, top: 0, width: 84, height: 92, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  image: { width: 84, height: 92 }, smallImage: { width: 66, height: 73 },
  trail: { position: 'absolute', left: 0, top: 0, width: 84, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,242,166,0.5)', borderWidth: 4, borderColor: '#FFF1A8' },
  burst: { position: 'absolute', width: 76, height: 76, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,244,176,0.44)', borderWidth: 3, borderColor: '#FFF4B6', zIndex: 2 },
  burstText: { color: '#FFF8CA', fontSize: 42, fontWeight: '900', textShadowColor: '#C7748D', textShadowRadius: 8 },
});
