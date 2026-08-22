import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { Animated, Easing, Image, PanResponder, Platform, StyleSheet, View } from 'react-native';

import { MobbyPullMesh, type MobbyPullMeshHandle } from '@/components/MobbyPullMesh';
import { ParticleBurst } from '@/components/effects';
import { MobbyAssetButton } from '@/components/mobby-ui';
import { type Item } from '@/data/collectibles';
import { type MobbyId } from '@/data/mobies';
import { PULL_ASSETS, type MobbyPullAsset, type PullFrame } from '@/data/mobbyPullAssets';
import { useMobbyHaptics } from '@/hooks/useMobbyHaptics';
import { styles } from '@/ui/layout/appStyles';
import { Text, useAppLayout } from '@/ui/layout/visualPrimitives';
import { PULL_REACTION_FRAMES } from './pullReactionFrames';

export function PullableMobby({ selected, onPull, size = 320, onCharacterPickerPress, selectedMobbyName, specialCentering = false, onInteractionStateChange, enabled = true, onValidRelease, onReaction }: { selected: Item; onPull: () => number; size?: number; onCharacterPickerPress?: () => void; selectedMobbyName?: string; specialCentering?: boolean; onInteractionStateChange?: (busy: boolean) => void; enabled?: boolean; onValidRelease?: () => Promise<void>; onReaction?: (reactionId: string) => void }) {
  const { scale: appScale } = useAppLayout();
  const mobbyId = itemMobbyId(selected.id);
  const pullAsset = PULL_ASSETS[mobbyId];
  const reactionFrames = PULL_REACTION_FRAMES[mobbyId];
  const [status, setStatus] = useState<'idle' | 'pulling' | 'released' | 'reacting'>('idle');
  const [reactionFrame, setReactionFrame] = useState<number | null>(null);
  const [isSpecialReaction, setIsSpecialReaction] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [largeBurst, setLargeBurst] = useState(false);
  const [eyeIndex, setEyeIndex] = useState(-1);
  const [mouthIndex, setMouthIndex] = useState(-1);
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const pullTranslateX = useRef(new Animated.Value(0)).current;
  const pullTranslateY = useRef(new Animated.Value(0)).current;
  const pullRotation = useRef(new Animated.Value(0)).current;
  const reactionMotion = useRef(new Animated.Value(0)).current;
  const specialMotion = useRef(new Animated.Value(0)).current;
  const reactionAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastSingleReactionRef = useRef(-1);
  const meshRef = useRef<MobbyPullMeshHandle>(null);
  const sectorRef = useRef(0);
  const strongRef = useRef(false);
  const mediumThresholdRef = useRef(false);
  const strongHapticRef = useRef(false);
  const haptics = useMobbyHaptics();
  const reactionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const smoothedPullRef = useRef({ dx: 0, dy: 0 });
  const lastMoveAtRef = useRef(0);
  const pullVelocityRef = useRef({ x: 0, y: 0 });

  const clearReactionTimers = useCallback(() => {
    reactionTimersRef.current.forEach(clearTimeout);
    reactionTimersRef.current = [];
    reactionAnimationRef.current?.stop();
    reactionAnimationRef.current = null;
  }, []);

  const resetExpression = useCallback(() => {
    setEyeIndex(-1);
    setMouthIndex(-1);
    sectorRef.current = 0;
    strongRef.current = false;
  }, []);

  useEffect(() => () => clearReactionTimers(), [clearReactionTimers]);
  useEffect(() => {
    if (reactionFrames) void Asset.loadAsync([...reactionFrames]);
  }, [reactionFrames]);
  useEffect(() => {
    clearReactionTimers();
    setReactionFrame(null);
    setIsSpecialReaction(false);
    setStatus('idle');
    specialMotion.setValue(0);
    resetExpression();
  }, [clearReactionTimers, mobbyId, resetExpression, specialMotion]);

  const release = useCallback((dx: number, dy: number) => {
    if (!enabled) return;
    if (Math.hypot(dx, dy) < 4) {
      Animated.parallel([
        Animated.spring(scaleX, { toValue: 1, useNativeDriver: typeof document === 'undefined', speed: 20, bounciness: 8 }),
        Animated.spring(scaleY, { toValue: 1, useNativeDriver: typeof document === 'undefined', speed: 20, bounciness: 8 }),
        Animated.spring(pullTranslateX, { toValue: 0, useNativeDriver: typeof document === 'undefined', speed: 20, bounciness: 8 }),
        Animated.spring(pullTranslateY, { toValue: 0, useNativeDriver: typeof document === 'undefined', speed: 20, bounciness: 8 }),
        Animated.spring(pullRotation, { toValue: 0, useNativeDriver: typeof document === 'undefined', speed: 20, bounciness: 8 }),
      ]).start();
      setStatus('idle');
      onInteractionStateChange?.(false);
      return;
    }
    meshRef.current?.release();
    const pullCount = onPull();
    void onValidRelease?.();
    const special = pullCount > 0 && pullCount % 10 === 0;
    setLargeBurst(special);
    setBurstKey((value) => value + 1);
    if (special) haptics.success();
    else haptics.medium();
    Animated.parallel([
      Animated.spring(scaleX, { toValue: 1, useNativeDriver: typeof document === 'undefined', speed: 18, bounciness: 13 }),
      Animated.spring(scaleY, { toValue: 1, useNativeDriver: typeof document === 'undefined', speed: 18, bounciness: 13 }),
      Animated.spring(pullTranslateX, { toValue: 0, velocity: pullVelocityRef.current.x, useNativeDriver: typeof document === 'undefined', speed: 16, bounciness: 15 }),
      Animated.spring(pullTranslateY, { toValue: 0, velocity: pullVelocityRef.current.y, useNativeDriver: typeof document === 'undefined', speed: 16, bounciness: 15 }),
      Animated.spring(pullRotation, { toValue: 0, velocity: pullVelocityRef.current.x / Math.max(1, size), useNativeDriver: typeof document === 'undefined', speed: 16, bounciness: 15 }),
    ]).start();

    if (reactionFrames) {
      clearReactionTimers();
      resetExpression();
      setStatus('reacting');
      reactionMotion.setValue(0);
      specialMotion.setValue(0);

      if (special) {
        const specialFrame = reactionFrames.length >= 20 ? 19 : reactionFrames.length - 1;
        onReaction?.(`${mobbyId}:pull:${specialFrame + 1}`);
        setIsSpecialReaction(true);
        setReactionFrame(null);
        reactionTimersRef.current.push(setTimeout(() => setReactionFrame(specialFrame), 300));
        reactionAnimationRef.current = Animated.parallel([
          Animated.sequence([
            Animated.timing(specialMotion, { toValue: 0.16, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: typeof document === 'undefined' }),
            Animated.timing(specialMotion, { toValue: 0.48, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: typeof document === 'undefined' }),
            Animated.timing(specialMotion, { toValue: 0.62, duration: 170, easing: Easing.out(Easing.back(1.8)), useNativeDriver: typeof document === 'undefined' }),
            Animated.timing(specialMotion, { toValue: 0.82, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: typeof document === 'undefined' }),
            Animated.delay(650),
            Animated.timing(specialMotion, { toValue: 1, duration: 460, easing: Easing.inOut(Easing.cubic), useNativeDriver: typeof document === 'undefined' }),
          ]),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(reactionMotion, { toValue: 1, duration: 2550, easing: Easing.linear, useNativeDriver: typeof document === 'undefined' }),
          ]),
        ]);
        reactionAnimationRef.current.start(({ finished }) => {
          if (!finished) return;
          setReactionFrame(null);
          setIsSpecialReaction(false);
          setStatus('idle');
          onInteractionStateChange?.(false);
          reactionMotion.setValue(0);
          specialMotion.setValue(0);
          reactionTimersRef.current = [];
          reactionAnimationRef.current = null;
        });
        return;
      }

      setIsSpecialReaction(false);

      const previous = lastSingleReactionRef.current;
      const nextFrame = previous < 0
        ? Math.floor(Math.random() * reactionFrames.length)
        : (previous + 1 + Math.floor(Math.random() * (reactionFrames.length - 1))) % reactionFrames.length;
      lastSingleReactionRef.current = nextFrame;
      onReaction?.(`${mobbyId}:pull:${nextFrame + 1}`);
      setReactionFrame(nextFrame);
      reactionAnimationRef.current = Animated.timing(reactionMotion, {
        toValue: 1,
        duration: [760, 900, 920, 1500][nextFrame] ?? 1100,
        easing: Easing.linear,
        useNativeDriver: typeof document === 'undefined',
      });
      reactionAnimationRef.current.start(({ finished }) => {
        if (!finished) return;
        setReactionFrame(null);
        setIsSpecialReaction(false);
        setStatus('idle');
        onInteractionStateChange?.(false);
        reactionMotion.setValue(0);
        reactionTimersRef.current = [];
        reactionAnimationRef.current = null;
      });
      return;
    }

    setStatus('released');
    reactionTimersRef.current.push(setTimeout(() => {
      setStatus('idle');
      onInteractionStateChange?.(false);
      resetExpression();
      reactionTimersRef.current = [];
    }, 550));
  }, [clearReactionTimers, enabled, haptics, mobbyId, onInteractionStateChange, onPull, onReaction, onValidRelease, pullRotation, pullTranslateX, pullTranslateY, reactionFrames, reactionMotion, resetExpression, scaleX, scaleY, size, specialMotion]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => enabled,
    onMoveShouldSetPanResponder: () => enabled,
    onPanResponderGrant: (event) => {
      clearReactionTimers();
      setReactionFrame(null);
      setIsSpecialReaction(false);
      specialMotion.setValue(0);
      scaleX.stopAnimation();
      scaleY.stopAnimation();
      setStatus('pulling');
      onInteractionStateChange?.(true);
      mediumThresholdRef.current = false;
      strongHapticRef.current = false;
      smoothedPullRef.current = { dx: 0, dy: 0 };
      pullVelocityRef.current = { x: 0, y: 0 };
      lastMoveAtRef.current = Date.now();
      meshRef.current?.begin(event.nativeEvent.locationX / appScale, event.nativeEvent.locationY / appScale);
    },
    onPanResponderMove: (_event, gesture) => {
      const rawDx = gesture.dx / appScale;
      const rawDy = gesture.dy / appScale;
      const resistance = (value: number, limit: number) => Math.sign(value) * limit * (1 - Math.exp(-Math.abs(value) / limit));
      const resistedDx = resistance(rawDx, Math.max(24, size * 0.24));
      const resistedDy = resistance(rawDy, Math.max(22, size * 0.2));
      const previous = smoothedPullRef.current;
      const now = Date.now();
      const alpha = Math.min(0.58, Math.max(0.24, (now - lastMoveAtRef.current) / 32));
      const dx = previous.dx + (resistedDx - previous.dx) * alpha;
      const dy = previous.dy + (resistedDy - previous.dy) * alpha;
      const deltaMs = Math.max(8, now - lastMoveAtRef.current);
      pullVelocityRef.current = { x: (dx - previous.dx) * 1000 / deltaMs, y: (dy - previous.dy) * 1000 / deltaMs };
      smoothedPullRef.current = { dx, dy };
      lastMoveAtRef.current = now;
      const directionTilt = Math.max(-0.12, Math.min(0.12, dx / Math.max(1, size) * 0.42));
      scaleX.setValue(1 + Math.min(0.2, Math.abs(dx) / Math.max(1, size) * 0.28));
      scaleY.setValue(1 - Math.min(0.08, Math.abs(dx) / Math.max(1, size) * 0.1));
      pullTranslateX.setValue(dx * 0.16);
      pullTranslateY.setValue(dy * 0.08);
      pullRotation.setValue(directionTilt);
      meshRef.current?.update(dx, dy);
      const magnitude = Math.hypot(dx, dy);
      if (magnitude >= 4) {
        haptics.threshold();
        if (!mediumThresholdRef.current) { mediumThresholdRef.current = true; haptics.medium(); }
      }
      if (magnitude >= Math.max(70, size * 0.16) && !strongHapticRef.current) { strongHapticRef.current = true; haptics.heavy(); }
      if (Math.hypot(dx, dy) >= 4) {
        const expression = selectPullExpression(pullAsset, dx, dy, size, sectorRef, strongRef);
        setEyeIndex(expression.eyeIndex);
        setMouthIndex(expression.mouthIndex);
      }
    },
    onPanResponderRelease: (_event, gesture) => release(gesture.dx / appScale, gesture.dy / appScale),
    onPanResponderTerminate: () => {
      meshRef.current?.release();
      smoothedPullRef.current = { dx: 0, dy: 0 };
      pullVelocityRef.current = { x: 0, y: 0 };
      Animated.parallel([
        Animated.spring(scaleX, { toValue: 1, useNativeDriver: typeof document === 'undefined' }),
        Animated.spring(scaleY, { toValue: 1, useNativeDriver: typeof document === 'undefined' }),
        Animated.spring(pullTranslateX, { toValue: 0, useNativeDriver: typeof document === 'undefined' }),
        Animated.spring(pullTranslateY, { toValue: 0, useNativeDriver: typeof document === 'undefined' }),
        Animated.spring(pullRotation, { toValue: 0, useNativeDriver: typeof document === 'undefined' }),
      ]).start();
      setStatus('idle');
      onInteractionStateChange?.(false);
      resetExpression();
    },
  }), [appScale, clearReactionTimers, enabled, haptics, onInteractionStateChange, pullAsset, pullRotation, pullTranslateX, pullTranslateY, release, resetExpression, scaleX, scaleY, size, specialMotion]);

  const triggerAccessibleReaction = useCallback(() => {
    const distance = Math.max(12, size * 0.08);
    release(distance, 0);
  }, [release, size]);

  const meshVisible = Platform.OS === 'web' && (status === 'pulling' || status === 'released');
  const isPullReaction = Boolean(reactionFrames && reactionFrame !== null);
  const defaultEye = pullAsset.defaultEye ?? pullAsset.eyes[0];
  const activeEye = eyeIndex >= 0 ? pullAsset.eyes[eyeIndex] ?? defaultEye : defaultEye;
  const activeMouth = mouthIndex >= 0 ? pullAsset.mouths[mouthIndex] : null;
  const eyeFrame = eyeIndex >= 0 ? pullAsset.eyeFrame : pullAsset.defaultEyeFrame ?? pullAsset.eyeFrame;
  const burstOpacity = reactionMotion.interpolate({ inputRange: [0, 0.03, 0.2, 0.21], outputRange: [0, 0.9, 0, 0] });
  const burstScale = reactionMotion.interpolate({ inputRange: [0, 0.2], outputRange: [0.45, 1.45], extrapolate: 'clamp' });
  const cheekEffectShift = reactionMotion.interpolate({ inputRange: [0.1, 0.17, 0.24, 0.3], outputRange: [0, -4, 3, 0], extrapolate: 'clamp' });
  const protestEffectShift = reactionMotion.interpolate({ inputRange: [0.29, 0.37, 0.45, 0.53], outputRange: [0, 8, -6, 0], extrapolate: 'clamp' });
  const sulkEffectDrop = reactionMotion.interpolate({ inputRange: [0.52, 0.68, 1], outputRange: [-5, 2, 5], extrapolate: 'clamp' });
  const singleEffectOpacity = reactionMotion.interpolate({ inputRange: [0, 0.08, 0.72, 1], outputRange: [0, 0.78, 0.62, 0], extrapolate: 'clamp' });
  const singleTranslateX = reactionMotion.interpolate({ inputRange: [0, 0.16, 0.32, 0.48, 0.68, 1], outputRange: [0, -4, 4, -3, 1, 0] });
  const singleTranslateY = reactionMotion.interpolate({ inputRange: [0, 0.14, 0.32, 0.72, 1], outputRange: [4, -4, 0, 2, 0] });
  const singleScaleX = reactionMotion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.95, 1.035, 1, 1] });
  const singleScaleY = reactionMotion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.91, 1.045, 1, 1] });
  const singleRotate = reactionMotion.interpolate({ inputRange: [0, 0.18, 0.36, 0.58, 1], outputRange: ['0deg', '-1.5deg', '1.5deg', '-0.7deg', '0deg'] });
  const activeReactionTranslateX = singleTranslateX;
  const activeReactionTranslateY = singleTranslateY;
  const activeReactionScaleX = singleScaleX;
  const activeReactionScaleY = singleScaleY;
  const activeReactionRotate = singleRotate;
  const pullableExtraHeight = size >= 300 ? 45 : 12;
  const specialPeakScale = size >= 300 ? 1.72 : 1.9;
  const specialHoldScale = size >= 300 ? 1.58 : 1.72;
  // The home character starts low in the room. During the large special
  // reaction, carry it toward the visual center instead of scaling in place.
  const specialLift = specialCentering ? -150 : (size >= 300 ? -38 : -30);
  const specialScale = specialMotion.interpolate({
    inputRange: [0, 0.16, 0.48, 0.62, 0.82, 0.9, 1],
    outputRange: [1, 0.9, specialPeakScale, specialPeakScale * 0.96, specialHoldScale, specialHoldScale, 1],
  });
  const specialTranslateX = specialMotion.interpolate({
    inputRange: [0, 0.42, 0.48, 0.54, 0.62, 0.7, 0.82, 1],
    outputRange: [0, 0, -10, 10, -7, 5, 0, 0],
  });
  const specialTranslateY = specialMotion.interpolate({
    inputRange: [0, 0.16, 0.48, 0.62, 0.82, 0.9, 1],
    outputRange: [0, 6, specialLift - 8, specialLift, specialLift, specialLift, 0],
  });
  const reactionEffectKind = !isSpecialReaction && reactionFrame !== null && reactionFrame < 4 ? reactionFrame : -1;
  const pullRotationDeg = pullRotation.interpolate({ inputRange: [-0.12, 0, 0.12], outputRange: ['-7deg', '0deg', '7deg'] });
  return (
    <View style={[styles.pullableWrap, { width: size, height: size + pullableExtraHeight }]}> 
      <View pointerEvents="box-none" style={[styles.pullableStage, { width: size, height: size }]}> 
        {onCharacterPickerPress ? <MobbyAssetButton accessibilityLabel={`メインモビーを選ぶ（現在：${selectedMobbyName ?? selected.name}）`} tone="cream" onPress={onCharacterPickerPress} style={[styles.characterPickerButton, size >= 300 ? styles.characterPickerButtonLarge : styles.characterPickerButtonCompact]} contentStyle={styles.characterPickerButtonAsset}><Text style={styles.characterPickerCaption}>キャラ</Text><Text style={styles.characterPickerValue}>選択</Text></MobbyAssetButton> : null}
        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { width: size, height: size, transform: [{ translateX: specialTranslateX }, { translateY: specialTranslateY }, { scale: specialScale }] }]}> 
          <Animated.View {...panResponder.panHandlers} accessibilityRole="button" accessibilityLabel="モビーのほっぺを引っ張る" accessibilityHint="タップすると引っ張った時のリアクションをします" onAccessibilityTap={triggerAccessibleReaction} style={[styles.pullableSlot, { width: size, height: size, opacity: meshVisible || isPullReaction ? 0 : 1, transform: [{ translateX: pullTranslateX }, { translateY: pullTranslateY }, { rotate: pullRotationDeg }, { scaleX }, { scaleY }] }]}> 
          <Image source={pullAsset.body} resizeMode="contain" style={[styles.pullableBody, { width: size, height: size }]} />
          </Animated.View>
          <MobbyPullMesh ref={meshRef} source={pullAsset.body} size={size} visible={meshVisible} />
          {!isPullReaction ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pullableFaceLayer]}> 
            <Image source={activeEye} resizeMode={eyeIndex >= 0 ? pullAsset.eyeResizeMode ?? 'contain' : 'contain'} style={pullFaceFrameStyle(eyeFrame, pullAsset, size)} />
            {activeMouth ? <Image source={activeMouth} resizeMode="contain" style={pullFaceFrameStyle(pullAsset.mouthFrame, pullAsset, size)} /> : null}
          </Animated.View> : null}
          {reactionFrames ? <Animated.View pointerEvents="none" style={[styles.pullableReactionLayer, {
          opacity: isPullReaction ? 1 : 0,
          transform: [{ translateX: activeReactionTranslateX }, { translateY: activeReactionTranslateY }, { rotate: activeReactionRotate }, { scaleX: activeReactionScaleX }, { scaleY: activeReactionScaleY }],
          }]}>{reactionFrames.map((frame, index) => <Image key={index} source={frame} resizeMode="contain" fadeDuration={0} style={[styles.pullableReactionFrame, { width: size, height: size, opacity: reactionFrame === index ? 1 : 0 }]} />)}</Animated.View> : null}
          {reactionEffectKind === 0 ? <Animated.View pointerEvents="none" style={[styles.pullableReactionBurst, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]} /> : null}
          {reactionEffectKind === 0 ? <View pointerEvents="none" style={styles.animeEffectLayer}>{Array.from({ length: 8 }, (_, index) => <Animated.View key={index} style={[styles.animeBurstRayWrap, { opacity: burstOpacity, transform: [{ rotate: `${index * 45}deg` }, { scale: burstScale }] }]}><View style={[styles.animeBurstRay, { height: size * 0.11, left: size / 2 - 1.5, top: size * 0.025 }]} /></Animated.View>)}</View> : null}
          {reactionEffectKind === 1 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: singleEffectOpacity, transform: [{ translateX: cheekEffectShift }] }]}><View style={[styles.animeCheekTrail, styles.animeCheekTrailLeft]}><View style={[styles.animeCheekStroke, { width: size * 0.13 }]} /><View style={[styles.animeCheekStroke, { width: size * 0.09 }]} /><View style={[styles.animeCheekStroke, { width: size * 0.055 }]} /></View><View style={[styles.animeCheekTrail, styles.animeCheekTrailRight]}><View style={[styles.animeCheekStroke, { width: size * 0.13 }]} /><View style={[styles.animeCheekStroke, { width: size * 0.09 }]} /><View style={[styles.animeCheekStroke, { width: size * 0.055 }]} /></View></Animated.View> : null}
          {reactionEffectKind === 2 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: singleEffectOpacity, transform: [{ translateX: protestEffectShift }] }]}><View style={[styles.animeSpeedGroup, styles.animeSpeedGroupLeft]}><View style={[styles.animeSpeedLine, { width: size * 0.16 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.11 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.07 }]} /></View><View style={[styles.animeSpeedGroup, styles.animeSpeedGroupRight]}><View style={[styles.animeSpeedLine, { width: size * 0.16 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.11 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.07 }]} /></View></Animated.View> : null}
          {reactionEffectKind === 3 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: singleEffectOpacity, transform: [{ translateY: sulkEffectDrop }] }]}><View style={styles.animeGloomLines}><View style={styles.animeGloomLine} /><View style={[styles.animeGloomLine, styles.animeGloomLineShort]} /><View style={styles.animeGloomLine} /></View></Animated.View> : null}
          <ParticleBurst type={largeBurst ? 'star' : 'heart'} count={largeBurst ? 12 : 8} large={largeBurst} active={burstKey > 0} burstKey={burstKey} seed={`${selected.id}-${burstKey}`} style={styles.pullParticleBurst} />
        </Animated.View>
      </View>
      {status !== 'idle' ? <View pointerEvents="none" style={styles.pullStatus}><Text style={styles.pullStatusText}>{status === 'pulling' ? 'のびてる……' : isSpecialReaction ? '10回目のスペシャル反応！' : 'びよーん！'}</Text></View> : null}
    </View>
  );
}

function itemMobbyId(itemId: string): MobbyId {
  if (itemId.startsWith('reo-')) return 'reomoby';
  if (itemId.startsWith('pote-')) return 'potemoby';
  if (itemId.startsWith('babu-')) return 'babumoby';
  return itemId.split('-')[0] as MobbyId;
}

function pullFaceFrameStyle(frame: PullFrame, asset: MobbyPullAsset, size: number) {
  const scale = size / asset.sourceSize;
  return {
    position: 'absolute' as const,
    left: frame.x * scale,
    top: frame.y * scale,
    width: frame.width * scale,
    height: frame.height * scale,
  };
}

function selectPullExpression(
  asset: MobbyPullAsset,
  dx: number,
  dy: number,
  width: number,
  sectorRef: { current: number },
  strongRef: { current: boolean },
) {
  const magnitude = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const fullTurn = Math.PI * 2;
  const sectorSize = fullTurn / asset.eyePairs.length;
  const normalized = (angle + fullTurn + sectorSize / 2) % fullTurn;
  const candidateSector = Math.floor(normalized / sectorSize) % asset.eyePairs.length;
  const currentCenter = sectorRef.current * sectorSize;
  const distanceFromCurrent = Math.abs(Math.atan2(Math.sin(angle - currentCenter), Math.cos(angle - currentCenter)));
  if (magnitude >= 12 && distanceFromCurrent > sectorSize / 2 + Math.PI / 18) sectorRef.current = candidateSector;

  const strongOn = Math.max(70, width * 0.16);
  const strongOff = Math.max(52, width * 0.12);
  if (!strongRef.current && magnitude >= strongOn) strongRef.current = true;
  if (strongRef.current && magnitude <= strongOff) strongRef.current = false;

  const eyePair = asset.eyePairs[sectorRef.current] ?? asset.eyePairs[0];
  const mouthPair = asset.mouthPairs[sectorRef.current] ?? asset.mouthPairs[0];
  return {
    eyeIndex: eyePair[strongRef.current ? 1 : 0],
    mouthIndex: mouthPair[strongRef.current ? 1 : 0],
  };
}
