import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, type ImageProps } from 'expo-image';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type MobbyIdleGesture = 'tilt' | 'wave' | 'jump';

export type MobbyIdleMotionProps = {
  children?: ReactNode;
  image?: ImageSourcePropType;
  imageProps?: Omit<ImageProps, 'source'>;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  blinkCue?: ReactNode;
  renderBlinkOverlay?: (opacity: Animated.Value) => ReactNode;
  onGesture?: (gesture: MobbyIdleGesture) => void;
};

export function MobbyIdleMotion({
  children, image, imageProps, enabled = true, style, blinkCue, renderBlinkOverlay, onGesture,
}: MobbyIdleMotionProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const breathe = useRef(new Animated.Value(1)).current;
  const gesture = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduceMotion(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    breathe.stopAnimation();
    breathe.setValue(1);
    if (!enabled || reduceMotion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.015, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: typeof document === 'undefined' }),
      Animated.timing(breathe, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: typeof document === 'undefined' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe, enabled, reduceMotion]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        const kind: MobbyIdleGesture = (['tilt', 'wave', 'jump'] as const)[Math.floor(Math.random() * 3)];
        onGesture?.(kind);
        gesture.setValue(0);
        animation = Animated.sequence([
          Animated.timing(gesture, { toValue: kind === 'tilt' ? 1 : kind === 'wave' ? 2 : 3, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(gesture, { toValue: 0, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: typeof document === 'undefined' }),
        ]);
        animation.start(({ finished }) => finished && schedule());
      }, 5000 + Math.random() * 10000);
    };
    if (enabled && !reduceMotion) schedule();
    return () => { cancelled = true; if (timer) clearTimeout(timer); animation?.stop(); gesture.stopAnimation(); gesture.setValue(0); };
  }, [enabled, gesture, onGesture, reduceMotion]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    const schedule = () => {
      timer = setTimeout(() => {
        blink.setValue(0);
        animation = Animated.sequence([
          Animated.timing(blink, { toValue: 1, duration: 70, useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(blink, { toValue: 0, duration: 90, useNativeDriver: typeof document === 'undefined' }),
        ]);
        animation.start(({ finished }) => finished && !cancelled && schedule());
      }, 2400 + Math.random() * 2800);
    };
    if (enabled && !reduceMotion && (blinkCue || renderBlinkOverlay)) schedule();
    return () => { cancelled = true; if (timer) clearTimeout(timer); animation?.stop(); blink.stopAnimation(); blink.setValue(0); };
  }, [blink, blinkCue, enabled, reduceMotion, renderBlinkOverlay]);

  const motionStyle = {
    transform: [
      { translateY: gesture.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [0, 0, 0, -8] }) },
      { rotate: gesture.interpolate({ inputRange: [0, 1, 2, 3], outputRange: ['0deg', '-4deg', '4deg', '0deg'] }) },
      { scaleX: gesture.interpolate({ inputRange: [0, 1, 2, 3], outputRange: [1, 1, 1.018, 1] }) },
      { scaleY: breathe },
    ],
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={motionStyle}>
        {children ?? (image ? <Image {...imageProps} contentFit="contain" source={image} /> : null)}
      </Animated.View>
      {(blinkCue || renderBlinkOverlay) ? (
        <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.overlay}>
          {renderBlinkOverlay?.(blink) ?? <Animated.View style={{ opacity: blink }}>{blinkCue}</Animated.View>}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
