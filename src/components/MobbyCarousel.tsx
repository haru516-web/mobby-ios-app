import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';

import { MOBBIES, type Mobby, type MobbyId } from '@/data/mobies';
import { MobbyColors } from './mobby-ui';

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
    <Image source={mobby.image} resizeMode="contain" style={styles.characterArt} />
  );
}

type MobbyCarouselProps = {
  selectedId: MobbyId;
  onSelect: (mobby: Mobby) => void;
  onInteract?: () => void;
  style?: ViewStyle;
};

export function MobbyCarousel({ selectedId, onSelect, onInteract, style }: MobbyCarouselProps) {
  const initialIndex = Math.max(0, MOBBIES.findIndex((mobby) => mobby.id === selectedId));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [dragProgress, setDragProgress] = useState(0);
  const gesture = useRef({ active: false, moved: false });

  useEffect(() => {
    const nextIndex = MOBBIES.findIndex((mobby) => mobby.id === selectedId);
    if (nextIndex >= 0 && nextIndex !== activeIndex) setActiveIndex(nextIndex);
  }, [activeIndex, selectedId]);

  const activeMobby = MOBBIES[activeIndex] ?? MOBBIES[0];
  const setActive = useCallback((nextIndex: number) => {
    const normalized = (nextIndex + MOBBIES.length) % MOBBIES.length;
    setActiveIndex(normalized);
    onSelect(MOBBIES[normalized]);
  }, [onSelect]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_event, state) => Math.abs(state.dx) > 4,
    onPanResponderGrant: () => {
      gesture.current = { active: true, moved: false };
      setDragProgress(0);
    },
    onPanResponderMove: (_event, state) => {
      if (!gesture.current.active) return;
      gesture.current.moved = gesture.current.moved || Math.abs(state.dx) > 5;
      setDragProgress(clamp(-state.dx / 190, -0.92, 0.92));
    },
    onPanResponderRelease: (_event, state) => {
      const moved = gesture.current.moved || Math.abs(state.dx) > 42;
      gesture.current = { active: false, moved: false };
      if (moved && Math.abs(state.dx) > 42) {
        setActive(activeIndex + (state.dx < 0 ? 1 : -1));
      } else if (!moved) {
        onInteract?.();
      }
      setDragProgress(0);
    },
    onPanResponderTerminate: () => {
      gesture.current = { active: false, moved: false };
      setDragProgress(0);
    },
  }), [activeIndex, onInteract, setActive]);

  return (
    <View style={[styles.root, style]} {...responder.panHandlers}>
      <View pointerEvents="none" style={styles.softGlow} />
      <View style={styles.slideStage}>
        {MOBBIES.map((mobby, index) => {
          const delta = circularDelta(index, activeIndex, MOBBIES.length) + dragProgress;
          const absoluteDelta = Math.abs(delta);
          if (absoluteDelta > 2.15) return null;
          const blend = Math.min(1, absoluteDelta);
          const scale = 1 - blend * 0.24;
          const opacity = 1 - blend * 0.66;
          const translateX = delta * 180;
          return (
            <Pressable
              key={mobby.id}
              accessibilityRole="button"
              accessibilityLabel={`${DISPLAY_NAMES[mobby.id]}を選ぶ`}
              onPress={() => setActive(index)}
              style={[
                styles.slide,
                {
                  opacity,
                  zIndex: absoluteDelta < 0.001 ? 3 : absoluteDelta < 1.15 ? 2 : 1,
                  transform: [{ translateX }, { scale }],
                },
              ]}
            >
              <CharacterArt mobby={mobby} />
            </Pressable>
          );
        })}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="前のモビー" onPress={() => setActive(activeIndex - 1)} style={[styles.arrow, styles.arrowLeft]}>
        <Image source={ICONS.left} resizeMode="contain" style={styles.arrowIconLeft} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="次のモビー" onPress={() => setActive(activeIndex + 1)} style={[styles.arrow, styles.arrowRight]}>
        <Image source={ICONS.right} resizeMode="contain" style={styles.arrowIconRight} />
      </Pressable>

      <View pointerEvents="none" style={styles.characterName}>
        <Text style={styles.name}>{DISPLAY_NAMES[activeMobby.id]}</Text>
      </View>
    </View>
  );
}

export { DISPLAY_NAMES };

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 360, position: 'relative', overflow: 'hidden' },
  softGlow: { position: 'absolute', top: 42, left: '8%', right: '8%', height: 285, borderRadius: 150, backgroundColor: 'rgba(255,250,226,0.48)' },
  slideStage: { flex: 1, minHeight: 330, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  slide: { position: 'absolute', top: 8, left: '50%', width: 286, height: 286, marginLeft: -143, alignItems: 'center' },
  characterArt: { width: 286, height: 286 },
  name: { color: MobbyColors.ink, fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  arrow: { position: 'absolute', top: 137, width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#D9A76C', backgroundColor: '#FFF4D9', alignItems: 'center', justifyContent: 'center', shadowColor: '#7B4C2E', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  arrowIconLeft: { width: 25, height: 25, transform: [{ rotate: '-90deg' }], tintColor: '#7B916E' },
  arrowIconRight: { width: 25, height: 25, transform: [{ rotate: '90deg' }], tintColor: '#7B916E' },
  characterName: { position: 'absolute', bottom: 6, left: 62, right: 62, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,229,0.94)', borderWidth: 1.5, borderColor: '#E3B878' },
});
