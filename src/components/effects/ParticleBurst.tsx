import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type ParticleBurstType = 'heart' | 'star' | 'sparkle' | 'confetti' | 'stamp-ink';

export type ParticleBurstProps = {
  type?: ParticleBurstType;
  seed?: number | string;
  count?: number;
  active?: boolean;
  burstKey?: string | number;
  large?: boolean;
  colors?: readonly ColorValue[];
  style?: StyleProp<ViewStyle>;
};

type Particle = { angle: number; distance: number; delay: number; size: number; color: ColorValue; rotate: number };

const DEFAULT_COLORS: Record<ParticleBurstType, readonly ColorValue[]> = {
  heart: ['#F36C88', '#FF9AAF', '#D94F70'],
  star: ['#FFD45C', '#FFB84D', '#FFF0A0'],
  sparkle: ['#FFFFFF', '#FFE89A', '#CFE9FF'],
  confetti: ['#F36C88', '#FFD45C', '#61CDBB', '#7CA7F7', '#B98BEA'],
  'stamp-ink': ['#C84E59', '#A93743', '#E06D73'],
};

const GLYPHS: Partial<Record<ParticleBurstType, string>> = { heart: '♥', star: '★', sparkle: '✦' };

function hashSeed(seed: number | string): number {
  const value = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function seededRandom(seed: number | string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function ParticleBurst({
  type = 'sparkle', seed = 1, count = 8, active = true, burstKey = 0, large = false, colors, style,
}: ParticleBurstProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const particleCount = Math.max(5, Math.min(12, Math.round(count)));
  const palette = colors?.length ? colors : DEFAULT_COLORS[type];
  const particles = useMemo(() => {
    const random = seededRandom(`${seed}:${type}:${particleCount}`);
    return Array.from({ length: particleCount }, (_, index): Particle => ({
      angle: -Math.PI * (0.12 + random() * 0.76),
      distance: (large ? 58 : 36) + random() * (large ? 58 : 34),
      delay: index / particleCount * 0.16,
      size: (large ? 12 : 8) + random() * (large ? 11 : 8),
      color: palette[index % palette.length],
      rotate: random() * 240 - 120,
    }));
  }, [large, palette, particleCount, seed, type]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduceMotion(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    if (!active) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 180 : large ? 850 : 680,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: typeof document === 'undefined',
    });
    animation.start();
    return () => animation.stop();
  }, [active, burstKey, large, progress, reduceMotion, type]);

  if (!active) return null;

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.container, style]}>
      {particles.map((particle, index) => {
        const start = reduceMotion ? 0 : particle.delay;
        const x = Math.cos(particle.angle) * particle.distance;
        const y = Math.sin(particle.angle) * particle.distance - (reduceMotion ? 0 : particle.distance * 0.2);
        const inputRange = [start, Math.min(0.86, start + 0.5), 1];
        const particleStyle = {
          opacity: progress.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
          transform: [
            { translateX: reduceMotion ? 0 : progress.interpolate({ inputRange: [start, 1], outputRange: [0, x], extrapolate: 'clamp' }) },
            { translateY: reduceMotion ? 0 : progress.interpolate({ inputRange: [start, 1], outputRange: [0, y], extrapolate: 'clamp' }) },
            { rotate: progress.interpolate({ inputRange: [start, 1], outputRange: ['0deg', `${particle.rotate}deg`], extrapolate: 'clamp' }) },
          ],
        };
        const glyph = GLYPHS[type];
        return (
          <Animated.View key={index} style={[styles.particle, particleStyle]}>
            {glyph ? (
              <Text style={{ color: particle.color, fontSize: particle.size, lineHeight: particle.size + 2 }}>{glyph}</Text>
            ) : (
              <View style={[
                styles.shape,
                { backgroundColor: particle.color, width: particle.size, height: type === 'stamp-ink' ? particle.size * 0.45 : particle.size * 0.55 },
                type === 'stamp-ink' && styles.ink,
              ]} />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  particle: { position: 'absolute' },
  shape: { borderRadius: 2 },
  ink: { borderRadius: 1, transform: [{ skewX: '-18deg' }] },
});
