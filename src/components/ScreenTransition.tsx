import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

type Props = {
  children: ReactNode;
  screenKey: string;
  loadingImage: ImageSourcePropType;
  reduceMotion: boolean;
  onTransitioningChange?: (transitioning: boolean) => void;
};

export function ScreenTransition({ children, screenKey, loadingImage, reduceMotion, onTransitioningChange }: Props) {
  const [shown, setShown] = useState({ key: screenKey, node: children });
  const [incoming, setIncoming] = useState<{ key: string; node: ReactNode } | null>(null);
  const progress = useRef(new Animated.Value(1)).current;
  const pending = useRef({ key: screenKey, node: children });
  const transitionId = useRef(0);

  pending.current = { key: screenKey, node: children };

  useLayoutEffect(() => {
    if (screenKey === shown.key) return;
    const id = ++transitionId.current;
    if (reduceMotion) {
      setIncoming(null);
      setShown(pending.current);
      onTransitioningChange?.(false);
      return;
    }

    onTransitioningChange?.(true);
    progress.setValue(0);
    const next = pending.current;
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 0.42, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0.58, duration: 90, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    setIncoming(next);
    animation.start(({ finished }) => {
      if (!finished || transitionId.current !== id) return;
      setShown(pending.current);
      setIncoming(null);
      onTransitioningChange?.(false);
    });
    return () => animation.stop();
  }, [onTransitioningChange, progress, reduceMotion, screenKey, shown.key]);

  useEffect(() => () => {
    transitionId.current += 1;
    progress.stopAnimation();
    onTransitioningChange?.(false);
  }, [onTransitioningChange, progress]);

  const outgoingOpacity = progress.interpolate({ inputRange: [0, 0.42, 0.58, 1], outputRange: [1, 0, 0, 0] });
  const outgoingX = progress.interpolate({ inputRange: [0, 0.42], outputRange: [0, -22], extrapolate: 'clamp' });
  const incomingOpacity = progress.interpolate({ inputRange: [0, 0.58, 1], outputRange: [0, 0, 1] });
  const incomingX = progress.interpolate({ inputRange: [0, 0.58, 1], outputRange: [22, 22, 0] });
  const loaderOpacity = progress.interpolate({ inputRange: [0, 0.36, 0.5, 0.64, 1], outputRange: [0, 0, 1, 0, 0] });

  if (!incoming) return <View style={styles.fill}>{shown.node}</View>;
  return (
    <View style={styles.fill} pointerEvents="none">
      <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.layer, { opacity: outgoingOpacity, transform: [{ translateX: outgoingX }] }]}>{shown.node}</Animated.View>
      <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.layer, { opacity: incomingOpacity, transform: [{ translateX: incomingX }] }]}>{incoming.node}</Animated.View>
      <Animated.View style={[styles.loader, { opacity: loaderOpacity }]}>
        <Image source={loadingImage} resizeMode="contain" style={styles.loaderImage} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, position: 'relative' },
  layer: { ...StyleSheet.absoluteFillObject },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  loaderImage: { width: 54, height: 54 },
});
