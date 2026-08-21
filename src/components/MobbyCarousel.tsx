import { Asset } from 'expo-asset';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MOBBIES, type Mobby, type MobbyId } from '@/data/mobies';
import { MobbyAssetButton, MobbyAssetSurface, MobbyColors } from './mobby-ui';

// Native port of mobby-main/docs/index.html's hero carousel. Its 74%-wide
// slides, 63% neighbor spacing, 0.76 neighbor scale and 0.34 opacity are kept
// here so the visual hierarchy matches the original carousel.
const DISPLAY_NAMES: Record<MobbyId, string> = {
  mobirin: 'もびりん',
  mobichi: 'もびち',
  yami: '病みモビー',
  mobiyan: 'もびやん',
  mobiyura: 'もびゆら',
  reomoby: 'れおモビー',
  potemoby: 'ぽてモビー',
  mobibou: 'モビ坊',
  babumoby: 'ばぶモビー',
};

const ICONS = {
  left: require('../../assets/home-ui/icons/chevron-down.png') as ImageSourcePropType,
  right: require('../../assets/home-ui/icons/chevron-up.png') as ImageSourcePropType,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function circularDelta(index: number, center: number, length: number) {
  let delta = index - center;
  if (delta > length / 2) delta -= length;
  if (delta < -length / 2) delta += length;
  return delta;
}

function CharacterArt({ mobby }: { mobby: Mobby }) {
  return (
    <Image accessible={false} source={mobby.image} resizeMode="contain" style={styles.characterArt} />
  );
}

function SelectedJoyArt({
  mobby,
  runId,
  onFinished,
}: {
  mobby: Mobby;
  runId: number;
  onFinished: (mobbyId: MobbyId, runId: number) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const joyOpacity = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || failed) return;

    scale.setValue(1);
    joyOpacity.setValue(0);
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.18,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: typeof document === 'undefined',
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 230,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: typeof document === 'undefined',
        }),
        Animated.delay(140),
      ]),
      Animated.sequence([
        Animated.timing(joyOpacity, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: typeof document === 'undefined',
        }),
        Animated.delay(310),
        Animated.timing(joyOpacity, {
          toValue: 0,
          duration: 140,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: typeof document === 'undefined',
        }),
      ]),
    ]);
    animation.start(({ finished }) => {
      if (finished) onFinished(mobby.id, runId);
    });
    return () => animation.stop();
  }, [failed, joyOpacity, mobby.id, onFinished, ready, runId, scale]);

  useEffect(() => {
    if (failed) onFinished(mobby.id, runId);
  }, [failed, mobby.id, onFinished, runId]);

  return (
    <Animated.View pointerEvents="none" style={[styles.selectionPop, { transform: [{ scale }] }]}>
      <Animated.Image
        accessible={false}
        source={mobby.image}
        resizeMode="contain"
        style={[
          styles.characterArtLayer,
          {
            opacity: failed
              ? 1
              : joyOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' }),
          },
        ]}
      />
      {!failed ? (
        <Animated.Image
          accessible={false}
          source={mobby.joyImage}
          resizeMode="contain"
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
          style={[styles.characterArtLayer, { opacity: joyOpacity }]}
        />
      ) : null}
    </Animated.View>
  );
}

type MobbyCarouselProps = {
  selectedId: MobbyId;
  onSelect: (mobby: Mobby) => void;
  onInteract?: () => void;
  interactionScale?: number;
  style?: StyleProp<ViewStyle>;
};

export function MobbyCarousel({ selectedId, onSelect, onInteract, interactionScale = 1, style }: MobbyCarouselProps) {
  const initialIndex = Math.max(0, MOBBIES.findIndex((mobby) => mobby.id === selectedId));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [joyId, setJoyId] = useState<MobbyId | null>(null);
  const [joyRevision, setJoyRevision] = useState(0);
  const [dragProgress, setDragProgress] = useState(0);
  const activeIndexRef = useRef(initialIndex);
  const joyRunRef = useRef(0);
  const gesture = useRef({ active: false, moved: false });
  const bob = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const joyAssets = MOBBIES.map((mobby) => mobby.joyImage).filter((source): source is number => typeof source === 'number');
    void Asset.loadAsync(joyAssets).catch(() => undefined);
  }, []);

  useEffect(() => {
    bob.stopAnimation();
    float.stopAnimation();
    bob.setValue(0);
    float.setValue(1);

    const bobLoop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: typeof document === 'undefined' }),
      Animated.timing(bob, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: typeof document === 'undefined' }),
    ]));
    const floatLoop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 0, duration: 1650, easing: Easing.inOut(Easing.sin), useNativeDriver: typeof document === 'undefined' }),
      Animated.timing(float, { toValue: 1, duration: 1650, easing: Easing.inOut(Easing.sin), useNativeDriver: typeof document === 'undefined' }),
    ]));
    bobLoop.start();
    floatLoop.start();
    return () => {
      bobLoop.stop();
      floatLoop.stop();
    };
  }, [bob, float]);

  const activeMobby = MOBBIES[activeIndex] ?? MOBBIES[0];
  const triggerJoy = useCallback((mobbyId: MobbyId) => {
    const nextRun = joyRunRef.current + 1;
    joyRunRef.current = nextRun;
    setJoyId(mobbyId);
    setJoyRevision(nextRun);
  }, []);

  const finishJoy = useCallback((mobbyId: MobbyId, runId: number) => {
    if (joyRunRef.current !== runId) return;
    setJoyId((current) => current === mobbyId ? null : current);
  }, []);

  useEffect(() => () => {
    joyRunRef.current += 1;
  }, []);

  const setActive = useCallback((nextIndex: number, notify = true) => {
    const normalized = (nextIndex + MOBBIES.length) % MOBBIES.length;
    if (normalized === activeIndexRef.current) return;
    activeIndexRef.current = normalized;
    triggerJoy(MOBBIES[normalized].id);
    setActiveIndex(normalized);
    if (notify) onSelect(MOBBIES[normalized]);
  }, [onSelect, triggerJoy]);

  const celebrateActive = useCallback((mobby: Mobby) => {
    triggerJoy(mobby.id);
    onInteract?.();
    onSelect(mobby);
  }, [onInteract, onSelect, triggerJoy]);

  useEffect(() => {
    const nextIndex = MOBBIES.findIndex((mobby) => mobby.id === selectedId);
    if (nextIndex >= 0 && nextIndex !== activeIndexRef.current) setActive(nextIndex, false);
  }, [selectedId, setActive]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, state) => {
      const designDx = state.dx / Math.max(0.2, interactionScale);
      return Math.abs(designDx) > 8 && Math.abs(designDx) > Math.abs(state.dy) * 1.25;
    },
    onPanResponderGrant: () => {
      gesture.current = { active: true, moved: false };
      setDragProgress(0);
    },
    onPanResponderMove: (_event, state) => {
      if (!gesture.current.active) return;
      const designDx = state.dx / Math.max(0.2, interactionScale);
      gesture.current.moved = gesture.current.moved || Math.abs(designDx) > 5;
      setDragProgress(clamp(designDx / 190, -0.92, 0.92));
    },
    onPanResponderRelease: (_event, state) => {
      const designDx = state.dx / Math.max(0.2, interactionScale);
      const moved = gesture.current.moved || Math.abs(designDx) > 42;
      gesture.current = { active: false, moved: false };
      if (moved && Math.abs(designDx) > 42) {
        setActive(activeIndexRef.current + (designDx < 0 ? 1 : -1));
      }
      setDragProgress(0);
    },
    onPanResponderTerminate: () => {
      gesture.current = { active: false, moved: false };
      setDragProgress(0);
    },
  }), [interactionScale, setActive]);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="モビーを左右にスワイプして選択" style={[styles.root, style]} {...responder.panHandlers}>
      <View style={styles.slideStage}>
        {MOBBIES.map((mobby, index) => {
          const delta = circularDelta(index, activeIndex, MOBBIES.length) + dragProgress;
          const absoluteDelta = Math.abs(delta);
          if (absoluteDelta > 2.15) return null;
          const active = index === activeIndex;
          const blend = Math.min(1, absoluteDelta);
          const scale = 1 - blend * 0.24;
          const opacity = 1 - blend * 0.66;
          const translateX = delta * 180;
          const floatMotion = active ? bob : index % 2 === 0 ? float : bob;
          const translateY = floatMotion.interpolate({
            inputRange: [0, 1],
            outputRange: active ? [5, -9] : [3, -6],
          });
          const rotate = floatMotion.interpolate({
            inputRange: [0, 1],
            outputRange: active ? ['-1.6deg', '1.6deg'] : ['-1deg', '1deg'],
          });
          return (
            <Pressable
              key={mobby.id}
              accessibilityRole="radio"
              accessibilityLabel={`${DISPLAY_NAMES[mobby.id]}を選ぶ`}
              accessibilityState={{ checked: active }}
              aria-checked={active}
              onPress={() => {
                if (active) {
                  celebrateActive(mobby);
                  return;
                }
                setActive(index);
              }}
              style={[
                styles.slide,
                {
                  opacity,
                  zIndex: absoluteDelta < 0.001 ? 3 : absoluteDelta < 1.15 ? 2 : 1,
                  transform: [{ translateX }, { scale }],
                },
              ]}
            >
              <Animated.View pointerEvents="none" style={[styles.floatingArt, { transform: [{ translateY }, { rotate }] }]}>
                {active && joyId === mobby.id ? <SelectedJoyArt key={`${mobby.id}-${joyRevision}`} mobby={mobby} runId={joyRevision} onFinished={finishJoy} /> : <CharacterArt mobby={mobby} />}
                {active ? <MobbyAssetSurface variant="tileSelected" pointerEvents="none" style={styles.selectedBadge} contentStyle={styles.selectedBadgeContent}><Text style={styles.selectedBadgeText}>✓</Text></MobbyAssetSurface> : null}
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      <MobbyAssetButton accessibilityLabel="前のモビー" tone="cream" onPress={() => setActive(activeIndexRef.current - 1)} style={[styles.arrow, styles.arrowLeft]} contentStyle={styles.arrowContent}>
        <Image source={ICONS.left} resizeMode="contain" style={styles.arrowIconLeft} />
      </MobbyAssetButton>
      <MobbyAssetButton accessibilityLabel="次のモビー" tone="cream" onPress={() => setActive(activeIndexRef.current + 1)} style={[styles.arrow, styles.arrowRight]} contentStyle={styles.arrowContent}>
        <Image source={ICONS.right} resizeMode="contain" style={styles.arrowIconRight} />
      </MobbyAssetButton>

      <MobbyAssetSurface variant="labelPill" pointerEvents="none" accessibilityLiveRegion="polite" style={styles.characterName} contentStyle={styles.characterNameContent}>
        <Text style={styles.name}>{DISPLAY_NAMES[activeMobby.id]}</Text>
        <Text style={styles.characterMeta}>{activeMobby.catchphrase} ・ 全{MOBBIES.length}キャラ中 {activeIndex + 1}キャラ目</Text>
      </MobbyAssetSurface>
    </View>
  );
}

export { DISPLAY_NAMES };

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 366, position: 'relative', overflow: 'hidden' },
  slideStage: { flex: 1, minHeight: 324, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  slide: { position: 'absolute', top: '50%', left: '50%', width: 286, height: 286, marginTop: -174, marginLeft: -143, alignItems: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  floatingArt: { width: 286, height: 286, alignItems: 'center', justifyContent: 'center' },
  characterArt: { width: 286, height: 286 },
  selectionPop: { width: 286, height: 286, alignItems: 'center', justifyContent: 'center' },
  characterArtLayer: { position: 'absolute', width: 286, height: 286 },
  selectedBadge: { position: 'absolute', top: 30, right: 29, width: 30, height: 30 },
  selectedBadgeContent: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', padding: 0 },
  selectedBadgeText: { color: '#FFF', fontSize: 15, lineHeight: 18, fontWeight: '900' },
  name: { color: MobbyColors.ink, fontSize: 18, lineHeight: 22, fontWeight: '900', letterSpacing: 0.5 },
  characterMeta: { color: '#97717A', fontSize: 12, lineHeight: 12, fontWeight: '800', marginTop: 2 },
  arrow: { position: 'absolute', top: '50%', width: 50, height: 50, marginTop: -56, overflow: 'hidden', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  arrowContent: { minHeight: 50, paddingHorizontal: 0, paddingVertical: 0, alignItems: 'center', justifyContent: 'center' },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  arrowIconLeft: { width: 25, height: 25, transform: [{ rotate: '-90deg' }], tintColor: '#7B916E' },
  arrowIconRight: { width: 25, height: 25, transform: [{ rotate: '90deg' }], tintColor: '#7B916E' },
  characterName: { position: 'absolute', top: '50%', left: 58, right: 58, height: 51, marginTop: 120, overflow: 'hidden' },
  characterNameContent: { height: 51, alignItems: 'center', justifyContent: 'center' },
});
