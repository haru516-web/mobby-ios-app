import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

type Props = {
  children: ReactNode;
  screenKey: string;
  reduceMotion: boolean;
};

export function ScreenTransition({ children, screenKey, reduceMotion }: Props) {
  const [shown, setShown] = useState({ key: screenKey, node: children });
  const [incoming, setIncoming] = useState<{ key: string; node: ReactNode } | null>(null);
  const progress = useRef(new Animated.Value(1)).current;
  const pending = useRef({ key: screenKey, node: children });
  const transitionId = useRef(0);

  pending.current = { key: screenKey, node: children };

  useLayoutEffect(() => {
    if (screenKey === shown.key) return;
    const id = ++transitionId.current;
    progress.setValue(0);
    const next = pending.current;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 180 : 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: typeof document === 'undefined',
    });
    setIncoming(next);
    animation.start(({ finished }) => {
      if (!finished || transitionId.current !== id) return;
      setShown(pending.current);
      setIncoming(null);
    });
    return () => animation.stop();
  }, [progress, reduceMotion, screenKey, shown.key]);

  useEffect(() => () => {
    transitionId.current += 1;
    progress.stopAnimation();
  }, [progress]);

  const outgoingOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const outgoingX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, reduceMotion ? -12 : -30] });
  const outgoingScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, reduceMotion ? 0.99 : 0.97] });
  const incomingOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const incomingX = progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 12 : 36, 0] });
  const incomingScale = progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0.99 : 0.96, 1] });

  if (!incoming) return <View style={styles.fill}>{shown.node}</View>;
  return (
    <View style={styles.fill} pointerEvents="none">
      <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.layer, { opacity: outgoingOpacity, transform: [{ translateX: outgoingX }, { scale: outgoingScale }] }]}>{shown.node}</Animated.View>
      <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.layer, { opacity: incomingOpacity, transform: [{ translateX: incomingX }, { scale: incomingScale }] }]}>{incoming.node}</Animated.View>
    </View>
  );
}

/** A small focus transition for tab routes that render outside the shell scene. */
export function TabFocusTransition({ children, reduceMotion }: { children: ReactNode; reduceMotion: boolean }) {
  const focused = useIsFocused();
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!focused) return undefined;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 380 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: typeof document === 'undefined',
    });
    animation.start();
    return () => animation.stop();
  }, [focused, progress, reduceMotion]);

  const opacity = progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: reduceMotion ? [0.58, 0.9, 1] : [0, 0.82, 1] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: reduceMotion ? [12, 0] : [8, 0], extrapolate: 'clamp' });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: reduceMotion ? [0.96, 1] : [0.97, 1], extrapolate: 'clamp' });
  return <Animated.View style={[styles.focusFill, { opacity, transform: [{ translateY }, { scale }] }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, position: 'relative' },
  layer: { ...StyleSheet.absoluteFillObject },
  focusFill: { flex: 1 },
});
