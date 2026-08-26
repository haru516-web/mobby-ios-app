import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ImageBackground } from 'expo-image';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ParticleBurst } from '@/components/effects';
import { BlackStarToggle } from '@/components/characters';
import { REACTION_BLACK_STAR_IDS, REACTION_MOBBY_IDS, REACTION_STICKERS } from '@/data/reactionCollection';
import { getCharacterProfile, isBlackStarCharacterId } from '@/domain/characters/roster';
import type { CharacterId } from '@/domain/characters/types';
import { styles as appStyles } from '@/ui/layout/appStyles';
import { Text } from '@/ui/layout/visualPrimitives';
import { useGachaTheme } from '@/theme/GachaThemeContext';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const REACTION_COLLECTION_POPUP_BACKGROUND = require('../../../assets/generated-ui/popup-reaction-collection-v1.png');
const REACTION_COLLECTION_PANEL_ASPECT_RATIO = 957 / 1462;
const REACTION_TAB_WIDTH = 58;
const REACTION_TAB_GAP = 8;
const REACTION_TAB_PADDING = 4;

type WebWheelEvent = {
  deltaX?: number;
  deltaY?: number;
  nativeEvent?: { deltaX?: number; deltaY?: number };
  preventDefault?: () => void;
};

// Mirror PullableMobby's home reaction timing, wobble, and first-four effects.
// The preview repeats the one-shot with a short pause so the saved reaction
// keeps feeling alive until the user returns to the collection grid.
function AnimatedReactionPreview({ id, source, index, size, reduceMotion }: {
  id: string;
  source: ImageSourcePropType;
  index: number;
  size: number;
  reduceMotion: boolean;
}) {
  const motion = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const special = index === 19;

  useEffect(() => {
    motion.stopAnimation();
    if (reduceMotion) {
      motion.setValue(1);
      return;
    }
    motion.setValue(0);
    const reset = Animated.timing(motion, { toValue: 0, duration: 1, useNativeDriver: typeof document === 'undefined' });
    const reaction = special
      ? Animated.sequence([
          Animated.timing(motion, { toValue: 0.16, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(motion, { toValue: 0.48, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(motion, { toValue: 0.62, duration: 170, easing: Easing.out(Easing.back(1.8)), useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(motion, { toValue: 0.82, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: typeof document === 'undefined' }),
          Animated.delay(650),
          Animated.timing(motion, { toValue: 1, duration: 460, easing: Easing.inOut(Easing.cubic), useNativeDriver: typeof document === 'undefined' }),
        ])
      : Animated.timing(motion, {
          toValue: 1,
          duration: [760, 900, 920, 1500][index] ?? 1100,
          easing: Easing.linear,
          useNativeDriver: typeof document === 'undefined',
        });
    const animation = Animated.loop(Animated.sequence([reaction, Animated.delay(special ? 320 : 240), reset]));
    animation.start();
    return () => animation.stop();
  }, [index, motion, reduceMotion, special]);

  const translateX = special
    ? motion.interpolate({ inputRange: [0, 0.42, 0.48, 0.54, 0.62, 0.7, 0.82, 1], outputRange: [0, 0, -10, 10, -7, 5, 0, 0] })
    : motion.interpolate({ inputRange: [0, 0.16, 0.32, 0.48, 0.68, 1], outputRange: [0, -4, 4, -3, 1, 0] });
  const translateY = special
    ? motion.interpolate({ inputRange: [0, 0.16, 0.48, 0.62, 0.82, 0.9, 1], outputRange: [0, 6, -48, -42, -42, -36, 0] })
    : motion.interpolate({ inputRange: [0, 0.14, 0.32, 0.72, 1], outputRange: [4, -4, 0, 2, 0] });
  const scaleX = special
    ? motion.interpolate({ inputRange: [0, 0.16, 0.48, 0.62, 0.82, 0.9, 1], outputRange: [1, 0.9, 1.72, 1.65, 1.58, 1.58, 1] })
    : motion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.95, 1.035, 1, 1] });
  const scaleY = special ? scaleX : motion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.91, 1.045, 1, 1] });
  const rotate = special
    ? motion.interpolate({ inputRange: [0, 0.48, 0.54, 0.62, 0.7, 1], outputRange: ['0deg', '-4deg', '4deg', '-3deg', '2deg', '0deg'] })
    : motion.interpolate({ inputRange: [0, 0.18, 0.36, 0.58, 1], outputRange: ['0deg', '-1.5deg', '1.5deg', '-0.7deg', '0deg'] });
  const effectKind = !special && index < 4 ? index : -1;
  const burstOpacity = motion.interpolate({ inputRange: [0, 0.03, 0.2, 0.21], outputRange: [0, 0.9, 0, 0] });
  const burstScale = motion.interpolate({ inputRange: [0, 0.2], outputRange: [0.45, 1.45], extrapolate: 'clamp' });
  const effectOpacity = motion.interpolate({ inputRange: [0, 0.08, 0.72, 1], outputRange: [0, 0.78, 0.62, 0], extrapolate: 'clamp' });
  const cheekShift = motion.interpolate({ inputRange: [0.1, 0.17, 0.24, 0.3], outputRange: [0, -4, 3, 0], extrapolate: 'clamp' });
  const protestShift = motion.interpolate({ inputRange: [0.29, 0.37, 0.45, 0.53], outputRange: [0, 8, -6, 0], extrapolate: 'clamp' });
  const sulkDrop = motion.interpolate({ inputRange: [0.52, 0.68, 1], outputRange: [-5, 2, 5], extrapolate: 'clamp' });

  return <View pointerEvents="none" style={[styles.previewMotionStage, { width: size, height: size }]}>
    <AnimatedImage
      accessible={false}
      source={source}
      contentFit="contain"
      contentPosition="center"
      style={[styles.previewMotionImage, { transform: [{ translateX }, { translateY }, { rotate }, { scaleX }, { scaleY }] }]}
    />
    {effectKind === 0 ? <Animated.View style={[appStyles.pullableReactionBurst, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]} /> : null}
    {effectKind === 0 ? <View style={appStyles.animeEffectLayer}>{Array.from({ length: 8 }, (_, rayIndex) => <Animated.View key={rayIndex} style={[appStyles.animeBurstRayWrap, { opacity: burstOpacity, transform: [{ rotate: `${rayIndex * 45}deg` }, { scale: burstScale }] }]}><View style={[appStyles.animeBurstRay, { height: size * 0.11, left: size / 2 - 1.5, top: size * 0.025 }]} /></Animated.View>)}</View> : null}
    {effectKind === 1 ? <Animated.View style={[appStyles.animeEffectLayer, { opacity: effectOpacity, transform: [{ translateX: cheekShift }] }]}><View style={[appStyles.animeCheekTrail, appStyles.animeCheekTrailLeft]}><View style={[appStyles.animeCheekStroke, { width: size * 0.13 }]} /><View style={[appStyles.animeCheekStroke, { width: size * 0.09 }]} /><View style={[appStyles.animeCheekStroke, { width: size * 0.055 }]} /></View><View style={[appStyles.animeCheekTrail, appStyles.animeCheekTrailRight]}><View style={[appStyles.animeCheekStroke, { width: size * 0.13 }]} /><View style={[appStyles.animeCheekStroke, { width: size * 0.09 }]} /><View style={[appStyles.animeCheekStroke, { width: size * 0.055 }]} /></View></Animated.View> : null}
    {effectKind === 2 ? <Animated.View style={[appStyles.animeEffectLayer, { opacity: effectOpacity, transform: [{ translateX: protestShift }] }]}><View style={[appStyles.animeSpeedGroup, appStyles.animeSpeedGroupLeft]}><View style={[appStyles.animeSpeedLine, { width: size * 0.16 }]} /><View style={[appStyles.animeSpeedLine, { width: size * 0.11 }]} /><View style={[appStyles.animeSpeedLine, { width: size * 0.07 }]} /></View><View style={[appStyles.animeSpeedGroup, appStyles.animeSpeedGroupRight]}><View style={[appStyles.animeSpeedLine, { width: size * 0.16 }]} /><View style={[appStyles.animeSpeedLine, { width: size * 0.11 }]} /><View style={[appStyles.animeSpeedLine, { width: size * 0.07 }]} /></View></Animated.View> : null}
    {effectKind === 3 ? <Animated.View style={[appStyles.animeEffectLayer, { opacity: effectOpacity, transform: [{ translateY: sulkDrop }] }]}><View style={appStyles.animeGloomLines}><View style={appStyles.animeGloomLine} /><View style={[appStyles.animeGloomLine, appStyles.animeGloomLineShort]} /><View style={appStyles.animeGloomLine} /></View></Animated.View> : null}
    <ParticleBurst type={special ? 'star' : 'heart'} count={special ? 12 : 8} large={special} active burstKey={id} seed={id} style={appStyles.pullParticleBurst} />
  </View>;
}

export function ReactionCollectionPopover({ selectedCharacterId, collectedIds, ownedCharacterIds = REACTION_MOBBY_IDS, reduceMotion = false, onSelectCharacter, onClose }: {
  selectedCharacterId: CharacterId;
  collectedIds: readonly string[];
  ownedCharacterIds?: readonly CharacterId[];
  reduceMotion?: boolean;
  onSelectCharacter: (id: CharacterId) => void;
  onClose: () => void;
}) {
  // Every fresh visit starts on ordinary Mobby, even when the home character
  // itself is a Black Star. The faction toggle is deliberately screen-local.
  const [showBlackStars, setShowBlackStars] = useState(false);
  const { activeTheme } = useGachaTheme();
  const ownedCharacters = useMemo(() => new Set(ownedCharacterIds), [ownedCharacterIds]);
  const visibleCharacterIds: readonly CharacterId[] = showBlackStars ? REACTION_BLACK_STAR_IDS : REACTION_MOBBY_IDS;
  const displayCharacterId = visibleCharacterIds.includes(selectedCharacterId)
    ? selectedCharacterId
    : visibleCharacterIds.find((id) => ownedCharacters.has(id)) ?? visibleCharacterIds[0];
  const displayCharacterOwned = !isBlackStarCharacterId(displayCharacterId) || ownedCharacters.has(displayCharacterId);
  const character = getCharacterProfile(displayCharacterId);
  const displayedCharacterName = displayCharacterOwned ? character.name : '？？？';
  const stickers = REACTION_STICKERS[displayCharacterId] ?? [];
  const collected = useMemo(() => new Set(collectedIds), [collectedIds]);
  const [previewStickerId, setPreviewStickerId] = useState<string | null>(null);
  const characterTabsRef = useRef<ScrollView>(null);
  const characterTabsOffsetRef = useRef(0);
  const characterTabsDragStartRef = useRef(0);
  const previewSticker = stickers.find((sticker) => sticker.id === previewStickerId) ?? null;
  const collectedCount = displayCharacterOwned
    ? stickers.reduce((count, sticker) => count + Number(collected.has(sticker.id)), 0)
    : 0;
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const availableHeight = Math.max(0, Math.min(viewportHeight * 0.82, viewportHeight - 48, 680));
  const panelWidth = Math.max(0, Math.min(viewportWidth - 32, 410, availableHeight * REACTION_COLLECTION_PANEL_ASPECT_RATIO));
  const panelHeight = panelWidth / REACTION_COLLECTION_PANEL_ASPECT_RATIO;
  const previewSize = Math.max(0, Math.min(panelWidth * 0.84, panelHeight * 0.58, 340));
  const characterTabsPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Platform.OS === 'web' && Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onMoveShouldSetPanResponderCapture: (_event, gesture) => Platform.OS === 'web' && Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      characterTabsDragStartRef.current = characterTabsOffsetRef.current;
    },
    onPanResponderMove: (_event, gesture) => {
      characterTabsRef.current?.scrollTo({ x: Math.max(0, characterTabsDragStartRef.current - gesture.dx), animated: false });
    },
  }), []);
  const handleCharacterTabsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    characterTabsOffsetRef.current = event.nativeEvent.contentOffset.x;
  };
  const handleCharacterTabsWheel = (event: WebWheelEvent) => {
    const deltaX = event.deltaX ?? event.nativeEvent?.deltaX ?? 0;
    const deltaY = event.deltaY ?? event.nativeEvent?.deltaY ?? 0;
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    if (!delta) return;
    event.preventDefault?.();
    characterTabsRef.current?.scrollTo({ x: Math.max(0, characterTabsOffsetRef.current + delta), animated: false });
  };
  const webCharacterTabsProps = Platform.OS === 'web' ? { onWheel: handleCharacterTabsWheel } : {};
  const dismissPreviewOrClose = () => {
    if (previewSticker) {
      setPreviewStickerId(null);
      return;
    }
    onClose();
  };
  useEffect(() => setPreviewStickerId(null), [displayCharacterId]);
  useEffect(() => {
    const selectedIndex = Math.max(0, visibleCharacterIds.indexOf(displayCharacterId));
    const viewport = Math.max(0, panelWidth - 52);
    const contentWidth = REACTION_TAB_PADDING * 2
      + visibleCharacterIds.length * REACTION_TAB_WIDTH
      + Math.max(0, visibleCharacterIds.length - 1) * REACTION_TAB_GAP;
    const selectedCenter = REACTION_TAB_PADDING + selectedIndex * (REACTION_TAB_WIDTH + REACTION_TAB_GAP) + REACTION_TAB_WIDTH / 2;
    const targetOffset = Math.max(0, Math.min(contentWidth - viewport, selectedCenter - viewport / 2));
    const frame = requestAnimationFrame(() => {
      characterTabsOffsetRef.current = targetOffset;
      characterTabsRef.current?.scrollTo({ x: targetOffset, animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [displayCharacterId, panelWidth, visibleCharacterIds]);
  return <Modal animationType="none" onRequestClose={dismissPreviewOrClose} presentationStyle="overFullScreen" transparent visible>
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable accessibilityLabel={previewSticker ? 'リアクションの拡大表示を閉じる' : 'リアクション図鑑を閉じる'} accessibilityRole="button" onPress={dismissPreviewOrClose} style={styles.backdrop} />
      <View accessibilityViewIsModal accessibilityLabel={`${displayedCharacterName}のリアクション図鑑`} style={[styles.panel, { width: panelWidth, height: panelHeight }]}>
      <ImageBackground accessible={false} imageStyle={styles.panelImage} contentFit="cover" source={activeTheme?.assets.popup ?? REACTION_COLLECTION_POPUP_BACKGROUND} style={styles.panelBackground}>
      <View style={styles.panelContent}>
      <View
        accessibilityElementsHidden={Boolean(previewSticker)}
        importantForAccessibility={previewSticker ? 'no-hide-descendants' : 'auto'}
        pointerEvents={previewSticker ? 'none' : 'auto'}
        style={[styles.collectionContent, previewSticker && styles.collectionContentHidden]}
      >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>REACTION STAMPS</Text>
          <Text accessibilityRole="header" style={styles.title}>リアクション図鑑</Text>
          <Text style={styles.subtitle}>{displayedCharacterName}のリアクションを集めよう ・ {collectedCount}/{stickers.length}</Text>
        </View>
        <Pressable accessibilityLabel="リアクション図鑑を閉じる" accessibilityRole="button" hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      <BlackStarToggle
        active={showBlackStars}
        onChange={(active) => {
          setShowBlackStars(active);
          setPreviewStickerId(null);
          const candidates = active ? REACTION_BLACK_STAR_IDS : REACTION_MOBBY_IDS;
          onSelectCharacter(candidates.find((id) => ownedCharacters.has(id)) ?? candidates[0]);
        }}
        style={styles.blackStarToggle}
        testID="reaction-black-star-toggle"
      />
      <View {...(Platform.OS === 'web' ? characterTabsPanResponder.panHandlers : {})} style={styles.tabsGestureArea}>
      <ScrollView
        {...webCharacterTabsProps}
        contentContainerStyle={styles.tabs}
        directionalLockEnabled
        horizontal
        nestedScrollEnabled
        onScroll={handleCharacterTabsScroll}
        ref={characterTabsRef}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
      >
        {visibleCharacterIds.map((id) => {
          const tabCharacter = getCharacterProfile(id);
          const owned = !isBlackStarCharacterId(id) || ownedCharacters.has(id);
          const selected = id === displayCharacterId;
          return <Pressable
            accessibilityLabel={owned ? `${tabCharacter.name}のリアクション` : '未解放の黒星'}
            accessibilityRole="tab"
            accessibilityState={{ disabled: !owned, selected }}
            disabled={!owned}
            key={id}
            onPress={() => onSelectCharacter(id)}
            style={({ pressed }) => [styles.tab, selected && styles.tabSelected, !owned && styles.tabLocked, pressed && styles.pressed]}
          >
            <Image accessible={false} source={tabCharacter.image} contentFit="contain" tintColor={owned ? undefined : '#17131D'} style={[styles.tabImage, !owned && styles.tabImageLocked]} />
            <Text numberOfLines={1} style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{owned ? tabCharacter.name : '？？？'}</Text>
            {selected ? <View pointerEvents="none" style={styles.tabIndicator} /> : null}
          </Pressable>;
        })}
      </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={styles.stickerScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.stickerScroll}
      >
        <View style={styles.grid}>
          {stickers.map((sticker) => {
            const owned = displayCharacterOwned && collected.has(sticker.id);
            return <Pressable
              accessibilityHint={owned ? '大きく表示します' : undefined}
              key={sticker.id}
              accessibilityLabel={owned ? `${displayedCharacterName}のリアクション${sticker.index + 1}を拡大表示` : '未収集のリアクション'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !owned }}
              disabled={!owned}
              onPress={() => setPreviewStickerId(sticker.id)}
              style={({ pressed }) => [styles.sticker, !owned && styles.stickerMissing, pressed && styles.stickerPressed]}
            >
              {owned
                ? <Image accessible={false} source={sticker.source} contentFit="contain" style={styles.stickerImage} />
                : <>
                  <Image accessible={false} source={sticker.source} contentFit="contain" tintColor="#514953" style={styles.stickerGhost} />
                  <View pointerEvents="none" style={styles.stickerHoleMark}><Text style={styles.stickerQuestion}>?</Text></View>
                </>}
            </Pressable>;
          })}
        </View>
      </ScrollView>
      <Text style={styles.hint}>ほっぺを引っぱると、新しいリアクションが増えるよ</Text>
      </View>
      {previewSticker ? <Pressable
        accessibilityLabel={`${displayedCharacterName}のリアクション${previewSticker.index + 1}を大きく表示中。タップして図鑑に戻る`}
        accessibilityRole="button"
        accessibilityViewIsModal
        onPress={() => setPreviewStickerId(null)}
        style={({ pressed }) => [styles.previewOverlay, pressed && styles.previewPressed]}
      >
        <AnimatedReactionPreview
          id={previewSticker.id}
          index={previewSticker.index}
          reduceMotion={reduceMotion}
          size={previewSticker.index === 19 ? Math.min(previewSize, 220) : previewSize}
          source={previewSticker.source}
        />
        <Text style={styles.previewHint}>タップで図鑑に戻る</Text>
      </Pressable> : null}
      </View>
      </ImageBackground>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, zIndex: 70, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  panel: {
    minHeight: 0,
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowColor: '#4F2D3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 14,
  },
  panelBackground: { flex: 1, width: '100%', height: '100%', minHeight: 0, borderRadius: 28, overflow: 'hidden' },
  panelImage: { borderRadius: 28 },
  panelContent: { flex: 1, minHeight: 0, zIndex: 1 },
  collectionContent: { flex: 1, minHeight: 0 },
  collectionContentHidden: { opacity: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 20, paddingHorizontal: 30, paddingBottom: 10 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#A45D68', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#593C5D', fontSize: 22, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#8A6C79', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#7E4C60', fontSize: 30, lineHeight: 32, fontWeight: '900' },
  blackStarToggle: { alignSelf: 'flex-end', minWidth: 86, minHeight: 36, marginTop: -6, marginRight: 29, marginBottom: 4, transform: [{ scale: 0.86 }] },
  tabsGestureArea: { marginHorizontal: 26 },
  tabsScroll: { flexGrow: 0 },
  tabs: { gap: 8, paddingHorizontal: 4, paddingBottom: 9 },
  tab: { width: 58, minHeight: 62, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingBottom: 5 },
  tabSelected: { transform: [{ scale: 1.04 }] },
  tabLocked: { opacity: 0.48 },
  tabImage: { width: 38, height: 38 },
  tabImageLocked: { opacity: 0.72 },
  tabLabel: { color: '#896D78', fontSize: 10, fontWeight: '800', marginTop: 2 },
  tabLabelSelected: { color: '#633D5D', fontWeight: '900' },
  tabIndicator: { position: 'absolute', bottom: 0, width: 28, height: 3, borderRadius: 2, backgroundColor: '#ED8A86' },
  stickerScroll: { flex: 1, minHeight: 0, marginTop: 2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(89,60,93,0.10)' },
  stickerScrollContent: { paddingHorizontal: 30, paddingTop: 10, paddingBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 7 },
  sticker: { width: '22%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible', backgroundColor: 'transparent' },
  stickerMissing: { opacity: 0.64 },
  stickerPressed: { opacity: 0.72, transform: [{ scale: 0.92 }] },
  stickerImage: { width: '98%', height: '98%' },
  stickerGhost: { width: '96%', height: '96%', opacity: 0.16 },
  stickerHoleMark: { position: 'absolute', width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  stickerQuestion: { color: '#756A73', fontSize: 20, lineHeight: 22, fontWeight: '900' },
  hint: { color: '#987982', fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'center', paddingHorizontal: 30, paddingTop: 9, paddingBottom: 15 },
  previewOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, elevation: 20, alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  previewMotionStage: { position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  previewMotionImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  previewPressed: { opacity: 0.86 },
  previewHint: { color: '#7E5E70', fontSize: 12, lineHeight: 18, fontWeight: '800', marginTop: -8 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
